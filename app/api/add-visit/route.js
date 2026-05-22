// POST /api/add-visit
// Body: { commerce_id, membership_id, amount? }
//
// Registra una visita manual desde la ficha del cliente en el panel del
// comerciante, sin necesitar escanear el QR del cliente.
// Suma las estrellas o puntos correspondientes al sistema activo,
// respetando la promo double_points si está activa para el día de hoy.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'
import { notifyBoth } from '../../../lib/notify-server'

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

    const { commerce_id, membership_id, amount } = await request.json()
    if (!commerce_id || !membership_id) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, name, slug, owner_id, prog_type')
      .eq('id', commerce_id)
      .single()
    if (!commerce) return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    if (commerce.owner_id !== user.id) {
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user.id).single()
      if (callerProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('id, user_id, commerce_id, stars, points, visits_count')
      .eq('id', membership_id)
      .single()
    if (!membership || membership.commerce_id !== commerce_id) {
      return NextResponse.json({ error: 'Membership inválida' }, { status: 400 })
    }

    const isStars = commerce.prog_type === 'stars'
    let basePts = 1
    if (!isStars) {
      const amt = parseInt(amount, 10)
      if (!Number.isFinite(amt) || amt < 1) {
        return NextResponse.json({ error: 'Ingresá el monto de la compra' }, { status: 400 })
      }
      basePts = amt
    }

    // Verificar double_points activo hoy
    const now = new Date().toISOString()
    const { data: activePromos } = await supabaseAdmin
      .from('promotions')
      .select('id, type, days, expires_at')
      .eq('commerce_id', commerce_id)
      .eq('active', true)
    const todayDow = new Date().getDay()
    const hasDouble = (activePromos || []).some(p => {
      if (p.expires_at && p.expires_at <= now) return false
      if (p.type !== 'double_points') return false
      if (!Array.isArray(p.days) || p.days.length === 0) return true
      return p.days.some(d => Number(d) === todayDow)
    })
    const ptsPerVisit = hasDouble ? basePts * 2 : basePts

    const visitNow = new Date().toISOString()
    const { data: visit, error: visitError } = await supabaseAdmin
      .from('visits')
      .insert({ user_id: membership.user_id, commerce_id, points_earned: ptsPerVisit })
      .select()
      .single()
    if (visitError) throw visitError

    const col = isStars ? 'stars' : 'points'
    const newVal = (membership[col] || 0) + ptsPerVisit
    const newVisitsCount = (membership.visits_count || 0) + 1

    const { error: upErr } = await supabaseAdmin
      .from('memberships')
      .update({ [col]: newVal, visits_count: newVisitsCount, last_visit: visitNow, status: 'active' })
      .eq('id', membership_id)
    if (upErr) throw upErr

    try {
      const { data: clientProfile } = await supabaseAdmin
        .from('profiles').select('full_name, name').eq('id', membership.user_id).single()
      const clientName  = clientProfile?.full_name || clientProfile?.name || 'Cliente'
      const clientFirst = clientName.split(' ')[0]
      const unitLabel   = isStars
        ? (ptsPerVisit === 1 ? 'estrella' : 'estrellas')
        : (ptsPerVisit === 1 ? 'punto' : 'puntos')
      const clubLink = commerce.slug ? `/club/${commerce.slug}` : '/'
      await notifyBoth({
        clientUserId: membership.user_id,
        ownerUserId:  commerce.owner_id,
        client: {
          type:  'visit',
          title: `${commerce.name} te sumó ${ptsPerVisit} ${unitLabel}`,
          body:  `Tu saldo: ${newVal} ${unitLabel}.`,
          link:  clubLink,
          metadata: { commerce_id, membership_id, kind: 'manual_visit' },
        },
        owner: {
          type:  'visit',
          title: `Visita de ${clientFirst} registrada`,
          body:  `Le sumaste ${ptsPerVisit} ${unitLabel}. Saldo: ${newVal} ${unitLabel}.`,
          link:  '/',
          metadata: { commerce_id, membership_id, user_id: membership.user_id, kind: 'manual_visit' },
        },
      })
    } catch (e) {
      console.error('[add-visit] error notifs:', e)
    }

    return NextResponse.json({
      ok:            true,
      col,
      new_value:     newVal,
      visits_count:  newVisitsCount,
      last_visit:    visitNow,
      points_earned: ptsPerVisit,
      double_active: hasDouble,
      visit_id:      visit.id,
      visit_at:      visit.scanned_at || visitNow,
    })
  } catch (err) {
    console.error('[add-visit]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
