// GET /api/client-view?u={user_id}&c={commerce_id}
// ⚠️ SECURITY: Valida que el user autenticado sea quien solicita sus propios datos.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    // ── AUTH GUARD ──
    const supabase = await createSupabaseServer()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const user_id     = searchParams.get('u')
    const commerce_id = searchParams.get('c')

    if (!user_id || !commerce_id) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // ── OWNERSHIP CHECK ──
    // Solo permitir ver datos del user autenticado (no de otros users)
    if (authUser.id !== user_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Cargar todo en paralelo
    const [
      { data: profile },
      { data: commerce },
      { data: membership },
      { data: prizes },
      { data: promos },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('full_name, name').eq('id', user_id).single(),
      supabaseAdmin.from('commerces')
        .select('name, img_url, prog_type, prog_pts, prog_goal')
        .eq('id', commerce_id).single(),
      supabaseAdmin.from('memberships')
        .select('id, points, stars, visits_count')
        .eq('user_id', user_id).eq('commerce_id', commerce_id).single(),
      supabaseAdmin.from('prizes')
        .select('id, name, cost, img_url, stock')
        .eq('commerce_id', commerce_id).eq('active', true)
        .order('cost', { ascending: true }),
      supabaseAdmin.from('promotions')
        .select('id, type, description, value, expires_at, days')
        .eq('commerce_id', commerce_id).eq('active', true),
    ])

    if (!profile) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    if (!commerce) return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })

    // Filtrar promos no expiradas
    const now = new Date().toISOString()
    const activePromos = (promos || []).filter(p => !p.expires_at || p.expires_at > now)

    const balance = commerce.prog_type === 'stars'
      ? (membership?.stars  || 0)
      : (membership?.points || 0)

    return NextResponse.json({
      ok: true,
      profile:    { full_name: profile.full_name || profile.name || null },
      commerce:   { name: commerce.name, img_url: commerce.img_url, prog_type: commerce.prog_type },
      membership: membership
        ? { id: membership.id, balance, visits_count: membership.visits_count || 0 }
        : null,
      prizes:  prizes  || [],
      promos:  activePromos,
    })
  } catch (err) {
    console.error('Client-view error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
