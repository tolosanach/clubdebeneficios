'use client'

// CrossRoleNudges — modales temporizados que aparecen para sugerir el rol
// que no está usando el usuario:
//   • BizSignupNudge (10s, solo clientes sin respuesta) — sugiere registrar
//     un negocio. Tiene 2 pantallas: la principal (Sí / No / "más tarde") y
//     una secundaria informativa cuando el user dice que registra después.
//   • ClientActivationNudge (15s, solo dueños) — recuerda que con su QR
//     personal pueden acumular beneficios en otros comercios.
//
// Cada modal se muestra max 1 vez por dispositivo (flag en localStorage).
// El BizSignupNudge respeta el flag global `benefix:bizAnswer`: si el user
// ya dijo Sí o No desde el banner persistente, el modal NO aparece. Esto
// evita doble-nag al user.

import { useEffect, useRef, useState } from 'react'
import { Store, X, Info, QrCode, ArrowRight } from 'lucide-react'

// G — antes era gradient orange→fucsia. Rebrand mayo 2026 fase 2:
// violeta brand sólido. Mantengo el nombre G por compat de call sites.
const G  = '#7131E1'
const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

const C = {
  white: '#FFFFFF', pearl: '#F0EAFF', mist: '#9B85CC', dust: '#8370AD',
  v: '#7131E1', rim: 'rgba(255,255,255,0.10)',
}

const BIZ_ANSWER_KEY    = 'benefix:bizAnswer'
const BIZ_NUDGE_KEY     = 'benefix:bizNudgeSeen'
const CLIENT_NUDGE_KEY  = 'benefix:clientNudgeSeen'

const BIZ_DELAY_MS    = 10_000
const CLIENT_DELAY_MS = 15_000

// ─── Shell común para los modales ───────────────────────────────────────────
function ModalShell({ onClose, children, maxWidth = 400 }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9993,
      background: 'rgba(8,4,18,0.74)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} className="modal-in" style={{
        width: '100%', maxWidth,
        background: 'linear-gradient(180deg, rgba(28,18,42,0.97), rgba(18,10,28,0.97))',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 22,
        padding: '24px 22px 22px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        position: 'relative',
      }}>
        <button onClick={onClose} aria-label="Cerrar"
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: C.mist, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}>
          <X size={14} strokeWidth={2} />
        </button>
        {children}
      </div>
    </div>
  )
}

// ─── Estilos compartidos de botones ─────────────────────────────────────────
const btnPrimary = {
  width: '100%', padding: '14px', borderRadius: 14,
  background: G, border: 'none', color: '#fff',
  fontFamily: FN, fontSize: 14, fontWeight: 800,
  cursor: 'pointer',
  marginBottom: 8,
  boxShadow: '0 8px 24px rgba(113,49,225,0.40)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}
const btnGhost = {
  width: '100%', padding: '13px', borderRadius: 14,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: C.pearl, fontFamily: FN, fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
}
const btnLink = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  width: '100%', marginTop: 14,
  background: 'transparent', border: 'none',
  color: C.dust, fontFamily: FI, fontSize: 12, fontWeight: 500,
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  padding: 0,
}

// ─── Nudge cliente (10s): "¿Tenés un negocio?" ──────────────────────────────
function BizSignupNudge({ profile }) {
  const [visible, setVisible] = useState(false)
  const [screen,  setScreen]  = useState('initial') // 'initial' | 'later-info'
  const armedRef = useRef(false)

  useEffect(() => {
    if (armedRef.current) return
    if (!profile || profile.role !== 'client') return
    try {
      const answered = localStorage.getItem(BIZ_ANSWER_KEY)
      const seen     = localStorage.getItem(BIZ_NUDGE_KEY)
      if (answered === 'yes' || answered === 'no') return
      if (seen === '1') return
    } catch {}
    armedRef.current = true
    const t = setTimeout(() => {
      // Re-check al momento de disparar: si en estos 10s el user
      // ya respondió desde el banner global, no abrimos el modal.
      try {
        const answered = localStorage.getItem(BIZ_ANSWER_KEY)
        if (answered === 'yes' || answered === 'no') return
      } catch {}
      setVisible(true)
    }, BIZ_DELAY_MS)
    return () => clearTimeout(t)
  }, [profile?.role])

  function markSeen() {
    try { localStorage.setItem(BIZ_NUDGE_KEY, '1') } catch {}
  }
  function close() { markSeen(); setVisible(false) }
  function yes() {
    markSeen()
    try { localStorage.setItem(BIZ_ANSWER_KEY, 'yes') } catch {}
    setVisible(false)
    window.dispatchEvent(new CustomEvent('benefix:biz-answered'))
    try { sessionStorage.setItem('benefix:signupAs', 'merchant') } catch {}
    window.dispatchEvent(new CustomEvent('benefix:open-signup', { detail: { mode: 'merchant' } }))
  }
  function no() {
    markSeen()
    try { localStorage.setItem(BIZ_ANSWER_KEY, 'no') } catch {}
    setVisible(false)
    window.dispatchEvent(new CustomEvent('benefix:biz-answered'))
  }

  if (!visible) return null

  if (screen === 'initial') {
    return (
      <ModalShell onClose={close}>
        <div style={{ textAlign: 'center', marginBottom: 18, marginTop: 4 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 19, background: G,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 10px 32px rgba(113,49,225,0.42)',
          }}>
            <Store size={28} color="#fff" strokeWidth={1.9} />
          </div>
          <div style={{ fontFamily: FN, fontSize: 20, fontWeight: 900, color: C.white, marginBottom: 7, letterSpacing: '-.01em' }}>
            ¿Tenés un negocio?
          </div>
          <div style={{ fontSize: 12.5, color: C.mist, lineHeight: 1.55, maxWidth: 320, margin: '0 auto' }}>
            Creá tu club de beneficios y fidelizá clientes con puntos o estrellas. Te toma menos de un minuto.
          </div>
        </div>

        <button onClick={yes} style={btnPrimary} aria-label="Sí, crear mi club">
          Sí, crear mi club
          <ArrowRight size={14} strokeWidth={2.4} />
        </button>
        <button onClick={no} style={btnGhost} aria-label="No, soy solo cliente">
          No, soy solo cliente
        </button>

        <button onClick={() => setScreen('later-info')} style={btnLink}>
          Tengo negocio, lo registro más tarde
        </button>
      </ModalShell>
    )
  }

  // screen === 'later-info'
  return (
    <ModalShell onClose={close}>
      <div style={{ textAlign: 'center', marginBottom: 18, marginTop: 4 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 19,
          background: 'rgba(113,49,225,0.18)',
          border: '1px solid rgba(113,49,225,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Info size={26} color="#7131E1" strokeWidth={2} />
        </div>
        <div style={{ fontFamily: FN, fontSize: 19, fontWeight: 900, color: C.white, marginBottom: 8, letterSpacing: '-.01em' }}>
          Lo registrás cuando quieras
        </div>
        <div style={{ fontSize: 12.5, color: C.mist, lineHeight: 1.6, maxWidth: 330, margin: '0 auto' }}>
          Podés crear tu club desde tu <strong style={{ color: C.pearl, fontWeight: 700 }}>perfil</strong> o tocando <strong style={{ color: C.pearl, fontWeight: 700 }}>"Soy un negocio"</strong> en el inicio. Cuando estés listo, te toma menos de un minuto.
        </div>
      </div>

      <button onClick={yes} style={btnPrimary} aria-label="Registrar mi club ahora">
        Registrar mi club ahora
        <ArrowRight size={14} strokeWidth={2.4} />
      </button>
      <button onClick={close} style={btnGhost} aria-label="Listo, gracias">
        Listo, gracias
      </button>
    </ModalShell>
  )
}

// ─── Nudge dueño (15s): "Tu QR personal te espera" ─────────────────────────
function ClientActivationNudge({ profile, setView }) {
  const [visible, setVisible] = useState(false)
  const armedRef = useRef(false)

  useEffect(() => {
    if (armedRef.current) return
    if (!profile || profile.role !== 'commerce_owner') return
    try {
      const seen = localStorage.getItem(CLIENT_NUDGE_KEY)
      if (seen === '1') return
    } catch {}
    armedRef.current = true
    const t = setTimeout(() => setVisible(true), CLIENT_DELAY_MS)
    return () => clearTimeout(t)
  }, [profile?.role])

  function markSeen() {
    try { localStorage.setItem(CLIENT_NUDGE_KEY, '1') } catch {}
  }
  function close() { markSeen(); setVisible(false) }
  function start() {
    markSeen()
    setVisible(false)
    // Flag para que ClientView muestre un coachmark sobre "Clubes cercanos"
    // cuando aterrice. Se limpia al primer render del coachmark.
    try { sessionStorage.setItem('benefix:cb-clubes-coachmark', '1') } catch {}
    if (setView) setView('client')
  }

  if (!visible) return null

  return (
    <ModalShell onClose={close}>
      <div style={{ textAlign: 'center', marginBottom: 18, marginTop: 4 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 19, background: G,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 10px 32px rgba(113,49,225,0.42)',
        }}>
          <QrCode size={28} color="#fff" strokeWidth={1.9} />
        </div>
        <div style={{ fontFamily: FN, fontSize: 20, fontWeight: 900, color: C.white, marginBottom: 7, letterSpacing: '-.01em' }}>
          Tu QR personal te espera
        </div>
        <div style={{ fontSize: 12.5, color: C.mist, lineHeight: 1.55, maxWidth: 330, margin: '0 auto' }}>
          Como dueño de un negocio también podés sumar puntos y descuentos en otros comercios. Tu QR de cliente ya está listo, descubrí cómo usarlo.
        </div>
      </div>

      <button onClick={start} style={btnPrimary} aria-label="Comenzar a usar mi QR de cliente">
        Comenzar
        <ArrowRight size={14} strokeWidth={2.4} />
      </button>
      <button onClick={close} style={btnGhost} aria-label="Más tarde">
        Más tarde
      </button>
    </ModalShell>
  )
}

// ─── Wrapper que monta ambos nudges ─────────────────────────────────────────
export default function CrossRoleNudges({ profile, setView }) {
  return (
    <>
      <BizSignupNudge profile={profile} />
      <ClientActivationNudge profile={profile} setView={setView} />
    </>
  )
}
