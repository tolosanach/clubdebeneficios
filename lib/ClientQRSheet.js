'use client'

// ClientQRSheet — bottom sheet glass con el QR personal del cliente.
// Lo que el comerciante escanea para sumar su visita. El qr_code es el
// string que codifica el QR (ej "CLUB-{user_id}").
//
// Props:
//   open:    boolean
//   onClose: () => void
//   profile: { name, full_name, avatar_url, qr_code }

import { useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X } from 'lucide-react'

const G  = 'linear-gradient(135deg, #FE5000, #BD4BF8)'
const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

function getInitial(name) {
  const t = (name || '').trim()
  if (!t) return '?'
  return t.charAt(0).toUpperCase()
}

export default function ClientQRSheet({ open, onClose, profile }) {
  // Cerrar con ESC.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const displayName = profile?.full_name || profile?.name || 'Mi QR'
  const qrValue     = profile?.qr_code || ''
  const avatarUrl   = profile?.avatar_url || null

  return (
    <>
      <style>{`
        @keyframes cqr-fadein { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cqr-slideup {
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
          animation: 'cqr-fadein 220ms ease both',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mi QR"
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
          padding: '12px 24px calc(28px + env(safe-area-inset-bottom, 0px))',
          maxHeight: '80vh',
          overflowY: 'auto',
          animation: 'cqr-slideup 280ms cubic-bezier(0.32, 0.72, 0, 1) both',
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

        {/* Avatar + nombre */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.10)' }}
            />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: G,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff',
            }}>
              {getInitial(displayName)}
            </div>
          )}
          <div style={{ fontSize: 18, fontWeight: 700, textAlign: 'center' }}>{displayName}</div>
        </div>

        {/* QR */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 260,
            padding: 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {qrValue ? (
              <QRCodeSVG
                value={qrValue}
                size={228}
                fgColor="#FFFFFF"
                bgColor="transparent"
                level="H"
              />
            ) : (
              <div style={{ width: 228, height: 228, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center', padding: 16 }}>
                Falta tu codigo QR. Iniciá sesión y volvé a abrir.
              </div>
            )}
          </div>
        </div>

        {/* Hint */}
        <p style={{
          fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center',
          fontFamily: FI, lineHeight: 1.5, margin: '0 0 18px 0',
        }}>
          Mostrale este QR al comercio para sumar tu visita.
        </p>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 99,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: FN, fontSize: 13.5, fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <X size={14} strokeWidth={2.4} />
          Cerrar
        </button>
      </div>
    </>
  )
}
