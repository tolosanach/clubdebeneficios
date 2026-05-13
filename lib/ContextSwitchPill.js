'use client'

// ContextSwitchPill — pill horizontal con 2 segmentos para alternar
// entre el contexto cliente y comercio. Pensado para vivir en el header
// global, al lado del logo Benefix.
//
// Visible solo cuando shouldShowContextSwitch === true (ver caller).
// Sin selector multi-comercio: ese va a vivir aparte cuando se active
// multi-sucursal.
//
// Props:
//   activeContext: 'client' | 'merchant'
//   onChange:      (next) => void
//   visible:       boolean

// Color del segmento activo segun contexto. Violeta brand solido para
// merchant, fucsia solido para cliente — matchea al QR central del
// BottomNavV2 sin gradients (rebrand mayo 2026).
const ROLE_COLOR = {
  merchant: '#7131E1',
  client:   '#EC4899',
}

export default function ContextSwitchPill({ activeContext, onChange, visible = true }) {
  if (!visible) return null

  const segments = [
    { id: 'client',   label: 'Cliente'  },
    { id: 'merchant', label: 'Comercio' },
  ]
  const activeColor = ROLE_COLOR[activeContext] || ROLE_COLOR.client

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
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
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
              background: active ? activeColor : 'transparent',
              boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.10)' : 'none',
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
