// POST /api/billing/sync
//
// Lo llama la app apenas el dueño vuelve del checkout de Mercado Pago
// (?upgrade=success). MP no avisa por webhook de las suscripciones creadas desde
// planes del panel, así que consultamos la API de MP y corremos la misma lógica
// del webhook (lib/mp-sync.js) para activar el plan al instante.
//
// Seguridad: requiere sesión y que el usuario sea dueño de al menos un comercio.
// Solo procesa suscripciones AÚN no vinculadas a un comercio (las demás las
// mantiene el cron de conciliación). El matching es el de siempre: referencia,
// intención de checkout reciente o email del pagador. Rate limit 30/hora.

import { NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../../lib/supabase-server'
import { supabaseAdmin, mpGet, MpFatalError, handlePreapproval } from '../../../../lib/mp-sync'

const hits = new Map() // user_id -> timestamps (en memoria, por instancia)

export async function POST() {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const now = Date.now()
    const recent = (hits.get(user.id) || []).filter(t => now - t < 3600_000)
    if (recent.length >= 30) return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 })
    hits.set(user.id, [...recent, now])

    const { data: mine } = await supabaseAdmin.from('commerces').select('id, plan').eq('owner_id', user.id)
    if (!mine?.length) return NextResponse.json({ error: 'Sin comercio' }, { status: 403 })
    const before = Object.fromEntries(mine.map(c => [c.id, c.plan]))

    const search = await mpGet('/preapproval/search?status=authorized&limit=50')
    for (const s of search?.results || []) {
      const { data: known } = await supabaseAdmin
        .from('subscriptions').select('commerce_id').eq('mp_preapproval_id', s.id).maybeSingle()
      if (known?.commerce_id) continue
      await handlePreapproval(s.id)
    }

    const { data: after } = await supabaseAdmin.from('commerces').select('id, plan').eq('owner_id', user.id)
    const activated = (after || []).find(c => c.plan !== before[c.id] && c.plan !== 'free')
    return NextResponse.json({ ok: true, activated: !!activated, plan: activated?.plan || null })
  } catch (e) {
    console.error('[billing-sync] error', e?.message)
    return NextResponse.json({ ok: false, activated: false, error: e instanceof MpFatalError ? e.message : 'error' }, { status: 200 })
  }
}
