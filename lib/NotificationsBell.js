'use client'

// NotificationsBell — UN solo botón flotante con dos pestañas adentro:
//
//   • Movimientos: notifs transaccionales (visita registrada, canje, descuento
//     aplicado/renovado, cliente nuevo). Vienen de la tabla `notifications` y
//     se marcan como leídas al abrir la pestaña.
//
//   • Sistema: sugerencias automáticas generadas por reglas + IA (cargá
//     premios, configurá horarios, reactivá inactivos). Vienen de
//     /api/suggestions. Cada una se marca leída al cliquearla.
//
// El badge del botón suma los no-leídos de ambas. Si llega un push del
// service worker, refresca la pestaña activa al toque.

import { useEffect, useRef, useState } from 'react'
import {
  Bell, Check, X, Gift, Percent, Star, UserPlus, ChevronRight,
  RefreshCw, Ban, ExternalLink, Sparkles,
} from 'lucide-react'
import { getSupabase } from './supabase'

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
  visit:              Star,
  join:               UserPlus,
  prize_redeem:       Gift,
  discount_redeem:    Percent,
  discount_renewed:   RefreshCw,
  discount_declined:  Ban,
  discount_granted:   Sparkles,
  // Aviso al dueño cuando tiene clientes acumulando sin premios cargados.
  // Lo dispara el cron /api/admin/check-empty-prize-clubs (1 vez por día,
  // throttle 7 días para no spamear).
  no_prizes_warning:  Gift,
}
const TYPE_COLOR = {
  visit:              '#8B5CF6',
  join:               '#22C55E',
  prize_redeem:       '#EC4899',
  discount_redeem:    '#FE5000',
  discount_renewed:   '#22C55E',
  discount_declined:  'rgba(255,255,255,0.55)',
  discount_granted:   '#BD4BF8',
  no_prizes_warning:  '#BD4BF8',  // violeta de marca — alerta no agresiva
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

export default function NotificationsBell({ bottom = 156, role = 'client', hideButton = false }) {
  const [open, setOpen]               = useState(false)
  const [tab, setTab]                 = useState('movimientos')   // 'movimientos' | 'sistema'
  const [items, setItems]             = useState([])
  const [unread, setUnread]           = useState(0)
  const [suggestions, setSuggestions] = useState([])
  const [hasPulse, setHasPulse]       = useState(false)
  const [refreshingSugs, setRefreshingSugs] = useState(false)
  const pollRef = useRef(null)
  const initialSugLoad = useRef(false)

  // Permitir abrir el drawer desde otro componente (ej: FloatingActionsTab,
  // que muestra la campana como ícono dentro de su pill flotante).
  useEffect(() => {
    function onOpen() { setOpen(true) }
    window.addEventListener('benefix:open-notifications', onOpen)
    return () => window.removeEventListener('benefix:open-notifications', onOpen)
  }, [])

  const suggestionsUnread = suggestions.filter(s => !s.read_at).length
  const totalUnread       = unread + suggestionsUnread

  // Cartelito "tenes mensajes nuevos" al arrancar la app. Antes se mostraba
  // siempre que hubiera unread y el drawer estuviera cerrado, pero el dueno
  // pidio que sea un nudge que aparece UNA SOLA VEZ por sesion (al iniciar
  // la app desde cero), dura ~2s y se va. Se reinicia cada cold-start porque
  // hasShownStartupBanner vive en un ref del componente que se resetea
  // cuando la pagina se carga de nuevo.
  const hasShownStartupBanner = useRef(false)
  const [showStartupBanner, setShowStartupBanner] = useState(false)
  useEffect(() => {
    if (hasShownStartupBanner.current) return
    if (totalUnread <= 0) return
    hasShownStartupBanner.current = true
    setShowStartupBanner(true)
    const t = setTimeout(() => setShowStartupBanner(false), 2000)
    return () => clearTimeout(t)
  }, [totalUnread])

  // Avisamos al exterior cuando cambia el contador de no-leídos para que
  // FloatingActionsTab (que muestra la campana como ícono compacto) pueda
  // mostrar el mismo badge sin duplicar la lógica de polling.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('benefix:notifications-count', { detail: { count: totalUnread } }))
  }, [totalUnread])

  // ─── MOVIMIENTOS: fetch + polling ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      try {
        const res = await fetch('/api/notifications', { cache: 'no-store' })
        const data = await res.json()
        if (cancelled) return
        if (data.ok) {
          setItems(data.items || [])
          setUnread(prev => {
            if ((data.unread_count || 0) > prev) setHasPulse(true)
            return data.unread_count || 0
          })
        }
      } catch {}
    }
    fetchAll()
    pollRef.current = setInterval(fetchAll, 30000)
    const onRefresh = () => fetchAll()
    window.addEventListener('benefix:notifications-refresh', onRefresh)
    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
      window.removeEventListener('benefix:notifications-refresh', onRefresh)
    }
  }, [])

  // Realtime: nos suscribimos a INSERTs nuevos en notifications filtrados
  // por nuestro user_id. Cuando llega uno, mostramos un toast in-app
  // (slide desde la derecha) que dura 5s y luego se va. Si el user lo
  // toca, abre el drawer. Esto es el equivalente de los push notifications
  // del navegador pero adentro de la propia app, asi funciona aunque el
  // browser tenga los pushes deshabilitados o el sitio no este como PWA.
  const [incomingToast, setIncomingToast] = useState(null)  // notif a mostrar
  const toastTimerRef = useRef(null)
  useEffect(() => {
    let channel = null
    let cancelled = false
    let dismissTimer
    ;(async () => {
      try {
        const supabase = getSupabase()
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled || !user) return
        channel = supabase
          .channel(`rt-notifs-${user.id}`)
          .on('postgres_changes', {
            event:  'INSERT',
            schema: 'public',
            table:  'notifications',
            filter: `user_id=eq.${user.id}`,
          }, (payload) => {
            const n = payload?.new
            if (!n) return
            // Refresh inmediato de la lista para que el badge se actualice
            // sin esperar al proximo poll.
            window.dispatchEvent(new CustomEvent('benefix:notifications-refresh'))
            setHasPulse(true)
            // Toast: pisamos el anterior si llega uno nuevo encima.
            setIncomingToast(n)
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
            toastTimerRef.current = setTimeout(() => {
              setIncomingToast(null)
              toastTimerRef.current = null
            }, 5000)
          })
          .subscribe()
      } catch (e) {
        console.warn('[NotificationsBell] realtime no disponible:', e?.message || e)
      }
    })()
    return () => {
      cancelled = true
      if (channel) {
        try { channel.unsubscribe() } catch {}
      }
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  // ─── SISTEMA: fetch inicial (suggestions) ───────────────────────────────
  useEffect(() => {
    if (initialSugLoad.current) return
    initialSugLoad.current = true
    loadSuggestions(false)
  }, [])

  async function loadSuggestions(force) {
    if (force) setRefreshingSugs(true)
    try {
      const url = force ? '/api/suggestions?refresh=1' : '/api/suggestions'
      const r = await fetch(url, { cache: 'no-store' })
      if (r.status === 401) return
      const data = await r.json().catch(() => ({}))
      if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions)
    } catch {} finally {
      setRefreshingSugs(false)
    }
  }

  // Pulso visual del badge cuando llega notif nueva
  useEffect(() => {
    if (!hasPulse) return
    const t = setTimeout(() => setHasPulse(false), 1500)
    return () => clearTimeout(t)
  }, [hasPulse])

  // Marcar todas como leídas SOLO al abrir la pestaña Movimientos. Las
  // sugerencias se marcan una por una al cliquearlas (decisión deliberada:
  // son tips procesables, queremos que el dueño las atienda no las descarte).
  useEffect(() => {
    if (!open || tab !== 'movimientos' || unread === 0) return
    let cancelled = false
    ;(async () => {
      try {
        await fetch('/api/notifications', { method: 'PATCH' })
        if (cancelled) return
        setUnread(0)
        setItems(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
      } catch {}
    })()
    return () => { cancelled = true }
  }, [open, tab])

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // ─── HANDLERS ───────────────────────────────────────────────────────────
  function handleNotifClick(n) {
    if (n.link) {
      if (n.link.startsWith('/')) window.location.href = n.link
      else window.open(n.link, '_blank', 'noopener,noreferrer')
    }
    setOpen(false)
  }

  async function markSuggestionRead(id) {
    setSuggestions(arr => arr.map(s => s.id === id ? { ...s, read_at: new Date().toISOString() } : s))
    fetch(`/api/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'read' }),
    }).catch(() => {})
  }

  async function dismissSuggestion(id) {
    setSuggestions(arr => arr.filter(s => s.id !== id))
    fetch(`/api/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss' }),
    }).catch(() => {})
  }

  function handleSuggestionCta(s, e) {
    e?.stopPropagation?.()
    if (!s.read_at) markSuggestionRead(s.id)
    if (!s.cta_url) return
    if (s.cta_url.startsWith('#')) {
      const tabId = s.cta_url.slice(1)
      const targetView = s.target === 'merchant' ? 'commerce-settings' : 'client'
      if (s.target === 'merchant') {
        try { localStorage.setItem('benefix:commerceTab', tabId) } catch {}
      }
      setOpen(false)
      window.dispatchEvent(new CustomEvent('benefix:navigate', {
        detail: { view: targetView, tab: tabId },
      }))
      return
    }
    if (s.cta_url.startsWith('http')) {
      window.open(s.cta_url, '_blank', 'noopener,noreferrer')
    }
  }

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
      {/* Toast in-app cuando llega una notif nueva via Realtime. Se
          muestra arriba a la derecha por 5s, click abre el drawer.
          Es independiente del estado del bell (siempre se renderea
          aunque hideButton=true) porque queremos que el dueño/cliente
          se entere apenas pasa algo, no necesita estar en una vista
          especifica. */}
      {incomingToast && (() => {
        const Icon  = TYPE_ICON[incomingToast.type] || Bell
        const color = TYPE_COLOR[incomingToast.type] || C.v
        return (
          <button
            onClick={() => {
              setIncomingToast(null)
              setOpen(true)
            }}
            style={{
              position: 'fixed',
              top: 'calc(20px + env(safe-area-inset-top, 0px))',
              right: 18,
              zIndex: 2000,
              maxWidth: 360,
              minWidth: 280,
              padding: '12px 14px 12px 12px',
              borderRadius: 14,
              background: 'rgba(20,12,32,0.96)',
              backdropFilter: 'blur(16px) saturate(160%)',
              WebkitBackdropFilter: 'blur(16px) saturate(160%)',
              border: `1px solid ${color}66`,
              boxShadow: '0 18px 48px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              fontFamily: FN, color: '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              animation: 'notif-toast-in 320ms cubic-bezier(0.22,1,0.36,1) both',
            }}
            aria-label="Abrir mensajes"
          >
            <span style={{
              flexShrink: 0,
              width: 32, height: 32, borderRadius: 9,
              background: `${color}22`,
              border: `1px solid ${color}55`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={16} color={color} strokeWidth={2.2} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, lineHeight: 1.3, marginBottom: 2 }}>
                {incomingToast.title}
              </span>
              {incomingToast.body && (
                <span style={{ display: 'block', fontSize: 11.5, fontWeight: 400, lineHeight: 1.45, color: 'rgba(255,255,255,0.70)' }}>
                  {incomingToast.body}
                </span>
              )}
            </span>
            <span
              role="button"
              aria-label="Cerrar"
              onClick={(e) => { e.stopPropagation(); setIncomingToast(null) }}
              style={{
                flexShrink: 0,
                width: 22, height: 22, borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.65)',
                marginTop: 2,
              }}
            >
              <X size={11} strokeWidth={2.4} />
            </span>
          </button>
        )
      })()}
      <style>{`
        @keyframes notif-toast-in {
          from { opacity: 0; transform: translateX(20px) translateY(-4px); }
          to   { opacity: 1; transform: translateX(0) translateY(0); }
        }
      `}</style>
      {/* Cuando hideButton=true, el boton flotante no se renderiza â
          NotificationsBell vive solo como "drawer + logica" y otro
          componente (FloatingActionsTab) provee el icono visible. */}
      {!hideButton && (
        <>
          {/* Cartelito "tenés mensajes nuevos" al lado del botón ──
              Aparece a la izquierda de la campanita cuando totalUnread>0
              y el drawer está cerrado. Visualmente es un pill que apunta
              al botón con una flechita ▶ a la derecha. Click sobre el
              cartelito abre el drawer (mismo handler que el botón).
              Animación de fade-in lateral cuando llega un mensaje
              nuevo (gatillada por hasPulse). */}
          {totalUnread > 0 && !open && showStartupBanner && (
            <button
              onClick={() => setOpen(true)}
              style={{
                position: 'fixed',
                right: 78,           // 18 (right del botón) + 52 (width) + 8 (gap)
                bottom: bottom + 12, // alineado verticalmente con el centro del botón (52/2 - h/2 ≈ 12)
                zIndex: 1500,
                background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.10))',
                border: '1px solid rgba(34,197,94,0.55)',
                borderRadius: 99,
                padding: '6px 12px 6px 10px',
                display: 'inline-flex', alignItems: 'center', gap: 7,
                fontFamily: FN, fontSize: 12, fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 6px 18px -6px rgba(34,197,94,0.55)',
                // Reuso `fadeIn` de globals.css — antes tenía un keyframe
                // propio inline (`<style>{...}</style>`) pero el parser de
                // Turbopack/SWC se trababa con el style block embebido en
                // el JSX. fadeIn es un opacity 0→1 simple y ya queda
                // limpio sin movimiento lateral.
                animation: 'fadeIn 280ms var(--ease-out) both',
                whiteSpace: 'nowrap',
              }}
              aria-label="Ver mensajes nuevos"
            >
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: '#22C55E',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Bell size={10} color="#fff" strokeWidth={3} />
              </span>
              <span>
                {totalUnread === 1
                  ? '1 mensaje nuevo'
                  : `${totalUnread > 99 ? '99+' : totalUnread} mensajes nuevos`}
              </span>
              <ChevronRight size={13} color="rgba(255,255,255,0.85)" strokeWidth={2.6} />
            </button>
          )}
          <button
            onClick={() => setOpen(v => !v)}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.94)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Notificaciones"
            style={buttonStyle}>
            <Bell size={22} color="#fff" strokeWidth={2.2} />
            {totalUnread > 0 && (
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
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </button>
        </>
      )}

      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 1499,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              animation: 'fadein 180ms ease',
            }} />
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
              padding: '18px 18px 0',
              borderBottom: `1px solid ${C.rim}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: FN, fontSize: 17, fontWeight: 800, color: C.white, letterSpacing: '-.01em' }}>Notificaciones</div>
                  <div style={{ fontSize: 11, color: C.dust, marginTop: 2 }}>
                    {totalUnread === 0 ? 'Todo al día' : `${totalUnread} sin leer`}
                  </div>
                </div>
                <button onClick={() => setOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.rim}`, borderRadius: 10, padding: 8, color: C.mist, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} strokeWidth={2.2} />
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { id: 'movimientos', label: 'Movimientos', count: unread },
                  { id: 'sistema',     label: 'Sistema',     count: suggestionsUnread },
                ].map(t => {
                  const active = tab === t.id
                  return (
                    <button key={t.id}
                      onClick={() => setTab(t.id)}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `2px solid ${active ? C.v : 'transparent'}`,
                        color: active ? C.white : C.mist,
                        fontFamily: FN, fontSize: 12.5,
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'border-color 160ms ease, color 160ms ease',
                      }}>
                      {t.label}
                      {t.count > 0 && (
                        <span style={{
                          minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99,
                          background: active ? C.v : 'rgba(255,255,255,0.10)',
                          color: '#fff', fontSize: 10, fontWeight: 800,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          lineHeight: 1,
                        }}>
                          {t.count > 99 ? '99+' : t.count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Contenido ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {tab === 'movimientos' && (
                <>
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
                        onClick={() => handleNotifClick(n)}
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
                            fontFamily: FN, fontSize: 13,
                            fontWeight: isUnread ? 700 : 600,
                            color: C.white, marginBottom: 3, lineHeight: 1.35,
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
                </>
              )}

              {tab === 'sistema' && (
                <div style={{ padding: '8px 14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 0' }}>
                    <div style={{ fontSize: 11, color: C.dust }}>
                      Tips automáticos para mejorar tu negocio
                    </div>
                    <button onClick={() => loadSuggestions(true)} disabled={refreshingSugs}
                      style={{ background: 'transparent', border: 'none', color: C.mist, cursor: refreshingSugs ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: 4 }}>
                      <RefreshCw size={11} strokeWidth={2.2} style={{ animation: refreshingSugs ? 'spin 0.9s linear infinite' : 'none' }} />
                      Actualizar
                    </button>
                  </div>
                  {suggestions.length === 0 && !refreshingSugs && (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: C.dust, fontSize: 13, lineHeight: 1.6 }}>
                      <Sparkles size={32} color={C.dust} strokeWidth={1.5} style={{ marginBottom: 12, opacity: 0.6 }} />
                      <div style={{ marginBottom: 4, color: C.mist }}>Por ahora no hay sugerencias</div>
                      <div style={{ fontSize: 11.5 }}>Te avisamos cuando detectemos algo para revisar.</div>
                    </div>
                  )}
                  {suggestions.map(s => {
                    const isUnread = !s.read_at
                    return (
                      <div key={s.id}
                        onClick={() => isUnread && markSuggestionRead(s.id)}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${C.rim}`,
                          borderRadius: 12,
                          padding: '12px 14px',
                          position: 'relative',
                          cursor: isUnread ? 'pointer' : 'default',
                        }}>
                        {isUnread && (
                          <span style={{
                            position: 'absolute', top: 14, left: 13,
                            width: 6, height: 6, borderRadius: '50%', background: C.v,
                          }} />
                        )}
                        <button onClick={e => { e.stopPropagation(); dismissSuggestion(s.id) }}
                          aria-label="Descartar"
                          style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', color: C.mist, cursor: 'pointer', width: 22, height: 22, padding: 0, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={11} strokeWidth={2.2} />
                        </button>
                        <div style={{ paddingLeft: isUnread ? 14 : 0, paddingRight: 22 }}>
                          <div style={{ fontFamily: FN, fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 4, lineHeight: 1.35 }}>{s.title}</div>
                          <div style={{ fontSize: 12, color: C.mist, lineHeight: 1.5 }}>{s.body}</div>
                          {s.cta_label && (
                            <button onClick={e => handleSuggestionCta(s, e)}
                              style={{ marginTop: 10, background: 'transparent', border: `1px solid ${C.rim}`, color: C.white, fontSize: 12, fontFamily: 'inherit', padding: '6px 11px', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {s.cta_label}
                              <ExternalLink size={11} strokeWidth={2.2} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer global: "Marcar todas" cuando aplica + boton de
                diagnostico de push siempre visible. */}
            <div style={{ padding: 14, borderTop: `1px solid ${C.rim}`, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tab === 'movimientos' && items.length > 0 && unread > 0 && (
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
                    alignSelf: 'center',
                  }}>
                  <Check size={13} strokeWidth={2.2} /> Marcar todas como leidas
                </button>
              )}
              {/* Boton de diagnostico para verificar que las notificaciones
                  del navegador estan funcionando en este dispositivo. */}
              <button
                onClick={async () => {
                  try {
                    const r = await fetch('/api/push/test', { method: 'POST' })
                    const d = await r.json()
                    if (d.ok) {
                      alert('Push enviado. Revisa las notificaciones del sistema.\n\n' +
                        'Si no aparece en pantalla:\n' +
                        '- Chequea que el sitio tenga permiso de notificaciones\n' +
                        '- En iOS: tenes que tener Benefix agregado a Pantalla de Inicio\n' +
                        '- En Windows: chequea Asistente de concentracion / Modo No molestar')
                    } else {
                      alert('No se pudo enviar push:\n\n' + (d.error || JSON.stringify(d, null, 2)))
                    }
                  } catch (e) {
                    alert('Error de red probando push: ' + (e?.message || e))
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: C.dust,
                  fontFamily: FN, fontSize: 11, fontWeight: 500,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}>
                Probar notificaciones push
              </button>
            </div>
          </aside>

          <style jsx>{`
            @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slidein-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </>
      )}
    </>
  )
}
