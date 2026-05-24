'use client'

// PlacesAutocomplete — input con autocomplete de Google Places (New)
// que prelena los datos del comercio (nombre, dirección, teléfono,
// website, categorías sugeridas) en el wizard de registro.
//
// Flujo:
//   1. El user empieza a tipear en el input → debounce 300ms → POST a
//      /api/places/autocomplete con un session token UUID v4.
//   2. Mostramos sugerencias en un dropdown abajo del input.
//   3. Al hacer click en una → POST a /api/places/details con el mismo
//      session token (Google factura toda la "sesión" como una operación
//      → más barato).
//   4. Llamamos al callback `onPlaceSelected(place)` con el objeto
//      normalizado por el backend.
//   5. Generamos un nuevo session token tras la selección o si pasaron
//      3 minutos sin actividad.
//
// Props:
//   - value: string (el nombre actual)
//   - onChange(value): callback cuando el user tipea
//   - onPlaceSelected(place): callback cuando elige una sugerencia.
//     El objeto `place` viene del backend con los campos normalizados.
//   - placeholder, autoFocus, style: pasan al input
//   - disabled: si true, el input se desactiva (sin autocomplete)

import { useEffect, useRef, useState } from 'react'
import { Search, MapPin, Loader, X } from 'lucide-react'

const FN = "'Inter', system-ui, sans-serif"

// Color de marca para el highlight de las filas. Sin imports cruzados —
// usamos rgba directos así el componente es portable.
const VIOLET    = '#6F30DF'
const VIOLET_BG = 'rgba(189,75,248,0.10)'
const RIM       = 'rgba(255,255,255,0.12)'

// ── helpers ─────────────────────────────────────────────────────────────
function uuidv4() {
  // Random UUID v4 — sin dep externa para no inflar el bundle
  // del registro. crypto.randomUUID() existe en todos los browsers
  // modernos + node 19+.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback (browsers viejos): Math.random hex
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const SESSION_IDLE_MS = 3 * 60 * 1000  // 3 minutos sin actividad → nuevo token

export default function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  placeholder = 'Ej: Café Berlín',
  autoFocus = false,
  disabled = false,
  style,
  inputStyle,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingPick, setLoadingPick] = useState(false)
  const [err, setErr]                 = useState('')

  const sessionTokenRef = useRef(uuidv4())
  const lastActivityRef = useRef(Date.now())
  const debounceRef     = useRef(null)
  const reqIdRef        = useRef(0)
  const wrapRef         = useRef(null)

  function regenSessionToken() {
    sessionTokenRef.current = uuidv4()
    lastActivityRef.current = Date.now()
  }

  // Si pasaron > 3min sin actividad cuando el user vuelve a tipear,
  // regeneramos el token (Google considera la sesión cerrada).
  function bumpActivity() {
    const now = Date.now()
    if (now - lastActivityRef.current > SESSION_IDLE_MS) {
      regenSessionToken()
    } else {
      lastActivityRef.current = now
    }
  }

  // ── Cierre del dropdown al click afuera ──
  useEffect(() => {
    function onDoc(e) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // ── Búsqueda con debounce ──
  // Cancelamos en cleanup para que un cambio rápido no dispare múltiples
  // fetches; reqIdRef discrimina respuestas viejas.
  function handleInput(v) {
    onChange?.(v)
    if (disabled) return
    bumpActivity()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!v || v.trim().length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    setShowDropdown(true)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(v.trim())
    }, 300)
  }

  async function fetchSuggestions(input) {
    const myReqId = ++reqIdRef.current
    setLoadingList(true)
    setErr('')
    try {
      const res = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, sessionToken: sessionTokenRef.current }),
      })
      if (myReqId !== reqIdRef.current) return  // respuesta vieja, ignorar
      if (!res.ok) {
        // Falla blanda — no rompemos UX, dejamos que el user escriba a mano.
        setSuggestions([])
        setLoadingList(false)
        return
      }
      const data = await res.json()
      setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : [])
    } catch {
      if (myReqId === reqIdRef.current) {
        setErr('No pudimos buscar ahora — seguí escribiendo a mano.')
        setSuggestions([])
      }
    } finally {
      if (myReqId === reqIdRef.current) setLoadingList(false)
    }
  }

  async function handlePick(s) {
    setShowDropdown(false)
    setLoadingPick(true)
    setErr('')
    try {
      const res = await fetch('/api/places/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: s.placeId, sessionToken: sessionTokenRef.current }),
      })
      if (!res.ok) {
        setErr('No pudimos traer los datos. Probá otra opción o seguí a mano.')
        return
      }
      const data = await res.json()
      const place = data?.place
      if (!place) {
        setErr('Datos vacíos. Probá otra opción.')
        return
      }
      // Le pegamos al input el nombre real (Google a veces normaliza
      // capitalización y mayúsculas). El padre recibe el objeto completo
      // y prelena el resto de campos vía onPlaceSelected.
      onChange?.(place.name || s.mainText || '')
      onPlaceSelected?.(place)
      // Cerramos sesión con Google: nuevo token para la próxima búsqueda.
      regenSessionToken()
    } catch {
      setErr('Algo salió mal. Probá de nuevo en un rato.')
    } finally {
      setLoadingPick(false)
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', ...(style || {}) }}>
      <div style={{ position: 'relative' }}>
        <Search
          size={15}
          color="rgba(255,255,255,0.45)"
          strokeWidth={2.2}
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          value={value || ''}
          autoFocus={autoFocus}
          disabled={disabled || loadingPick}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true)
          }}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '14px 16px 14px 38px',
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${RIM}`,
            borderRadius: 14,
            color: '#fff',
            fontSize: 16,
            fontFamily: FN,
            outline: 'none',
            boxSizing: 'border-box',
            opacity: loadingPick ? 0.6 : 1,
            ...(inputStyle || {}),
          }}
        />
        {/* Spinner a la derecha cuando estamos buscando */}
        {(loadingList || loadingPick) && (
          <Loader
            size={15}
            color="rgba(255,255,255,0.55)"
            strokeWidth={2.2}
            style={{
              position: 'absolute', right: 14, top: '50%',
              transform: 'translateY(-50%)',
              animation: 'spin 0.9s linear infinite',
            }}
          />
        )}
      </div>

      {/* Mensaje suave de error si la API falla */}
      {err && (
        <div style={{
          marginTop: 6,
          fontSize: 11.5,
          color: 'rgba(255,255,255,0.55)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <X size={11} strokeWidth={2.4} color="rgba(255,255,255,0.45)" />
          {err}
        </div>
      )}

      {/* Dropdown de sugerencias */}
      {showDropdown && (suggestions.length > 0 || loadingList) && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0, right: 0,
          background: 'rgba(20,12,32,0.96)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          border: `1px solid ${RIM}`,
          borderRadius: 14,
          boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
          overflow: 'hidden',
          zIndex: 50,
          maxHeight: 320,
          overflowY: 'auto',
        }}>
          {loadingList && suggestions.length === 0 && (
            <div style={{
              padding: '14px 16px',
              fontSize: 12,
              color: 'rgba(255,255,255,0.55)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Loader size={13} strokeWidth={2.2} style={{ animation: 'spin 0.9s linear infinite' }} />
              Buscando en Google Maps…
            </div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={s.placeId}
              type="button"
              onClick={() => handlePick(s)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px',
                background: 'transparent',
                border: 'none',
                borderTop: i === 0 ? 'none' : `1px solid rgba(255,255,255,0.06)`,
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: FN,
                transition: 'background 140ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = VIOLET_BG }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <MapPin size={14} color={VIOLET} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.mainText}
                </div>
                {s.secondaryText && (
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 2, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.secondaryText}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
