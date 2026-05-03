'use client'

// ClientQRSheet — bottom sheet del cliente con dos pasos:
//   step='picker' (default): cards "Mostrar QR personal" / "Escanear QR de negocio"
//   step='qr': muestra el QR del cliente para que el comercio lo escanee.
// Props: open, onClose, profile

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, ScanLine, X, ArrowLeft } from 'lucide-react'

const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"
const CLIENT_GRADIENT = 'linear-gradient(135deg, #DB2777, #F472B6)'

function getInitial(name) {
  const t = (name || '').trim()
  if (!t) return '?'
  return t.charAt(0).toUpperCase()
}

export default function ClientQRSheet({ open, onClose, profile }) {
  const [step, setStep] = useState('picker')
  useEffect(() => { if (open) setStep('picker') }, [open])
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

  function handleScanClub() {
    onClose?.()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('benefix:navigate', { detail: { view: 'scanner' } }))
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('benefix:scan-mode', { detail: { mode: 'join-club' } }))
      }, 80)
    }
  }

  return (
    <>
      <style>{`
        @keyframes cqr-fadein { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cqr-slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
      <div onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 2200, background: 'rgba(8,4,18,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', animation: 'cqr-fadein 220ms ease both' }} />
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 2300, background: 'rgba(15, 10, 25, 0.96)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 24px calc(28px + env(safe-area-inset-bottom, 0px))', maxHeight: '85vh', overflowY: 'auto', animation: 'cqr-slideup 280ms cubic-bezier(0.32, 0.72, 0, 1) both', color: '#fff', fontFamily: FN }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <span aria-hidden style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {step === 'picker' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>¿Qué querés hacer?</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0', fontFamily: FI }}>Tu cuenta</p>
            </div>

            <button onClick={() => setStep('qr')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: 18, marginBottom: 12, borderRadius: 16, background: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(244,114,182,0.10))', border: '1px solid rgba(236,72,153,0.40)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <span style={{ width: 48, height: 48, borderRadius: 12, background: CLIENT_GRADIENT, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(236,72,153,0.40)' }}>
                <QrCode size={24} color="#fff" strokeWidth={2.2} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Mostrar QR personal</span>
                <span style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: FI, lineHeight: 1.4 }}>Para que un comercio lo escanee y te sume visita</span>
              </span>
            </button>

            <button onClick={handleScanClub} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: 18, marginBottom: 18, borderRadius: 16, background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
              <span style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(139, 92, 246, 0.18)', border: '1px solid rgba(139, 92, 246, 0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ScanLine size={24} color="#8B5CF6" strokeWidth={2.2} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Escanear QR de negocio</span>
                <span style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: FI, lineHeight: 1.4 }}>Sumate a un club nuevo escaneando su QR</span>
              </span>
            </button>

            <button onClick={onClose} style={{ width: '100%', padding: '12px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 99, color: 'rgba(255,255,255,0.65)', fontFamily: FN, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <X size={14} strokeWidth={2.4} />
              Cancelar
            </button>
          </>
        )}

        {step === 'qr' && (
          <>
            <button onClick={() => setStep('picker')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 12 }}>
              <ArrowLeft size={14} strokeWidth={2.4} />
              Volver
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.10)' }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: CLIENT_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff' }}>
                  {getInitial(displayName)}
                </div>
              )}
              <div style={{ fontSize: 18, fontWeight: 700, textAlign: 'center' }}>{displayName}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 260, padding: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {qrValue ? (
                  <QRCodeSVG value={qrValue} size={228} fgColor="#FFFFFF" bgColor="transparent" level="H" />
                ) : (
                  <div style={{ width: 228, height: 228, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center', padding: 16 }}>
                    Falta tu codigo QR. Inicia sesion y volve a abrir.
                  </div>
                )}
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontFamily: FI, lineHeight: 1.5, margin: '0 0 18px 0' }}>
              Mostrale este QR al comercio para sumar tu visita.
            </p>

            <button onClick={onClose} style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 99, color: 'rgba(255,255,255,0.85)', fontFamily: FN, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <X size={14} strokeWidth={2.4} />
              Cerrar
            </button>
          </>
        )}
      </div>
    </>
  )
}
