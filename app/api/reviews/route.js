// GET  /api/reviews?commerce_id=...   → lista reseñas + promedio
// POST /api/reviews                   → crea o actualiza reseña (requiere auth + membership)
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const commerce_id = new URL(request.url).searchParams.get('commerce_id')
  if (!commerce_id) return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })

  // No hay FK directa de reviews.user_id → profiles.id (apunta a auth.users)
  // así que Postgrest no resuelve el join implícito y devuelve 500. Hacemos
  // las queries por separado y armamos el shape esperado.
  const { data: reviews, error } = await supabaseAdmin
    .from('reviews')
    .select('id, rating, comment, created_at, user_id, membership_id')
    .eq('commerce_id', commerce_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (reviews && reviews.length > 0) {
    const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))]
    const memIds  = [...new Set(reviews.map(r => r.membership_id).filter(Boolean))]
    const [{ data: profiles }, { data: memberships }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from('profiles').select('id, name, avatar_url').in('id', userIds)
        : Promise.resolve({ data: [] }),
      memIds.length
        ? supabaseAdmin.from('memberships').select('id, visits_count').in('id', memIds)
        : Promise.resolve({ data: [] }),
    ])
    const profileMap = new Map((profiles || []).map(p => [p.id, p]))
    const memMap     = new Map((memberships || []).map(m => [m.id, m]))
    for (const r of reviews) {
      r.profile    = profileMap.get(r.user_id)       || null
      r.membership = memMap.get(r.membership_id)     || null
    }
  }

  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null

  // Si hay usuario autenticado, devolver su reseña previa
  let userReview = null
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: ur } = await supabaseAdmin
        .from('reviews')
        .select('id, rating, comment')
        .eq('commerce_id', commerce_id)
        .eq('user_id', user.id)
        .maybeSingle()
      userReview = ur || null
    }
  } catch (_) {}

  return NextResponse.json({ ok: true, reviews: reviews || [], avg, total: reviews.length, userReview })
}

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { commerce_id, rating, comment } = await request.json()
    if (!commerce_id || !rating) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    if (rating < 1 || rating > 5) return NextResponse.json({ error: 'Rating inválido' }, { status: 400 })

    // Verificar que es miembro
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('commerce_id', commerce_id)
      .single()

    if (!membership) return NextResponse.json({ error: 'Solo los socios pueden opinar' }, { status: 403 })

    // Upsert: una reseña por usuario por comercio
    const { data: review, error: revErr } = await supabaseAdmin
      .from('reviews')
      .upsert(
        { user_id: user.id, commerce_id, membership_id: membership.id, rating, comment: comment?.trim() || null },
        { onConflict: 'user_id,commerce_id' }
      )
      .select('id, rating, comment')
      .single()

    if (revErr) throw revErr

    return NextResponse.json({ ok: true, review })
  } catch (err) {
    console.error('reviews POST error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
