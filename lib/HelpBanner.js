'use client'

// HelpBanner — cartel de ayuda compacto al tope de cada vista.
//
// Estilo: gradient violeta puro de marca, ícono "?" igual al del botón
// flotante de soporte. Diseño deliberadamente CHICO — el cartel ocupa solo
// 2 líneas en total cuando está colapsado.
//
// Interacción: el cartel completo es cliqueable cuando hay `details`. Click
// en cualquier parte del cartel (excepto la X) → expande / contrae. No hay
// botón "Ver más" textual — un chevron chiquito en la esquina inferior
// derecha indica que se puede tocar.
//
// API:
//  - id      : string único por vista (key de localStorage `clufix:help:<id>`)
//  - title   : prefijo bold del body (1-3 palabras)
//  - body    : descripción corta. Cuando hay `details`, se acota a 2 líneas.
//  - details : (opcional) JSX/string ampliado que aparece al expandir
//  - icon    : (opcional) componente lucide custom (default: HelpCircle)
//  - tone    : 'default' | 'stars' | 'points'
//
// Util: `resetAllHelpBanners()` para que el botón "Volver a ver carteles"
// los muestre todos de nuevo.

import { useEffect, useState } from 'react'
import { X, HelpCircle, ChevronDown } from 'lucide-react'

const FN = "'Space Grotesk', system-ui, sans-serif"
const KEY_PREFIX = 'clufix:help:'

// Paleta unificada en gama de violetas. Todos los tonos comparten el
// mismo fondo violeta oscuro y border claro — solo cambian acentos
// menores. Ícono sin fondo de relleno (solo trazo). Sin bordes
// redondeados para que se sienta como una "tira de info" plana.
const VIOLET_TONE = {
  border: '1px solid rgba(216,180,254,0.40)',
  bg:     'rgba(20,8,40,0.85)',
  iconBg: 'transparent',
  iconShadow: 'none',
  iconColor: '#D8B4FE',
  titleColor: '#E9D5FF',
  bodyColor:  '#C4B5FD',
  detailColor:'#A78BFA',
}
const TONES = { default: VIOLET_TONE, stars: VIOLET_TONE, points: VIOLET_TONE }

export default function HelpBanner({ id, title, body, details, icon: Icon = HelpCircle, tone = 'default' }) {
  // Empezamos ocultos para evitar flash en SSR — el primer useEffect decide.
  const [show, setShow]         = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!id) return
    if (typeof window === 'undefined') return
    try {
      const seen = localStorage.getItem(KEY_PREFIX + id)
      if (!seen) setShow(true)
    } catch {
      setShow(true)
    }
  }, [id])

  function dismiss(e) {
    e?.stopPropagation?.()
    setShow(false)
    try { localStorage.setItem(KEY_PREFIX + id, '1') } catch {}
  }

  function toggle() {
    if (!details) return
    setExpanded(e => !e)
  }

  if (!show) return null

  const t = TONES[tone] || TONES.default
  // Solo aplicamos line-clamp al body cuando hay `details` y no está expandido.
  const collapsed = details && !expanded

  return (
    <div
      role={details ? 'button' : 'note'}
      aria-label={title}
      aria-expanded={details ? expanded : undefined}
      onClick={toggle}
      style={{
        position: 'relative',
        margin: '0 0 16px',
        padding: '10px 32px 10px 12px',
        // Sin bordes redondeados: tira plana de info en gama violeta.
        borderRadius: 0,
        border: t.border,
        background: t.bg,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        cursor: details ? 'pointer' : 'default',
        animation: 'helpBannerIn 320ms cubic-bezier(0.16,1,0.3,1)',
        userSelect: 'none',
      }}
    >
      {/* Ícono sin relleno — solo el trazo del SVG en color violeta claro.
          Antes vivía dentro de un cuadrado violeta con gradient + shadow;
          ahora va "pelado" para que la tira se sienta más sobria. */}
      <Icon
        size={16}
        strokeWidth={2}
        color={t.iconColor}
        style={{ flexShrink: 0, marginTop: 1 }}
      />

      {/* Texto: title inline + body, todo acotado a 2 líneas cuando hay details. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FN,
          fontSize: 12,
          color: t.bodyColor,
          lineHeight: 1.45,
          ...(collapsed ? {
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } : {}),
        }}>
          {title && (
            <strong style={{ color: t.titleColor, fontWeight: 700, letterSpacing: '0.01em' }}>
              {title}.
            </strong>
          )}
          {title && ' '}
          {body}
          {expanded && details && (
            <span style={{ color: t.detailColor }}>
              {' '}{details}
            </span>
          )}
        </div>
      </div>

      {/* Chevron de "ver más" — color violeta claro. */}
      {details && (
        <ChevronDown
          size={11}
          strokeWidth={2.2}
          color={t.detailColor}
          style={{
            position: 'absolute',
            bottom: 7,
            right: 9,
            transition: 'transform 200ms ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Botón cerrar (X) — también en gama violeta. */}
      <button
        onClick={dismiss}
        aria-label="Cerrar ayuda"
        title="Cerrar"
        style={{
          position: 'absolute',
          top: 5,
          right: 5,
          width: 20,
          height: 20,
          borderRadius: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: t.detailColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = t.titleColor; e.currentTarget.style.background = 'rgba(189,75,248,0.18)' }}
        onMouseLeave={e => { e.currentTarget.style.color = t.detailColor; e.currentTarget.style.background = 'transparent' }}
      >
        <X size={10} strokeWidth={2.4} />
      </button>
      <style jsx>{`
        @keyframes helpBannerIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ── Util para que "Volver a ver carteles de ayuda" pueda resetearlos todos.
//    Borra todas las keys que arrancan con `clufix:help:`.
export function resetAllHelpBanners() {
  if (typeof window === 'undefined') return 0
  let count = 0
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(KEY_PREFIX)) keys.push(k)
    }
    keys.forEach(k => { localStorage.removeItem(k); count++ })
  } catch {}
  return count
}
