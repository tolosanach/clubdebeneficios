'use client'

// ContextSwitchPill — pill horizontal con 2 segmentos para alternar
// entre el contexto cliente y comercio. Pensado para vivir en el header
// global, al lado del logo Clufix.
//
// Visible solo cuando shouldShowContextSwitch === true (ver caller).
// Sin selector multi-comercio: ese va a vivir aparte cuando se active
// multi-sucursal.
//
// Props:
//   activeContext: 'client' | 'merchant'
//   onChange:      (next) => void
//   visible:       boolean

// Color del segmento activo — SEGÚN EL MODO: Cliente = fucsia, Comercio =
// violeta. Así el switch mismo comunica en qué contexto estás.
const MODE_COLOR = { client: '#D6198C', merchant: '#6F30DF' }
const MODE_GLOW  = { client: 'rgba(214,25,140,0.50)', merchant: 'rgba(111,48,223,0.50)' }

export default function ContextSwitchPill({ activeContext, onChange, visible = true }) {
  if (!visible) return null

  const segments = [
    { id: 'client',   label: 'Cliente'  },
    { id: 'merchant', label: 'Comercio' },
  ]

  return (
    <div
      role="group"
      aria-label="Contexto activo"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        height: 32,
        padding: '0 4px',
        borderRadius: 999,
        background: 'rgba(0,0,0,0.30)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {segments.map(seg => {
        const active = seg.id === activeContext
        return (
          <button
            key={seg.id}
            onClick={() => onChange?.(seg.id)}
            aria-pressed={active}
            style={{
              padding: '0 14px',
              height: 24,
              border: 'none',
              borderRadius: 999,
              cursor: active ? 'default' : 'pointer',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'inherit',
              color: active ? '#fff' : 'rgba(255,255,255,0.65)',
              background: active ? MODE_COLOR[seg.id] : 'transparent',
              boxShadow: active ? `0 2px 10px ${MODE_GLOW[seg.id]}` : 'none',
              outline: 'none',
              transition: 'background 180ms ease, color 180ms ease',
            }}
          >
            {seg.label}
          </button>
        )
      })}
    </div>
  )
}
