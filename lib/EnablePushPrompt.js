'use client'

// EnablePushPrompt — banner sutil que aparece cuando el browser soporta web
// push pero el user todavía no dio permiso. Lo deja descartar (no insiste).
// Si el user descartó el banner una vez (localStorage), no vuelve a aparecer
// salvo que se borre la flag.
//
// Mostrarlo solo cuando hay sesión activa y el user está dentro de la app
// (no en /home ni /directory). Quien lo monta es app/page.js.

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import {
  registerPushIfPossible,
  requestPushPermissionAndSubscribe,
  attachServiceWorkerMessageListener,
} from './push-client'

const FN = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const DISMISSED_KEY = 'clufix:push-banner-dismissed'

export default function EnablePushPrompt() {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Listener del SW (refresca drawer cuando llega un push)
    const detach = attachServiceWorkerMessageListener()

    // Si ya tiene permiso, registrar silenciosamente y NO mostrar banner.
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('PushManager' in window)) return

    if (Notification.permission === 'granted') {
      registerPushIfPossible().catch(() => {})
      return detach
    }
    if (Notification.permission === 'denied') return detach
    // 'default' — mostrar banner solo si no fue descartado antes.
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return detach
    } catch {}

    // Esperar 4 segundos antes de mostrar para no aparecer apenas entra.
    const t = setTimeout(() => setShow(true), 4000)
    return () => {
      clearTimeout(t)
      detach()
    }
  }, [])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch {}
  }

  async function enable() {
    setBusy(true)
    const res = await requestPushPermissionAndSubscribe()
    setBusy(false)
    if (res.ok) {
      setShow(false)
    } else if (res.reason === 'denied') {
      // El user dijo no — no insistimos.
      dismiss()
    }
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      left: '50%',
      bottom: 16,
      transform: 'translateX(-50%)',
      zIndex: 1502,
      width: 'min(420px, calc(100vw - 32px))',
      background: 'linear-gradient(135deg, rgba(254,80,0,0.96), rgba(189,75,248,0.96))',
      borderRadius: 18,
      boxShadow: '0 18px 48px rgba(189,75,248,0.45), 0 0 0 1px rgba(255,255,255,0.10)',
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'slideup 320ms cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Bell size={20} color="#fff" strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FN, fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
          Activá las notificaciones
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
          Recibí avisos al instante de visitas, canjes y descuentos.
        </div>
      </div>
      <button onClick={enable} disabled={busy}
        style={{
          background: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '8px 14px',
          color: '#6F30DF',
          fontFamily: FN, fontSize: 12, fontWeight: 800,
          cursor: busy ? 'wait' : 'pointer',
          flexShrink: 0,
          opacity: busy ? 0.7 : 1,
        }}>
        {busy ? '...' : 'Activar'}
      </button>
      <button onClick={dismiss}
        title="Ahora no"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.85)',
          cursor: 'pointer',
          padding: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
        <X size={16} strokeWidth={2.4} />
      </button>
      <style jsx>{`
        @keyframes slideup {
          from { transform: translate(-50%, 30px); opacity: 0; }
          to   { transform: translate(-50%, 0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
