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

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const popoverPos =
    align === 'left'  ? { left: 0, transform: 'none' } :
    align === 'right' ? { right: 0, transform: 'none' } :
                        { left: '50%', transform: 'translateX(-50%)' }

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(o => !o) }}
        aria-label="Más información"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 2,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: open ? '#BD4BF8' : color,
          transition: 'color 180ms ease',
        }}>
        <Info size={size} strokeWidth={2} />
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          ...popoverPos,
          width,
          maxWidth: 'min(280px, calc(100vw - 32px))',
          background: 'rgba(20,14,32,0.98)',
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
