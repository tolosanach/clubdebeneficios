'use client'

// BottomNavV2 — navegacion contextual estilo Mercado Pago.
// Responsive:
//   * Mobile (< 768px): bottom nav horizontal de 5 slots con boton QR
//     circular ELEVADO en el centro.
//   * Desktop (>= 768px): side-rail vertical anclado al borde izquierdo
//     con los mismos slots stackeados + boton QR como pill prominente
//     y boton "Mas" en el pie (solo merchant).
// La eleccion mobile/desktop se hace via @media en un <style> block:
// renderizamos AMBOS layouts y CSS oculta el que no aplica. Asi
// evitamos flicker de hidratacion y no dependemos de JS para el switch.
//
// Los 4 slots laterales cambian segun activeContext ('client' | 'merchant');
// el boton QR central tambien cambia su icono y delega la accion al padre
// via onQRTap (cliente -> ClientQRSheet, merchant -> MerchantQRSheet).
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
  Gift, Users, Settings, BarChart3, Bot, HelpCircle, LogOut,
} from 'lucide-react'

// Rebrand mayo 2026 fase 2: sin gradients. La key `gradient` queda
// con valor sólido (igual al `solid`) para no romper los call sites
// que la consumen. En la próxima limpieza se puede renombrar a
// `accent`. Merchant pasa a violeta brand (#7131E1); client mantiene
// fucsia (#EC4899) que ya estaba alineado.
const ROLE_COLOR = {
  merchant: { solid: '#7131E1', gradient: '#7131E1', glow: 'rgba(113,49,225,0.45)' },
  client:   { solid: '#EC4899', gradient: '#EC4899', glow: 'rgba(236,72,153,0.45)' },
}
const NAV_BG = 'rgba(10, 8, 18, 0.92)'
const INACTIVE = 'rgba(255,255,255,0.55)'
const FN = "'Space Grotesk', system-ui, sans-serif"

const SLOTS_CLIENT = [
  { id: 'mis clubs',      label: 'Mis clubes',     Icon: Home,  view: 'client',            tab: 'mis clubs' },
  { id: 'historial',      label: 'Historial',      Icon: Clock, view: 'client',            tab: 'historial' },
  { id: 'notificaciones', label: 'Notificaciones', Icon: Bell,  view: 'client',            tab: 'notificaciones', isNotifs: true },
  { id: 'cuenta',         label: 'Cuenta',         Icon: User,  view: 'client',            tab: 'cuenta' },
]

const SLOTS_MERCHANT = [
  { id: 'dashboard',      label: 'Inicio',         Icon: LayoutDashboard, view: 'commerce-settings', tab: 'dashboard' },
  { id: 'beneficios',     label: 'Beneficios',     Icon: Sparkles,        view: 'commerce-settings', tab: 'recompensas' },
  { id: 'notificaciones', label: 'Notificaciones', Icon: Bell,            view: 'commerce-settings', tab: 'notificaciones', isNotifs: true },
  { id: 'mas',            label: 'Mas',            Icon: Menu,            view: null,                tab: null,             isMore: true },
]

// Items que en mobile viven dentro del MoreSheet, pero en desktop se
// muestran directo en el side-rail debajo de los slots principales.
// El user pidió "que las otras funciones que están en Más aparezcan
// directamente en la lista del menú". Si quisiéramos paridad mobile,
// habría que reemplazar el MoreSheet — por ahora solo desktop.
const SLOTS_MERCHANT_EXTRA = [
  { id: 'premios',         label: 'Premios',          Icon: Gift,       view: 'commerce-settings', tab: 'premios' },
  { id: 'clientes',        label: 'Clientes',         Icon: Users,      view: 'commerce-settings', tab: 'clientes' },
  { id: 'analisis',        label: 'Análisis',         Icon: BarChart3,  view: 'commerce-settings', tab: 'analisis' },
  { id: 'historial',       label: 'Historial',        Icon: Clock,      view: 'commerce-settings', tab: 'historial' },
  { id: 'automatizaciones',label: 'Automatizaciones', Icon: Bot,        view: 'commerce-settings', tab: 'mensajes', badge: 'PRO' },
  { id: 'configuracion',   label: 'Configuración',    Icon: Settings,   view: 'commerce-settings', tab: 'configuracion' },
  { id: 'soporte',         label: 'Soporte',          Icon: HelpCircle, isSupport: true },
]

export default function BottomNavV2({
  activeContext = 'client',
  currentView,
  currentTab,
  onNavigate,
  unreadCount = 0,
  onQRTap,
  onMoreTap,
  onLogout,
}) {
  const slots = activeContext === 'merchant' ? SLOTS_MERCHANT : SLOTS_CLIENT
  const isClient = activeContext !== 'merchant'
  const roleColor = ROLE_COLOR[isClient ? 'client' : 'merchant']
  const ACTIVE = roleColor.solid

  const isActive = (slot) => {
    if (slot.isMore) return false
    // Notificaciones: ahora es una view propia ('notifications'), asi
    // que el slot queda activo cuando estamos parados ahi (sin importar
    // role/contexto).
    if (slot.isNotifs) return currentView === 'notifications'
    if (slot.view && slot.view !== currentView) return false
    if (slot.id === 'beneficios') return currentTab === 'recompensas'
    return slot.tab === currentTab
  }

  const handleSlotTap = (slot) => {
    if (slot.isMore) { onMoreTap?.(); return }
    if (slot.isSupport) {
      try { window.dispatchEvent(new CustomEvent('benefix:open-support')) } catch {}
      return
    }
    if (slot.isLogout) { onLogout?.(); return }
    if (slot.isNotifs) {
      // Notificaciones ahora es una vista del sistema, no un drawer.
      // Tap → navega a view='notifications'. El drawer flotante sigue
      // existiendo (mode='drawer' por default) para triggers externos
      // como el realtime toast, pero el slot del nav no lo usa mas.
      if (onNavigate) onNavigate('notifications', null)
      return
    }
    if (onNavigate) onNavigate(slot.view, slot.tab)
  }

  const renderSlot = (slot, variant) => {
    const active = isActive(slot)
    const isVertical = variant === 'desktop'
    const isDanger = slot.isLogout
    return (
      <button
        key={slot.id}
        onClick={() => handleSlotTap(slot)}
        aria-label={slot.label}
        aria-pressed={active}
        style={{
          flex: isVertical ? '0 0 auto' : 1,
          width: isVertical ? '100%' : undefined,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          flexDirection: isVertical ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: isVertical ? 'flex-start' : 'center',
          gap: isVertical ? 12 : 3,
          padding: isVertical ? '10px 14px' : 0,
          color: isDanger ? '#F87444' : (active ? ACTIVE : INACTIVE),
          fontFamily: 'inherit',
          borderRadius: isVertical ? 10 : 0,
          minHeight: isVertical ? 40 : undefined,
          transition: 'background 160ms ease, color 160ms ease',
        }}
      >
        {/* Indicador activo: en mobile sigue con la barrita superior + halo;
            en desktop suavizamos a una franja izquierda más fina (3×18) y
            background sutil sin border, para que no se sienta tan pesado. */}
        {active && !isVertical && (
          <span
            aria-hidden
            style={{
              position: 'absolute', top: 0, left: '50%',
              transform: 'translateX(-50%)',
              width: 32, height: 4,
              background: roleColor.gradient,
              borderRadius: '0 0 4px 4px',
              boxShadow: `0 2px 8px ${roleColor.glow}`,
            }}
          />
        )}
        {active && !isVertical && (
          <span
            aria-hidden
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, calc(-50% - 6px))',
              width: 44, height: 30,
              borderRadius: 14,
              background: `${roleColor.solid}1F`,
              border: `1px solid ${roleColor.solid}33`,
              pointerEvents: 'none',
            }}
          />
        )}
        {active && isVertical && (
          <>
            <span
              aria-hidden
              style={{
                position: 'absolute', left: 0, top: '50%',
                transform: 'translateY(-50%)',
                width: 3, height: 18,
                background: roleColor.gradient,
                borderRadius: '0 3px 3px 0',
                pointerEvents: 'none',
              }}
            />
            <span
              aria-hidden
              style={{
                position: 'absolute', inset: 0,
                borderRadius: 10,
                background: `${roleColor.solid}0F`,
                pointerEvents: 'none',
              }}
            />
          </>
        )}
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <slot.Icon
            size={isVertical ? 18 : 22}
            strokeWidth={isVertical ? (active ? 1.8 : 1.6) : (active ? 2.4 : 2)}
            color={isDanger ? '#F87444' : (active ? ACTIVE : INACTIVE)}
          />
          {slot.isNotifs && unreadCount > 0 && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: -2, right: -4,
                width: 8, height: 8,
                borderRadius: '50%',
                background: '#E24B4A',
                border: '1.5px solid #0a0512',
              }}
            />
          )}
        </span>
        <span style={{
          fontSize: isVertical ? 13 : 10,
          fontWeight: isVertical ? (active ? 600 : 500) : 600,
          letterSpacing: isVertical ? '0.005em' : '0.02em',
          marginTop: 0,
          color: isDanger ? '#F87444' : (active ? ACTIVE : INACTIVE),
          whiteSpace: 'nowrap',
          position: 'relative',
          flex: isVertical ? 1 : undefined,
          textAlign: isVertical ? 'left' : undefined,
        }}>
          {slot.label}
        </span>
        {/* Badge tipo "PRO" — solo aplica a items extra del desktop */}
        {slot.badge && isVertical && (
          <span
            aria-hidden
            style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
              padding: '2px 6px',
              borderRadius: 99,
              background: 'rgba(245,166,35,0.16)',
              border: '1px solid rgba(245,166,35,0.32)',
              color: '#F5A623',
              flexShrink: 0,
            }}
          >
            {slot.badge}
          </span>
        )}
      </button>
    )
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
          .bnav-qr-btn, .bnav-qr-pill { animation: none !important; }
        }
        @media (max-width: 767px) {
          .bnav-desktop { display: none !important; }
        }
        @media (min-width: 768px) {
          .bnav-mobile  { display: none !important; }
        }
      `}</style>

      {/* MOBILE: bottom nav horizontal */}
      <nav
        className="bnav-mobile"
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
          zIndex: 1600,
        }}
      >
        {slots.map((slot, idx) => {
          const node = renderSlot(slot, 'mobile')
          if (idx === 2) {
            return (
              <span key="qr-gap-and-slot" style={{ display: 'contents' }}>
                <span aria-hidden style={{ flex: 1, minWidth: 0 }} />
                {node}
              </span>
            )
          }
          return node
        })}

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
            zIndex: 1,
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

      {/* DESKTOP: side-rail vertical anclado a la izquierda */}
      <nav
        className="bnav-desktop"
        role="navigation"
        aria-label="Navegacion principal"
        style={{
          position: 'fixed',
          left: 0,
          top: 80,
          bottom: 0,
          width: 220,
          paddingTop: 24,
          paddingBottom: 24,
          paddingLeft: 12,
          paddingRight: 12,
          background: NAV_BG,
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 6,
          zIndex: 1600,
          fontFamily: FN,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Botón QR pill — suavizado: peso 600 (no 800), sin uppercase ni
            letter-spacing exagerado, glow más sutil, altura compacta. La
            idea es que se vea como un CTA elegante y no un cartel grita. */}
        <button
          className="bnav-qr-pill"
          onClick={() => onQRTap?.()}
          aria-label={isClient ? 'Mostrar mi QR' : 'Escanear o mostrar QR del negocio'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            width: '100%',
            minHeight: 44,
            padding: '10px 16px',
            border: 'none',
            borderRadius: 12,
            background: roleColor.gradient,
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            letterSpacing: '0.005em',
            cursor: 'pointer',
            boxShadow: `0 4px 14px ${roleColor.glow}`,
            marginBottom: 10,
            fontFamily: FN,
            transition: 'transform 160ms ease, box-shadow 160ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {isClient
            ? <QrCode size={18} color="#fff" strokeWidth={1.9} />
            : <ScanLine size={18} color="#fff" strokeWidth={1.9} />}
          <span>{isClient ? 'Mi QR' : 'QR del negocio'}</span>
        </button>

        {/* Items principales (siempre): Inicio, Beneficios, Notificaciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {slots.filter(s => !s.isMore).map(slot => renderSlot(slot, 'desktop'))}
        </div>

        {/* Items extra del comerciante — antes vivían dentro de "Más",
            ahora se muestran directo. Solo aplica al merchant context.
            Separados por un divisor sutil para que no se confundan con
            los principales. */}
        {!isClient && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '10px 8px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {SLOTS_MERCHANT_EXTRA.map(slot => renderSlot(slot, 'desktop'))}
            </div>
          </>
        )}

        {/* Footer: Cuenta + Cerrar sesión (solo si onLogout fue provisto).
            Quedan al pie pegado abajo via marginTop: 'auto' del wrapper. */}
        {onLogout && (
          <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {renderSlot({ id: 'cuenta-rail', label: 'Cuenta', Icon: User, view: 'client', tab: 'cuenta' }, 'desktop')}
            {renderSlot({ id: 'logout-rail', label: 'Cerrar sesión', Icon: LogOut, isLogout: true }, 'desktop')}
          </div>
        )}
      </nav>
    </>
  )
}
