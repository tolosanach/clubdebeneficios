'use client'

// lib/push-client.js
// Cliente de web push del navegador.
//
// API pública:
//   - registerPushIfPossible() → idempotente, intenta registrar el SW y
//     suscribir si el user ya dio permiso. No prompteea, no hace ruido.
//   - requestPushPermissionAndSubscribe() → muestra el prompt de permisos
//     y suscribe si dice que sí. Llamar desde un click handler.
//   - unsubscribePush() → desuscribe y borra del backend.
//
// El módulo es seguro de importar en SSR: las llamadas chequean window y
// salen temprano si están fuera de un browser.

const SW_PATH = '/sw-push.js'

function isSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

// urlBase64ToUint8Array — necesario para pasar la VAPID public key como
// applicationServerKey al PushManager.subscribe().
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

async function getVapidKey() {
  try {
    const res = await fetch('/api/push/vapid', { cache: 'no-store' })
    const data = await res.json()
    if (!data.ok || !data.publicKey) return null
    return data.publicKey
  } catch {
    return null
  }
}

async function registerSw() {
  // Si ya hay un SW registrado del mismo path, lo reutilizamos.
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH)
  if (existing) return existing
  return navigator.serviceWorker.register(SW_PATH)
}

async function saveSubscription(subscription) {
  const json = subscription.toJSON()
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys:     json.keys,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }),
  })
}

async function deleteSubscription(endpoint) {
  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {})
}

/**
 * Idempotente: intenta registrar el SW y suscribir si el user YA dio
 * permiso. No muestra prompt — eso es responsabilidad de
 * requestPushPermissionAndSubscribe(). Devuelve la subscription o null.
 */
export async function registerPushIfPossible() {
  if (!isSupported()) return null
  if (Notification.permission !== 'granted') return null
  try {
    const reg = await registerSw()
    let sub = await reg.pushManager.getSubscription()
    if (sub) {
      // Revalidar contra el backend (idempotente — upsert por endpoint)
      await saveSubscription(sub)
      return sub
    }
    const key = await getVapidKey()
    if (!key) return null  // VAPID no configurado en server
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    })
    await saveSubscription(sub)
    return sub
  } catch (e) {
    console.warn('[push] registerPushIfPossible error:', e?.message)
    return null
  }
}

/**
 * Pide permiso al user (debe ser llamado desde un click handler) y suscribe.
 * Devuelve { ok, reason } — reason puede ser 'denied', 'unsupported', 'no_vapid'.
 */
export async function requestPushPermissionAndSubscribe() {
  if (!isSupported()) return { ok: false, reason: 'unsupported' }
  let perm = Notification.permission
  if (perm === 'default') {
    perm = await Notification.requestPermission()
  }
  if (perm !== 'granted') return { ok: false, reason: 'denied' }

  const sub = await registerPushIfPossible()
  if (!sub) return { ok: false, reason: 'no_vapid' }
  return { ok: true }
}

/** Desuscribe y borra del backend. */
export async function unsubscribePush() {
  if (!isSupported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH)
    if (!reg) return
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    await deleteSubscription(endpoint)
  } catch (e) {
    console.warn('[push] unsubscribe error:', e?.message)
  }
}

/**
 * Setup del listener para que el SW pueda avisar a la tab cuando
 * recibe un push (para refrescar el drawer de notifs sin esperar al
 * siguiente poll).
 */
export function attachServiceWorkerMessageListener() {
  if (!isSupported()) return () => {}
  function handler(event) {
    if (event.data?.type === 'benefix:notification') {
      window.dispatchEvent(new CustomEvent('benefix:notifications-refresh'))
    }
  }
  navigator.serviceWorker?.addEventListener('message', handler)
  return () => navigator.serviceWorker?.removeEventListener('message', handler)
}
