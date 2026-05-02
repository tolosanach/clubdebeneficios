// POST /api/places/details
// Body: { placeId: string, sessionToken?: string }
// Returns: { place: { name, address, phone, website, latitude, longitude,
//   openingHours, googleMapsUrl, suggestedCategories, primaryType, types,
//   country, province, locality, streetName, streetNumber, postalCode,
//   streetAddress } }
//
// Proxy al endpoint Place Details de Google Places API (New).
// Devuelve los campos normalizados al schema de Benefix `commerces` +
// los componentes de dirección parseados (country/province/locality/etc.)
// para que el wizard pueda prellenar dropdowns por separado.
// La sesión (sessionToken) debe ser la misma del autocomplete que llevó
// a esta selección — Google factura toda la sesión como UNA operación
// (mucho más barato que cobrar autocomplete + details como independientes).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'
import { suggestBenefixCategories } from '../../../../lib/googlePlacesCategoryMap'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GOOGLE_BASE_URL = 'https://places.googleapis.com/v1/places'

// Field mask — campos que necesitamos para mapear a `commerces`.
// Cada campo es un SKU separado en Google; pedimos solo los necesarios.
const FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'addressComponents',
  'location',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'regularOpeningHours',
  'primaryType',
  'types',
  'googleMapsUri',
].join(',')

// Rate limit: 60 llamadas por hora por user. Es mucho más laxo que
// autocomplete porque cada details es 1 click intencional del comerciante.
const rateLimitMap   = new Map()
const RATE_WINDOW_MS = 60 * 60 * 1000  // 1 hora
const RATE_MAX       = 60

function isRateLimited(userId) {
  const now = Date.now()
  const arr = (rateLimitMap.get(userId) || []).filter(t => now - t < RATE_WINDOW_MS)
  if (arr.length >= RATE_MAX) return true
  arr.push(now)
  rateLimitMap.set(userId, arr)
  return false
}

// Día numérico de Google (0=Monday) → string legible en castellano.
const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function fmtTime(t) {
  if (!t) return ''
  const h = String(t.hour ?? 0).padStart(2, '0')
  const m = String(t.minute ?? 0).padStart(2, '0')
  return `${h}:${m}`
}

function formatOpeningHours(regular) {
  if (!regular || !Array.isArray(regular.periods)) return []
  const byDay = {}
  for (const p of regular.periods) {
    const dayIdx = p?.open?.day
    if (dayIdx === undefined || dayIdx === null) continue
    const range = `${fmtTime(p.open)}–${fmtTime(p.close)}`
    if (!byDay[dayIdx]) byDay[dayIdx] = []
    byDay[dayIdx].push(range)
  }
  const result = []
  for (let i = 0; i < 7; i++) {
    if (byDay[i]) result.push({ day: DAY_NAMES[i], ranges: byDay[i] })
  }
  return result
}

// Parsea el array addressComponents al shape que necesita el wizard.
// Cada componente tiene { longText, shortText, types[] }. Buscamos por
// type específico (country, locality, administrative_area_level_1, etc.).
// types relevantes:
//   - country                          → País
//   - administrative_area_level_1      → Provincia/Estado
//   - administrative_area_level_2      → Departamento (fallback de locality)
//   - locality                         → Ciudad
//   - route                            → Nombre de calle
//   - street_number                    → Altura
//   - postal_code                      → Código postal
function parseAddressComponents(components) {
  if (!Array.isArray(components)) {
    return { country: '', province: '', locality: '', streetName: '', streetNumber: '', postalCode: '', streetAddress: '' }
  }
  const find = (...wantedTypes) => {
    for (const c of components) {
      const types = Array.isArray(c.types) ? c.types : []
      if (wantedTypes.some(t => types.includes(t))) {
        return (c.longText || c.shortText || '').trim()
      }
    }
    return ''
  }
  const country      = find('country')
  const province     = find('administrative_area_level_1')
  const locality     = find('locality') || find('administrative_area_level_2')
  const streetName   = find('route')
  const streetNumber = find('street_number')
  const postalCode   = find('postal_code')
  const streetAddress = [streetName, streetNumber].filter(Boolean).join(' ').trim()
  return { country, province, locality, streetName, streetNumber, postalCode, streetAddress }
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (isRateLimited(user.id)) {
      return NextResponse.json({ error: 'Demasiadas selecciones. Esperá un rato.' }, { status: 429 })
    }
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 })
    }

    const body = await request.json()
    const { placeId, sessionToken } = body || {}
    if (!placeId || typeof placeId !== 'string') {
      return NextResponse.json({ error: 'placeId requerido' }, { status: 400 })
    }

    const cleanPlaceId = placeId.trim()
    const cleanToken   = typeof sessionToken === 'string' && sessionToken
      ? sessionToken.slice(0, 100)
      : undefined

    // Place Details va con GET. El sessionToken viaja como query param
    // para cerrar la sesión iniciada por autocomplete.
    const url = new URL(`${GOOGLE_BASE_URL}/${encodeURIComponent(cleanPlaceId)}`)
    url.searchParams.set('languageCode', 'es-AR')
    if (cleanToken) url.searchParams.set('sessionToken', cleanToken)

    const apiResp = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key':   process.env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
    })

    // Debug logs (temporales) — diagnosticar mapeo a campos del wizard.
    const rawText = await apiResp.text()
    console.log('[places/details] placeId:', cleanPlaceId)
    console.log('[places/details] google status:', apiResp.status)
    console.log('[places/details] google raw body:', rawText)

    if (!apiResp.ok) {
      console.error('Google Places details error:', apiResp.status, rawText)
      return NextResponse.json({ error: 'No pudimos traer los datos. Probá de nuevo.' }, { status: 502 })
    }

    let place = {}
    try { place = JSON.parse(rawText) } catch (e) {
      console.error('[places/details] JSON parse fallido:', e?.message || e)
    }

    const primaryType = place.primaryType || ''
    const types       = Array.isArray(place.types) ? place.types : []
    const suggestedCategories = suggestBenefixCategories(primaryType, types)
    const parsed      = parseAddressComponents(place.addressComponents)

    const normalized = {
      placeId:       place.id || cleanPlaceId,
      name:          place.displayName?.text || '',
      address:       place.formattedAddress  || '',
      country:       parsed.country,
      province:      parsed.province,
      locality:      parsed.locality,
      streetName:    parsed.streetName,
      streetNumber:  parsed.streetNumber,
      postalCode:    parsed.postalCode,
      streetAddress: parsed.streetAddress,
      phone:         place.nationalPhoneNumber || place.internationalPhoneNumber || '',
      website:       place.websiteUri || '',
      latitude:      place.location?.latitude  ?? null,
      longitude:     place.location?.longitude ?? null,
      openingHours:  formatOpeningHours(place.regularOpeningHours),
      googleMapsUrl: place.googleMapsUri || '',
      primaryType,
      types,
      suggestedCategories,
    }
    console.log('[places/details] normalized →', JSON.stringify(normalized, null, 2))

    // Log fire-and-forget para auditar uso/costo.
    supabaseAdmin.from('google_places_usage').insert({
      user_id:       user.id,
      endpoint:      'details',
      session_token: cleanToken || null,
    }).then(() => {}).catch(() => {})

    return NextResponse.json({ place: normalized })
  } catch (err) {
    console.error('Places details handler error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
