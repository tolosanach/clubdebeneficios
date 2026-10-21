// Lógica compartida de sincronización con Mercado Pago (suscripciones y cobros).
// La usan el webhook (/api/webhooks/mercadopago) y la conciliación (/api/admin/mp-reconcile).

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { notify } from './notify-server'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const MP_TOKEN  = process.env.MP_ACCESS_TOKEN
const MP_SECRET = process.env.MP_WEBHOOK_SECRET
const MP_API    = 'https://api.mercadopago.com'

// preapproval_plan_id (dashboard de MP) → plan en nuestra DB.
export const PREAPPROVAL_PLAN_MAP = {
  '70261fab7ead48ef960b444d04689bfc': 'starter',
  '62e68b0c9a6d4e7697a6032fda8e95ec': 'pro',
}
// Fallback por monto mensual (ARS). Mantener alineado con PLANS en app/page.js.
const AMOUNT_PLAN_MAP = { 25000: 'starter', 45000: 'pro' }

// Ventana para matchear una suscripción con un checkout_intent.
const INTENT_WINDOW_HOURS = 12

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─── Helpers ────────────────────────────────────────────────────────────────

export class MpFatalError extends Error {
  constructor(code) { super('mp_api_' + code); this.code = code }
}

export async function mpGet(path) {
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
      // 401/403 = el token no es de la cuenta/app dueña del objeto; 5xx = MP caído.
      // Se propaga para responder 500 y que MP reintente (y quede visible en logs).
      if (res.status === 401 || res.status === 403 || res.status >= 500) throw new MpFatalError(res.status)
      return null
    }
    return await res.json()
  } catch (e) {
    if (e instanceof MpFatalError) throw e
    console.error('[mp-webhook] mp api error', path, e?.message)
    throw new MpFatalError('network')
  }
}

function planFrom(data) {
  const byId = PREAPPROVAL_PLAN_MAP[data?.preapproval_plan_id]
  if (byId) return byId
  const amount = Number(data?.auto_recurring?.transaction_amount)
  return AMOUNT_PLAN_MAP[amount] || null
}

function commerceIdFromRef(ref) {
  if (!ref) return null
  const first = String(ref).split(':')[0]
  return UUID_RE.test(first) ? first : null
}

async function getAdminIds() {
  const { data } = await supabaseAdmin.from('profiles').select('id').eq('role', 'admin')
  return (data || []).map(p => p.id)
}

async function notifyAdmins({ type, title, body, metadata }) {
  try {
    const ids = await getAdminIds()
    await Promise.all(ids.map(userId => notify({ userId, type, title, body, link: null, metadata })))
  } catch (e) {
    console.error('[mp-webhook] notifyAdmins failed', e?.message)
  }
}

async function logActivity(commerceId, description, metadata) {
  const { error } = await supabaseAdmin.from('commerce_activity').insert({
    commerce_id: commerceId, type: 'plan_changed', description, metadata,
  })
  if (error) console.error('[mp-webhook] activity insert failed', error)
}

async function setCommercePlan(commerceId, newPlan, ctx) {
  const { data: commerce } = await supabaseAdmin
    .from('commerces').select('id, name, plan, owner_id').eq('id', commerceId).single()
  if (!commerce) {
    console.warn('[mp-webhook] comercio no encontrado', commerceId)
    return null
  }
  if (commerce.plan === newPlan) return commerce // nada que cambiar (evento repetido)

  const { error } = await supabaseAdmin.from('commerces').update({ plan: newPlan }).eq('id', commerceId)
  if (error) {
    console.error('[mp-webhook] update plan failed', commerceId, error)
    return null
  }
  await logActivity(commerceId, `Plan actualizado a ${newPlan.toUpperCase()} (vía Mercado Pago)`, ctx)
  return { ...commerce, previousPlan: commerce.plan, plan: newPlan }
}

// Busca el comercio que abrió el checkout de este plan hace poco.
// Solo matchea si hay UN único comercio candidato (si hay dudas, va a manual).
async function matchByIntent(plan, preapprovalId) {
  if (!plan) return null
  const since = new Date(Date.now() - INTENT_WINDOW_HOURS * 3600 * 1000).toISOString()
  const { data: intents } = await supabaseAdmin
    .from('checkout_intents')
    .select('id, commerce_id')
    .eq('plan', plan)
    .is('matched_preapproval_id', null)
    .gte('created_at', since)
  const candidates = [...new Set((intents || []).map(i => i.commerce_id))]
  if (candidates.length !== 1) {
    if (candidates.length > 1) console.warn('[mp-webhook] intent ambiguo', { plan, candidates })
    return null
  }
  await supabaseAdmin
    .from('checkout_intents')
    .update({ matched_preapproval_id: preapprovalId })
    .eq('commerce_id', candidates[0])
    .eq('plan', plan)
    .is('matched_preapproval_id', null)
  return candidates[0]
}

// Busca un comercio cuyo dueño tenga el mismo email que el pagador de MP.
// Solo matchea si ese dueño tiene UN único comercio.
async function matchByPayerEmail(email) {
  if (!email) return null
  const { data: profiles } = await supabaseAdmin
    .from('profiles').select('id').ilike('email', email.trim())
  const ownerIds = (profiles || []).map(p => p.id)
  if (ownerIds.length !== 1) return null
  const { data: commerces } = await supabaseAdmin
    .from('commerces').select('id').eq('owner_id', ownerIds[0])
  return commerces?.length === 1 ? commerces[0].id : null
}

// ─── Suscripciones ──────────────────────────────────────────────────────────

export async function handlePreapproval(preapprovalId) {
  const data = await mpGet(`/preapproval/${preapprovalId}`)
  if (!data) return null

  const plan   = planFrom(data)
  const status = data.status // authorized | paused | cancelled | pending
  const { data: existing } = await supabaseAdmin
    .from('subscriptions').select('*').eq('mp_preapproval_id', preapprovalId).maybeSingle()

  let commerceId = commerceIdFromRef(data.external_reference)
  let matchedBy  = commerceId ? 'external_reference' : null
  if (!commerceId && existing?.commerce_id) {
    commerceId = existing.commerce_id
    matchedBy  = existing.matched_by
  }
  if (!commerceId && status === 'authorized') {
    commerceId = await matchByIntent(plan, preapprovalId)
    if (commerceId) matchedBy = 'intent'
  }
  if (!commerceId && status === 'authorized') {
    commerceId = await matchByPayerEmail(data.payer_email)
    if (commerceId) matchedBy = 'payer_email'
  }

  console.log('[mp-webhook] preapproval', { preapprovalId, status, plan, commerceId, matchedBy, ext: data.external_reference })

  await supabaseAdmin.from('subscriptions').upsert({
    mp_preapproval_id:  preapprovalId,
    commerce_id:        commerceId,
    plan,
    status,
    amount:             data.auto_recurring?.transaction_amount ?? null,
    payer_email:        data.payer_email || existing?.payer_email || null,
    external_reference: data.external_reference || null,
    matched_by:         matchedBy,
    updated_at:         new Date().toISOString(),
  })

  if (!commerceId) {
    if (status === 'authorized' && !existing) {
      await notifyAdmins({
        type:  'billing_unmatched',
        title: 'Suscripción nueva sin comercio asignado',
        body:  `Entró una suscripción ${plan ? plan.toUpperCase() : ''} de ${data.payer_email || 'un pagador sin email'} y no pudimos saber de qué comercio es. ID MP: ${preapprovalId}`,
        metadata: { preapprovalId, plan, payer_email: data.payer_email || null },
      })
    }
    return { commerceId: null, plan, status }
  }

  const ctx = { via: 'mp_preapproval', preapprovalId, status, matchedBy }
  if (status === 'authorized') {
    if (!plan) {
      console.warn('[mp-webhook] no pudimos determinar el plan', data.preapproval_plan_id, data.auto_recurring)
      return { commerceId, plan, status }
    }
    const changed = await setCommercePlan(commerceId, plan, ctx)
    if (changed?.previousPlan && changed.previousPlan !== plan) {
      await notify({
        userId: changed.owner_id,
        type:   'plan_activated',
        title:  `¡Tu plan ${plan.toUpperCase()} está activo!`,
        body:   'Ya tenés disponibles todas las funciones de tu plan. Gracias por sumarte.',
        link:   '/comercio',
        metadata: { plan, commerce_id: commerceId },
      })
      await notifyAdmins({
        type:  'billing_new_subscriber',
        title: `Nuevo suscriptor ${plan.toUpperCase()}: ${changed.name}`,
        body:  `Se activó automáticamente (match: ${matchedBy}).`,
        metadata: { commerce_id: commerceId, plan, preapprovalId },
      })
    }
  } else if (status === 'cancelled' || status === 'paused') {
    const changed = await setCommercePlan(commerceId, 'free', ctx)
    if (changed?.previousPlan && changed.previousPlan !== 'free') {
      await notifyAdmins({
        type:  'billing_cancelled',
        title: `${changed.name} ${status === 'paused' ? 'pausó' : 'canceló'} su suscripción`,
        body:  `Pasó de ${changed.previousPlan.toUpperCase()} a FREE.`,
        metadata: { commerce_id: commerceId, preapprovalId, status },
      })
    }
  }
  return { commerceId, plan, status }
}

// ─── Cuotas cobradas ────────────────────────────────────────────────────────

export async function handleAuthorizedPayment(paymentId) {
  const data = await mpGet(`/authorized_payments/${paymentId}`)
  if (!data) return
  const preapprovalId = data.preapproval_id

  let { data: sub } = await supabaseAdmin
    .from('subscriptions').select('*').eq('mp_preapproval_id', preapprovalId).maybeSingle()
  if (!sub && preapprovalId) {
    // Primera vez que vemos esta suscripción (ej: el aviso de la suscripción
    // no llegó o llegó antes de este deploy) → la procesamos ahora.
    await handlePreapproval(preapprovalId)
    ;({ data: sub } = await supabaseAdmin
      .from('subscriptions').select('*').eq('mp_preapproval_id', preapprovalId).maybeSingle())
  }

  const status = data.payment?.status || data.status // approved | rejected | ...
  const paidAt = data.payment?.date_approved || data.last_modified || data.date_created || null

  console.log('[mp-webhook] authorized_payment', { paymentId, preapprovalId, status, commerceId: sub?.commerce_id })

  // Si el cobro ya se cargó a mano (con el N.° de operación u otro ID), lo
  // reutilizamos en vez de duplicarlo: misma suscripción/comercio, mismo monto y
  // misma fecha (±36 h).
  const amountNow = data.transaction_amount ?? sub?.amount ?? null
  if (status === 'approved' && paidAt && sub?.commerce_id && amountNow != null) {
    const t = new Date(paidAt).getTime()
    const { data: prev } = await supabaseAdmin.from('payments')
      .select('id, mp_payment_id, paid_at').eq('commerce_id', sub.commerce_id)
      .eq('amount', amountNow).eq('status', 'approved').neq('mp_payment_id', String(paymentId))
    const dup = (prev || []).find(r => r.paid_at && Math.abs(new Date(r.paid_at).getTime() - t) < 36 * 3600 * 1000)
    if (dup) await supabaseAdmin.from('payments').update({ mp_payment_id: String(paymentId) }).eq('id', dup.id)
  }

  await supabaseAdmin.from('payments').upsert({
    mp_payment_id:     String(paymentId),
    mp_preapproval_id: preapprovalId || null,
    commerce_id:       sub?.commerce_id || null,
    plan:              sub?.plan || null,
    amount:            data.transaction_amount ?? sub?.amount ?? null,
    status,
    paid_at:           status === 'approved' ? paidAt : null,
  }, { onConflict: 'mp_payment_id' })

  if (status === 'rejected' && sub?.commerce_id) {
    const { data: c } = await supabaseAdmin.from('commerces').select('name').eq('id', sub.commerce_id).single()
    await notifyAdmins({
      type:  'billing_payment_failed',
      title: `Falló el cobro de ${c?.name || 'un comercio'}`,
      body:  'Mercado Pago va a reintentar. Si la suscripción se cancela, el plan baja a FREE solo.',
      metadata: { commerce_id: sub.commerce_id, paymentId, preapprovalId },
    })
  }
}

export async function handlePayment(paymentId) {
  const data = await mpGet(`/v1/payments/${paymentId}`)
  if (!data) return
  console.log('[mp-webhook] payment', { paymentId, status: data.status, externalRef: data.external_reference })
}
