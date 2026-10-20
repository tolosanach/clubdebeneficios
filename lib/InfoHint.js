'use client'
import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

// InfoHint — círculo "i" reusable que abre un popover con texto explicativo
// al tocarlo. Mobile-friendly (click, no hover). Click afuera lo cierra.
//
// Props:
//  - text:   string con el texto a explicar (puede tener saltos de línea)
//  - size:   tamaño del ícono (default 14)
//  - color:  color del ícono cuando está cerrado (default mist)
//  - align:  'left' | 'center' | 'right' — alineación del popover (default 'center')
//  - width:  ancho del popover en px (default 240)
export default function InfoHint({ text, size = 14, color = 'rgba(255,255,255,0.55)', align = 'center', width = 240 }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const btnRef = useRef(null)
  const [pos, setPos] = useState(null)

  // Posiciona el popover con position:fixed y lo mantiene dentro de la
  // pantalla (margen 16px), sin importar dónde esté el ícono.
  function toggle() {
    if (open) { setOpen(false); return }
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const vw = window.innerWidth
      const w = Math.min(width, 280, vw - 32)
      let left = align === 'right' ? r.right - w : align === 'left' ? r.left : r.left + r.width / 2 - w / 2
      left = Math.max(16, Math.min(left, vw - w - 16))
      setPos({ left, top: r.bottom + 6, width: w })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function close() { setOpen(false) }
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggle() }}
        aria-label="Más información"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 2,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: open ? '#E03E1B' : color,
          transition: 'color 180ms ease',
        }}>
        <Info size={size} strokeWidth={2} />
      </button>
      {open && pos && (
        <div style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          width: pos.width,
          background: 'rgba(31,22,15,0.98)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 12,
          color: 'rgba(255,255,255,0.82)',
          lineHeight: 1.55,
          fontWeight: 400,
          textAlign: 'left',
          boxShadow: '0 12px 32px -8px rgba(0,0,0,0.55)',
          zIndex: 1000,
          whiteSpace: 'pre-line',
        }}>
          {text}
        </div>
      )}
    </span>
  )
}
