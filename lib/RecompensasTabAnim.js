'use client'

// RecompensasTabAnim — animaciones inline que reemplazan los títulos de
// las dos sub-tabs de la pantalla Recompensas del comerciante:
//   - tab 'how'      → Sistema de acumulación: 3 estrellas que se llenan
//                      una por una (cuando el sistema es 'stars') O un
//                      contador que sube +N (cuando es 'points').
//   - tab 'discount' → Descuento próxima compra: una etiqueta de %OFF
//                      con un pulse + número que cambia.
//
// Se renderean SIEMPRE chicas (alto ~28px, ancho variable) para entrar
// en la solapa de la tab. Loop infinito con setInterval / CSS keyframes.
// Solo se animan cuando active=true para no consumir CPU si la tab está
// inactiva (igual queda visible la versión "frozen" del primer frame).

import { useEffect, useState } from 'react'
import { Star, Coins, Percent } from 'lucide-react'

const FN = "'Space Grotesk', system-ui, sans-serif"

// ─── Animación de estrellas ─────────────────────────────────────────────
// 3 estrellas que se rellenan de izquierda a derecha cíclicamente.
// Frame 0: ☆ ☆ ☆   Frame 1: ★ ☆ ☆   Frame 2: ★ ★ ☆   Frame 3: ★ ★ ★
// Después vuelve a vacío y arranca de nuevo. ~600ms entre frames.
function StarsAccumAnim({ active }) {
  const [filled, setFilled] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setFilled(f => (f + 1) % 4)
    }, 700)
    return () => clearInterval(id)
  }, [active])

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[0, 1, 2].map(i => {
        const isFilled = i < filled
        return (
          <Star
            key={i}
            size={11}
            color={isFilled ? '#FFC93C' : (active ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.20)')}
            fill={isFilled ? '#FFC93C' : 'transparent'}
            strokeWidth={2}
            style={{
              transition: 'color 220ms ease, fill 220ms ease, transform 220ms cubic-bezier(0.34,1.56,0.64,1)',
              transform: isFilled ? 'scale(1.12)' : 'scale(1)',
            }}
          />
        )
      })}
    </span>
  )
}

// ─── Animación de puntos ────────────────────────────────────────────────
// Contador que sube de 0 a 100 en pasos rápidos. Visualmente da la
// sensación de "acumulación de puntos". Sufijo "pts" después del número.
function PointsAccumAnim({ active }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setN(prev => {
        if (prev >= 100) return 0
        return prev + 5
      })
    }, 90)
    return () => clearInterval(id)
  }, [active])

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Coins size={11} color="#EC4899" strokeWidth={2.4} />
      <span style={{
        fontFamily: FN, fontSize: 11, fontWeight: 800, color: '#EC4899',
        minWidth: 22, textAlign: 'right', letterSpacing: '-.01em',
        fontVariantNumeric: 'tabular-nums',
      }}>+{n}</span>
    </span>
  )
}

// ─── Animación de descuento próxima compra ──────────────────────────────
// Etiqueta de %OFF. Si el dueño YA tiene un cupón configurado (percent
// numérico válido > 0), mostramos ese número fijo. Si todavía no hay
// nada, ciclamos entre 10/15/20/30 como teaser.
function DiscountAnim({ active, percent }) {
  const PERCENTS = [10, 15, 20, 30]
  const fixed = Number.isFinite(percent) && percent > 0 ? Math.round(percent) : null
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (!active || fixed != null) return
    const id = setInterval(() => {
      setIdx(i => (i + 1) % PERCENTS.length)
    }, 1100)
    return () => clearInterval(id)
  }, [active, fixed])

  const shown = fixed != null ? fixed : PERCENTS[idx]

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      // Rebrand mayo 2026 fase 2: violeta brand sólido en lugar del
      // gradient orange→fucsia.
      background: active ? '#7131E1' : 'rgba(255,255,255,0.08)',
      borderRadius: 5,
      padding: '2px 6px',
      transition: 'background 220ms ease',
      boxShadow: active ? '0 2px 8px rgba(113,49,225,0.40)' : 'none',
    }}>
      <span style={{
        fontFamily: FN, fontSize: 11, fontWeight: 800,
        color: active ? '#fff' : 'rgba(255,255,255,0.55)',
        letterSpacing: '-.02em',
        fontVariantNumeric: 'tabular-nums',
        minWidth: 16, textAlign: 'right',
        transition: 'color 220ms ease',
      }}>{shown}</span>
      <Percent size={9} color={active ? '#fff' : 'rgba(255,255,255,0.55)'} strokeWidth={3} />
      <span style={{
        fontFamily: FN, fontSize: 8.5, fontWeight: 800,
        color: active ? '#fff' : 'rgba(255,255,255,0.55)',
        letterSpacing: '.05em',
      }}>OFF</span>
    </span>
  )
}

/**
 * Componente router que elige la animación correcta según la tab y el
 * sistema actual del comerciante. Recibe tabId ('how' | 'discount'),
 * systemType ('stars' | 'points'), y active (la tab está visible/activa).
 * Devuelve el span con la animación + un mini-label de texto debajo
 * para que el dueño igual sepa qué tab es.
 */
export default function RecompensasTabAnim({ tabId, systemType = 'stars', active = true, discountPercent = null }) {
  let anim = null
  let label = ''
  if (tabId === 'how') {
    anim = systemType === 'points'
      ? <PointsAccumAnim active={active} />
      : <StarsAccumAnim active={active} />
    label = 'Acumulación'
  } else if (tabId === 'discount') {
    anim = <DiscountAnim active={active} percent={discountPercent} />
    label = 'Descuento'
  }
  return (
    <span style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start',
      gap: 2, lineHeight: 1,
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', height: 18 }}>{anim}</span>
      <span style={{
        fontFamily: FN, fontSize: 10.5, fontWeight: 700,
        color: active ? '#fff' : 'rgba(255,255,255,0.62)',
        letterSpacing: '.02em',
      }}>{label}</span>
    </span>
  )
}
