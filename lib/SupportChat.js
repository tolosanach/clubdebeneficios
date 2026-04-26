'use client'
import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Bot, AlertCircle, Phone } from 'lucide-react'

// SupportChat — drawer flotante de soporte con IA.
// Props:
//  - role: 'client' | 'merchant'  (default 'client')
//  - whatsappNumber: string E.164 sin '+' para escalación humana (ej '5492954XXXXXXX')
//
// Estado: botón redondo bottom-right que abre un panel.
// Hidrata el historial al abrir. Guarda conversation_id para reutilizar.
export default function SupportChat({ role = 'client', whatsappNumber = '5492954000000' }) {
  const [open, setOpen]         = useState(false)
  const [convId, setConvId]     = useState(null)
  const [messages, setMessages] = useState([])  // [{ role:'user'|'assistant', content }]
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [hasUser, setHasUser]   = useState(false)  // true si el endpoint no tira 401
  const [error, setError]       = useState('')
  const scrollRef = useRef(null)

  // Greeting — solo si la conversación está vacía. No persiste, es sólo UI.
  const greeting = role === 'merchant'
    ? '¡Hola! Soy el asistente de Benefix. Te ayudo con dudas sobre tu club: premios, promos, planes, escaneo de QR, configuración. ¿En qué te ayudo?'
    : '¡Hola! Soy el asistente de Benefix. Te ayudo con dudas sobre tu tarjeta, cómo usar el QR, canjear premios o sumarte a un club nuevo. ¿En qué te ayudo?'

  // Cargar historial al abrir por primera vez
  useEffect(() => {
    if (!open || messages.length > 0) return
    let cancelled = false
    fetch(`/api/support/history?role=${role}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return
        if (!data) { setHasUser(false); return }
        setHasUser(true)
        if (data.conversation_id) setConvId(data.conversation_id)
        if (Array.isArray(data.messages)) setMessages(data.messages)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open, role, messages.length])

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  async function handleSend(e) {
    e?.preventDefault?.()
    const text = input.trim()
    if (!text || sending) return
    setError('')
    setMessages(m => [...m, { role: 'user', content: text }])
    setInput('')
    setSending(true)
    try {
      const r = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversation_id: convId, message: text, role }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(data.error || 'Error inesperado.')
        if (r.status === 401) setHasUser(false)
        return
      }
      if (data.conversation_id) setConvId(data.conversation_id)
      setMessages(m => [...m, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError('Sin conexión. Probá de nuevo.')
    } finally {
      setSending(false)
    }
  }

  function escalateToHuman() {
    const text = encodeURIComponent(
      `Hola, necesito ayuda con Benefix.\n\nMi conversación con la IA no resolvió mi consulta.\n\n${role === 'merchant' ? '(Soy comerciante)' : '(Soy cliente)'}`
    )
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank')
  }

  // Estilos compartidos
  const C = {
    fg: '#fff',
    mist: 'rgba(255,255,255,0.70)',
    dust: 'rgba(255,255,255,0.45)',
    rim: 'rgba(255,255,255,0.10)',
    bg: 'rgba(15,12,28,0.96)',
    accent: '#7c3aed',
  }

  return (
    <>
      {/* Botón flotante — bottom alto para no chocar con bottom-nav mobile. */}
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Abrir chat de soporte"
          style={{
            position:'fixed', bottom:90, right:18, zIndex:9998,
            width:54, height:54, borderRadius:'50%',
            background:'linear-gradient(135deg, #FE5000, #BD4BF8)',
            border:'2px solid rgba(255,255,255,0.20)',
            color:'#fff', cursor:'pointer', padding:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 8px 24px -6px rgba(254,80,0,0.45)',
          }}>
          <MessageCircle size={22} strokeWidth={2.2} />
        </button>
      )}

      {/* Drawer abierto */}
      {open && (
        <div style={{
          position:'fixed', zIndex:9999,
          bottom:90, right:18,
          width:'min(380px, calc(100vw - 24px))',
          height:'min(560px, calc(100vh - 150px))',
          borderRadius:18, overflow:'hidden',
          background:C.bg, backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
          border:`1px solid ${C.rim}`,
          boxShadow:'0 24px 64px -12px rgba(0,0,0,0.50)',
          display:'flex', flexDirection:'column',
          animation:'modal-in .25s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {/* Header */}
          <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10, borderBottom:`1px solid ${C.rim}`, background:'linear-gradient(135deg, rgba(254,80,0,0.10), rgba(189,75,248,0.06))' }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg, #FE5000, #BD4BF8)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Bot size={16} color="#fff" strokeWidth={2.2} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'system-ui', fontSize:13, fontWeight:700, color:C.fg, lineHeight:1.1 }}>Asistente Benefix</div>
              <div style={{ fontSize:10.5, color:C.mist, marginTop:2 }}>Respuestas con IA · disponibles 24/7</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar"
              style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${C.rim}`, color:C.mist, width:28, height:28, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
              <X size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
            {/* Greeting (visible siempre) */}
            <div style={{ alignSelf:'flex-start', maxWidth:'85%', padding:'9px 12px', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.rim}`, borderRadius:'14px 14px 14px 4px', fontSize:13, color:C.fg, lineHeight:1.5 }}>
              {greeting}
            </div>

            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth:'85%',
                padding:'9px 12px',
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.45), rgba(189,75,248,0.30))'
                  : 'rgba(255,255,255,0.05)',
                border: m.role === 'user' ? '1px solid rgba(124,58,237,0.35)' : `1px solid ${C.rim}`,
                borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                fontSize:13, color:C.fg, lineHeight:1.5, whiteSpace:'pre-wrap',
              }}>
                {m.content}
              </div>
            ))}

            {sending && (
              <div style={{ alignSelf:'flex-start', display:'flex', gap:4, padding:'10px 14px', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.rim}`, borderRadius:'14px 14px 14px 4px' }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width:5, height:5, borderRadius:'50%', background:C.mist, animation:`typing 1.2s ${i*0.15}s infinite` }} />
                ))}
              </div>
            )}

            {error && (
              <div style={{ alignSelf:'stretch', padding:'9px 12px', background:'rgba(248,116,68,0.10)', border:'1px solid rgba(248,116,68,0.32)', borderRadius:10, fontSize:12, color:'#fca36b', display:'flex', alignItems:'flex-start', gap:8 }}>
                <AlertCircle size={13} strokeWidth={2} style={{ flexShrink:0, marginTop:1 }} />
                {error}
              </div>
            )}

            {!hasUser && open && (
              <div style={{ alignSelf:'stretch', padding:'10px 12px', background:'rgba(255,255,255,0.04)', border:`1px solid ${C.rim}`, borderRadius:10, fontSize:12, color:C.mist }}>
                Para usar el chat necesitás iniciar sesión.
              </div>
            )}
          </div>

          {/* Footer: input + escalación */}
          <div style={{ borderTop:`1px solid ${C.rim}`, padding:10, background:'rgba(0,0,0,0.20)' }}>
            <form onSubmit={handleSend} style={{ display:'flex', gap:6, marginBottom:8 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder={hasUser ? 'Escribí tu pregunta...' : 'Iniciá sesión para chatear'}
                disabled={!hasUser || sending}
                maxLength={800}
                style={{ flex:1, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.rim}`, borderRadius:10, padding:'9px 12px', fontSize:13, color:C.fg, fontFamily:'inherit', outline:'none' }} />
              <button type="submit" disabled={!input.trim() || !hasUser || sending}
                aria-label="Enviar"
                style={{ width:38, background: input.trim() && hasUser && !sending ? 'linear-gradient(135deg, #FE5000, #BD4BF8)' : 'rgba(255,255,255,0.06)', border:'none', borderRadius:10, color:'#fff', cursor: input.trim() && hasUser && !sending ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>
                <Send size={14} strokeWidth={2.2} />
              </button>
            </form>
            <button onClick={escalateToHuman}
              style={{ width:'100%', background:'transparent', border:`1px dashed ${C.rim}`, borderRadius:10, padding:'7px 10px', color:C.mist, fontSize:11, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Phone size={11} strokeWidth={2} /> ¿Necesitás un humano? Hablá por WhatsApp
            </button>
          </div>

          <style>{`
            @keyframes typing { 0%, 60%, 100% { opacity: 0.3 } 30% { opacity: 1 } }
            @keyframes modal-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
          `}</style>
        </div>
      )}
    </>
  )
}
