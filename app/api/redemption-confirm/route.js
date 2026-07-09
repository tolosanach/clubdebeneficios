// POST /api/redemption-confirm
// Body: { redemption_id }
//
// Endpoint del DUEÃO: confirma un canje que estaba en 'pending'. El
// saldo del cliente YA fue debitado al crear el pending (reserva en
// /api/redeem-request), asi que aca solo:
//   - cambiamos status a 'completed'
//   - bajamos stock del premio (-1, y desactivamos si llega a 0)
//   - notificamos al cliente que su canje quedo concretado
//
// Auth: el caller tiene que ser el owner del comercio del canje (o admin).
// La validaciÃ³n se hace leyendo la cookie de sesiÃ³n vÃ­a @supabase/ssr;
// si el caller no matchea, devolvemos 403.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notify } from '../../../lib/notify-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getSessionUser() {
  const cookieStore = await cookies()
  const ssr = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await ssr.auth.getUser()
  return user
}

export async function POST(request) {
  try {
    const { redemption_id } = await request.json()
    if (!redemption_id) {
      return NextResponse.json({ error: 'Falta redemption_id' }, { status: 400 })
    }

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Cargar la redemption + relación al commerce y al prize.
    const { data: redemption, error: redErr } = await supabaseAdmin
      .from('redemptions')
      .select('id, status, user_id, commerce_id, prize_id, membership_id, code')
      .eq('id', redemption_id)
      .single()
    if (redErr || !redemption) {
      return NextResponse.json({ error: 'Canje no encontrado' }, { status: 404 })
    }
    if (redemption.status !== 'pending') {
      return NextResponse.json({
        error: `El canje ya está en estado "${redemption.status}", no se puede confirmar dos veces.`,
      }, { status: 409 })
    }

    // Validar que el caller sea owner del comercio (o admin).
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single()
    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, name, slug, prog_type, owner_id')
      .eq('id', redemption.commerce_id)
      .single()
    if (!commerce) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    }
    const isAdmin = profile?.role === 'admin'
    const isOwner = commerce.owner_id === user.id
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Cargar premio para chequear costo + stock.
    const { data: prize } = await supabaseAdmin
      .from('prizes')
      .select('id, name, cost, active, stock')
      .eq('id', redemption.prize_id)
      .single()
    if (!prize) {
      return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })
    }
    // Si el premio fue desactivado entre el request y la confirmación, igual
    // permitimos cerrarlo (el dueño está físicamente entregando, ya pasó).
    if (prize.stock !== null && prize.stock <= 0) {
      return NextResponse.json({ error: 'Sin stock disponible' }, { status: 400 })
    }

    // El saldo YA fue debitado al crear el pending (en redeem-request).
    // Aca solo leemos el saldo actual del cliente para mostrarlo en la
    // notif. No tocamos el balance.
    const isStars = commerce.prog_type === 'stars'
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('id, stars, points')
      .eq('id', redemption.membership_id)
      .single()
    const newBalance = membership ? (isStars ? membership.stars : membership.points) : 0

    // Marcamos el canje como completed + el momento de confirmacion.
    // points_spent ya quedo registrado en redeem-request, no lo pisamos.
    const { error: updErr } = await supabaseAdmin
      .from('redemptions')
      .update({
        status:       'completed',
        confirmed_at: new Date().toISOString(),
        responder_id: user.id,
      })
      .eq('id', redemption_id)
    if (updErr) throw updErr

    // Stock: -1 atómico (RPC), y si llega a 0 lo desactivamos automáticamente.
    // El UPDATE con guard `stock > 0` evita oversell y decrementos perdidos
    // cuando el dueño confirma varios canjes del mismo premio en paralelo.
    let stockDepleted = false
    if (prize.stock !== null) {
      const { data: dec } = await supabaseAdmin.rpc('decrement_prize_stock', { p_prize_id: prize.id })
      stockDepleted = (dec && dec.length) ? !!dec[0].depleted : true
    }

    // Notif al cliente — su canje quedó confirmado. Lo llevamos a su
    // wallet (mis clubs) en vez de a /club/[slug] para que vea el
    // balance actualizado y mantenga el acceso a la campana + chat
    // (la página /club/[slug] no monta esos floating actions).
    try {
      const unitTxt = isStars ? `${prize.cost} estrellas` : `${prize.cost} puntos`
      await notify({
        userId: redemption.user_id,
        type:   'prize_redeem',
        title:  `Tu canje de "${prize.name}" fue confirmado ✓`,
        body:   `${commerce.name} entregó tu premio. Se descontaron ${unitTxt}. Saldo: ${newBalance}.`,
        link:   '/?view=client&tab=historial',
        metadata: {
          commerce_id: commerce.id,
          prize_id:    prize.id,
          kind:        'prize_redeem',
          code:        redemption.code,
        },
      })
    } catch (e) {
      console.error('[redemption-confirm] notif al cliente falló:', e)
    }

    return NextResponse.json({
      ok:             true,
      redemption_id,
      status:         'completed',
      points_spent:   prize.cost,
      new_balance:    newBalance,
      stock_depleted: stockDepleted,
      prize_name:     prize.name,
    })
  } catch (err) {
    console.error('[redemption-confirm] error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
