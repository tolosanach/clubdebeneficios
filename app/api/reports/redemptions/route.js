// GET /api/reports/redemptions
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
      .from('redemptions')
      .select(`
        id,
        user_id,
        commerce_id,
        prize_id,
        points_spent,
        created_at,
        profiles:user_id(id, full_name, email),
        prizes:prize_id(id, name, cost)
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

    const { data: redemptions, error } = await query

    if (error) throw error

    // Formatear respuesta
    const formatted = (redemptions || []).map(redemption => ({
      id: redemption.id,
      fecha: new Date(redemption.created_at).toLocaleDateString('es-AR'),
      hora: new Date(redemption.created_at).toLocaleTimeString('es-AR'),
      cliente: redemption.profiles?.full_name || 'Desconocido',
      email: redemption.profiles?.email || '-',
      premio: redemption.prizes?.name || 'Desconocido',
      puntos_gastados: redemption.points_spent || 0,
      unidad: commerce.prog_type === 'stars' ? '⭐' : '💎',
    }))

    return NextResponse.json({
      ok: true,
      data: formatted,
      total: formatted.length,
      prog_type: commerce.prog_type,
    })
  } catch (err) {
    console.error('Reports redemptions error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
