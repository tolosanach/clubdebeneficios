// POST /api/billing/checkout-intent
// Body: { commerce_id, plan: 'starter' | 'pro' }
//
// Se llama (fire-and-forget) justo cuando el dueño abre el checkout de
// suscripción de Mercado Pago desde upgradePlan(). Deja registrado qué
// comercio intentó suscribirse a qué plan y cuándo.
//
// Por qué existe: el link de suscripción de MP (preapproval_plan) no siempre
// traslada el `external_reference` a la suscripción creada. Cuando el webhook
// recibe una suscripción sin comercio, busca el intent reciente del mismo
// plan para saber a quién activar (ver app/api/webhooks/mercadopago).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { commerce_id, plan } = await request.json()
    if (!commerce_id || !['starter', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    const { data: commerce } = await supabaseAdmin
      .from('commerces').select('id, owner_id').eq('id', commerce_id).single()
    if (!commerce || commerce.owner_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await supabaseAdmin.from('checkout_intents').insert({ commerce_id, user_id: user.id, plan })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[checkout-intent] error', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
