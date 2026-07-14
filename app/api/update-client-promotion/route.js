// POST /api/update-client-promotion
// Body: { client_promotion_id, expires_at }   (expires_at: ISO string | null)
//
// Permite al dueño (o admin) modificar la fecha de vencimiento de UN cupón
// puntual de UN cliente, sin tocar a los demás. Es la contraparte unitaria del
// vencimiento: cada client_promotion puede tener su propia fecha y desde la
// ficha del cliente el dueño la ajusta caso por caso.
//
// Auth: dueño del comercio dueño de la promo (o admin global).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { client_promotion_id, expires_at } = await request.json()
    if (!client_promotion_id) {
      return NextResponse.json({ error: 'Falta client_promotion_id' }, { status: 400 })
    }

    // Validar la fecha (permitimos null = sin vencimiento).
    let expiresIso = null
    if (expires_at !== null && expires_at !== undefined && expires_at !== '') {
      const d = new Date(expires_at)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
      }
      expiresIso = d.toISOString()
    }

    // Cargar el client_promotion y resolver la cadena de ownership:
    // client_promotion -> membership -> commerce.owner_id
    const { data: cp } = await supabaseAdmin
      .from('client_promotions')
      .select('id, membership_id, promotion_id, memberships(id, commerce_id, commerces(id, owner_id))')
      .eq('id', client_promotion_id)
      .single()
    if (!cp) {
      return NextResponse.json({ error: 'Cupón no encontrado' }, { status: 404 })
    }

    const ownerId = cp.memberships?.commerces?.owner_id
    if (ownerId !== user.id) {
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user.id).single()
      if (callerProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    const { error: upErr } = await supabaseAdmin
      .from('client_promotions')
      .update({ expires_at: expiresIso })
      .eq('id', client_promotion_id)
    if (upErr) throw upErr

    return NextResponse.json({ ok: true, expires_at: expiresIso })
  } catch (err) {
    console.error('[update-client-promotion]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
