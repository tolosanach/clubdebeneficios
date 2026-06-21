'use client'

// ClientQRSheet — bottom sheet del cliente con dos pasos:
//   step='picker' (default): cards "Mostrar QR personal" / "Escanear QR de negocio"
//   step='qr': fullscreen ticket design (idéntico a QrFullscreen audience='client')
// Props: open, onClose, profile

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, ScanLine, X, ArrowLeft, Share2 } from 'lucide-react'

const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"
const CLIENT_GRADIENT = 'linear-gradient(135deg, #d4007f, #F472B6)'
const VIOLET = '#6F30DF'

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
  const qrValue     = profile?.qr_code || (profile?.id ? `CLUB-${profile.id}` : '')

  async function buildShareImage() {
    if (typeof document === 'undefined') return null
    const W = 1080, H = 1920
    const canvas = document.createElement('canvas')
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const FONT = "'Space Grotesk', system-ui, sans-serif"

    ctx.fillStyle = VIOLET
    ctx.fillRect(0, 0, W, H)

    const LOGO_H = 150, LOGO_Y = 130
    try {
      const logoImg = new Image()
      logoImg.src = `${window.location.origin}/brand/logo-clufix-wordmark-white.svg`
      await new Promise(r => { logoImg.onload = r; logoImg.onerror = r })
      if (logoImg.naturalWidth > 0) {
        const logoW = logoImg.naturalWidth * (LOGO_H / logoImg.naturalHeight)
        ctx.drawImage(logoImg, (W - logoW) / 2, LOGO_Y, logoW, LOGO_H)
      }
    } catch {}

    const LABEL_Y = LOGO_Y + LOGO_H + 80
    ctx.font = `700 34px ${FONT}`
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('QR PERSONAL', W / 2, LABEL_Y)

    const TX = 90, TY = LABEL_Y + 80, TW = W - TX * 2, CORNER = 52
    const QR_SIZE = 660, QR_X = (W - QR_SIZE) / 2, QR_Y = TY + 70
    const INSTR_Y = QR_Y + QR_SIZE + 52, INSTR_SIZE = 34
    const T_BODY_BOTTOM = INSTR_Y + INSTR_SIZE + 72

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(TX + CORNER, TY)
    ctx.lineTo(TX + TW - CORNER, TY)
    ctx.arcTo(TX + TW, TY, TX + TW, TY + CORNER, CORNER)
    ctx.lineTo(TX + TW, T_BODY_BOTTOM)
    ctx.lineTo(TX, T_BODY_BOTTOM)
    ctx.lineTo(TX, TY + CORNER)
    ctx.arcTo(TX, TY, TX + CORNER, TY, CORNER)
    ctx.closePath()
    ctx.fill()

    try {
      const QRCode = (await import('qrcode')).default
      const qrDataU = await QRCode.toDataURL(qrValue || '', {
        width: QR_SIZE, margin: 1, errorCorrectionLevel: 'H',
        color: { dark: '#0a0a0a', light: '#ffffff' },
      })
      const qrImg = new Image()
      qrImg.src = qrDataU
      await new Promise(r => { qrImg.onload = r; qrImg.onerror = r })
      ctx.drawImage(qrImg, QR_X, QR_Y, QR_SIZE, QR_SIZE)
    } catch {}

    ctx.font = `800 ${INSTR_SIZE}px ${FONT}`
    ctx.fillStyle = '#1a1a1a'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('ESCANEÁ ESTE QR EN EL NEGOCIO', W / 2, INSTR_Y)

    const SERR_R = 30, SERR_GAP = 60
    ctx.fillStyle = VIOLET
    let sx = TX + SERR_GAP / 2
    while (sx < TX + TW) {
      ctx.beginPath()
      ctx.arc(sx, T_BODY_BOTTOM, SERR_R, 0, Math.PI * 2)
      ctx.fill()
      sx += SERR_GAP
    }

    if (displayName) {
      ctx.font = `700 62px ${FONT}`
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(displayName, W / 2, T_BODY_BOTTOM + SERR_R * 2 + 52)
    }

    ctx.font = `500 28px ${FONT}`
    ctx.fillStyle = 'rgba(255,255,255,0.30)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('clufix.com.ar', W / 2, H - 70)

    return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png', 1))
  }

  async function handleShare() {
    let blob = null
    try { blob = await buildShareImage() } catch {}
    const fileName = 'mi-qr-clufix.png'
    const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null

    if (file && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Mi QR de Clufix' })
        return
      } catch {}
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Mi QR de Clufix' })
        return
      } catch {}
    }
    if (blob) {
      try {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } catch {}
    }
  }

  function handleScanClub() {
    onClose?.()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('clufix:navigate', { detail: { view: 'scanner' } }))
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('clufix:scan-mode', { detail: { mode: 'join-club' } }))
      }, 80)
    }
  }

  // step='qr' → fullscreen ticket design (identical to QrFullscreen audience='client')
  if (step === 'qr') {
    return (
      <div role="dialog" aria-modal="true" style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: VIOLET,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `64px 24px calc(32px + env(safe-area-inset-bottom, 0px))`,
        overflow: 'hidden',
      }}>
        {/* X */}
        <button onClick={onClose} aria-label="Cerrar" style={{
          position: 'absolute', top: 20, right: 20, zIndex: 5,
          background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
          padding: 8, lineHeight: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={24} strokeWidth={2} />
        </button>

        {/* Logo */}
        <div style={{
          position: 'absolute', top: 22, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <img src="/brand/logo-clufix-wordmark-white.svg" alt="Clufix" style={{ height: 60 }} />
        </div>

        {/* Label */}
        <div style={{
          fontFamily: FN, fontSize: 11, fontWeight: 700,
          letterSpacing: '.14em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)', marginBottom: 24,
          textAlign: 'center',
        }}>
          QR PERSONAL
        </div>

        {/* Ticket */}
        <div style={{ width: '100%', maxWidth: 300, boxShadow: '0 8px 40px rgba(0,0,0,0.30)' }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px 16px 0 0',
            padding: '28px 24px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <QRCodeSVG
              value={qrValue || ''}
              size={210}
              fgColor="#0a0a0a"
              bgColor="#ffffff"
              level="H"
              style={{ display: 'block' }}
            />
            <div style={{
              fontFamily: FN, fontSize: 10, fontWeight: 800,
              color: '#1a1a1a', letterSpacing: '.12em',
              textTransform: 'uppercase', textAlign: 'center',
              lineHeight: 1.4,
            }}>
              ESCANEÁ ESTE QR EN EL NEGOCIO
            </div>
          </div>
          {/* Borde dentado */}
          <div style={{
            width: '100%', height: 10,
            backgroundImage: `radial-gradient(circle at 50% 100%, ${VIOLET} 6px, #fff 7px)`,
            backgroundSize: '16px 10px',
            backgroundRepeat: 'repeat-x',
          }} />
        </div>

        {/* Nombre */}
        {displayName && (
          <div style={{
            marginTop: 28,
            fontFamily: FN, fontSize: 16, fontWeight: 700,
            color: 'rgba(255,255,255,0.90)', textAlign: 'center',
            letterSpacing: '-.01em',
          }}>
            {displayName}
          </div>
        )}

        {/* Compartir */}
        <button onClick={handleShare} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '10px 18px', marginTop: 24,
          background: 'rgba(255,255,255,0.14)',
          border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 99, color: '#fff',
          fontFamily: FN, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          lineHeight: 1,
        }}>
          <Share2 size={14} strokeWidth={2.2} />
          Compartir
        </button>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes cqr-fadein { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cqr-slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (min-width: 768px) {
          .cqr-sheet {
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            width: 480px !important;
            border-radius: 24px !important;
            bottom: 40px !important;
          }
        }
      `}</style>
      <div onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 2200, background: 'rgba(8,4,18,0.55)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', animation: 'cqr-fadein 220ms ease both' }} />
      <div role="dialog" aria-modal="true" className="cqr-sheet" onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 2300, background: 'rgba(15, 10, 25, 0.96)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 24px calc(28px + env(safe-area-inset-bottom, 0px))', maxHeight: '85vh', overflowY: 'auto', animation: 'cqr-slideup 280ms cubic-bezier(0.32, 0.72, 0, 1) both', color: '#fff', fontFamily: FN }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <span aria-hidden style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.18)' }} />
        </div>

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
            <ScanLine size={24} color="#6F30DF" strokeWidth={2.2} />
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
      </div>
    </>
  )
}
