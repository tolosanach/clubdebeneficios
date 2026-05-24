'use client'

// MoreSheet — bottom sheet con el menu del comerciante (todo lo que
// no entra en los 4 slots del bottom-nav v2). Cada item dispara un
// onNavigate y cierra el sheet.
//
// Props:
//   open:             boolean
//   onClose:          () => void
//   onNavigate:       (view, tab) => void
//   onLogout:         () => void
//   profile:          object  (full_name/name, email, ...)
//   onDeleteBusiness: () => void  — handler para "Eliminar cuenta de negocio"

import { useEffect, useState } from 'react'
import {
  Users, BarChart3, PieChart, Clock, Bot,
  Gift, Inbox, HelpCircle,
  User, LogOut, ChevronRight, X, Trash2, Pen,
} from 'lucide-react'

const G  = '#6F30DF'
const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

function getInitial(name) {
  const t = (name || '').trim()
  if (!t) return '?'
  return t.charAt(0).toUpperCase()
}

export default function MoreSheet({ open, onClose, onNavigate, onLogout, profile, onDeleteBusiness }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Reset confirm state when sheet closes
  useEffect(() => {
    if (!open) { setShowDeleteConfirm(false); setDeleting(false) }
  }, [open])

  if (!open) return null

  const displayName = profile?.full_name || profile?.name || 'Tu cuenta'

  const navAndClose = (view, tab) => () => {
    onNavigate?.(view, tab)
    onClose?.()
  }
  const logoutAndClose = () => {
    onLogout?.()
    onClose?.()
  }

  const items = [
    { label: 'Premios',                 Icon: Gift,     action: navAndClose('commerce-settings', 'premios') },
    { label: 'Canjes pendientes',       Icon: Inbox,    action: navAndClose('commerce-settings', 'canjes') },
    { label: 'Clientes',                Icon: Users,    action: navAndClose('commerce-settings', 'clientes') },
    { label: 'Análisis',                Icon: BarChart3, action: navAndClose('commerce-settings', 'analisis') },
    { label: 'Reportes y segmentación', Icon: PieChart, action: navAndClose('commerce-settings', 'analisis') },
    { label: 'Historial',               Icon: Clock,    action: navAndClose('commerce-settings', 'historial') },
    { label: 'Automatizaciones',        Icon: Bot,      action: navAndClose('commerce-settings', 'mensajes'), badge: 'PRO' },
    { label: 'Soporte',                 Icon: HelpCircle, action: () => { try { window.dispatchEvent(new CustomEvent('clufix:open-support')) } catch {}; onClose?.() } },
  ]
  const accountItems = [
    { label: 'Cuenta',         Icon: User,   action: navAndClose('client', 'cuenta') },
    { label: 'Eliminar cuenta', Icon: Trash2, action: () => setShowDeleteConfirm(true), danger: true },
    { label: 'Cerrar sesión',  Icon: LogOut, action: logoutAndClose, danger: true },
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
        onClick={showDeleteConfirm ? undefined : onClose}
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

        {/* Header con avatar + nombre + acceso rápido a Configuración */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px 14px', marginBottom: 6, background: 'rgba(113,49,225,0.10)', borderBottom: '1px solid rgba(113,49,225,0.20)' }}>
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
          <button
            onClick={navAndClose('commerce-settings', 'configuracion')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, background: 'rgba(113,49,225,0.22)', border: '1px solid rgba(113,49,225,0.40)', borderRadius: 99, padding: '6px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontFamily: FN, fontSize: 12, fontWeight: 600 }}
          >
            <Pen size={11} strokeWidth={2.2} />
            Editar
          </button>
        </div>

        {/* Items principales */}
        <div role="menu">
          {items.map((it, i) => (
            <MenuRow key={it.label} item={it} isLast={i === items.length - 1} />
          ))}
        </div>

        {/* Divisor */}
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

      {/* Modal de confirmación "Eliminar cuenta de negocio" */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2400,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
          background: 'rgba(8,4,18,0.80)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: '100%', maxWidth: 380,
            background: 'linear-gradient(180deg, rgba(28,18,42,0.98), rgba(18,10,28,0.98))',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 22,
            padding: '28px 24px 22px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.60)',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'rgba(248,68,68,0.15)',
              border: '1px solid rgba(248,68,68,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Trash2 size={24} color="#F84444" strokeWidth={2} />
            </div>
            <div style={{ fontFamily: FN, fontSize: 18, fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: 10, letterSpacing: '-0.01em' }}>
              ¿Eliminar cuenta de negocio?
            </div>
            <div style={{ fontFamily: FI, fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, textAlign: 'center', marginBottom: 24 }}>
              Se eliminarán tu club, clientes y configuración. Tu cuenta de cliente se mantiene intacta.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                style={{
                  flex: 1, padding: '13px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  color: '#fff', fontFamily: FN, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setDeleting(true)
                  try {
                    await onDeleteBusiness?.()
                  } finally {
                    setDeleting(false)
                    setShowDeleteConfirm(false)
                  }
                }}
                disabled={deleting}
                style={{
                  flex: 1, padding: '13px',
                  background: deleting ? 'rgba(248,68,68,0.45)' : '#F84444',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff', fontFamily: FN, fontSize: 14, fontWeight: 700,
                  cursor: deleting ? 'default' : 'pointer',
                }}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
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
          color: '#FF199F',
        }}>
          {badge}
        </span>
      )}
      {!danger && <ChevronRight size={16} strokeWidth={2.2} color="rgba(255,255,255,0.40)" />}
    </button>
  )
}
