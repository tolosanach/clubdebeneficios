'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, X, ExternalLink, RefreshCw, Minus } from 'lucide-react'

// SuggestionsInbox — buzón flotante de sugerencias generadas por reglas + IA.
//
// UI: botón redondo (campanita) bottom-right con badge numérico + dot pulsante
// si hay no leídas. Click abre un drawer parecido al SupportChat. Cada sugerencia
// es una card con dot de "no leída", título, body, CTA opcional, y X para descartar.
//
// Persistencia: GET /api/suggestions al montar, PATCH para read/dismiss.
// El refresh real (correr reglas + IA redactora) lo dispara solo el endpoint
// cuando pasaron ≥24h desde el último run.
export default function SuggestionsInbox({ bottom = 158 } = {}) {
  const [open, setOpen]                 = useState(false)
  const [suggestions, setSuggestions]   = useState([])
  const [loading, setLoading]           = useState(false)
  const [refreshing, setRefreshing]     = useState(false)
  const [hasUser, setHasUser]           = useState(true)
  const initialLoadDone = useRef(false)

  const unreadCount = suggestions.filter(s => !s.read_at).length

  // Carga inicial — una vez al montar
  useEffect(() => {
    if (initialLoadDone.current) return
    initialLoadDone.current = true
    loadList(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cuando alguien abre el chat de soporte, cerramos el inbox para no superponer drawers
  useEffect(() => {
    function onChatOpen() { setOpen(false) }
    window.addEventListener('clufix:support-chat-open', onChatOpen)
    return () => window.removeEventListener('clufix:support-chat-open', onChatOpen)
  }, [])

  // Cuando se abre el inbox, avisamos al chat para que se cierre
  useEffect(() => {
    if (open) window.dispatchEvent(new CustomEvent('clufix:inbox-open'))
  }, [open])

  async function loadList(force) {
    if (force) setRefreshing(true)
    else setLoading(true)
    try {
      const url = force ? '/api/suggestions?refresh=1' : '/api/suggestions'
      const r = await fetch(url)
      if (r.status === 401) { setHasUser(false); return }
      const data = await r.json().catch(() => ({}))
      if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions)
    } catch {
      // silencioso — no rompemos la UI por un error de red en el buzón
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function markRead(id) {
    setSuggestions(arr => arr.map(s => s.id === id ? { ...s, read_at: new Date().toISOString() } : s))
    fetch(`/api/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'read' }),
    }).catch(() => {})
  }

  async function dismiss(id) {
    setSuggestions(arr => arr.filter(s => s.id !== id))
    fetch(`/api/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss' }),
    }).catch(() => {})
  }

  function handleCta(s, e) {
    e?.stopPropagation?.()
    if (!s.read_at) markRead(s.id)
    if (!s.cta_url) return

    // Anchor interno → evento global que escucha app/page.js para navegar
    if (s.cta_url.startsWith('#')) {
      const tab = s.cta_url.slice(1)
      const targetView = s.target === 'merchant' ? 'commerce-settings' : 'client'
      // Persistimos el tab para que sobreviva una navegación + remount
      if (s.target === 'merchant') {
        try { localStorage.setItem('clufix:commerceTab', tab) } catch {}
      }
      setOpen(false)  // Cerramos el drawer antes de navegar
      window.dispatchEvent(new CustomEvent('clufix:navigate', {
        detail: { view: targetView, tab },
      }))
      return
    }

    if (s.cta_url.startsWith('http')) {
      window.open(s.cta_url, '_blank', 'noopener,noreferrer')
    }
  }

  // Sin sesión no mostramos nada
  if (!hasUser) return null

  const C = {
    fg: '#fff',
    mist: 'rgba(255,255,255,0.70)',
    rim: 'rgba(255,255,255,0.10)',
    bg: 'rgba(15,12,28,0.96)',
    accent: '#7c3aed',
    danger: '#FE5000',
  }

  return (
    <>
      {/* Botón flotante — encima del botón del chat (chat: bottom 90, este: bottom 158) */}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Abrir buzón de sugerencias"
          style={{
            position:'fixed', bottom, right:22, zIndex:9997,
            width:46, height:46, borderRadius:'50%',
            background:'rgba(15,12,28,0.96)',
            border:'1px solid rgba(255,255,255,0.15)',
            color:'#fff', cursor:'pointer', padding:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 8px 24px -6px rgba(0,0,0,0.45)',
          }}>
          <Bell size={18} strokeWidth={2.2} />
          {unreadCount > 0 && (
            <>
              <span style={{
                position:'absolute', top:-3, right:-3,
                minWidth:18, height:18, padding:'0 5px', borderRadius:9,
                background:C.danger, color:'#fff', fontSize:10, fontWeight:600,
                display:'flex', alignItems:'center', justifyContent:'center',
                border:'2px solid #0F0C1C',
                lineHeight:1,
              }}>{unreadCount}</span>
              <span style={{
                position:'absolute', top:-3, right:-3,
                minWidth:18, height:18, borderRadius:9,
                background:C.danger, opacity:0.6,
                animation:'inbox-ping 1.6s cubic-bezier(0,0,0.2,1) infinite',
                pointerEvents:'none',
              }}/>
            </>
          )}
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div style={{
          position:'fixed', zIndex:9999,
          bottom:90, right:18,
          width:'min(380px, calc(100vw - 24px))',
          // 100dvh respeta la barra dinámica del browser mobile (en iOS Safari sube/baja).
          // El offset de 220 deja siempre margen arriba para que el header del drawer
          // (con botón "-" de minimizar) nunca quede tapado por la URL bar.
          height:'min(560px, calc(100dvh - 220px))',
          borderRadius:18, overflow:'hidden',
          background:C.bg, backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
          border:`1px solid ${C.rim}`,
          boxShadow:'0 24px 64px -12px rgba(0,0,0,0.50)',
          display:'flex', flexDirection:'column',
          animation:'inbox-modal-in .25s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Header */}
          <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${C.rim}` }}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:C.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Bell size={13} color="#fff" strokeWidth={2.2} />
            </div>
            <div style={{ flex:1, minWidth:0, fontFamily:'system-ui', fontSize:13.5, fontWeight:500, color:C.fg, lineHeight:1.1 }}>
              Sugerencias para vos
            </div>
            <button onClick={() => loadList(true)} aria-label="Actualizar" disabled={refreshing}
              style={{ background:'transparent', border:'none', color:C.mist, width:26, height:26, borderRadius:6, cursor: refreshing ? 'wait' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, opacity: refreshing ? 0.5 : 1 }}>
              <RefreshCw size={13} strokeWidth={2.2} style={{ animation: refreshing ? 'inbox-spin 0.9s linear infinite' : 'none' }} />
            </button>
            <button onClick={() => setOpen(false)} aria-label="Minimizar"
              style={{ background:'transparent', border:'none', color:C.mist, width:26, height:26, borderRadius:6, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
              <Minus size={15} strokeWidth={2.4} />
            </button>
          </div>

          {/* Lista */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
            {loading && suggestions.length === 0 && (
              <div style={{ alignSelf:'center', color:C.mist, fontSize:12, padding:20 }}>Cargando…</div>
            )}
            {!loading && suggestions.length === 0 && (
              <div style={{ alignSelf:'center', color:C.mist, fontSize:13, padding:'40px 20px', textAlign:'center', lineHeight:1.6, maxWidth:280 }}>
                Por ahora no hay sugerencias.<br/>Te avisamos cuando detectemos algo que valga la pena revisar.
              </div>
            )}
            {suggestions.map(s => {
              const unread = !s.read_at
              return (
                <div key={s.id}
                  onClick={() => unread && markRead(s.id)}
                  style={{
                    background:'rgba(255,255,255,0.06)',
                    borderRadius:12,
                    padding:'12px 14px',
                    position:'relative',
                    cursor: unread ? 'pointer' : 'default',
                  }}>
                  {unread && (
                    <span style={{
                      position:'absolute', top:14, left:13,
                      width:6, height:6, borderRadius:'50%', background:C.accent,
                    }}/>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); dismiss(s.id) }}
                    aria-label="Descartar"
                    style={{ position:'absolute', top:8, right:8, background:'transparent', border:'none', color:C.mist, cursor:'pointer', width:22, height:22, padding:0, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <X size={11} strokeWidth={2.2} />
                  </button>
                  <div style={{ paddingLeft: unread ? 14 : 0, paddingRight:22 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:C.fg, lineHeight:1.35, marginBottom:4 }}>{s.title}</div>
                    <div style={{ fontSize:12.5, color:C.mist, lineHeight:1.5 }}>{s.body}</div>
                    {s.cta_label && (
                      <button onClick={(e) => handleCta(s, e)}
                        style={{ marginTop:10, background:'transparent', border:`1px solid ${C.rim}`, color:C.fg, fontSize:12, fontFamily:'inherit', padding:'6px 11px', borderRadius:8, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
                        {s.cta_label}
                        <ExternalLink size={11} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <style>{`
            @keyframes inbox-modal-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
            @keyframes inbox-ping { 75%, 100% { transform: scale(1.9); opacity: 0 } }
            @keyframes inbox-spin { to { transform: rotate(360deg) } }
          `}</style>
        </div>
      )}
    </>
  )
}
