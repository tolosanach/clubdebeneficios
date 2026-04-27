// POST /api/redeem
// Body: { membership_id, prize_id, commerce_id, user_id }

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyBoth } from '../../../lib/notify-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { membership_id, prize_id, commerce_id, user_id } = await request.json()

    if (!membership_id || !prize_id || !commerce_id || !user_id) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // Obtener el premio
    const { data: prize, error: prizeError } = await supabaseAdmin
      .from('prizes')
      .select('id, name, cost, active, stock')
      .eq('id', prize_id)
      .eq('commerce_id', commerce_id)
      .single()

    if (prizeError || !prize) {
      return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })
    }
    if (!prize.active) {
      return NextResponse.json({ error: 'El premio no está activo' }, { status: 400 })
    }
    if (prize.stock !== null && prize.stock <= 0) {
      return NextResponse.json({ error: 'Este premio ya no tiene stock disponible' }, { status: 400 })
    }

    // Tipo de programa del comercio (para saber qué columna debitar)
    const { data: commerce } = await supabaseAdmin
      .from('commerces').select('prog_type, owner_id, name, slug').eq('id', commerce_id).single()

    const isStars    = commerce?.prog_type === 'stars'
    const balanceCol = isStars ? 'stars' : 'points'

    // Débito atómico: solo descuenta si hay saldo suficiente. Si dos canjes
    // simultáneos llegan, solo uno cumple la condición; el otro afecta 0 filas.
    // Implementado en supabase-migration-v11.sql como debit_membership_balance.
    const { data: debited, error: debitErr } = await supabaseAdmin.rpc('debit_membership_balance', {
      p_membership_id: membership_id,
      p_amount:        prize.cost,
      p_column:        balanceCol,
    })
    if (debitErr) throw debitErr

    // RPC retorna [] si saldo insuficiente o membership_id no existe
    if (!debited || debited.length === 0) {
      return NextResponse.json({
        error:  'Saldo insuficiente',
        needed: prize.cost,
      }, { status: 400 })
    }

    const newBalance = debited[0].new_balance

    // Registrar canje
    await supabaseAdmin.from('redemptions').insert({
      membership_id,
      commerce_id,
      prize_id,
      user_id,
      points_spent: prize.cost,
    })

    // Descontar stock si aplica
    let stockDepleted = false
    if (prize.stock !== null) {
      const newStock = prize.stock - 1
      stockDepleted = newStock === 0
      await supabaseAdmin.from('prizes')
        .update({ stock: newStock, ...(stockDepleted ? { active: false } : {}) })
        .eq('id', prize_id)
    }

    // ─── NOTIFICACIONES ──────────────────────────────────────────────────
    // Aviso al cliente y al dueño del comercio sobre el canje del premio.
    try {
      const { data: clientProfile } = await supabaseAdmin
        .from('profiles').select('full_name').eq('id', user_id).single()
      const clientFirstName = (clientProfile?.full_name || 'Cliente').split(' ')[0]
      const commerceName = commerce?.name || 'el negocio'
      const isStars = commerce?.prog_type === 'stars'
      const unitTxt = isStars ? `${prize.cost} estrellas` : `${prize.cost} puntos`
      const clubLink = commerce?.slug ? `/club/${commerce.slug}` : '/'
      await notifyBoth({
        clientUserId: user_id,
        ownerUserId:  commerce?.owner_id,
        client: {
          type:  'prize_redeem',
          title: `Canjeaste "${prize.name}" en ${commerceName}`,
          body:  `Gastaste ${unitTxt}. Saldo restante: ${newBalance}.`,
          link:  clubLink,
          metadata: { commerce_id, kind: 'prize_redeem', prize_id },
        },
        owner: {
          type:  'prize_redeem',
          title: `${clientFirstName} canjeó "${prize.name}"`,
          body:  `Le descontaste ${unitTxt}.`,
          link:  '/',
          metadata: { commerce_id, user_id, kind: 'prize_redeem', prize_id },
        },
      })
    } catch (e) {
      console.error('[redeem] error enviando notificaciones:', e)
    }

    return NextResponse.json({
      ok:             true,
      prize_name:     prize.name,
      points_spent:   prize.cost,
      new_balance:    newBalance,
      prog_type:      commerce?.prog_type,
      stock_depleted: stockDepleted,
    })
  } catch (err) {
    console.error('Redeem error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
