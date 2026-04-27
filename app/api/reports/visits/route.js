// GET /api/reports/visits
// Query params: commerce_id, start_date, end_date, limit

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
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
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

    // Construir query
    let query = supabaseAdmin
      .from('visits')
      .select(`
        id,
        user_id,
        commerce_id,
        points_earned,
        created_at,
        profiles:user_id(id, full_name, name, email)
      `)
      .eq('commerce_id', commerce_id)
      .order('created_at', { ascending: false })

    // Filtrar por fechas si se proporcionan
    if (start_date) {
      query = query.gte('created_at', start_date)
    }
    if (end_date) {
      query = query.lte('created_at', end_date)
    }

    query = query.limit(limit)

    const { data: visits, error } = await query

    if (error) throw error

    // Formatear respuesta
    const formatted = (visits || []).map(visit => ({
      id: visit.id,
      fecha: new Date(visit.created_at).toLocaleDateString('es-AR'),
      hora: new Date(visit.created_at).toLocaleTimeString('es-AR'),
      cliente: visit.profiles?.full_name || visit.profiles?.name || 'Desconocido',
      email: visit.profiles?.email || '-',
      puntos: visit.points_earned || 1,
      unidad: commerce.prog_type === 'stars' ? '⭐' : '💎',
    }))

    return NextResponse.json({
      ok: true,
      data: formatted,
      total: formatted.length,
      prog_type: commerce.prog_type,
    })
  } catch (err) {
    console.error('Reports visits error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
