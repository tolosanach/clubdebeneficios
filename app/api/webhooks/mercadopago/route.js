// POST /api/webhooks/mercadopago
//
// Webhook que recibe notificaciones de Mercado Pago y mantiene sincronizado
// el plan de cada comercio en supabase. Flujo:
//
//   1. MP nos manda una notif cuando cambia una preapproval (suscripción) o
//      cuando llega un pago dentro de una suscripción.
//   2. Fetcheamos los detalles vía la API de MP usando MP_ACCESS_TOKEN.
//   3. Mapeamos preapproval_plan_id → 'starter' / 'pro'.
//   4. Leemos external_reference (que es el commerce.id que el frontend
//      mete en la URL del checkout — ver upgradePlan() en page.js).
//   5. Actualizamos commerces.plan según el status:
//        - 'authorized' → activa el plan.
//        - 'cancelled' / 'paused' → baja a 'free'.
//
// Notas:
//   - Devolvemos siempre 200 (excepto en errores muy graves) para que MP
//     no reintente innecesariamente. Los errores se loguean en server.
//   - No estamos validando la firma HMAC de MP por ahora — MEJORA FUTURA
//     usar `x-signature` y `x-request-id` con el secret del webhook.
//   - Usamos service role para bypassear RLS al actualizar commerces.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MP_TOKEN = process.env.MP_ACCESS_TOKEN
const MP_API   = 'https://api.mercadopago.com'

// Mapping preapproval_plan_id (de MP) → nombre del plan en nuestra DB.
// Estos IDs los obtuvimos al crear las suscripciones en el dashboard de MP.
// Si en el futuro creamos más planes, agregar acá.
const PREAPPROVAL_PLAN_MAP = {
  '70261fab7ead48ef960b444d04689bfc': 'starter',
  '62e68b0c9a6d4e7697a6032fda8e95ec': 'pro',
}

// Helper: fetch a la API de MP con el access token.
async function mpGet(path) {
  if (!MP_TOKEN) {
    console.error('[mp-webhook] MP_ACCESS_TOKEN no configurado')
    return null
  }
  try {
    const res = await fetch(`${MP_API}${path}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[mp-webhook] mp api failed', path, res.status)
      return null
    }
    return await res.json()
  } catch (e) {
    console.error('[mp-webhook] mp api error', path, e?.message)
    return null
  }
}

// Helper: actualiza el plan del comercio + loguea actividad.
async function updateCommercePlan(commerceId, newPlan, ctx = {}) {
  if (!commerceId || !newPlan) return false
  const { error } = await supabaseAdmin
    .from('commerces')
    .update({ plan: newPlan })
    .eq('id', commerceId)
  if (error) {
    console.error('[mp-webhook] update plan failed', commerceId, error)
    return false
  }
  // Activity log opcional — útil para auditoría y para mostrar en la app.
  try {
    await supabaseAdmin.from('commerce_activity').insert({
      commerce_id: commerceId,
      type:        'plan_changed',
      description: `Plan actualizado a ${newPlan.toUpperCase()}${ctx.via ? ` (vía ${ctx.via})` : ''}`,
      metadata:    ctx,
    })
  } catch (_) {
    // si no existe la tabla o la columna metadata, no falla el webhook.
  }
  return true
}

// Procesa una preapproval (suscripción): activa, pausa o cancela según status.
async function handlePreapproval(preapprovalId) {
  const data = await mpGet(`/preapproval/${preapprovalId}`)
  if (!data) return
  const externalRef = data.external_reference
  const planId      = data.preapproval_plan_id
  const status      = data.status  // 'authorized' | 'paused' | 'cancelled' | 'pending'

  if (!externalRef) {
    console.warn('[mp-webhook] preapproval sin external_reference', preapprovalId)
    return
  }
  const planName = PREAPPROVAL_PLAN_MAP[planId]

  console.log('[mp-webhook] preapproval', { preapprovalId, externalRef, planId, planName, status })

  if (status === 'authorized') {
    if (!planName) {
      console.warn('[mp-webhook] preapproval_plan_id desconocido', planId)
      return
    }
    await updateCommercePlan(externalRef, planName, { via: 'mp_preapproval', preapprovalId, status })
  } else if (status === 'cancelled' || status === 'paused') {
    // Bajamos a FREE — la suscripción se cortó/pausó.
    await updateCommercePlan(externalRef, 'free', { via: 'mp_preapproval', preapprovalId, status })
  }
  // status === 'pending' u otros → no hacer nada, esperar evento posterior.
}

// Procesa un pago aprobado dentro de una suscripción (renovación mensual).
// Por ahora solo logueamos — la activación ya quedó hecha en el preapproval
// authorized. Si en el futuro queremos extender plan_renews_at, va acá.
async function handleAuthorizedPayment(paymentId) {
  const data = await mpGet(`/authorized_payments/${paymentId}`)
  if (!data) return
  const status      = data.status
  const externalRef = data.external_reference
  console.log('[mp-webhook] authorized_payment', { paymentId, status, externalRef })
}

// Procesa un pago individual (no recurrente). Por compatibilidad si MP lo manda.
async function handlePayment(paymentId) {
  const data = await mpGet(`/v1/payments/${paymentId}`)
  if (!data) return
  console.log('[mp-webhook] payment', { paymentId, status: data.status, externalRef: data.external_reference })
}

export async function POST(request) {
  try {
    // MP manda algunas notifs por query string (legacy IPN) y otras por body
    // (webhooks v2). Combinamos ambas formas.
    const url = new URL(request.url)
    const queryType  = url.searchParams.get('type')   || url.searchParams.get('topic')
    const queryId    = url.searchParams.get('id')     || url.searchParams.get('data.id')

    let body = {}
    try { body = await request.json() } catch (_) {}
    const bodyType = body?.type   || body?.topic || body?.action
    const bodyId   = body?.data?.id || body?.id

    const type = (queryType || bodyType || '').toLowerCase()
    const id   = queryId || bodyId

    console.log('[mp-webhook] received', { type, id, query: Object.fromEntries(url.searchParams), body })

    if (!id) {
      // Notif sin id (ej. ping de validación) — devolvemos 200 sin hacer nada.
      return NextResponse.json({ ok: true })
    }

    // Routing por tipo de evento. MP usa varios nombres según la versión.
    if (type.includes('preapproval') || type.includes('subscription_preapproval')) {
      await handlePreapproval(id)
    } else if (type.includes('subscription_authorized_payment')) {
      await handleAuthorizedPayment(id)
    } else if (type.includes('payment')) {
      await handlePayment(id)
    } else {
      console.log('[mp-webhook] tipo no manejado', type)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mp-webhook] error global', err)
    // Devolvemos 200 para que MP no reintente en loop.
    return NextResponse.json({ ok: true })
  }
}

// MP a veces hace una validación inicial con GET — lo soportamos devolviendo OK.
export async function GET() {
  return NextResponse.json({ ok: true, name: 'mercadopago-webhook' })
}
