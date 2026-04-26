// GET /api/segments
// Query params: commerce_id
// Returns: count of each segment

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'
import { classifySegment, SEGMENT_INFO } from '../../../lib/segments'

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

    if (!commerce_id) return NextResponse.json({ error: 'commerce_id es requerido' }, { status: 400 })

    // Verificar que el usuario es dueño del comercio
    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, owner_id')
      .eq('id', commerce_id)
      .single()

    if (!commerce || commerce.owner_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener todos los miembros y sus visitas
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('id, user_id, visits_count, points, stars, last_visit')
      .eq('commerce_id', commerce_id)

    // Clasificar segmentos
    const segments = {
      nuevos: { count: 0, clients: [] },
      frecuentes: { count: 0, clients: [] },
      vip: { count: 0, clients: [] },
      inactivos: { count: 0, clients: [] },
    }

    for (const membership of memberships || []) {
      const segment = classifySegment(membership, [])
      segments[segment].count += 1
      segments[segment].clients.push(membership.user_id)
    }

    const total = (memberships || []).length

    return NextResponse.json({
      ok: true,
      segments: {
        nuevos: {
          ...SEGMENT_INFO.nuevos,
          count: segments.nuevos.count,
          percent: total > 0 ? Math.round((segments.nuevos.count / total) * 100) : 0,
        },
        frecuentes: {
          ...SEGMENT_INFO.frecuentes,
          count: segments.frecuentes.count,
          percent: total > 0 ? Math.round((segments.frecuentes.count / total) * 100) : 0,
        },
        vip: {
          ...SEGMENT_INFO.vip,
          count: segments.vip.count,
          percent: total > 0 ? Math.round((segments.vip.count / total) * 100) : 0,
        },
        inactivos: {
          ...SEGMENT_INFO.inactivos,
          count: segments.inactivos.count,
          percent: total > 0 ? Math.round((segments.inactivos.count / total) * 100) : 0,
        },
      },
      total,
    })
  } catch (err) {
    console.error('Segments error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
