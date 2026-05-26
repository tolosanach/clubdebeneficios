// POST /api/admin/check-founder-expiry
//
// Cron diario que detecta comercios fundadores cuyo período de lanzamiento
// venció (is_founder=true AND founder_expiry <= hoy AND plan != 'free').
// Para cada uno:
//   1) Baja el plan a 'free'.
//   2) Marca is_founder=false para que no vuelva a procesarse.
//   3) Envía notificación in-app + push al dueño.
//
// Auth: header `authorization: Bearer ${CRON_SECRET}` (igual que el resto
// de crons de admin). Vercel lo inyecta automáticamente desde env var.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notify } from '@/lib/notify-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function handle(request) {
  const auth     = request.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'

  // Comercios fundadores vencidos que todavía tienen plan elevado.
  const { data: expired, error } = await supabaseAdmin
    .from('commerces')
    .select('id, owner_id, name, plan')
    .eq('is_founder', true)
    .lte('founder_expiry', today)
    .neq('plan', 'free')

  if (error) {
    console.error('[check-founder-expiry] error trayendo comercios:', error)
    return NextResponse.json({ error: 'Error de DB' }, { status: 500 })
  }

  const stats = { checked: expired?.length ?? 0, downgraded: 0, errors: 0 }

  for (const c of expired || []) {
    // 1) Bajar plan + marcar founder como expirado.
    const { error: updateErr } = await supabaseAdmin
      .from('commerces')
      .update({ plan: 'free', is_founder: false })
      .eq('id', c.id)

    if (updateErr) {
      console.error('[check-founder-expiry] error actualizando comercio', c.id, updateErr)
      stats.errors += 1
      continue
    }

    // 2) Notificación al dueño (in-app + push).
    const planLabel = c.plan === 'pro' ? 'Pro' : 'Starter'
    await notify({
      userId:   c.owner_id,
      type:     'founder_expired',
      title:    'Tu período fundador terminó',
      body:     `"${c.name}" volvió al plan Free. Podés seguir usándolo sin cargo o upgradear a Starter o Pro para mantener todas las funciones ${planLabel} que venías usando.`,
      link:     '/comercio/configuracion',
      metadata: { commerce_id: c.id, commerce_name: c.name, previous_plan: c.plan },
    })

    stats.downgraded += 1
  }

  console.log('[check-founder-expiry] ejecutado:', stats)
  return NextResponse.json({ ok: true, ...stats })
}

export async function GET(request)  { return handle(request) }
export async function POST(request) { return handle(request) }
