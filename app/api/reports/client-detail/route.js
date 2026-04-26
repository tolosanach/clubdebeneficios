// GET /api/reports/client-detail
// Query params: commerce_id, user_id

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const commerce_id = searchParams.get('commerce_id')
    const user_id = searchParams.get('user_id')

    if (!commerce_id || !user_id) {
      return NextResponse.json({ error: 'commerce_id y user_id son requeridos' }, { status: 400 })
    }

    // Verificar que el usuario es dueño del comercio
    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, owner_id, prog_type')
      .eq('id', commerce_id)
      .single()

    if (!commerce || commerce.owner_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener datos del cliente
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, created_at')
      .eq('id', user_id)
      .single()

    // Obtener membresía
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('id, visits_count, points, stars, last_visit, created_at')
      .eq('user_id', user_id)
      .eq('commerce_id', commerce_id)
      .single()

    if (!membership) {
      return NextResponse.json({
        error: 'Cliente no es miembro de este comercio',
      }, { status: 404 })
    }

    // Obtener historial de visitas
    const { data: visits } = await supabaseAdmin
      .from('visits')
      .select('id, created_at, points_earned')
      .eq('user_id', user_id)
      .eq('commerce_id', commerce_id)
      .order('created_at', { ascending: false })

    // Obtener historial de canjes
    const { data: redemptions } = await supabaseAdmin
      .from('redemptions')
      .select(`
        id,
        created_at,
        points_spent,
        prizes:prize_id(name, cost)
      `)
      .eq('user_id', user_id)
      .eq('commerce_id', commerce_id)
      .order('created_at', { ascending: false })

    // Construir timeline
    const timeline = [
      ...(visits || []).map(v => ({
        type: 'visit',
        date: v.created_at,
        description: `Visita registrada`,
        value: v.points_earned || 1,
        icon: '📍',
      })),
      ...(redemptions || []).map(r => ({
        type: 'redemption',
        date: r.created_at,
        description: `Canjeó: ${r.prizes?.name || 'Premio'}`,
        value: -(r.points_spent || 0),
        icon: '🎁',
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date))

    return NextResponse.json({
      ok: true,
      cliente: {
        id: profile?.id,
        nombre: profile?.full_name || 'Desconocido',
        email: profile?.email || '-',
        unido: new Date(profile?.created_at).toLocaleDateString('es-AR'),
      },
      estadisticas: {
        visitas_totales: membership.visits_count || 0,
        ultima_visita: membership.last_visit
          ? new Date(membership.last_visit).toLocaleDateString('es-AR')
          : 'Nunca',
        saldo: membership.points || membership.stars || 0,
        unidad: commerce.prog_type === 'stars' ? '⭐ Estrellas' : '💎 Puntos',
        canjes_totales: (redemptions || []).length,
      },
      timeline,
      prog_type: commerce.prog_type,
    })
  } catch (err) {
    console.error('Reports client-detail error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
