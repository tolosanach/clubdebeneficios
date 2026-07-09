// lib/notify-server.js
//
// Helper server-side para notificar a un user. Inserta una fila en la tabla
// `notifications` (in-app, drawer + campana) y opcionalmente dispara web push
// del navegador si el user tiene push_subscriptions registrados.
//
// El push se hace lazy: si la dependencia `web-push` no está instalada o
// faltan las VAPID keys en env, fallea silenciosamente y la notif in-app
// igual queda registrada. Esto permite que el sistema funcione end-to-end
// incluso antes de configurar VAPID.
//
// Uso (desde un route handler):
//   import { notify } from '@/lib/notify-server'
//   await notify({
//     userId: '...',
//     type: 'visit',
//     title: '¡Sumaste 1 estrella en Café Berlín!',
//     body:  'Llevás 5 estrellas en este club.',
//     link:  '/club/cafe-berlin',
//   })

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

// Cache lazy del módulo web-push: solo lo cargamos la primera vez que se
// necesita (evita romper builds si la dep no está instalada todavía).
let _webPushPromise = null
async function getWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return null
  if (!_webPushPromise) {
    _webPushPromise = (async () => {
      try {
        const wp = await import('web-push')
        const lib = wp.default || wp
        lib.setVapidDetails(
          process.env.VAPID_SUBJECT || 'mailto:soporte@clufix.com.ar',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY,
        )
        return lib
      } catch (e) {
        console.warn('[notify] web-push no instalado o error de init:', e?.message)
        return null
      }
    })()
  }
  return _webPushPromise
}

/**
 * Crea una notificación in-app + dispara web push si corresponde.
 *
 * @param {Object} opts
 * @param {string} opts.userId   id del destinatario (auth.users.id)
 * @param {string} opts.type     tipo lógico (ej: 'visit', 'join', 'prize_redeem', 'discount_redeem')
 * @param {string} opts.title    título principal
 * @param {string} [opts.body]   texto secundario (opcional)
 * @param {string} [opts.link]   URL relativa adonde lleva el click
 * @param {Object} [opts.metadata] payload arbitrario para la UI
 */
export async function notify({ userId, type, title, body, link, metadata }) {
  if (!userId || !type || !title) {
    console.warn('[notify] faltan campos:', { userId, type, title })
    return null
  }

  // 1) Insert in-app
  let inserted = null
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id:  userId,
        type,
        title,
        body:     body || null,
        link:     link || null,
        metadata: metadata || {},
      })
      .select('id, created_at')
      .single()
    if (error) throw error
    inserted = data
  } catch (e) {
    console.error('[notify] error insertando notification:', e)
    return null
  }

  // 2) Web push (best-effort, no bloquea la respuesta)
  ;(async () => {
    try {
      const webpush = await getWebPush()
      if (!webpush) return

      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', userId)

      if (!subs || subs.length === 0) return

      const payload = JSON.stringify({
        title,
        body:  body || '',
        link:  link || '/',
        type,
        notifId: inserted.id,
      })

      // Tipos "criticos" se envian con urgency:high y TTL grande para
      // que el push service (FCM/APNs) los despache de inmediato y los
      // mantenga en cola si el device esta offline. Los tipos comunes
      // van con urgency normal (best-effort).
      const CRITICAL_TYPES = new Set(['redeem_pending', 'discount_pending'])
      const pushOpts = CRITICAL_TYPES.has(type)
        ? { urgency: 'high',   TTL: 60 * 60 * 24 } // 24h para no perderlo
        : { urgency: 'normal', TTL: 60 * 60 * 4  } // 4h para los comunes

      await Promise.all(subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            pushOpts,
          )
        } catch (err) {
          // Si el endpoint dejó de existir (410 / 404), borramos el registro.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', s.id)
          } else {
            console.warn('[notify] error enviando push:', err?.message)
          }
        }
      }))
    } catch (e) {
      console.warn('[notify] error en web push pipeline:', e?.message)
    }
  })()

  return inserted
}

/**
 * Helper conveniente: notifica al cliente y al dueño en una sola llamada.
 * Si el dueño es el mismo user (el dueño se sumó a su propio comercio para
 * testear, raro pero posible), evita duplicar.
 */
export async function notifyBoth({ clientUserId, ownerUserId, client, owner }) {
  const promises = []
  if (clientUserId && client) {
    promises.push(notify({ userId: clientUserId, ...client }))
  }
  if (ownerUserId && owner && ownerUserId !== clientUserId) {
    promises.push(notify({ userId: ownerUserId, ...owner }))
  }
  return Promise.all(promises)
}
