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
//  - id      : string único por vista (key de localStorage `benefix:help:<id>`)
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
const KEY_PREFIX = 'benefix:help:'

const TONES = {
  // Default: gradient violeta puro de marca (mismo del botón de soporte).
  default: {
    border: '1px solid rgba(189,75,248,0.40)',
    bg:     'linear-gradient(135deg, rgba(124,58,237,0.20) 0%, rgba(168,85,247,0.14) 50%, rgba(189,75,248,0.18) 100%)',
    iconBg: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #BD4BF8 100%)',
    iconShadow: '0 4px 14px rgba(168,85,247,0.40)',
    accent: '#D8B4FE',
  },
  stars: {
    border: '1px solid rgba(139,92,246,0.32)',
    bg:     'linear-gradient(135deg, rgba(139,92,246,0.14), rgba(124,58,237,0.06))',
    iconBg: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
    iconShadow: '0 4px 14px rgba(124,58,237,0.32)',
    accent: '#C4B5FD',
  },
  points: {
    border: '1px solid rgba(236,72,153,0.32)',
    bg:     'linear-gradient(135deg, rgba(236,72,153,0.14), rgba(219,39,119,0.06))',
    iconBg: 'linear-gradient(135deg, #EC4899, #DB2777)',
    iconShadow: '0 4px 14px rgba(219,39,119,0.32)',
    accent: '#FBCFE8',
  },
}

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
        margin: '0 0 12px',
        padding: '10px 36px 10px 12px',
        borderRadius: 14,
        border: t.border,
        background: t.bg,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        cursor: details ? 'pointer' : 'default',
        animation: 'helpBannerIn 320ms cubic-bezier(0.16,1,0.3,1)',
        userSelect: 'none',
      }}
    >
      <div style={{
        flexShrink: 0,
        width: 30,
        height: 30,
        borderRadius: 9,
        background: t.iconBg,
        boxShadow: t.iconShadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
      }}>
        <Icon size={15} strokeWidth={2.4} color="#fff" />
      </div>

      {/* Texto: title bold inline + body, todo acotado a 2 líneas cuando hay details. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FN,
          fontSize: 12.5,
          color: 'rgba(255,255,255,0.86)',
          lineHeight: 1.45,
          ...(collapsed ? {
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } : {}),
        }}>
          {title && (
            <strong style={{ color: '#fff', fontWeight: 700, letterSpacing: '0.01em' }}>
              {title}.
            </strong>
          )}
          {title && ' '}
          {body}
          {/* Detalles ampliados — solo cuando expanded, en línea continuada del body */}
          {expanded && details && (
            <span style={{ color: 'rgba(255,255,255,0.74)' }}>
              {' '}{details}
            </span>
          )}
        </div>
      </div>

      {/* Chevron sutil en la esquina inferior derecha del cartel cuando hay
          details — indica que el cartel se puede tocar para ver/contraer.
          Rota 180° cuando está expanded. */}
      {details && (
        <ChevronDown
          size={13}
          strokeWidth={2.4}
          color="rgba(255,255,255,0.55)"
          style={{
            position: 'absolute',
            bottom: 8,
            right: 10,
            transition: 'transform 200ms ease',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
            pointerEvents: 'none',
          }}
        />
      )}

      <button
        onClick={dismiss}
        aria-label="Cerrar ayuda"
        title="Cerrar"
        style={{
          position: 'absolute',
          top: 7,
          right: 7,
          width: 22,
          height: 22,
          borderRadius: 6,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = 'transparent' }}
      >
        <X size={12} strokeWidth={2.4} />
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
//    Borra todas las keys que arrancan con `benefix:help:`.
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
