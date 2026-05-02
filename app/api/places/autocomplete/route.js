// POST /api/places/autocomplete
// Body: { input: string, sessionToken: string }
// Returns: { suggestions: [{ placeId, mainText, secondaryText }] }
//
// Proxy al endpoint Places API (New) de Google.
// La API key vive solo en server (env GOOGLE_PLACES_API_KEY) — el cliente
// nunca la ve. Esto nos permite además rate-limit por user y loggear el
// uso para auditar costos.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GOOGLE_URL = 'https://places.googleapis.com/v1/places:autocomplete'

// Field mask — solo pedimos lo que vamos a usar para no inflar el costo.
// Google factura por SKU según los campos requeridos (ver doc Places API
// New: data SKUs).
const FIELD_MASK = [
  'suggestions.placePrediction.placeId',
  'suggestions.placePrediction.text',
  'suggestions.placePrediction.structuredFormat',
].join(',')

// Rate limit en memoria — 30 llamadas por minuto por user. Mismo patrón
// que /api/support/chat. En prod multi-instancia conviene migrar a Redis.
const rateLimitMap   = new Map()  // user_id → [timestamps]
const RATE_WINDOW_MS = 60 * 1000  // 1 min
const RATE_MAX       = 30

function isRateLimited(userId) {
  const now = Date.now()
  const arr = (rateLimitMap.get(userId) || []).filter(t => now - t < RATE_WINDOW_MS)
  if (arr.length >= RATE_MAX) return true
  arr.push(now)
  rateLimitMap.set(userId, arr)
  return false
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (isRateLimited(user.id)) {
      return NextResponse.json({ error: 'Demasiadas búsquedas. Esperá unos segundos.' }, { status: 429 })
    }
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 })
    }

    const body = await request.json()
    const { input, sessionToken } = body || {}
    if (!input || typeof input !== 'string' || input.trim().length < 2) {
      // Devolvemos lista vacía si el input es muy corto (no error) — así el
      // frontend no se siente frustrado escribiendo la primera letra.
      return NextResponse.json({ suggestions: [] })
    }
    const cleanInput = input.trim().slice(0, 200)
    const cleanToken = typeof sessionToken === 'string' && sessionToken
      ? sessionToken.slice(0, 100)
      : undefined

    // Body para la Places API. Sesgamos a Argentina con region code "ar"
    // y le damos un location bias centrado en el país (centro aproximado:
    // -36.6, -64.3 — La Pampa) con radio amplio (50km en este caso es
    // intencionalmente bajo; Google mezcla el bias con regionCodes para
    // priorizar resultados argentinos sin descartar globalmente).
    const payload = {
      input: cleanInput,
      includedRegionCodes: ['ar'],
      languageCode: 'es-AR',
      locationBias: {
        circle: {
          center:  { latitude: -36.6, longitude: -64.3 },
          radius:  50000,
        },
      },
    }
    if (cleanToken) payload.sessionToken = cleanToken

    const apiResp = await fetch(GOOGLE_URL, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'X-Goog-Api-Key':   process.env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(payload),
    })

    // ── Debug logs (temporales) — diagnosticar por qué Google a veces
    // devuelve lista vacía. Loggea: input del user, status HTTP de Google,
    // y el body crudo del response. Quitar cuando esté resuelto. ──
    const rawText = await apiResp.text()
    console.log('[places/autocomplete] input:', cleanInput)
    console.log('[places/autocomplete] google status:', apiResp.status)
    console.log('[places/autocomplete] google raw body:', rawText)

    if (!apiResp.ok) {
      console.error('Google Places autocomplete error:', apiResp.status, rawText)
      // No crasheamos el flujo — devolvemos lista vacía y dejamos que el
      // user escriba a mano si Google está caído.
      return NextResponse.json({ suggestions: [] })
    }

    let data = {}
    try { data = JSON.parse(rawText) } catch {}
    const raw  = Array.isArray(data?.suggestions) ? data.suggestions : []

    // Normalizamos al shape simple que espera el frontend.
    const suggestions = raw.map(s => {
      const pred = s.placePrediction || {}
      const sf   = pred.structuredFormat || {}
      return {
        placeId:        pred.placeId || null,
        mainText:       sf.mainText?.text      || pred.text?.text || '',
        secondaryText:  sf.secondaryText?.text || '',
      }
    }).filter(x => x.placeId && x.mainText)

    // Insert async fire-and-forget — no bloqueamos la respuesta si el log
    // falla. La tabla google_places_usage per