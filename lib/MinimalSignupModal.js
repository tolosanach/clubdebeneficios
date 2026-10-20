'use client'

// MinimalSignupModal — flujo de registro de baja fricción (abr 2026).
//
// Reemplaza el OnboardingFlow viejo de 6 pasos para usuarios nuevos. Se
// muestra una sola vez después del primer login OAuth, según el rol que el
// usuario eligió en el landing ("Soy cliente" / "Soy comercio") y que viene
// guardado en sessionStorage `clufix:signupAs`.
//
// Modos:
//   • client   — pide nombre + teléfono. Listo, ya puede usar la app como
//                socio: tarjeta personal con QR, sumarse a clubes, etc.
//   • merchant — además de los datos personales pide nombre del negocio,
//                rubro(s) (max 3, reusando FAMILIES_DATA), ciudad y sistema
//                de fidelización (stars vs points). Crea la fila en
//                `commerces` y deja al user listo para escanear clientes.
//
// Diseño: una sola pantalla con secciones, scroll si hace falta. NADA de
// upload de logos ni descripciones largas — eso lo carga después en "Mi
// negocio". El objetivo es que en menos de 30 segundos el flujo termine.
//
// Cross-rol: el modal se puede abrir manualmente vía
//   window.dispatchEvent(new CustomEvent('clufix:open-signup', { detail: { mode: 'merchant' } }))
// para que un cliente existente registre su negocio sin pasar por el OAuth
// de nuevo, o un comerciante cargue sus datos personales.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, ChevronDown, X, Store, Star, Coins, AlertTriangle, Search, User as UserIcon, MapPin, Sparkles, CheckCircle } from 'lucide-react'
import { FAMILIES_DATA } from './commerce-families-data'
import { LOCATIONS } from './locations'
import PhoneInput from './PhoneInput'
import PlacesAutocomplete from './PlacesAutocomplete'

// G — antes era gradient orange→fucsia. Rebrand mayo 2026 fase 2:
// violeta brand sólido. Mantengo el nombre G por compat de call sites.
const G  = '#E03E1B'
const FN = "'Space Grotesk', system-ui, sans-serif"
const FI = "'Inter', system-ui, sans-serif"
const C = {
  white: '#FFFFFF', pearl: '#FFEDE6', mist: '#B3A596', dust: '#9A8C7E',
  v: '#E03E1B', rim: 'rgba(255,255,255,0.10)',
}

// Subcategorías indexadas para el buscador de rubros. Cada item incluye
// nombre + alias para que "ropa" matchee "Indumentaria", etc.
const ALL_SUBS = FAMILIES_DATA.flatMap(f =>
  f.subs.map(s => ({ family: f.name, name: s.name, aliases: s.aliases || [] }))
)

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// ─── SearchableSelect — combobox custom para Provincia y Ciudad ──────────────
// Reemplaza al <select> nativo para que el user pueda tipear las primeras
// letras y filtrar la lista en tiempo real (con tolerancia a acentos via
// normalize). Click → abre dropdown con todas las opciones; tipear → filtra;
// Enter → selecciona la primera coincidencia; Escape o click afuera → cierra.
function SearchableSelect({ value, onChange, options, placeholder, disabled }) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef(null)
  const inputRef   = useRef(null)

  const selected = options.find(o => o.value === value)

  // Filtrado tolerante a acentos. Match si el query aparece en el label.
  const filtered = (() => {
    const q = normalize(search).trim()
    if (!q) return options
    return options.filter(o => normalize(o.label).includes(q))
  })()

  // Cerrar al click afuera del wrapper.
  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function handleSelect(opt) {
    onChange(opt.value)
    setOpen(false)
    setSearch('')
    if (inputRef.current) inputRef.current.blur()
  }
  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); setSearch(''); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) handleSelect(filtered[0])
      return
    }
    if (e.key === 'ArrowDown' && !open) { setOpen(true); return }
  }
  function handleFocus() {
    if (disabled) return
    setOpen(true)
  }

  // Lo que se muestra dentro del input: si está abierto, lo que el user tipeó;
  // si está cerrado, el label del valor seleccionado (o vacío).
  const displayValue = open ? search : (selected?.label || '')

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={e => { setSearch(e.target.value); if (!open) setOpen(true) }}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        style={{
          width: '100%',
          padding: '13px 38px 13px 14px',
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid rgba(255,255,255,${open ? 0.30 : 0.12})`,
          borderRadius: 14,
          color: disabled ? 'rgba(255,255,255,0.45)' : C.white,
          fontSize: 15, fontFamily: FI,
          boxSizing: 'border-box', outline: 'none',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.5 : 1,
          transition: 'border 180ms ease',
        }}
      />
      <ChevronDown
        size={16}
        color={C.dust}
        style={{
          position: 'absolute', right: 14, top: '50%',
          transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          pointerEvents: 'none',
          transition: 'transform 220ms ease',
        }}
      />
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#14100D',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          maxHeight: 220,
          overflowY: 'auto',
          zIndex: 20,
          boxShadow: '0 12px 28px rgba(0,0,0,0.50)',
          padding: 4,
        }}>
          {filtered.length === 0 && (
            <div style={{
              padding: '14px',
              fontSize: 13,
              color: C.dust,
              textAlign: 'center',
            }}>
              Sin resultados
            </div>
          )}
          {filtered.map(opt => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onMouseDown={e => e.preventDefault() /* evita que el blur del input cierre antes del click */}
                onClick={() => handleSelect(opt)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: isSelected ? 'rgba(224,62,27,0.20)' : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontFamily: FI, fontSize: 14,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'background 140ms ease',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function MinimalSignupModal({ user, profile, mode = 'client', onComplete, onClose }) {
  // Datos comunes (cliente y comerciante).
  // Si el user ya tiene perfil onboardeado (caso "soy cliente que abre
  // negocio"), prellenamos con los datos del profile en vez de pedirlos
  // de nuevo. user_metadata es fallback para users recién creados.
  const initialName = profile?.full_name || profile?.name
    || user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  const initialPhone = profile?.phone || ''
  const initialProvince = profile?.province || ''
  const initialCity = profile?.city || ''
  const [name,         setName]         = useState(initialName)
  const [phone,        setPhone]        = useState(initialPhone)
  const [province,     setProvince]     = useState(initialProvince)
  const [city,         setCity]         = useState(initialCity)

  // Datos solo merchant.
  const [businessName, setBusinessName] = useState('')
  const [categories,   setCategories]   = useState([])  // hasta 3 nombres de subcategoría
  const [customCat,    setCustomCat]    = useState('')
  const [progType,     setProgType]     = useState('stars')
  const [catSearch,    setCatSearch]    = useState('')
  const [catFamilyId,  setCatFamilyId]  = useState(null)

  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState('')

  // Estado del autocomplete de Google Places (paso 2 merchant). Si el user
  // elige una sugerencia, guardamos qué se importó para mostrar el banner
  // "Datos importados de Google Maps" debajo del input.
  const [googleImported, setGoogleImported] = useState(null)

  const isMerchant = mode === 'merchant'

  // Helper para comparar strings sin tildes ni mayúsculas (matcheo robusto
  // contra los enums de LOCATIONS y FAMILIES_DATA).
  function norm(s) {
    return (s || '').toString().toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
  }

  // Callback al elegir una sugerencia del PlacesAutocomplete. Setea cada
  // state independiente del wizard merchant. Ojo: el wizard NO tiene campos
  // de país/dirección/website, así que solo prelenamos lo que tiene un
  // destino útil acá: businessName, phone, province, city, primer rubro.
  function handleGooglePlaceSelected(place) {
    if (!place) return
    console.log('[MinimalSignupModal.handleGooglePlace] received:', place)

    // Provincia: matchear contra el enum de Argentina.
    let mappedProvince = ''
    if (place.province) {
      const target = norm(place.province)
      for (const [key, data] of Object.entries(LOCATIONS.argentina.provinces)) {
        if (norm(data.name) === target) { mappedProvince = key; break }
      }
    }

    // Ciudad: el array de cities son strings (no keys). Match exacto.
    let mappedCity = ''
    if (mappedProvince && place.locality) {
      const cs = LOCATIONS.argentina.provinces[mappedProvince]?.cities || []
      const target = norm(place.locality)
      const found = cs.find(c => norm(c) === target)
      if (found) mappedCity = found
    }

    // Categoría: primer rubro sugerido que aparezca en FAMILIES_DATA.subs[].
    // Si lo encontramos, lo agregamos al array de categories (que ya puede
    // tener seleccionados manualmente — respetamos el tope de 3).
    // Match tolerante a tildes y mayúsculas (norm()) para que "Jugueteria"
    // matchee "Juguetería" y similares — sino discrepancias de tipeo en el
    // mapa Google (sin tilde) hacen perder el match. Cuando matchea,
    // usamos el name canónico de FAMILIES_DATA (con tildes) para que
    // CategoryPicker lo refleje como seleccionado.
    let prefilledCat = null
    for (const sugg of (place.suggestedCategories || [])) {
      const target = norm(sugg)
      let canonicalName = null
      for (const f of FAMILIES_DATA) {
        const sub = f.subs.find(s => norm(s.name) === target)
        if (sub) { canonicalName = sub.name; break }
      }
      if (canonicalName) { prefilledCat = canonicalName; break }
    }

    // Aplicar: name del negocio, teléfono, provincia, ciudad, categoría.
    if (place.name)   setBusinessName(place.name)
    if (place.phone)  setPhone(place.phone)
    if (mappedProvince) setProvince(mappedProvince)
    if (mappedCity)     setCity(mappedCity)
    if (prefilledCat) {
      setCategories(prev => prev.includes(prefilledCat) || prev.length >= 3
        ? prev
        : [...prev, prefilledCat])
    }

    // Guardamos TODOS los campos extras del place en googleImported para
    // mandarlos en el submit y prellenar más datos del comercio (dirección,
    // lat/lng, horarios estructurados, link a Maps). El backend decide qué
    // hacer con cada uno; el frontend solo los persiste hasta el submit.
    setGoogleImported({
      placeId: place.placeId,
      provinceMatched: !!mappedProvince,
      cityMatched: !!mappedCity,
      categoryMatched: !!prefilledCat,
      address: place.streetAddress || place.address || null,
      latitude: place.latitude ?? null,
      longitude: place.longitude ?? null,
      openingHours: place.openingHours || null,
      googleMapsUrl: place.googleMapsUrl || null,
      website: place.website || null,
    })
  }

  // Limpiar el banner de "Datos importados" si el user borra el nombre o lo
  // edita radicalmente — sino queda mintiendo. Es heurística simple: si el
  // input vuelve a estar vacío, ya no hay import vigente.
  function clearGoogleImport() {
    setGoogleImported(null)
    setBusinessName('')
  }

  // ── Multi-step (solo merchant) ──────────────────────────────────────────
  // El flujo merchant se divide en 4 pasos para reducir fricción:
  //   1. Tus datos (nombre + teléfono opcional)
  //   2. Tu negocio (nombre del comercio + rubros)
  //   3. Ubicación (provincia + ciudad)
  //   4. Sistema de fidelización (stars vs points) + submit
  // El flujo client mantiene su pantalla única — son pocos campos y dividirlo
  // sería sobre-fragmentar.
  // Una pregunta por pantalla (oct 2026). Si el user ya tiene nombre y
  // teléfono (cliente que abre negocio) salteamos las dos primeras.
  const skipPersonalStep = !!(profile?.name && profile?.phone)
  const SCREENS = skipPersonalStep
    ? ['biz', 'cat', 'loc', 'sys']
    : ['name', 'phone', 'biz', 'cat', 'loc', 'sys']
  const TOTAL_STEPS = SCREENS.length
  const [step, setStep] = useState(1)   // 1-based sobre SCREENS
  const screen = SCREENS[step - 1]

  // Provincias/ciudades derivadas (Argentina hard-codeada).
  const provinces = useMemo(() => Object.entries(LOCATIONS.argentina.provinces), [])
  const cities = useMemo(() => {
    if (!province) return []
    return LOCATIONS.argentina.provinces[province]?.cities || []
  }, [province])

  // Búsqueda de rubros: filtramos contra name + family + aliases.
  const filteredSubs = useMemo(() => {
    const q = normalize(catSearch).trim()
    if (!q) return []
    return ALL_SUBS.filter(s => {
      if (normalize(s.name).includes(q)) return true
      if (normalize(s.family).includes(q)) return true
      return s.aliases.some(a => normalize(a).includes(q))
    }).slice(0, 12)
  }, [catSearch])

  // Family activa para drill-down (cuando no hay search).
  const activeFamily = useMemo(() => {
    if (!catFamilyId) return null
    return FAMILIES_DATA.find(f => f.id === catFamilyId)
  }, [catFamilyId])

  function toggleCategory(name) {
    setCategories(prev => {
      if (prev.includes(name)) return prev.filter(c => c !== name)
      if (prev.length >= 3) return prev  // tope de 3
      return [...prev, name]
    })
  }

  // Validación per-mode.
  // Merchant: el teléfono es REALMENTE opcional (la UI dice "opcional" y queremos
  // que el flujo lo respete — sin fricción). Cliente sigue requiriéndolo porque
  // los comercios necesitan poder contactar al socio.
  const phoneValid    = phone.replace(/\D/g, '').length >= 8
  const locationValid = !!(province && city)
  const clientValid   = !!name.trim() && phoneValid && locationValid
  const merchantValid = !!name.trim() && locationValid && !!businessName.trim() && categories.length > 0
  const canSubmit     = isMerchant ? merchantValid : clientValid

  // Validación per-step (solo aplica al flujo merchant).
  // Nombre siempre requerido. Teléfono es opcional para merchant, así que
  // no bloquea el avance en step 1.
  function stepValid(s) {
    const k = SCREENS[s - 1]
    if (k === 'name')  return !!name.trim()
    if (k === 'phone') return true
    if (k === 'biz')   return !!businessName.trim()
    if (k === 'cat')   return categories.length > 0
    if (k === 'loc')   return !!province && !!city
    if (k === 'sys')   return !!progType
    return false
  }
  function goNext() {
    if (!stepValid(step)) return
    if (step < TOTAL_STEPS) setStep(step + 1)
    else handleSubmit()
  }
  function goBack() {
    if (step > 1) setStep(step - 1)
  }
  const onEnter = (e) => { if (e.key === 'Enter') { e.preventDefault(); goNext() } }

  async function handleSubmit() {
    if (!canSubmit || submitting) return
    setError('')
    setSubmitting(true)
    try {
      const body = isMerchant
        ? {
            mode: 'merchant',
            name: name.trim(),
            phone: phone.trim() || null,
            country: 'argentina',
            province,
            city,
            businessName: businessName.trim(),
            categories,
            customCategory: customCat.trim() || undefined,
            prog_type: progType,
            // Datos extras del place de Google Maps (si el user eligió uno
            // del autocomplete). El backend los guarda en commerces para
            // que la página pública del club tenga dirección, mapa, horarios
            // y link de Maps de entrada, sin tener que pedirlos al dueño.
            googlePlace: googleImported ? {
              placeId:       googleImported.placeId       || null,
              address:       googleImported.address       || null,
              latitude:      googleImported.latitude      ?? null,
              longitude:     googleImported.longitude     ?? null,
              openingHours:  googleImported.openingHours  || null,
              googleMapsUrl: googleImported.googleMapsUrl || null,
              website:       googleImported.website       || null,
            } : null,
          }
        : {
            mode: 'client',
            name: name.trim(),
            phone: phone.trim(),
            country: 'argentina',
            province,
            city,
          }
      const res = await fetch('/api/signup/minimal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo guardar. Intentá de nuevo.')
        return
      }
      // Limpiamos la intención del landing para que no reaparezca.
      try { sessionStorage.removeItem('clufix:signupAs') } catch {}
      onComplete && onComplete({ mode, commerce_id: data.commerce_id, slug: data.slug })
    } catch (e) {
      setError('Error de conexión. Revisá tu internet e intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── UI helpers ────────────────────────────────────────────────────────

  const inputStyle = {
    width: '100%', padding: '13px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 14, color: C.white, fontSize: 15, fontFamily: FI,
    boxSizing: 'border-box', outline: 'none',
  }
  const labelStyle = {
    fontSize: 11, color: C.dust, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7,
    fontFamily: FN,
  }

  // ── Estilos compartidos del footer del multi-step ──
  const navBtnPrimary = (enabled) => ({
    flex: 1, padding: '15px 16px', borderRadius: 14,
    background: G, border: 'none', color: '#fff',
    fontFamily: FN, fontSize: 14, fontWeight: 800,
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.42,
    boxShadow: enabled ? '0 8px 28px rgba(224,62,27,0.40)' : 'none',
    transition: 'opacity 200ms ease, box-shadow 200ms ease',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  })
  const navBtnGhost = {
    padding: '15px 18px', borderRadius: 14,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: C.pearl, fontFamily: FN, fontSize: 14, fontWeight: 600,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  }

  // Título/subtítulo de cada pantalla.
  const SCREEN_COPY = {
    name:  { title: '¿Cómo te llamás?',            sub: 'Así te saludamos en tu panel.' },
    phone: { title: '¿Un WhatsApp de contacto?',   sub: 'Opcional. Lo podés cargar después.' },
    biz:   { title: '¿Cómo se llama tu negocio?',  sub: 'Si aparece en Google Maps, elegilo y completamos el resto por vos.' },
    cat:   { title: '¿A qué se dedica?',           sub: 'Elegí hasta 3 rubros.' },
    loc:   { title: '¿Dónde está?',                sub: 'Para que tus clientes te encuentren.' },
    sys:   { title: '¿Cómo suman tus clientes?',   sub: 'Lo podés cambiar después desde tu panel.' },
  }

  // ── Render del flujo merchant: una pregunta por pantalla ───────────────
  function renderMerchantFlow() {
    const isLast  = step === TOTAL_STEPS
    const enabled = stepValid(step) && !submitting
    const copy    = SCREEN_COPY[screen]
    const phoneEmpty = screen === 'phone' && phone.replace(/\D/g, '').length < 4
    const btnLabel = submitting && isLast ? 'Creando tu club…'
      : isLast ? 'Crear mi club'
      : phoneEmpty ? 'Ahora no'
      : 'Continuar'

    const pane = (key, children) => (
      <div key={key} style={{ width: `${100 / TOTAL_STEPS}%`, flexShrink: 0, padding: '6px 24px 24px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          {key === screen && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: FN, fontSize: 27, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.02em', color: C.white }}>{copy.title}</div>
              <div style={{ fontSize: 14, color: C.mist, lineHeight: 1.5, marginTop: 8 }}>{copy.sub}</div>
            </div>
          )}
          {children}
        </div>
      </div>
    )

    return (
      <>
        {/* Header: atrás · progreso · cerrar */}
        <div style={{ padding: '14px 14px 18px', flexShrink: 0, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={goBack} aria-label="Volver" disabled={step === 1}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: step === 1 ? 'default' : 'pointer', padding: 6, lineHeight: 0, opacity: step === 1 ? 0 : 1 }}>
            <ChevronLeft size={22} strokeWidth={2.2} />
          </button>
          <div style={{ flex: 1, display: 'flex', gap: 6 }}>
            {SCREENS.map((k, i) => (
              <div key={k} style={{ flex: 1, height: 4, borderRadius: 99, background: i < step ? G : 'rgba(255,255,255,0.10)', transition: 'background 300ms ease' }} />
            ))}
          </div>
          {onClose ? (
            <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 6, lineHeight: 0 }}>
              <X size={20} strokeWidth={2} />
            </button>
          ) : <div style={{ width: 32 }} />}
        </div>

        {/* Pantallas en fila, translateX para mostrar la activa */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex', width: `${TOTAL_STEPS * 100}%`,
            transform: `translateX(-${(step - 1) * (100 / TOTAL_STEPS)}%)`,
            transition: 'transform 380ms cubic-bezier(0.4,0,0.2,1)',
          }}>
            {SCREENS.map(k => {
              if (k === 'name') return pane(k, (
                <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={onEnter}
                  placeholder="Nombre y apellido" autoComplete="name" style={{ ...inputStyle, fontSize: 17, padding: '16px 18px' }} />
              ))
              if (k === 'phone') return pane(k, (
                <div onKeyDown={onEnter}><PhoneInput value={phone} onChange={setPhone} size="lg" /></div>
              ))
              if (k === 'biz') return pane(k, (
                <>
                  <PlacesAutocomplete
                    value={businessName}
                    placeholder="Ej: Café Tato"
                    onChange={(v) => { setBusinessName(v); if (!v) setGoogleImported(null) }}
                    onPlaceSelected={handleGooglePlaceSelected}
                  />
                  {googleImported && (
                    <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(224,62,27,0.10)', border: '1px solid rgba(224,62,27,0.32)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={15} color={C.v} strokeWidth={2.4} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                        Encontramos tu negocio en Google Maps. Ya completamos lo que pudimos.
                      </div>
                      <button onClick={clearGoogleImport} type="button" style={{ background: 'none', border: 'none', color: C.mist, fontSize: 12, textDecoration: 'underline', cursor: 'pointer', flexShrink: 0 }}>
                        Deshacer
                      </button>
                    </div>
                  )}
                </>
              ))
              if (k === 'cat') return pane(k, (
                <CategoryPicker
                  categories={categories} onToggle={toggleCategory}
                  catSearch={catSearch} setCatSearch={setCatSearch}
                  catFamilyId={catFamilyId} setCatFamilyId={setCatFamilyId}
                  filteredSubs={filteredSubs} activeFamily={activeFamily}
                  customCat={customCat} setCustomCat={setCustomCat}
                />
              ))
              if (k === 'loc') return pane(k, (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <div style={labelStyle}>Provincia</div>
                    <SearchableSelect value={province} onChange={v => { setProvince(v); setCity('') }}
                      options={(provinces || []).map(([key, p]) => ({ value: key, label: p?.name || key }))}
                      placeholder="Tipeá tu provincia…" />
                  </div>
                  <div>
                    <div style={labelStyle}>Ciudad</div>
                    <SearchableSelect value={city} onChange={setCity}
                      options={(cities || []).map(c => ({ value: c, label: c }))}
                      placeholder={province ? 'Tipeá tu ciudad…' : 'Elegí primero la provincia'} disabled={!province} />
                  </div>
                  {googleImported?.provinceMatched && googleImported?.cityMatched && (
                    <div style={{ fontSize: 12, color: C.mist, marginTop: 12 }}>✓ Completado con los datos de Google Maps.</div>
                  )}
                </>
              ))
              if (k === 'sys') return pane(k, (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <SystemOption active={progType === 'stars'} onClick={() => setProgType('stars')} Icon={Star} color="#E03E1B"
                      title="Estrellas" desc="1 estrella por compra. Ideal para cafés, peluquerías y comercios con tickets parecidos." demo={<StarsDemo />} />
                    <SystemOption active={progType === 'points'} onClick={() => setProgType('points')} Icon={Coins} color="#F0603A"
                      title="Puntos" desc="1 punto = 1 peso. Ideal para tiendas con compras de monto variable." demo={<PointsDemo />} />
                  </div>
                  {error && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 14px', background:'rgba(248,116,68,0.12)', border:'1px solid rgba(248,116,68,0.35)', borderRadius:12, marginTop: 14, fontSize:13, color:'#f87444', lineHeight:1.4 }}>
                      <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink:0 }} />
                      {error}
                    </div>
                  )}
                </>
              ))
              return null
            })}
          </div>
        </div>

        {/* Footer: un solo botón grande */}
        <div style={{ padding: '14px 24px 24px', flexShrink: 0, position: 'relative', zIndex: 1, display: 'flex' }}>
          <button onClick={goNext} disabled={!enabled} style={navBtnPrimary(enabled)} aria-label={btnLabel}>
            {btnLabel}
            {!submitting && !isLast && <ChevronRight size={16} strokeWidth={2.4} />}
          </button>
        </div>
      </>
    )
  }

  // ── Render del flujo client (single-screen, igual que antes) ────────────
  function renderClientFlow() {
    return (
      <>
        {/* Header con cerrar */}
        <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          {onClose && (
            <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 6 }}>
              <X size={22} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Body scrolleable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 22px 32px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 440, margin: '0 auto' }}>

            {/* Hero del modal */}
            <div style={{ textAlign: 'center', marginBottom: 26 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 22, background: G,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '6px auto 16px',
                boxShadow: '0 12px 36px rgba(224,62,27,0.40)',
              }}>
                <span style={{ fontFamily: FN, fontSize: 30, fontWeight: 900, color: '#fff' }}>
                  {(initialName || 'B').slice(0,1).toUpperCase()}
                </span>
              </div>
              <div style={{ fontFamily: FN, fontSize: 24, fontWeight: 900, color: C.white, marginBottom: 6, letterSpacing: '-.02em' }}>
                Casi listo
              </div>
              <div style={{ fontSize: 13, color: C.mist, lineHeight: 1.55 }}>
                Necesitamos un par de datos para tu tarjeta de cliente.
              </div>
            </div>

            {/* Nombre */}
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>Tu nombre</div>
              <input
                type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre y apellido"
                style={inputStyle}
              />
            </div>

            {/* Teléfono */}
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>Teléfono</div>
              <PhoneInput value={phone} onChange={setPhone} size="lg" />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                * Mínimo 8 dígitos. Lo necesitamos para que los comercios puedan contactarte.
              </div>
            </div>

            {/* Provincia + Ciudad */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div>
                <div style={labelStyle}>Provincia</div>
                <SearchableSelect
                  value={province}
                  onChange={v => { setProvince(v); setCity('') }}
                  options={provinces.map(([key, p]) => ({ value: key, label: p.name }))}
                  placeholder="Tipeá…"
                />
              </div>
              <div>
                <div style={labelStyle}>Ciudad</div>
                <SearchableSelect
                  value={city}
                  onChange={setCity}
                  options={cities.map(c => ({ value: c, label: c }))}
                  placeholder={province ? 'Tipeá…' : 'Provincia primero'}
                  disabled={!province}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 14px', background:'rgba(248,116,68,0.12)', border:'1px solid rgba(248,116,68,0.35)', borderRadius:12, marginBottom:14, fontSize:13, color:'#f87444', lineHeight:1.4 }}>
                <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink:0 }} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              style={{
                width: '100%', padding: '16px', borderRadius: 16,
                background: G, border: 'none', color: '#fff',
                fontFamily: FN, fontSize: 15, fontWeight: 800,
                cursor: (!canSubmit || submitting) ? 'not-allowed' : 'pointer',
                opacity: (!canSubmit || submitting) ? 0.45 : 1,
                boxShadow: canSubmit && !submitting ? '0 10px 32px rgba(224,62,27,0.40)' : 'none',
                transition: 'opacity 200ms ease, box-shadow 200ms ease',
                marginTop: 4,
              }}>
              {submitting ? 'Guardando…' : 'Listo, entrar'}
            </button>

            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
              Podés completar el resto de tu perfil cuando quieras desde la app.
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9994, background: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Background blobs */}
      {/* Blobs ambientales — rebrand mayo 2026 fase 2: ambos en violeta
          brand monocromo (113,49,225) en lugar de violeta-rosa viejo. */}
      <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(224,62,27,0.30) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(224,62,27,0.25) 0%, transparent 70%)', filter:'blur(80px)', pointerEvents:'none' }} />

      {isMerchant ? renderMerchantFlow() : renderClientFlow()}
    </div>
  )
}

// ─── Sistema option (radio card) ──────────────────────────────────────────
// Si se le pasa una prop `demo` (un JSX), se renderiza en un panel inferior
// dentro de la misma card para mostrar visualmente cómo funciona el sistema
// (ej: estrellas llenándose o un contador de puntos).
function SystemOption({ active, onClick, Icon, color, title, desc, demo }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: '14px 16px', borderRadius: 14,
        background: active ? `${color}1F` : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.10)'}`,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        transition: 'background 180ms ease, border 180ms ease',
      }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: active ? color : 'rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} color="#fff" strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FN, fontSize: 14, fontWeight: 800, color: C.white, marginBottom: 3 }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: C.mist, lineHeight: 1.5 }}>
            {desc}
          </div>
        </div>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: `2px solid ${active ? color : 'rgba(255,255,255,0.25)'}`,
          background: active ? color : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 2,
        }}>
          {active && <Check size={11} color="#fff" strokeWidth={3} />}
        </div>
      </div>
      {demo && (
        <div style={{ width: '100%' }}>
          {demo}
        </div>
      )}
    </button>
  )
}

// ─── Demo loops para que el merchant entienda cada sistema sin pensar ──────
// StarsDemo: 5 estrellas que se van llenando una por una, con label
// describiendo cada visita. Al llegar a 5, anuncia "¡Premio listo!" y reinicia.
function StarsDemo() {
  // 6 estados: 0 = idle ("Cada visita: 1 estrella"), 1-4 = visit labels,
  // 5 = "¡Premio listo!". Al pasar de 5, vuelve a 0.
  const [step, setStep] = useState(0)

  useEffect(() => {
    let dur
    if (step === 0)      dur = 1000
    else if (step === 5) dur = 1900
    else                 dur = 900
    const t = setTimeout(() => setStep(s => (s + 1) % 6), dur)
    return () => clearTimeout(t)
  }, [step])

  const labels = [
    'Cada visita: 1 estrella',
    '1ra visita',
    '2da visita',
    '3ra visita',
    '4ta visita',
    '¡Tu cliente canjea su premio!',
  ]
  const isPrize = step === 5

  return (
    <div style={{
      width: '100%',
      borderTop: '1px solid rgba(255,255,255,0.10)',
      paddingTop: 12, marginTop: 12,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700,
        color: isPrize ? '#E03E1B' : 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase', letterSpacing: '.06em',
        marginBottom: 8,
        minHeight: 14,
        transition: 'color 300ms ease',
      }}>
        {labels[step]}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        {[0, 1, 2, 3, 4].map(i => {
          const filled = i < step
          return (
            <Star
              key={i}
              size={20}
              fill={filled ? '#E03E1B' : 'transparent'}
              color={filled ? '#E03E1B' : 'rgba(255,255,255,0.28)'}
              strokeWidth={2}
              style={{
                transform: filled ? 'scale(1)' : 'scale(0.92)',
                transition: 'transform 320ms cubic-bezier(0.34,1.56,0.64,1), fill 320ms ease',
                filter: filled ? 'drop-shadow(0 0 8px rgba(224,62,27,0.55))' : 'none',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// PointsDemo: contador grande que se va sumando con cada compra simulada.
// Loop:
//   step 0 → idle "1 peso = 1 punto", contador = 0
//   step 1 → "+ $25.000", contador anima 0 → 25000
//   step 2 → "+ $30.000", contador anima 25000 → 55000
//   step 3 → "¡Premio listo!", contador anima 55000 → 70000 (highlight)
function PointsDemo() {
  const events = [
    { value: 0,     label: '1 peso = 1 punto'    },
    { value: 25000, label: 'Compra de $25.000'   },
    { value: 55000, label: 'Compra de $30.000'   },
    { value: 70000, label: 'Tu cliente ya sumó'  },
  ]
  const [step,      setStep]      = useState(0)
  const [displayed, setDisplayed] = useState(0)

  // Avance de paso cíclico
  useEffect(() => {
    let dur
    if (step === 0)                       dur = 1000
    else if (step === events.length - 1)  dur = 2000
    else                                  dur = 1500
    const t = setTimeout(() => {
      if (step === events.length - 1) {
        setStep(0)
        setDisplayed(0)
      } else {
        setStep(s => s + 1)
      }
    }, dur)
    return () => clearTimeout(t)
  }, [step])

  // Counter smooth (rAF + ease-out cubic)
  useEffect(() => {
    const target = events[step].value
    if (displayed === target) return
    const initial = displayed
    const startTs = performance.now()
    const duration = 700
    let raf
    function tick(ts) {
      const progress = Math.min((ts - startTs) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(initial + (target - initial) * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [step])

  const isPrize = step === events.length - 1

  return (
    <div style={{
      width: '100%',
      borderTop: '1px solid rgba(255,255,255,0.10)',
      paddingTop: 12, marginTop: 12,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700,
        color: isPrize ? '#F0603A' : 'rgba(255,255,255,0.55)',
        textTransform: 'uppercase', letterSpacing: '.06em',
        marginBottom: 6,
        minHeight: 14,
        transition: 'color 300ms ease',
      }}>
        {events[step].label}
      </div>
      <div style={{
        fontFamily: FN, fontSize: 22, fontWeight: 900,
        color: '#F0603A',
        letterSpacing: '-.02em',
        textShadow: isPrize ? '0 0 14px rgba(20,184,166,0.55)' : 'none',
        transition: 'text-shadow 300ms ease',
      }}>
        {displayed.toLocaleString('es-AR')} pts
      </div>
    </div>
  )
}

// ─── Category picker (multi up to 3) ──────────────────────────────────────
function CategoryPicker({
  categories, onToggle,
  catSearch, setCatSearch,
  catFamilyId, setCatFamilyId,
  filteredSubs, activeFamily,
  customCat, setCustomCat,
}) {
  const labelStyle = {
    fontSize: 11, color: C.dust, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7,
    fontFamily: FN,
  }
  const isOtroSelected = categories.includes('Otro') || (customCat && categories.includes(customCat))

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={labelStyle}>
        Rubro {categories.length > 0 && <span style={{ color: C.v }}>· {categories.length}/3</span>}
      </div>

      {/* Chips de categorías ya elegidas */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {categories.map(c => (
            <button key={c} onClick={() => onToggle(c)}
              style={{
                background: 'rgba(224,62,27,0.18)',
                border: '1px solid rgba(224,62,27,0.45)',
                color: '#fff', fontFamily: FI, fontSize: 12, fontWeight: 600,
                padding: '6px 10px', borderRadius: 999, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {c}
              <X size={12} strokeWidth={2.5} />
            </button>
          ))}
        </div>
      )}

      {/* Buscador — funciona también como input libre. Si lo que escribís
          coincide con algún rubro de la lista te lo sugerimos abajo, pero si
          no aparece igual podés usar lo tipeado tal cual. */}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.dust, pointerEvents: 'none' }} />
        <input
          type="text" value={catSearch}
          onChange={e => { setCatSearch(e.target.value); setCatFamilyId(null) }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const t = catSearch.trim()
              if (!t) return
              if (!categories.includes(t)) onToggle(t)
              setCatSearch('')
            }
          }}
          placeholder="Escribí tu rubro (ej: ropa, café, peluquería)"
          style={{
            width: '100%', padding: '11px 14px 11px 38px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, color: C.white, fontSize: 14, fontFamily: FI,
            boxSizing: 'border-box', outline: 'none',
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8, lineHeight: 1.45 }}>
        Si tu rubro no está en la lista, escribilo y dale Enter — podés usarlo igual.
      </div>

      {/* Resultados de búsqueda */}
      {catSearch.trim() && (() => {
        const typed = catSearch.trim()
        const exactMatch = filteredSubs.some(s => s.name.toLowerCase() === typed.toLowerCase())
        const alreadyAdded = categories.some(c => c.toLowerCase() === typed.toLowerCase())
        return (
          <div style={{
            maxHeight: 240, overflowY: 'auto',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: 6,
          }}>
            {/* "Usar lo escrito" — siempre visible cuando lo tipeado no
                coincide exactamente con un rubro estándar. Lo ponemos
                primero para que sea la opción más a mano. */}
            {!exactMatch && !alreadyAdded && (
              <button onClick={() => { onToggle(typed); setCatSearch('') }}
                style={{
                  width: '100%', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 11px', borderRadius: 9,
                  background: 'rgba(224,62,27,0.16)',
                  border: '1px solid rgba(224,62,27,0.32)',
                  color: '#fff', fontFamily: FN, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', marginBottom: filteredSubs.length > 0 ? 6 : 0,
                }}>
                <span style={{ color: C.v }}>✦</span>
                Usar "<span style={{ fontWeight: 800 }}>{typed}</span>" como mi rubro
              </button>
            )}
            {filteredSubs.length === 0 && exactMatch === false && alreadyAdded === false && (
              <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                Sin coincidencias en nuestra lista — usá tu texto.
              </div>
            )}
            {filteredSubs.map(s => {
              const selected = categories.includes(s.name)
              return (
                <button key={s.name} onClick={() => { onToggle(s.name); setCatSearch('') }}
                  style={{
                    width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 11px', borderRadius: 9,
                    background: selected ? 'rgba(224,62,27,0.18)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: C.white, fontFamily: FI, fontSize: 13,
                  }}>
                  <span><span style={{ color: C.dust, marginRight: 6 }}>{s.family} ›</span>{s.name}</span>
                  {selected && <Check size={14} color={C.v} strokeWidth={2.5} />}
                </button>
              )
            })}
          </div>
        )
      })()}

      {/* Drill-down por familia (cuando no hay search) */}
      {!catSearch.trim() && !catFamilyId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {FAMILIES_DATA.map(f => (
            <button key={f.id} onClick={() => setCatFamilyId(f.id)}
              style={{
                padding: '10px 12px', borderRadius: 11,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: C.white, fontFamily: FN, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', textAlign: 'left',
              }}>
              {f.name}
            </button>
          ))}
          <button onClick={() => setCatFamilyId('otro')}
            style={{
              padding: '10px 12px', borderRadius: 11,
              background: 'rgba(224,62,27,0.10)',
              border: '1px solid rgba(224,62,27,0.30)',
              color: '#fff', fontFamily: FN, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', textAlign: 'left',
              gridColumn: 'span 2',
            }}>
            ✦ Otro (escribilo a mano)
          </button>
        </div>
      )}

      {/* Subcategorías de una familia */}
      {!catSearch.trim() && catFamilyId && catFamilyId !== 'otro' && activeFamily && (
        <div>
          <button onClick={() => setCatFamilyId(null)}
            style={{ display:'inline-flex', alignItems:'center', gap:4, background:'none', border:'none', color: C.mist, fontFamily: FN, fontSize: 12, fontWeight: 600, cursor:'pointer', padding:'4px 0', marginBottom: 6 }}>
            <ChevronLeft size={14} strokeWidth={2.5} /> Volver
          </button>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {activeFamily.subs.map(sub => {
              const selected = categories.includes(sub.name)
              return (
                <button key={sub.name} onClick={() => onToggle(sub.name)}
                  style={{
                    padding: '7px 12px', borderRadius: 999,
                    background: selected ? 'rgba(224,62,27,0.20)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selected ? 'rgba(224,62,27,0.50)' : 'rgba(255,255,255,0.10)'}`,
                    color: '#fff', fontFamily: FI, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                  {sub.name}{selected && <span style={{ marginLeft: 4 }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Otro — texto libre */}
      {!catSearch.trim() && catFamilyId === 'otro' && (
        <div>
          <button onClick={() => setCatFamilyId(null)}
            style={{ display:'inline-flex', alignItems:'center', gap:4, background:'none', border:'none', color: C.mist, fontFamily: FN, fontSize: 12, fontWeight: 600, cursor:'pointer', padding:'4px 0', marginBottom: 6 }}>
            <ChevronLeft size={14} strokeWidth={2.5} /> Volver
          </button>
          <input
            type="text" value={customCat}
            onChange={e => setCustomCat(e.target.value)}
            placeholder="Escribí tu rubro"
            style={{
              width: '100%', padding: '11px 14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1pxsolid rgba(255,255,255,0.12)',
              borderRadius: 12, color: C.white, fontSize: 14, fontFamily: FI,
              boxSizing: 'border-box', outline: 'none', marginBottom: 8,
            }}
          />
          <button
            onClick={() => {
              const t = customCat.trim()
              if (!t) return
              if (!categories.includes(t)) onToggle(t)
            }}
            disabled={!customCat.trim() || isOtroSelected}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 12,
              background: customCat.trim() && !isOtroSelected ? 'rgba(224,62,27,0.20)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${customCat.trim() && !isOtroSelected ? 'rgba(224,62,27,0.50)' : 'rgba(255,255,255,0.10)'}`,
              color: '#fff', fontFamily: FN, fontSize: 13, fontWeight: 700,
              cursor: customCat.trim() && !isOtroSelected ? 'pointer' : 'not-allowed',
              opacity: customCat.trim() && !isOtroSelected ? 1 : 0.45,
            }}>
            Agregar este rubro
          </button>
        </div>
      )}
    </div>
  )
}
