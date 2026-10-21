// GET /api/kit-difusion?commerce_id=X&piece=launch|promo|prize|post|sticker[&promo_id=..][&prize_id=..][&download=1]
// GET /api/kit-difusion?commerce_id=X&meta=1&kind=launch|promo|prize[&promo_id|prize_id]
//
// Devuelve la pieza de difusión (PNG) del comercio, o con meta=1 el link del
// club y el texto de WhatsApp listo para compartir.
// Auth: dueño del comercio o admin global. Solo promos/premios vigentes.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'
import { renderPiece, whatsappText, clubUrl, PIECES } from '../../../lib/kit-difusion'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function GET(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const url = new URL(request.url)
    const commerceId = url.searchParams.get('commerce_id')
    const meta = url.searchParams.get('meta') === '1'
    const piece = url.searchParams.get('piece') || url.searchParams.get('kind') || 'launch'
    if (!commerceId) return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })
    if (!PIECES.includes(piece)) return NextResponse.json({ error: 'Pieza inválida' }, { status: 400 })

    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, owner_id, name, slug, prog_type')
      .eq('id', commerceId)
      .single()
    if (!commerce) return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    if (commerce.owner_id !== user.id) {
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user.id).single()
      if (callerProfile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    if (!commerce.slug) return NextResponse.json({ error: 'Tu club todavía no tiene dirección pública' }, { status: 400 })

    let promo = null
    let prize = null
    if (piece === 'promo') {
      const id = url.searchParams.get('promo_id')
      const { data } = await supabaseAdmin.from('promotions')
        .select('id, type, value, description, days, expires_at, expiration_type, active')
        .eq('id', id || '').eq('commerce_id', commerce.id).maybeSingle()
      if (!data) return NextResponse.json({ error: 'Promo no encontrada' }, { status: 404 })
      if (!data.active || (data.expires_at && new Date(data.expires_at) <= new Date() && data.expiration_type !== 'relative')) {
        return NextResponse.json({ error: 'La promo ya no está vigente' }, { status: 409 })
      }
      promo = data
    }
    if (piece === 'prize') {
      const id = url.searchParams.get('prize_id')
      const { data } = await supabaseAdmin.from('prizes')
        .select('id, name, cost, img_url, system_type, active, stock, created_at')
        .eq('id', id || '').eq('commerce_id', commerce.id).maybeSingle()
      if (!data) return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })
      if (!data.active || data.stock === 0) return NextResponse.json({ error: 'El premio no está disponible' }, { status: 409 })
      prize = data
    }

    if (meta) {
      const unit = commerce.prog_type === 'points' ? 'puntos' : 'estrellas'
      return NextResponse.json({
        club_url: clubUrl(commerce.slug),
        whatsapp_text: whatsappText({ name: commerce.name, slug: commerce.slug, kind: piece, promo, prize, unit }),
      })
    }

    const { png, filename } = await renderPiece(piece, { commerce, promo, prize })
    const headers = { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' }
    if (url.searchParams.get('download') === '1') headers['Content-Disposition'] = `attachment; filename="${filename}"`
    return new NextResponse(png, { headers })
  } catch (e) {
    console.error('[kit-difusion]', e)
    return NextResponse.json({ error: 'No se pudo generar la pieza' }, { status: 500 })
  }
}
