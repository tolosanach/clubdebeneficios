'use client'

// IntentPickerView — pantalla post-OAuth que pregunta al user nuevo
// (o legacy) si quiere usar Benefix como cliente, comerciante, o ambos.
// La elección se persiste en `profiles.user_intent` y se marca
// `profiles.intent_prompt_shown=true` para no volver a mostrar.
//
// Casos de uso:
//   - User nuevo recién hizo OAuth y entra por primera vez.
//   - User legacy sin user_intent ni comercios — le mostramos esto UNA
//     vez la próxima vez que entre (después se marca intent_prompt_shown).
//
// Props:
//   - onChoose(intent) — callback con 'client' | 'merchant' | 'both'.
//     El padre persiste en DB y maneja la navegación que corresponde.
//   - onSkip() — callback si el user descarta. El padre marca
//     intent_prompt_shown=true igual, pero deja user_intent=NULL.

import { ShoppingBag, Store, Sparkles, X } from 'lucide-react'

const FN = "'Inter', system-ui, sans-serif"

export default function IntentPickerView({ onChoose, onSkip, userName }) {
  const firstName = (userName || '').split(' ')[0] || ''
  const greeting  = firstName ? `¡Hola, ${firstName}!` : '¡Hola!'

  const OPTIONS = [
    {
      id:    'client',
      Icon:  ShoppingBag,
      title: 'Soy cliente',
      desc:  'Quiero acumular puntos en comercios y aprovechar beneficios.',
      color: '#EC4899',  // fucsia (mi billetera)
      colorD:'#DB2777',
    },
    {
      id:    'merchant',
      Icon:  Store,
      title: 'Soy comerciante',
      desc:  'Quiero crear mi club y fidelizar a mis clientes.',
      color: '#BD4BF8',  // violeta de marca
      colorD:'#7C3AED',
    },
    {
      id:    'both',
      Icon:  Sparkles,
      title: 'Las dos cosas',
      desc:  'Tengo un comercio y también soy cliente de otros.',
      color: '#F5A623',  // ámbar
      colorD:'#D97706',
    },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000,
      background: '#0a0612',
      overflowY: 'auto',
      padding: '60px 20px 40px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* Botón "saltar" arriba a la derecha — se descarta el prompt */}
      {onSkip && (
        <button onClick={onSkip}
          aria-label="Saltar"
          style={{
            position: 'absolute', top: 20, right: 20,
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.65)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <X size={16} strokeWidth={2.4} />
        </button>
      )}

      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <div style={{
          fontFamily: FN, fontSize: 28, fontWeight: 900,
          color: '#fff', letterSpacing: '-.02em', marginBottom: 8,
        }}>
          {greeting}
        </div>
        <div style={{
          fontFamily: FN, fontSize: 16, fontWeight: 500,
          color: 'rgba(255,255,255,0.65)', marginBottom: 36, lineHeight: 1.5,
        }}>
          ¿Cómo querés usar Benefix?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {OPTIONS.map((opt, i) => {
            const Icon = opt.Icon
            return (
              <button
                key={opt.id}
                onClick={() => onChoose?.(opt.id)}
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  borderRadius: 18,
                  background: `linear-gradient(135deg, rgba(${hexToRgb(opt.color)},0.10), rgba(${hexToRgb(opt.color)},0.04))`,
                  border: `1px solid rgba(${hexToRgb(opt.color)},0.32)`,
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'transform 200ms cubic-bezier(0.22,1,0.36,1), border-color 200ms ease, background 200ms ease',
                  animation: `fadeUp 350ms cubic-bezier(0.22,1,0.36,1) ${i * 80}ms both`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.borderColor = `rgba(${hexToRgb(opt.color)},0.65)`
                  e.currentTarget.style.background = `linear-gradient(135deg, rgba(${hexToRgb(opt.color)},0.18), rgba(${hexToRgb(opt.color)},0.08))`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = `rgba(${hexToRgb(opt.color)},0.32)`
                  e.currentTarget.style.background = `linear-gradient(135deg, rgba(${hexToRgb(opt.color)},0.10), rgba(${hexToRgb(opt.color)},0.04))`
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: `linear-gradient(135deg, ${opt.color}, ${opt.colorD})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 8px 22px -6px ${opt.color}99`,
                }}>
                  <Icon size={24} color="#fff" strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                  <div style={{
                    fontFamily: FN, fontSize: 16, fontWeight: 800,
                    color: '#fff', marginBottom: 4,
                  }}>
                    {opt.title}
                  </div>
                  <div style={{
                    fontSize: 13, color: 'rgba(255,255,255,0.65)',
                    lineHeight: 1.5,
                  }}>
                    {opt.desc}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {onSkip && (
          <button onClick={onSkip}
            style={{
              marginTop: 22,
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.45)',
              fontFamily: FN, fontSize: 12,
              cursor: 'pointer',
              padding: 8,
            }}>
            Después decido
          </button>
        )}
      </div>
    </div>
  )
}

// Hex (#RRGGBB) → "r,g,b" para usar en rgba(...).
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r},${g},${b}`
}
