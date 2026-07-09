// POST /api/redeem-request
// Body: { membership_id, prize_id, commerce_id, user_id }
//
// Endpoint del CLIENTE: arranca un canje en estado 'pending'. Decision
// de producto: el saldo se RESERVA al iniciar (debita aca) para evitar
// que el cliente arranque dos canjes paralelos contra el mismo balance.
// Si el dueno rechaza o el cliente cancela, /api/redemption-cancel
// devuelve los puntos sumandolos de nuevo a su membership.
//
// Genera un codigo corto (BNX-XXXX) que el cliente le muestra al comercio
// por WhatsApp, y notifica al dueno.
//
// El stock se descuenta recien al confirmar (en /api/redemption-confirm),
// no aca â durante el pending el stock queda visible para otros clientes.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'
import { notify } from '../../../lib/notify-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Genera un código corto tipo "BNX-A4F2" — 4 chars alfanuméricos en mayúscula
// (sin 0/O/1/I para evitar confusiones de lectura).
function genCode() {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const buf = crypto.getRandomValues(new Uint8Array(4))
  return 'BNX-' + Array.from(buf).map(b => ALPHABET[b % ALPHABET.length]).join('')
}

export async function POST(request) {
  try {
    // AUTH GUARD: verificar que el usuario autenticado es quien intenta hacer
    // el canje. Se autentica por COOKIE de sesión (via @supabase/ssr), igual
    // que /api/scan, /api/join, etc. Antes leía un `Authorization: Bearer`
    // que NINGÚN caller del front enviaba (ni en /club/[slug] ni en la
    // billetera de page.js), así que getUser() nunca encontraba usuario y el
    // canje iniciado por el cliente devolvía 401 siempre.
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { membership_id, prize_id, commerce_id, user_id } = await request.json()

    // Validar que el usuario autenticado es el que intenta hacer el canje
    if (user.id !== user_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!membership_id || !prize_id || !commerce_id || !user_id) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // Obtener el premio + chequear que esté activo y con stock.
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
      return NextResponse.json({ error: 'Este premio ya no tiene stock' }, { status: 400 })
    }

    // Comercio + tipo de programa para validar saldo.
    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, name, slug, prog_type, owner_id, phone')
      .eq('id', commerce_id)
      .single()
    if (!commerce) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    }

    const isStars    = commerce.prog_type === 'stars'
    const balanceCol = isStars ? 'stars' : 'points'

    // Membership del cliente — chequeamos que el saldo alcance ANTES de
    // crear el pendiente (no debitamos, solo validamos). Sino el cliente
    // podría spamear pendings sin saldo.
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('id, user_id, commerce_id, stars, points')
      .eq('id', membership_id)
      .single()
    if (!membership || membership.user_id !== user_id) {
      return NextResponse.json({ error: 'Membership inválida' }, { status: 400 })
    }
    const currentBalance = isStars ? (membership.stars || 0) : (membership.points || 0)
    if (currentBalance < prize.cost) {
      return NextResponse.json({
        error: 'Saldo insuficiente',
        needed: prize.cost,
        balance: currentBalance,
      }, { status: 400 })
    }

    // Chequeo idempotencia suave: si ya hay un canje pending del mismo
    // user para el mismo prize, devolvemos ese (no creamos otro). Evita
    // que tap repetido genere 5 pendings duplicados.
    const { data: existingPending } = await supabaseAdmin
      .from('redemptions')
      .select('id, code, created_at')
      .eq('user_id', user_id)
      .eq('prize_id', prize_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let redemption
    if (existingPending) {
      // Ya hay un pending del mismo cliente para este premio â devolvemos
      // ese mismo (idempotencia). NO debitamos de nuevo: el saldo ya quedo
      // reservado en la creacion original.
      redemption = existingPending
    } else {
      // RESERVA del saldo: debitar atomicamente. Si el RPC no actualiza
      // ninguna fila (saldo no alcanza por race-condition con otro canje
      // simultaneo), abortamos sin crear el pending.
      const { data: debited, error: debitErr } = await supabaseAdmin.rpc('debit_membership_balance', {
        p_membership_id: membership_id,
        p_amount:        prize.cost,
        p_column:        balanceCol,
      })
      if (debitErr) throw debitErr
      if (!debited || debited.length === 0) {
        return NextResponse.json({
          error:  'No alcanza el saldo. Quizas iniciaste otro canje en paralelo.',
          needed: prize.cost,
        }, { status: 400 })
      }

      // Generamos codigo y reintentamos hasta 3 veces si el insert colisiona.
      let code = genCode()
      let inserted = null
      let lastErr  = null
      for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
        const r = await supabaseAdmin
          .from('redemptions')
          .insert({
            membership_id,
            commerce_id,
            prize_id,
            user_id,
            points_spent: prize.cost, // ya debitado, lo dejamos registrado
            status:       'pending',
            code,
            kind:         'prize',
          })
          .select('id, code, created_at')
          .single()
        if (!r.error) {
          inserted = r.data
        } else {
          lastErr = r.error
          code    = genCode()
        }
      }
      if (!inserted) {
        // El insert fallo despues de debitar â devolvemos el saldo para no
        // dejar al cliente sin sus puntos.
        await supabaseAdmin.rpc('credit_membership_balance', {
          p_membership_id: membership_id,
          p_amount:        prize.cost,
          p_column:        balanceCol,
        })
        throw lastErr || new Error('No se pudo crear la solicitud')
      }
      redemption = inserted
    }

    // Notificación al dueño — lo importante es que sepa que llegó un
    // canje pendiente y abra la app a confirmarlo.
    try {
      const { data: clientProfile } = await supabaseAdmin
        .from('profiles').select('full_name, name').eq('id', user_id).single()
      const clientName = clientProfile?.full_name || clientProfile?.name || 'Un cliente'
      const unitTxt    = isStars ? `${prize.cost} estrellas` : `${prize.cost} puntos`
      await notify({
        userId: commerce.owner_id,
        type:   'redeem_pending',
        title:  `${clientName} quiere canjear "${prize.name}"`,
        body:   `Costo: ${unitTxt}. Código: ${redemption.code}. Confirmá desde el panel cuando lo entregues.`,
        link:   '/?view=commerce-settings&tab=canjes',
        metadata: {
          commerce_id,
          prize_id,
          user_id,
          redemption_id: redemption.id,
          code:          redemption.code,
          kind:          'redeem_pending',
        },
      })
    } catch (e) {
      console.error('[redeem-request] notif al dueño falló:', e)
    }

    return NextResponse.json({
      ok:             true,
      redemption_id:  redemption.id,
      code:           redemption.code,
      status:         'pending',
      // Datos que el front usa para armar el wa.me — el comercio puede
      // no tener phone cargado, en ese caso el front muestra fallback.
      commerce: {
        id:    commerce.id,
        name:  commerce.name,
        slug:  commerce.slug,
        phone: commerce.phone || null,
      },
      prize: {
        id:   prize.id,
        name: prize.name,
        cost: prize.cost,
      },
      prog_type: commerce.prog_type,
    })
  } catch (err) {
    console.error('[redeem-request] error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
