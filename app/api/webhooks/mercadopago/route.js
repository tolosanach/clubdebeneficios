// POST /api/webhooks/mercadopago
//
// Recibe notificaciones de Mercado Pago y mantiene sincronizado el plan de
// cada comercio + el historial de cobros. Flujo:
//
//   1. MP avisa cuando cambia una suscripción (preapproval) o cuando cobra
//      una cuota (authorized_payment).
//   2. Pedimos el detalle a la API de MP con MP_ACCESS_TOKEN.
//   3. Resolvemos el COMERCIO de la suscripción, en este orden:
//        a) external_reference (commerce.id que agrega upgradePlan al link).
//        b) La fila ya guardada en `subscriptions` (eventos posteriores).
//        c) El checkout_intent reciente del mismo plan (el link de MP no
//           siempre traslada external_reference — así se nos escapó el
//           primer pago real, oct 2026).
//        d) El email del pagador = email del dueño de un comercio.
//      Si nada matchea, avisamos al admin para asignarla a mano.
//   4. Resolvemos el PLAN por preapproval_plan_id o, si no viene, por monto.
//   5. authorized → activa el plan. cancelled/paused → baja a 'free'.
//   6. Cada cuota cobrada queda en `payments`.
//
// Seguridad: si MP_WEBHOOK_SECRET está configurado, validamos la firma
// x-signature de MP y rechazamos lo que no matchee.
//
// Siempre devolvemos 200 (salvo firma inválida) para que MP no reintente en loop.


import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { MpFatalError, handlePreapproval, handleAuthorizedPayment, handlePayment } from '../../../../lib/mp-sync'

const MP_SECRET = process.env.MP_WEBHOOK_SECRET

// Valida x-signature según la doc de MP:
//   manifest = `id:${data.id};request-id:${x-request-id};ts:${ts};`
//   v1 = HMAC-SHA256(manifest, secret) en hex
function isValidSignature(request, dataId) {
  if (!MP_SECRET) return true // sin secret configurado no validamos (modo legacy)
  const sig = request.headers.get('x-signature') || ''
  const requestId = request.headers.get('x-request-id') || ''
  const parts = Object.fromEntries(
    sig.split(',').map(p => p.split('=').map(s => s.trim())).filter(p => p.length === 2)
  )
  if (!parts.ts || !parts.v1) return false
  let manifest = ''
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`
  if (requestId) manifest += `request-id:${requestId};`
  manifest += `ts:${parts.ts};`
  const expected = crypto.createHmac('sha256', MP_SECRET).update(manifest).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1))
  } catch {
    return false
  }
}

// ─── Entry point ────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const url = new URL(request.url)
    const queryType = url.searchParams.get('type') || url.searchParams.get('topic')
    const queryId   = url.searchParams.get('data.id') || url.searchParams.get('id')

    let body = {}
    try { body = await request.json() } catch (_) {}
    const bodyType = body?.type || body?.topic || body?.action
    const bodyId   = body?.data?.id || body?.id

    // El cuerpo es lo que describe el evento; el ?type= de la URL puede venir
    // distinto (el simulador de MP los mezcla). Si hay cuerpo, manda el cuerpo.
    const type = (body?.type || body?.topic || queryType || bodyType || '').toLowerCase()
    const id   = queryId || bodyId

    if (!isValidSignature(request, url.searchParams.get('data.id') || bodyId)) {
      console.warn('[mp-webhook] firma inválida', { type, id })
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    console.log('[mp-webhook] received', { type, id })
    if (!id) return NextResponse.json({ ok: true })

    if (type.includes('authorized_payment')) {
      await handleAuthorizedPayment(id)
    } else if (type.includes('preapproval')) {
      await handlePreapproval(id)
    } else if (type.includes('payment')) {
      await handlePayment(id)
    } else {
      console.log('[mp-webhook] tipo no manejado', type)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof MpFatalError) {
      // No se pudo leer el detalle en MP (credenciales o caída): 500 para que reintente.
      console.error('[mp-webhook] mp fatal', err.message)
      return NextResponse.json({ ok: false, reason: err.message }, { status: 500 })
    }
    console.error('[mp-webhook] error global', err)
    return NextResponse.json({ ok: true })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, name: 'mercadopago-webhook' })
}
