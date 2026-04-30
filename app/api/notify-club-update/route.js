// POST /api/notify-club-update
// Body: { commerce_id, kind: 'prize'|'promo', name?, value?, image? }
//
// Lo llama el comerciante CUANDO acaba de cargar un premio o promo nuevo.
// El server:
//   1) Valida que el caller sea el dueño del comercio.
//   2) Consulta `club_subscriptions` para sacar la lista de user_ids
//      suscriptos a este comercio para este tipo de evento.
//   3) Dispara `notify(...)` (in-app + push) a cada uno usando el helper
//      `notify-server.js`.
//
// La respuesta es { ok, notified: <count> }. Best-effort: si la fila de
// subscription tiene un user_id que ya no existe, lo saltea.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'
import { notify } from '../../../lib/notify-server'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { commerce_id, kind, name, value, image } = body
    if (!commerce_id || !kind) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }
    if (kind !== 'prize' && kind !== 'promo') {
      return NextResponse.json({ error: 'kind inválido' }, { status: 400 })
    }

    // Verificar ownership o admin
    const { data: commerce } = await supabaseAdmin
      .from('commerces').select('id, name, owner_id, slug').eq('id', commerce_id).single()
    if (!commerce) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    }
    if (commerce.owner_id !== user.id) {
      const { data: prof } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user.id).single()
      if (prof?.role !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    // Filtrar subscribers según el toggle correspondiente
    const flagCol = kind === 'prize' ? 'notify_prizes' : 'notify_promos'
    const { data: subs } = await supabaseAdmin
      .from('club_subscriptions')
      .select(`user_id, ${flagCol}`)
      .eq('commerce_id', commerce_id)
      .eq(flagCol, true)
    const userIds = (subs || []).map(s => s.user_id).filter(Boolean)
    if (userIds.length === 0) {
      return NextResponse.json({ ok: true, notified: 0 })
    }

    // Texto de la notif
    const title = kind === 'prize'
      ? `Nuevo premio en ${commerce.name}`
      : `Nueva promo en ${commerce.name}`
    const body_ = kind === 'prize'
      ? (name ? `${name} ya está disponible para canjear.` : 'Hay un premio nuevo en el catálogo.')
      : (name ? `${name} disponible ahora.`              : 'Tenés un beneficio nuevo activo.')
    const link = `/club/${commerce.slug || commerce.id}`

    // Notif fan-out — paralelo, best-effort. notify() ya es resiliente.
    const results = await Promise.allSettled(userIds.map(uid =>
      notify({
        userId: uid,
        type:   kind === 'prize' ? 'new_prize' : 'new_promo',
        title,
        body:   body_,
        link,
        metadata: {
          commerce_id,
          commerce_name: commerce.name,
          kind,
          name: name || null,
          value: value ?? null,
          image: image || null,
        },
      })
    ))
    const notified = results.filter(r => r.status === 'fulfilled').length

    return NextResponse.json({ ok: true, notified })
  } catch (err) {
    console.error('[notify-club-update]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
