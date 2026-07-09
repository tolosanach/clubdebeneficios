// POST /api/redemption-cancel
// Body: { redemption_id, reason? }
//
// Cancela un canje pendiente. Pueden cancelarlo TANTO el dueno del
// comercio (rechazo) COMO el cliente que lo inicio (cancelacion propia).
// El saldo del cliente fue debitado al crear el pending (reserva en
// /api/redeem-request), asi que aca DEVOLVEMOS los puntos sumandolos
// de nuevo a su membership. El stock del premio nunca se toco (se
// descuenta solo al confirmar), no hay que restituirlo.
//
// Notif:
//   - Si lo cancelo el dueno  -> notif al cliente ("rechazado")
//   - Si lo cancelo el cliente -> notif al dueno ("cancelado por el cliente")

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
    const { redemption_id, reason } = await request.json()
    if (!redemption_id) {
      return NextResponse.json({ error: 'Falta redemption_id' }, { status: 400 })
    }

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: redemption, error: redErr } = await supabaseAdmin
      .from('redemptions')
      .select('id, status, user_id, commerce_id, prize_id, membership_id, code, points_spent')
      .eq('id', redemption_id)
      .single()
    if (redErr || !redemption) {
      return NextResponse.json({ error: 'Canje no encontrado' }, { status: 404 })
    }
    if (redemption.status !== 'pending') {
      return NextResponse.json({
        error: `El canje esta en estado "${redemption.status}", no se puede cancelar.`,
      }, { status: 409 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single()
    const { data: commerce } = await supabaseAdmin
      .from('commerces').select('id, name, slug, owner_id, prog_type').eq('id', redemption.commerce_id).single()
    if (!commerce) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    }
    const isAdmin  = profile?.role === 'admin'
    const isOwner  = commerce.owner_id === user.id
    const isClient = redemption.user_id === user.id
    if (!isAdmin && !isOwner && !isClient) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const cancelledByOwner = isAdmin || isOwner

    // Devolver saldo reservado: sumamos points_spent al membership de forma
    // ATÓMICA vía RPC. Un read-then-write (leer saldo, escribir saldo+refund)
    // podía pisar un crédito concurrente — ej: un escaneo que suma puntos en
    // paralelo al reembolso — perdiéndose uno de los dos.
    const isStars    = commerce.prog_type === 'stars'
    const balanceCol = isStars ? 'stars' : 'points'
    const refund     = redemption.points_spent || 0
    let refundedTo   = null
    if (refund > 0) {
      const { data: credited } = await supabaseAdmin.rpc('credit_membership_balance', {
        p_membership_id: redemption.membership_id,
        p_amount:        refund,
        p_column:        balanceCol,
      })
      refundedTo = (credited && credited.length) ? credited[0].new_balance : null
    }

    // Marcamos como cancelled â saldo ya devuelto, stock nunca se toco.
    const { error: updErr } = await supabaseAdmin
      .from('redemptions')
      .update({
        status:           'cancelled',
        cancelled_reason: reason ? String(reason).slice(0, 200) : null,
        responder_id:     user.id,
      })
      .eq('id', redemption_id)
    if (updErr) throw updErr

    const { data: prize } = await supabaseAdmin
      .from('prizes').select('name').eq('id', redemption.prize_id).single()
    const unitTxt = `${refund} ${isStars ? 'estrellas' : 'puntos'}`

    try {
      if (cancelledByOwner) {
        // Lo cancelo el dueno â notif al cliente.
        await notify({
          userId: redemption.user_id,
          type:   'redeem_cancelled',
          title:  `Tu canje de "${prize?.name || 'tu premio'}" fue rechazado`,
          body:   reason
            ? `${commerce.name}: ${reason}. Te devolvimos ${unitTxt} a tu saldo.`
            : `${commerce.name} no pudo confirmar el canje. Te devolvimos ${unitTxt} a tu saldo.`,
          link:   '/?view=client&tab=mis clubs',
          metadata: {
            commerce_id: commerce.id,
            prize_id:    redemption.prize_id,
            kind:        'redeem_cancelled',
            code:        redemption.code,
            reason:      reason || null,
            refunded:    refund,
          },
        })
      } else {
        // Lo cancelo el cliente â notif al dueno.
        const { data: clientProfile } = await supabaseAdmin
          .from('profiles').select('full_name, name').eq('id', redemption.user_id).single()
        const clientName = clientProfile?.full_name || clientProfile?.name || 'Un cliente'
        await notify({
          userId: commerce.owner_id,
          type:   'redeem_cancelled',
          title:  `${clientName} cancelo su solicitud de "${prize?.name || 'un premio'}"`,
          body:   `Le devolvimos ${unitTxt} a su saldo. No tenes que hacer nada.`,
          link:   '/?view=commerce-settings&tab=canjes',
          metadata: {
            commerce_id:  commerce.id,
            prize_id:     redemption.prize_id,
            kind:         'redeem_cancelled',
            code:         redemption.code,
            cancelled_by: 'client',
            refunded:     refund,
          },
        })
      }
    } catch (e) {
      console.error('[redemption-cancel] notif fallo:', e)
    }

    return NextResponse.json({
      ok:           true,
      redemption_id,
      status:       'cancelled',
      refunded:     refund,
      new_balance:  refundedTo,
      cancelled_by: cancelledByOwner ? 'owner' : 'client',
    })
  } catch (err) {
    console.error('[redemption-cancel] error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
