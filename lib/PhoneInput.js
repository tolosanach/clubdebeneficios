'use client'
import { useState, useEffect } from 'react'

// Códigos de país comunes para nuestros usuarios. Default Argentina.
// Si necesitás agregar más, mantené el orden por relevancia local.
export const COUNTRY_CODES = [
  { code: '+54',  label: 'AR', name: 'Argentina'  },
  { code: '+598', label: 'UY', name: 'Uruguay'    },
  { code: '+56',  label: 'CL', name: 'Chile'      },
  { code: '+595', label: 'PY', name: 'Paraguay'   },
  { code: '+55',  label: 'BR', name: 'Brasil'     },
  { code: '+591', label: 'BO', name: 'Bolivia'    },
  { code: '+51',  label: 'PE', name: 'Perú'       },
  { code: '+52',  label: 'MX', name: 'México'     },
  { code: '+57',  label: 'CO', name: 'Colombia'   },
  { code: '+34',  label: 'ES', name: 'España'     },
  { code: '+1',   label: 'US', name: 'EE.UU.'     },
  { code: '+39',  label: 'IT', name: 'Italia'     },
]

// Si el value del padre llega con código de país detectable, lo separamos.
// Para AR, además sacamos el "9" móvil que está entre código y número, así
// el usuario ve solo el área + número (ej: "2954123456") y no el formato
// internacional completo.
function splitValue(v) {
  if (!v) return { code: '+54', num: '' }
  // Ordenamos por longitud descendente para que +598 matchee antes que +5.
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
  for (const c of sorted) {
    if (v.startsWith(c.code)) {
      let num = v.slice(c.code.length).trim()
      // Normalización AR: si el value guardado es "+5491134..." mostramos
      // "1134..." sin el 9 móvil para que no se preste a confusión.
      if (c.code === '+54') num = num.replace(/^9/, '')
      return { code: c.code, num }
    }
  }
  return { code: '+54', num: v }
}

/**
 * PhoneInput — código de país + número, con microcopy estándar.
 *
 * - value (string): normalizado tipo "+54XXXXXX". Si no trae código, se asume AR.
 * - onChange (string => void): emite el normalizado completo "+54XXXXX".
 * - hint (bool): mostrar "sin 0 ni 15". Default true. Pasar false en contextos
 *   donde el espacio es premium (ej: form de alta manual de cliente).
 * - size: 'sm' | 'md' | 'lg' — escala padding y fontSize del input.
 * - placeholder: solo del número, no del código.
 */
export default function PhoneInput({
  value = '',
  onChange,
  autoFocus = false,
  placeholder,           // si no se pasa, default según país (ver abajo)
  hint = true,
  size = 'md',
}) {
  const initial = splitValue(value)
  const [code, setCode] = useState(initial.code)
  const [num,  setNum]  = useState(initial.num)

  // Sincroniza desde value prop si cambia externamente (ej: form reset).
  // No incluimos value en deps para evitar reset al tipear; sólo cuando el
  // padre setea un valor distinto al ya en estado.
  useEffect(() => {
    const p = splitValue(value)
    if (p.code !== code) setCode(p.code)
    const cleanProp = p.num.replace(/\D/g, '')
    const cleanState = num.replace(/\D/g, '')
    if (cleanProp !== cleanState) setNum(p.num)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function emit(c, n) {
    let cleanNum = n.replace(/\D/g, '')
    // Argentina: el "9" móvil va entre código de país y área. La app lo
    // agrega automáticamente para no confundir al usuario al ingresarlo.
    // Si el usuario lo tipeó por costumbre, lo sacamos para no duplicar.
    if (c === '+54' && cleanNum) {
      cleanNum = cleanNum.replace(/^9/, '')
      cleanNum = '9' + cleanNum
    }
    onChange?.(cleanNum ? `${c}${cleanNum}` : '')
  }

  const sizeStyles = {
    sm: { padding: '9px 12px',  fontSize: 13 },
    md: { padding: '12px 14px', fontSize: 14 },
    lg: { padding: '14px 16px', fontSize: 16 },
  }
  const s = sizeStyles[size] || sizeStyles.md

  // Estilo común para select e input. Usa CSS vars-friendly hardcoded values
  // que matchean el tema oscuro de la app.
  const fieldBase = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    color: '#fff',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          value={code}
          onChange={e => { setCode(e.target.value); emit(e.target.value, num) }}
          style={{
            ...fieldBase, ...s,
            cursor: 'pointer', flexShrink: 0,
            appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
            paddingRight: 24,
            backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(255,255,255,0.4)' d='M5 6L0 0h10z'/></svg>\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code} style={{ background: '#1a1a2e', color: '#fff' }}>
              {c.label} {c.code}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          autoFocus={autoFocus}
          value={num}
          onChange={e => { setNum(e.target.value); emit(code, e.target.value) }}
          placeholder={placeholder || (code === '+54' ? '2954 123456' : '11 1234 5678')}
          style={{ ...fieldBase, ...s, flex: 1, minWidth: 0 }}
        />
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 6 }}>
          {code === '+54' ? (
            <>📱 Ingresá tu número <strong style={{ color: 'rgba(255,255,255,0.65)' }}>sin el 0</strong> al inicio ni el <strong style={{ color: 'rgba(255,255,255,0.65)' }}>15</strong>. Ej: 2954 123456</>
          ) : (
            <>📱 Ingresá tu número con el código de área. Ej: 11 1234 5678</>
          )}
        </div>
      )}
    </div>
  )
}
