'use client'

// BottomNavV2 — bottom navigation contextual estilo Mercado Pago.
// 5 slots con un boton QR circular ELEVADO en el centro. Los 4 slots
// laterales cambian segun activeContext ('client' | 'merchant'); el
// boton QR central tambien cambia su icono y delega la accion al
// padre via onQRTap (cliente -> ClientQRSheet, merchant -> MerchantQRSheet).
//
// Props:
//   activeContext: 'client' | 'merchant'
//   currentView:   string (ej: 'client', 'commerce-settings')
//   currentTab:    string (tab activo dentro de la view)
//   onNavigate:    (view, tab?) => void
//   unreadCount:   number  (badge dot rojo en Notificaciones si > 0)
//   onQRTap:       () => void
//   onMoreTap:     () => void

import {
  Home, Clock, Bell, User,
  LayoutDashboard, Sparkles, Menu,
  QrCode, ScanLine,
} from 'lucide-react'

// Color del rol activo. Violeta de marca para merchant; fucsia para
// cliente. Se usa en el QR central, en la barrita superior del slot
// activo, en el icono del slot activo y en el label.
const ROLE_COLOR = {
  merchant: { solid: '#BD4BF8', gradient: 'linear-gradient(135deg, #7C3AED, #BD4BF8)', glow: 'rgba(189,75,248,0.45)' },
  client:   { solid: '#EC4899', gradient: 'linear-gradient(135deg, #DB2777, #F472B6)', glow: 'rgba(236,72,153,0.45)' },
}
const NAV_BG = 'rgba(10, 8, 18, 0.92)'
const INACTIVE = 'rgba(255,255,255,0.55)'

// Configuracion de los 4 slots laterales por contexto. El slot del
// medio (indice 2) es siempre el QR — lo dibujamos aparte como
// floating action.
const SLOTS_CLIENT = [
  { id: 'mis clubs',      label: 'Mis clubes',     Icon: Home,  view: 'client',            tab: 'mis clubs' },
  { id: 'historial',      label: 'Historial',      Icon: Clock, view: 'client',            tab: 'historial' },
  { id: 'notificaciones', label: 'Notificaciones', Icon: Bell,  view: 'client',            tab: 'notificaciones', isNotifs: true },
  { id: 'cuenta',         label: 'Cuenta',         Icon: User,  view: 'client',            tab: 'cuenta' },
]

const SLOTS_MERCHANT = [
  // Mantenemos el id interno 'dashboard' (hay 30+ refs en page.js que lo usan).
  // Solo cambia el LABEL visible a "Inicio".
  { id: 'dashboard',      label: 'Inicio',         Icon: LayoutDashboard, view: 'commerce-settings', tab: 'dashboard' },
  { id: 'beneficios',     label: 'Beneficios',     Icon: Sparkles,        view: 'commerce-settings', tab: 'recompensas' },
  { id: 'notificaciones', label: 'Notificaciones', Icon: Bell,            view: 'commerce-settings', tab: 'notificaciones', isNotifs: true },
  { id: 'mas',            label: 'Mas',            Icon: Menu,            view: null,                tab: null,             isMore: true },
]

export default function BottomNavV2({
  activeContext = 'client',
  currentView,
  currentTab,
  onNavigate,
  unreadCount = 0,
  onQRTap,
  onMoreTap,
}) {
  const slots = activeContext === 'merchant' ? SLOTS_MERCHANT : SLOTS_CLIENT
  const isClient = activeContext !== 'merchant'
  const roleColor = ROLE_COLOR[isClient ? 'client' : 'merchant']
  const ACTIVE = roleColor.solid

  // Detecta si un slot esta activo. Para los 4 laterales matcheamos por
  // tab + view. El "Mas" del merchant nunca queda activo (es un sheet,
  // no una vista).
  const isActive = (slot) => {
    if (slot.isMore) return false
    if (slot.view && slot.view !== currentView) return false
    // Beneficios matchea con el tab 'beneficios' real, pero por ahora
    // tambien matcheamos con 'premios' y 'promociones' para que el
    // slot quede iluminado mientras se hace la migracion.
    if (slot.id === 'beneficios') {
      // Beneficios apunta a 'recompensas' (sub-tabs Sistema para sumar /
      // Descuento prox compra). Suma doble vive adentro de Sistema para
      // sumar como toggle, no como tab independiente.
      return currentTab === 'recompensas'
    }
    return slot.tab === currentTab
  }

  const handleSlotTap = (slot) => {
    if (slot.isMore) {
      onMoreTap?.()
      return
    }
    if (slot.isNotifs) {
      // Slot notificaciones: dispara el evento de apertura del drawer
      // flotante existente (NotificationsBell) y no cambia el tab.
      // Asi el nav queda como acceso rapido al drawer y el contenido
      // visible debajo no se pierde.
      try { window.dispatchEvent(new CustomEvent('benefix:open-notifications')) } catch {}
      return
    }
    if (onNavigate) onNavigate(slot.view, slot.tab)
  }

  return (
    <>
      <style>{`
        @keyframes bnav-qr-pulse {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50%      { transform: translate(-50%, 0) scale(1.04); }
        }
        @keyframes bnav-tab-press {
          from { transform: scale(0.92); }
          to   { transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bnav-qr-btn { animation: none !important; }
        }
      `}</style>
      <nav
        role="navigation"
        aria-label="Navegacion principal"
        style={{
          position: 'fixed',
          left: 0, right: 0, bottom: 0,
          height: 68,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: NAV_BG,
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-around',
          zIndex: 1000,
        }}
      >
        {slots.map((slot, idx) => {
          // Inserto un placeholder "vacio" entre indice 1 y 2 para reservar
          // el espacio del QR central. Renderizo asi: [s0, s1, GAP, s2, s3].
          const renderSlot = (
            <button
              key={slot.id}
              onClick={() => handleSlotTap(slot)}
              aria-label={slot.label}
              aria-pressed={isActive(slot)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                padding: 0,
                color: isActive(slot) ? ACTIVE : INACTIVE,
                fontFamily: 'inherit',
                animation: 'bnav-tab-press 120ms ease',
              }}
              onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.92)' }}
              onTouchEnd={(e)   => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {isActive(slot) && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 24,
                    height: 3,
                    background: roleColor.gradient,
                    borderRadius: '0 0 4px 4px',
                  }}
                />
              )}
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <slot.Icon
                  size={22}
                  strokeWidth={isActive(slot) ? 2.4 : 2}
                  color={isActive(slot) ? ACTIVE : INACTIVE}
                  style={isActive(slot) ? { filter: `drop-shadow(0 0 6px ${roleColor.glow})` } : undefined}
                />
                {slot.isNotifs && unreadCount > 0 && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -4,
                      width: 8, height: 8,
                      borderRadius: '50%',
                      background: '#E24B4A',
                      border: '1.5px solid #0a0512',
                    }}
                  />
                )}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.02em',
                marginTop: 0,
                color: isActive(slot) ? ACTIVE : INACTIVE,
                whiteSpace: 'nowrap',
              }}>
                {slot.label}
              </span>
            </button>
          )

          if (idx === 2) {
            // Antes del 3er slot (notificaciones), reservo el espacio del QR.
            return (
              <span key="qr-gap-and-slot" style={{ display: 'contents' }}>
                <span aria-hidden style={{ flex: 1, minWidth: 0 }} />
                {renderSlot}
              </span>
            )
          }
          return renderSlot
        })}

        {/* Boton QR central: position absolute para sobresalir por encima
            del nav y mantenerse alineado con el gap reservado (50% del nav). */}
        <button
          className="bnav-qr-btn"
          onClick={() => onQRTap?.()}
          aria-label={isClient ? 'Mostrar mi QR' : 'Escanear o mostrar QR del negocio'}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: `calc(24px + env(safe-area-inset-bottom, 0px))`,
            transform: 'translateX(-50%)',
            width: 64, height: 64,
            borderRadius: '50%',
            background: roleColor.gradient,
            border: '4px solid #0a0512',
            boxShadow: `0 8px 24px ${roleColor.glow}, 0 4px 12px rgba(0,0,0,0.4)`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            animation: 'bnav-qr-pulse 2.4s ease-in-out infinite',
          }}
        >
          {isClient
            ? <QrCode size={28} color="#fff" strokeWidth={2} />
            : <ScanLine size={28} color="#fff" strokeWidth={2} />}
        </button>
        {/* Label "QR" centrado adentro del nav, en el gap reservado. */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            bottom: `calc(8px + env(safe-area-inset-bottom, 0px))`,
            transform: 'translateX(-50%)',
            fontSize: 10,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.04em',
            pointerEvents: 'none',
          }}
        >
          QR
        </span>
      </nav>
    </>
  )
}
