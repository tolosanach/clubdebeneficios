// GET /api/portaretrato?commerce_id=X&format=png|pdf
//
// Devuelve el portarretrato imprimible (13 × 18 cm, vertical) del comercio con
// su nombre, rubros y QR. Auth: dueño del comercio o admin global.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'
import { portaretratoPng, portaretratoPdf, displayNameFor } from '../../../lib/portaretrato'

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
    const format = url.searchParams.get('format') === 'pdf' ? 'pdf' : 'png'
    if (!commerceId) return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })

    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, owner_id, name, slug, category, categories')
      .eq('id', commerceId)
      .single()
    if (!commerce) return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    if (commerce.owner_id !== user.id) {
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user.id).single()
      if (callerProfile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const categories = Array.isArray(commerce.categories) && commerce.categories.length
      ? commerce.categories
      : (commerce.category ? [commerce.category] : [])
    const input = { name: commerce.name || '', categories, slug: commerce.slug || commerce.id }

    const buf = format === 'pdf' ? await portaretratoPdf(input) : await portaretratoPng(input)
    const safe = (displayNameFor(input.name) || 'club')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'club'

    return new NextResponse(buf, {
      headers: {
        'Content-Type': format === 'pdf' ? 'application/pdf' : 'image/png',
        'Content-Disposition': `attachment; filename="portarretrato-${safe}.${format}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    console.error('[portaretrato]', e)
    return NextResponse.json({ error: 'No se pudo generar el portarretrato' }, { status: 500 })
  }
}
