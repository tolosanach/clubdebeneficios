'use client'

// MoreSheet — bottom sheet con el menu del comerciante (todo lo que
// no entra en los 4 slots del bottom-nav v2). Cada item dispara un
// onNavigate y cierra el sheet.
//
// Props:
//   open:                  boolean
//   onClose:               () => void
//   onNavigate:            (view, tab) => void
//   onLogout:              () => void
//   profile:               object  (full_name/name, email, user_intent, ...)
//   onActivateClientMode:  () => void   // opcional — handler para
//     "Quiero usar también como cliente". Se renderiza solo si
//     profile.user_intent === 'merchant' (el merchant no tiene aun
//     activado el contexto cliente). El handler debe actualizar
//     user_intent → 'both', refrescar profile y cambiar contexto.

import { useEffect } from 'react'
import {
  Users, Settings, BarChart3, PieChart, Clock, Bot,
  Gift, Inbox, HelpCircle,
  User, LogOut, ChevronRight, X, ShoppingBag,
} from 'lucide-react'

const G  = 'linear-gradient(135deg, #FE5000, #BD4BF8)'
const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

function getInitial(name) {
  const t = (name || '').trim()
  if (!t) return '?'
  return t.charAt(0).toUpperCase()
}

export default function MoreSheet({ open, onClose, onNavigate, onLogout, profile, onActivateClientMode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const displayName = profile?.full_name || profile?.name || 'Tu cuenta'

  // Lista de items del menu. Cada item tiene { label, Icon, action }.
  // action = () => callbacks. El sheet se cierra automaticamente despues
  // de cada accion via wrapper.
  const navAndClose = (view, tab) => () => {
    onNavigate?.(view, tab)
    onClose?.()
  }
  const logoutAndClose = () => {
    onLogout?.()
    onClose?.()
  }

  // Mapeo a tabs REALES de CommerceSettingsView. "Reportes y segmentacion"
  // usa el tab existente 'analisis' (ahí viven los reportes hoy);
  // "Automatizaciones" usa el tab 'mensajes' (donde se gestionan las
  // automatizaciones de mensajeria). "Cuenta" navega a ClientView.cuenta
  // porque el merchant no tiene un tab de cuenta separado.
  const items = [
    { label: 'Premios',                 Icon: Gift,     action: navAndClose('commerce-settings', 'premios') },
    { label: 'Canjes pendientes',       Icon: Inbox,    action: navAndClose('commerce-settings', 'canjes') },
    { label: 'Clientes',                Icon: Users,    action: navAndClose('commerce-settings', 'clientes') },
    { label: 'Configuración',           Icon: Settings, action: navAndClose('commerce-settings', 'configuracion') },
    { label: 'Análisis',                Icon: BarChart3, action: navAndClose('commerce-settings', 'analisis') },
    { label: 'Reportes y segmentación', Icon: PieChart, action: navAndClose('commerce-settings', 'analisis') },
    { label: 'Historial',               Icon: Clock,    action: navAndClose('commerce-settings', 'historial') },
    { label: 'Automatizaciones',        Icon: Bot,      action: navAndClose('commerce-settings', 'mensajes'), badge: 'PRO' },
    { label: 'Soporte',                 Icon: HelpCircle, action: () => { try { window.dispatchEvent(new CustomEvent('benefix:open-support')) } catch {}; onClose?.() } },
  ]
  const accountItems = [
    { label: 'Cuenta',                  Icon: User,     action: navAndClose('client', 'cuenta') },
    { label: 'Cerrar sesión',           Icon: LogOut,   action: logoutAndClose, danger: true },
  ]

  return (
    <>
      <style>{`
        @keyframes ms-fadein { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ms-slideup {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
      <div
        onClick={onClose}
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2200,
          background: 'rgba(8,4,18,0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'ms-fadein 220ms ease both',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mas opciones"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          zIndex: 2300,
          background: 'rgba(15, 10, 25, 0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '12px 0 calc(28px + env(safe-area-inset-bottom, 0px))',
          maxHeight: '85vh',
          overflowY: 'auto',
          animation: 'ms-slideup 280ms cubic-bezier(0.32, 0.72, 0, 1) both',
          color: '#fff',
          fontFamily: FN,
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <span
            aria-hidden
            style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }}
          />
        </div>

        {/* Header con avatar + nombre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px 16px', marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: G,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {getInitial(displayName)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            {profile?.email && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: FI }}>
                {profile.email}
              </div>
            )}
          </div>
        </div>

        {/* Items principales */}
        <div role="menu">
          {items.map((it, i) => (
            <MenuRow key={it.label} item={it} isLast={i === items.length - 1} />
          ))}
        </div>

        {/* Cross-role: si el user es solo merchant (user_intent='merchant')
            y todavia no activo el modo cliente, ofrecemos un callout para
            activarlo. Espejo del item "¿Tenes un comercio?" que vive en
            ClientView para el camino inverso. */}
        {profile?.user_intent === 'merchant' && onActivateClientMode && (
          <div style={{ padding: '14px 20px 4px' }}>
            <button
              onClick={() => { onActivateClientMode?.(); onClose?.() }}
              role="menuitem"
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 14px',
                background: 'linear-gradient(135deg, rgba(236,72,153,0.14), rgba(219,39,119,0.10))',
                border: '1px solid rgba(236,72,153,0.36)',
                borderRadius: 14,
                color: '#fff',
                cursor: 'pointer',
                fontFamily: FI, fontSize: 13,
                textAlign: 'left',
                transition: 'transform 200ms ease, border-color 200ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.borderColor = 'rgba(236,72,153,0.65)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = 'rgba(236,72,153,0.36)'
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg, #DB2777, #F472B6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 6px 16px -4px rgba(236,72,153,0.55)',
   
              }}>
                <ShoppingBag size={17} strokeWidth={2.4} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: FN, fontSize: 13.5, fontWeight: 700,
                  color: '#fff', marginBottom: 2,
                }}>
                  ¿Querés también usar Benefix como cliente?
                </div>
                <div style={{
                  fontFamily: FI, fontSize: 11.5,
                  color: 'rgba(255,255,255,0.65)', lineHeight: 1.35,
                }}>
                  Sumate a otros clubes y aprovechá beneficios.
                </div>
              </div>
              <ChevronRight size={16} strokeWidth={2.4} color="rgba(255,255,255,0.55)" />
            </button>
          </div>
        )}

        {/* Divisor mas grueso */}
        <div style={{ height: 8, background: 'rgba(255,255,255,0.025)', margin: '6px 0' }} />

        {/* Items de cuenta */}
        <div role="menu">
          {accountItems.map((it, i) => (
            <MenuRow key={it.label} item={it} isLast={i === accountItems.length - 1} />
          ))}
        </div>

        {/* Cancelar */}
        <div style={{ padding: '14px 24px 0' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 99,
              color: 'rgba(255,255,255,0.65)',
              fontFamily: FN, fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <X size={14} strokeWidth={2.4} />
            Cerrar
          </button>
        </div>
      </div>
    </>
  )
}

function MenuRow({ item, isLast }) {
  const { label, Icon, action, badge, danger } = item
  return (
    <button
      onClick={action}
      role="menuitem"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 24px',
        background: 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
        color: danger ? '#F87444' : '#fff',
        fontFamily: 'inherit',
        fontSize: 14,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <Icon size={18} strokeWidth={2.2} color={danger ? '#F87444' : 'rgba(255,255,255,0.85)'} />
      <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em',
          padding: '2px 7px',
          borderRadius: 99,
          background: 'rgba(245,166,35,0.18)',
          border: '1px solid rgba(245,166,35,0.40)',
          color: '#F5A623',
        }}>
          {badge}
        </span>
      )}
      {!danger && <ChevronRight size={16} strokeWidth={2.2} color="rgba(255,255,255,0.40)" />}
    </button>
  )
}
