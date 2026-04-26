// GET /api/segments/[segment]
// Query params: commerce_id, limit
// Returns: clients in specified segment

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'
import { classifySegment } from '../../../../lib/segments'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const segment = params.segment
    const validSegments = ['nuevos', 'frecuentes', 'vip', 'inactivos']
    if (!validSegments.includes(segment)) {
      return NextResponse.json({ error: 'Segmento inválido' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const commerce_id = searchParams.get('commerce_id')
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    if (!commerce_id) return NextResponse.json({ error: 'commerce_id es requerido' }, { status: 400 })

    // Verificar que el usuario es dueño del comercio
    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, owner_id, prog_type')
      .eq('id', commerce_id)
      .single()

    if (!commerce || commerce.owner_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener todos los miembros con sus visitas
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select(`
        id,
        user_id,
        visits_count,
        points,
        stars,
        last_visit,
        profiles:user_id(id, full_name, email, created_at)
      `)
      .eq('commerce_id', commerce_id)

    // Obtener todas las visitas por usuario
    const { data: visits } = await supabaseAdmin
      .from('visits')
      .select('user_id, created_at')
      .eq('commerce_id', commerce_id)

    // Agrupar visitas por usuario
    const visitsByUser = {}
    ;(visits || []).forEach(v => {
      if (!visitsByUser[v.user_id]) visitsByUser[v.user_id] = []
      visitsByUser[v.user_id].push(v)
    })

    // Filtrar por segmento
    const segmentClients = (memberships || [])
      .filter(m => classifySegment(m, visitsByUser[m.user_id] || []) === segment)
      .slice(0, limit)
      .map(m => ({
        id: m.user_id,
        nombre: m.profiles?.full_name || 'Desconocido',
        email: m.profiles?.email || '-',
        unido: new Date(m.profiles?.created_at).toLocaleDateString('es-AR'),
        visitas: m.visits_count || 0,
        saldo: commerce.prog_type === 'stars' ? (m.stars || 0) : (m.points || 0),
        ultima_visita: m.last_visit
          ? new Date(m.last_visit).toLocaleDateString('es-AR')
          : 'Nunca',
      }))

    return NextResponse.json({
      ok: true,
      segment,
      total: segmentClients.length,
      data: segmentClients,
      prog_type: commerce.prog_type,
    })
  } catch (err) {
    console.error('Segment clients error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
