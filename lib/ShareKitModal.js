'use client'

// Modal "Difundir": muestra la pieza generada (historia / post / sticker),
// y deja descargarla, copiar el link del club y compartir por WhatsApp.
// Las piezas las arma /api/kit-difusion con los datos reales del comercio.

import { useEffect, useState } from 'react'
import { X, Download, Copy, Check, MessageCircle } from 'lucide-react'

const CORAL = '#E03E1B'

const LAUNCH_TABS = [
  { id: 'launch',  label: 'Historia' },
  { id: 'post',    label: 'Post' },
  { id: 'puerta',  label: 'Puerta' },
]

const TITLES = {
  launch: 'Difundir mi club',
  promo:  'Difundir esta promo',
  prize:  'Difundir este premio',
}

export default function ShareKitModal({ open, onClose, commerceId, kind = 'launch', promoId = '', prizeId = '', fontFamily = 'inherit' }) {
  const [piece, setPiece] = useState(kind)
  const [meta, setMeta] = useState(null)
  const [imgState, setImgState] = useState('loading') // loading | ok | error
  const [errMsg, setErrMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [imgSrc, setImgSrc] = useState('')

  useEffect(() => { if (open) { setPiece(kind); setCopied(false) } }, [open, kind])

  const q = `commerce_id=${encodeURIComponent(commerceId)}` +
    (kind === 'promo' ? `&promo_id=${encodeURIComponent(promoId)}` : '') +
    (kind === 'prize' ? `&prize_id=${encodeURIComponent(prizeId)}` : '')
  const imgUrl = `/api/kit-difusion?${q}&piece=${piece}`

  // Link del club + texto de WhatsApp (según qué se está difundiendo).
  useEffect(() => {
    if (!open || !commerceId) return
    let alive = true
    setMeta(null)
    fetch(`/api/kit-difusion?${q}&piece=${kind}&meta=1`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (alive) setMeta(j) })
      .catch(() => {})
    return () => { alive = false }
  }, [open, q, kind, commerceId])

  // Al cambiar de pieza: la pido una sola vez y uso el blob para la vista
  // previa y para la descarga. Si falla (promo vencida, premio sin stock…)
  // muestro el motivo en vez de una imagen rota.
  useEffect(() => {
    if (!open) return
    setImgState('loading'); setErrMsg(''); setImgSrc('')
    let alive = true
    let objUrl = ''
    fetch(imgUrl).then(async r => {
      if (!alive) return
      if (r.ok) {
        objUrl = URL.createObjectURL(await r.blob())
        if (!alive) { URL.revokeObjectURL(objUrl); return }
        setImgSrc(objUrl); setImgState('ok')
      } else {
        const j = await r.json().catch(() => ({}))
        setErrMsg(j.error || ''); setImgState('error')
      }
    }).catch(() => { if (alive) setImgState('error') })
    return () => { alive = false; if (objUrl) URL.revokeObjectURL(objUrl) }
  }, [open, imgUrl])

  if (!open) return null

  const isStory = piece === 'launch' || piece === 'promo' || piece === 'prize'
  const aspect = piece === 'post' ? '1 / 1' : piece === 'puerta' ? '1 / 1' : '9 / 16'
  const copyLink = async () => {
    if (!meta?.club_url) return
    try { await navigator.clipboard.writeText(meta.club_url) }
    catch {
      const t = document.createElement('textarea'); t.value = meta.club_url
      document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove()
    }
    setCopied(true); setTimeout(() => setCopied(false), 2200)
  }
  const waHref = meta?.whatsapp_text ? `https://wa.me/?text=${encodeURIComponent(meta.whatsapp_text)}` : null

  const btn = (primary) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 16px', borderRadius: 12, border: primary ? 'none' : '1px solid rgba(255,255,255,0.16)',
    background: primary ? CORAL : 'rgba(255,255,255,0.07)', color: '#fff', fontFamily, fontSize: 14, fontWeight: 700,
    cursor: 'pointer', textDecoration: 'none', lineHeight: 1,
  })

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 10050, background: 'rgba(10,6,4,0.82)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440, maxHeight: '100%', overflowY: 'auto', background: '#14100D', borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.10)', padding: 18, color: '#fff', fontFamily,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>{TITLES[kind] || TITLES.launch}</div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        {kind === 'launch' && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {LAUNCH_TABS.map(t => (
              <button key={t.id} onClick={() => setPiece(t.id)} style={{
                flex: 1, padding: '9px 0', borderRadius: 99, fontFamily, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: piece === t.id ? `1px solid ${CORAL}` : '1px solid rgba(255,255,255,0.14)',
                background: piece === t.id ? 'rgba(224,62,27,0.2)' : 'transparent', color: piece === t.id ? '#FFB59E' : 'rgba(255,255,255,0.7)',
              }}>{t.label}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{
            width: isStory ? 'min(230px, 56vw)' : 'min(300px, 76vw)', aspectRatio: aspect, borderRadius: 14, overflow: 'hidden',
            background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {imgState === 'ok' && <img src={imgSrc} alt="Vista previa de la pieza" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />}
            {imgState === 'loading' && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Armando la pieza…</div>}
            {imgState === 'error' && <div style={{ fontSize: 13, color: '#FFB59E', padding: 16, textAlign: 'center' }}>{errMsg || 'No pudimos armar la pieza. Probá de nuevo en unos segundos.'}</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <a href={imgState === 'ok' ? imgSrc : undefined} download={`clufix-${piece}.png`}
             onClick={e => { if (imgState !== 'ok') e.preventDefault() }}
             style={{ ...btn(true), opacity: imgState === 'ok' ? 1 : 0.5 }}>
            <Download size={16} /> Descargar {piece === 'post' ? 'post' : piece === 'puerta' ? 'sticker' : 'historia'}
          </a>
          <button onClick={copyLink} disabled={!meta} style={{ ...btn(false), opacity: meta ? 1 : 0.5 }}>
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? '¡Link copiado!' : 'Copiar link de mi club'}
          </button>
          {waHref && (
            <a href={waHref} target="_blank" rel="noopener noreferrer" style={btn(false)}>
              <MessageCircle size={16} /> Compartir por WhatsApp
            </a>
          )}
        </div>

        <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.05)', fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.82)' }}>
          {isStory && (<>
            <div style={{ fontWeight: 800, color: '#fff', marginBottom: 6 }}>Cómo publicarla en Instagram</div>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>Descargá la historia.</li>
              <li>Tocá <b>Copiar link de mi club</b>.</li>
              <li>Subila a tu historia de Instagram.</li>
              <li>Stickers → <b>Enlace</b> y pegá tu link.</li>
              <li>Ubicá el sticker sobre el recuadro punteado.</li>
            </ol>
          </>)}
          {piece === 'post' && (<>
            <div style={{ fontWeight: 800, color: '#fff', marginBottom: 6 }}>Cómo publicarlo</div>
            Subilo al feed y poné el link de tu club en la bio de tu Instagram (Copiar link de mi club). En el epígrafe invitá a sumarse desde el link de la bio.
          </>)}
          {piece === 'puerta' && (<>
            <div style={{ fontWeight: 800, color: '#fff', marginBottom: 6 }}>Para la puerta o la vidriera</div>
            Imprimilo en papel autoadhesivo, de 10 a 15 cm, y pegalo de frente a la calle. No lleva QR a propósito: así nadie se suma desde afuera. El QR para sumarse queda adentro, en el mostrador (portarretrato).
          </>)}
        </div>
      </div>
    </div>
  )
}
