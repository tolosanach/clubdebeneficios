// POST /api/redemption-cancel
// Body: { redemption_id, reason? }
//
// Endpoint del DUEÑO: rechaza un canje pendiente. NO toca el saldo del
// cliente (sigue con sus puntos intactos) ni el stock del premio. Solo
// marca la redemption como 'cancelled' y dispara una notif al cliente.
//
// Auth: misma validación que confirm — caller tiene que ser owner del
// comercio o admin.

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
      .select('id, status, user_id, commerce_id, prize_id, code')
      .eq('id', redemption_id)
      .single()
    if (redErr || !redemption) {
      return NextResponse.json({ error: 'Canje no encontrado' }, { status: 404 })
    }
    if (redemption.status !== 'pending') {
      return NextResponse.json({
        error: `El canje está en estado "${redemption.status}", no se puede rechazar.`,
      }, { status: 409 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single()
    const { data: commerce } = await supabaseAdmin
      .from('commerces').select('id, name, slug, owner_id').eq('id', redemption.commerce_id).single()
    if (!commerce) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    }
    const isAdmin = profile?.role === 'admin'
    const isOwner = commerce.owner_id === user.id
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Marcamos como cancelled — saldo y stock no se tocan.
    const { error: updErr } = await supabaseAdmin
      .from('redemptions')
      .update({
        status:           'cancelled',
        cancelled_reason: reason ? String(reason).slice(0, 200) : null,
      })
      .eq('id', redemption_id)
    if (updErr) throw updErr

    // Cargar nombre del premio para mostrar en la notif.
    const { data: prize } = await supabaseAdmin
      .from('prizes').select('name').eq('id', redemption.prize_id).single()

    try {
      await notify({
        userId: redemption.user_id,
        type:   'redeem_cancelled',
        title:  `Tu canje de "${prize?.name || 'tu premio'}" fue rechazado`,
        body:   reason
          ? `${commerce.name}: ${reason}. Tus puntos siguen intactos.`
          : `${commerce.name} no pudo confirmar el canje. Tus puntos siguen intactos.`,
        // Llevamos al cliente a su wallet (Mis Clubs) — ahí ve el
        // balance que sigue intacto y mantiene acceso a campana/chat
        // (la página /club/[slug] no los monta).
        link:   '/?view=client&tab=mis clubs',
        metadata: {
          commerce_id: commerce.id,
          prize_id:    redemption.prize_id,
          kind:        'redeem_cancelled',
          code:        redemption.code,
          reason:      reason || null,
        },
      })
    } catch (e) {
      console.error('[redemption-cancel] notif al cliente falló:', e)
    }

    return NextResponse.json({
      ok:            true,
      redemption_id,
      status:        'cancelled',
    })
  } catch (err) {
    console.error('[redemption-cancel] error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
