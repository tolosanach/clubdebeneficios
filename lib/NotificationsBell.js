'use client'

// NotificationsBell — botón flotante con campana + badge contador de no-leídas
// y drawer lateral con la lista de notifs. Polling cada 30s para refrescar.
// Si el navegador tiene push registrado, además se actualiza al recibir el
// evento 'message' del service worker (lib/push-client.js).
//
// Uso:
//   <NotificationsBell />
// (toma user logueado solo, no necesita props)

import { useEffect, useRef, useState } from 'react'
import { Bell, Check, X, Gift, Percent, Star, UserPlus, ChevronRight, RefreshCw, Ban } from 'lucide-react'

const FN = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const C = {
  bg:    '#0a0a0a',
  card:  '#171717',
  rim:   'rgba(255,255,255,0.10)',
  white: '#fff',
  pearl: 'rgba(255,255,255,0.92)',
  mist:  'rgba(255,255,255,0.65)',
  dust:  'rgba(255,255,255,0.45)',
  v:     '#BD4BF8',
  o:     '#FE5000',
  ok:    '#22C55E',
}

// Mapping type → icono. Si no matchea, usa Bell genérica.
const TYPE_ICON = {
  visit:             Star,
  join:              UserPlus,
  prize_redeem:      Gift,
  discount_redeem:   Percent,
  discount_renewed:  RefreshCw,
  discount_declined: Ban,
}
const TYPE_COLOR = {
  visit:             '#8B5CF6',
  join:              '#22C55E',
  prize_redeem:      '#EC4899',
  discount_redeem:   '#FE5000',
  discount_renewed:  '#22C55E',
  discount_declined: 'rgba(255,255,255,0.55)',
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'recién'
  if (m < 60)  return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7)   return `hace ${d}d`
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export default function NotificationsBell({ bottom = 156, role = 'client' }) {
  const [open, setOpen]       = useState(false)
  const [items, setItems]     = useState([])
  const [unread, setUnread]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasPulse, setHasPulse] = useState(false)
  const pollRef = useRef(null)

  // Fetch inicial + polling cada 30s
  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      try {
        const res = await fetch('/api/notifications', { cache: 'no-store' })
        const data = await res.json()
        if (cancelled) return
        if (data.ok) {
          setItems(data.items || [])
          // Si había no leídas y aumenta el contador, animamos pulso.
          setUnread(prev => {
            if ((data.unread_count || 0) > prev) setHasPulse(true)
            return data.unread_count || 0
          })
        }
      } catch {}
    }
    fetchAll()
    pollRef.current = setInterval(fetchAll, 30000)
    // Listener para refrescos forzados (ej: el SW recibió un push)
    const onRefresh = () => fetchAll()
    window.addEventListener('benefix:notifications-refresh', onRefresh)
    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
      window.removeEventListener('benefix:notifications-refresh', onRefresh)
    }
  }, [])

  // Pulso visual del badge cuando llega una notif nueva
  useEffect(() => {
    if (!hasPulse) return
    const t = setTimeout(() => setHasPulse(false), 1500)
    return () => clearTimeout(t)
  }, [hasPulse])

  // Cuando se abre el drawer, marcamos todas como leídas (si hay alguna)
  useEffect(() => {
    if (!open || unread === 0) return
    let cancelled = false
    ;(async () => {
      try {
        await fetch('/api/notifications', { method: 'PATCH' })
        if (cancelled) return
        setUnread(0)
        // Marcar localmente todas como leídas para que el render se actualice
        setItems(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
      } catch {}
    })()
    return () => { cancelled = true }
  }, [open])

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function handleItemClick(n) {
    if (n.link) {
      // Si es un link interno, navegamos al SPA via window.location;
      // si es externo, también funciona.
      if (n.link.startsWith('/')) {
        window.location.href = n.link
      } else {
        window.open(n.link, '_blank', 'noopener,noreferrer')
      }
    }
    setOpen(false)
  }

  // Posición del botón flotante: en mobile arriba a la derecha del SupportChat,
  // en desktop también flota pero en la esquina sup-derecha.
  const buttonStyle = {
    position: 'fixed',
    right: 18,
    bottom,
    zIndex: 1500,
    width: 52, height: 52,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FE5000 0%, #BD4BF8 100%)',
    border: 'none',
    boxShadow: '0 8px 24px -4px rgba(189,75,248,0.50), 0 0 0 1px rgba(255,255,255,0.10)',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1)',
  }

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.94)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title="Notificaciones"
        style={buttonStyle}>
        <Bell size={22} color="#fff" strokeWidth={2.2} />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: -4, right: -4,
            minWidth: 22, height: 22,
            borderRadius: 99,
            background: '#22C55E',
            color: '#fff',
            fontFamily: FN,
            fontSize: 11, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 6px',
            border: '2px solid #0a0a0a',
            boxShadow: hasPulse ? '0 0 0 8px rgba(34,197,94,0.18)' : 'none',
            transition: 'box-shadow 600ms ease',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1499,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              animation: 'fadein 180ms ease',
            }} />
          {/* Drawer derecha */}
          <aside style={{
            position: 'fixed',
            top: 0, right: 0, bottom: 0,
            width: 'min(420px, 92vw)',
            zIndex: 1501,
            background: C.bg,
            borderLeft: `1px solid ${C.rim}`,
            display: 'flex', flexDirection: 'column',
            animation: 'slidein-right 220ms cubic-bezier(0.16,1,0.3,1)',
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 18px 14px',
              borderBottom: `1px solid ${C.rim}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontFamily: FN, fontSize: 17, fontWeight: 800, color: C.white, letterSpacing: '-.01em' }}>Notificaciones</div>
                <div style={{ fontSize: 11, color: C.dust, marginTop: 2 }}>
                  {items.length === 0 ? 'No hay actividad reciente' : `${items.length} ${items.length === 1 ? 'aviso' : 'avisos'}`}
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.rim}`, borderRadius: 10, padding: 8, color: C.mist, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} strokeWidth={2.2} />
              </button>
            </div>

            {/* Lista */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 24px', color: C.dust, fontSize: 13 }}>
                  <Bell size={36} color={C.dust} strokeWidth={1.5} style={{ marginBottom: 14, opacity: 0.6 }} />
                  <div style={{ marginBottom: 6, color: C.mist }}>Todo tranquilo por acá</div>
                  <div style={{ fontSize: 11.5 }}>Cuando pase algo en tus clubes te avisamos.</div>
                </div>
              )}

              {items.map(n => {
                const Icon = TYPE_ICON[n.type] || Bell
                const color = TYPE_COLOR[n.type] || C.v
                const isUnread = !n.read_at
                return (
                  <button key={n.id}
                    onClick={() => handleItemClick(n)}
                    style={{
                      width: '100%', textAlign: 'left',
                      padding: '12px 18px',
                      background: isUnread ? 'rgba(189,75,248,0.06)' : 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${C.rim}`,
                      cursor: n.link ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      fontFamily: 'inherit',
                      transition: 'background 140ms ease',
                    }}
                    onMouseEnter={e => { if (n.link) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isUnread ? 'rgba(189,75,248,0.06)' : 'transparent' }}>
                    {/* Punto azul de no-leída */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: `${color}1A`,
                        border: `1px solid ${color}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={16} color={color} strokeWidth={2} />
                      </div>
                      {isUnread && (
                        <span style={{
                          position: 'absolute', top: -2, right: -2,
                          width: 10, height: 10, borderRadius: '50%',
                          background: '#22C55E',
                          border: `2px solid ${C.bg}`,
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: FN,
                        fontSize: 13,
                        fontWeight: isUnread ? 700 : 600,
                        color: C.white,
                        marginBottom: 3,
                        lineHeight: 1.35,
                      }}>{n.title}</div>
                      {n.body && (
                        <div style={{ fontSize: 12, color: C.mist, marginBottom: 5, lineHeight: 1.45 }}>{n.body}</div>
                      )}
                      <div style={{ fontSize: 10.5, color: C.dust, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{timeAgo(n.created_at)}</span>
                        {n.link && (
                          <>
                            <span>·</span>
                            <span style={{ color: color, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                              Ver <ChevronRight size={11} strokeWidth={2.5} />
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {items.length > 0 && unread > 0 && (
              <div style={{ padding: 14, borderTop: `1px solid ${C.rim}`, textAlign: 'center' }}>
                <button
                  onClick={async () => {
                    await fetch('/api/notifications', { method: 'PATCH' })
                    setUnread(0)
                    setItems(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${C.rim}`,
                    borderRadius: 10,
                    padding: '8px 14px',
                    color: C.mist,
                    fontFamily: FN, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                  <Check size={13} strokeWidth={2.2} /> Marcar todas como leídas
                </button>
              </div>
            )}
          </aside>

          <style jsx>{`
            @keyframes fadein {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes slidein-right {
              from { transform: translateX(100%); }
              to   { transform: translateX(0); }
            }
          `}</style>
        </>
      )}
    </>
  )
}
