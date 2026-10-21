// GET /api/admin/mp-reconcile            → sincroniza con Mercado Pago
// GET /api/admin/mp-reconcile?dry=1      → solo diagnóstico, no escribe nada
//
// Red de seguridad para cuando el webhook no recibe avisos de MP (por ejemplo
// si el plan se creó desde el panel de MP y no con el token de la app).
// Consulta la API de MP, y para cada suscripción y cada cuota cobrada corre la
// MISMA lógica que el webhook (lib/mp-sync.js): matchea el comercio, activa o
// baja el plan y guarda el cobro en `payments`. Es idempotente.
//
// Auth: sesión de admin, o header `Authorization: Bearer ${CRON_SECRET}`
// (para un cron). Los emails de pagador y IDs que devuelve son solo para admin.

import { NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../../lib/supabase-server'
import {
  supabaseAdmin, mpGet, MpFatalError, PREAPPROVAL_PLAN_MAP,
  handlePreapproval,
} from '../../../../lib/mp-sync'

async function authorized(request) {
  const bearer = request.headers.get('authorization') || ''
  if (process.env.CRON_SECRET && bearer === `Bearer ${process.env.CRON_SECRET}`) return true
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function GET(request) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const dry = new URL(request.url).searchParams.get('dry') === '1'
  const out = { dry, plans: [], subscriptions: [], payments: [], errors: [] }

  try {
    // Diagnóstico: a qué app pertenece cada plan (debería ser la de Benefix).
    for (const planId of Object.keys(PREAPPROVAL_PLAN_MAP)) {
      const p = await mpGet(`/preapproval_plan/${planId}`)
      out.plans.push({
        plan_id: planId, nuestro_plan: PREAPPROVAL_PLAN_MAP[planId],
        encontrado: !!p, application_id: p?.application_id ?? null,
        collector_id: p?.collector_id ?? null, status: p?.status ?? null,
      })
    }

    const search = await mpGet('/preapproval/search?limit=100')
    const found = search?.results || []
    for (const s of found) {
      const { data: known } = await supabaseAdmin
        .from('subscriptions').select('commerce_id').eq('mp_preapproval_id', s.id).maybeSingle()
      out.subscriptions.push({
        id: s.id, status: s.status, payer_email: s.payer_email,
        monto: s.auto_recurring?.transaction_amount ?? null,
        external_reference: s.external_reference || null,
        ya_en_base: !!known, comercio: known?.commerce_id ?? null,
        ultimo_cobro: s.summarized ? { fecha: s.summarized.last_charged_date ?? null, monto: s.summarized.last_charged_amount ?? null, cobros: s.summarized.charged_quantity ?? null } : null,
      })
      if (dry) continue
      try {
        await handlePreapproval(s.id)
      } catch (e) {
        if (e instanceof MpFatalError) throw e
        out.errors.push({ preapproval: s.id, error: e?.message })
      }
    }
    out.total_en_mp = found.length
  } catch (e) {
    const code = e instanceof MpFatalError ? e.message : (e?.message || 'error')
    out.errors.push({ fatal: code })
    return NextResponse.json(out, { status: 502 })
  }
  return NextResponse.json(out)
}
