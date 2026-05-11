'use client'

// MerchantQRSheet — bottom sheet con las 2 acciones del comerciante:
// mostrar el QR del negocio (para sumar clientes) o registrar visita
// (escanear el QR del cliente). Reemplaza visualmente al merchant-
// intent-picker existente — la logica de cada flujo se delega al
// padre via callbacks.
//
// Props:
//   open:               boolean
//   onClose:            () => void
//   onShowCommerceQR:   () => void
//   onScanClient:       () => void
//   commerceName:       string

import { useEffect } from 'react'
import { QrCode, ScanLine, X } from 'lucide-react'

// G — antes era gradient orange→fucsia. Rebrand mayo 2026 fase 2:
// violeta brand sólido. Mantengo el nombre G por compat de call sites.
const G  = '#7131E1'
const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"

export default function MerchantQRSheet({
  open,
  onClose,
  onShowCommerceQR,
  onScanClient,
  commerceName,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <style>{`
        @keyframes mqr-fadein { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mqr-slideup {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @media (min-width: 768px) {
          .mqr-sheet {
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            width: 480px !important;
            border-radius: 24px !important;
            bottom: 40px !important;
          }
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
          animation: 'mqr-fadein 220ms ease both',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Acciones del negocio"
        className="mqr-sheet"
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
          animation: 'mqr-slideup 280ms cubic-bezier(0.32, 0.72, 0, 1) both',
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

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>¿Qué querés hacer?</h2>
          {commerceName && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0', fontFamily: FI }}>
              {commerceName}
            </p>
          )}
        </div>

        {/* Card 1 — Mostrar QR del negocio */}
        <button
          onClick={() => { onShowCommerceQR?.(); onClose?.() }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: 18,
            marginBottom: 12,
            borderRadius: 16,
            background: 'rgba(113, 49, 225, 0.08)',
            border: '1px solid rgba(113, 49, 225, 0.3)',
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          <span style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'rgba(113, 49, 225, 0.18)',
            border: '1px solid rgba(113, 49, 225, 0.4)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <QrCode size={24} color="#7131E1" strokeWidth={2.2} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
              Mostrar QR del negocio
            </span>
            <span style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: FI, lineHeight: 1.4 }}>
              Para que un cliente nuevo se sume a tu club
            </span>
          </span>
        </button>

        {/* Card 2 — Registrar visita */}
        <button
          onClick={() => { onScanClient?.(); onClose?.() }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: 18,
            marginBottom: 18,
            borderRadius: 16,
            background: 'rgba(113, 49, 225, 0.12)',
            border: '1px solid rgba(113, 49, 225, 0.4)',
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          <span style={{
            width: 48, height: 48, borderRadius: 12,
            background: G,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(113,49,225,0.40)',
          }}>
            <ScanLine size={24} color="#fff" strokeWidth={2.2} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
              Registrar visita
            </span>
            <span style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: FI, lineHeight: 1.4 }}>
              Escaneá el QR del cliente para sumar su compra
            </span>
          </span>
        </button>

        {/* Cancel */}
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
          Cancelar
        </button>
      </div>
    </>
  )
}
