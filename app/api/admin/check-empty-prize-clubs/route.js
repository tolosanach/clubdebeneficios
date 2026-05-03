// POST /api/admin/check-empty-prize-clubs
//
// Cron endpoint disparado por Vercel Cron (configurado en vercel.json).
// Para cada comercio activo:
//   1) Verifica si tiene 0 premios activos en su sistema actual.
//   2) Verifica si tiene clientes con balance > 0 (memberships con
//      stars > 0 o points > 0 según el sistema del comercio).
//   3) Si ambas condiciones se cumplen Y nunca enviamos esta notif (o
//      la última fue hace >= 7 días), inserta una notif tipo
//      `no_prizes_warning` para el dueño.
//
// Auth: header `authorization: Bearer ${CRON_SECRET}`. Vercel Cron lo
// inyecta automáticamente cuando configurás la env var CRON_SECRET en
// Vercel y referenciás el cron en vercel.json (oficial Vercel docs).
//
// Idempotencia: el throttle de 7 días vive en la query — si la última
// notif `no_prizes_warning` para este user es < 7 días, no creamos otra.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const THROTTLE_DAYS = 7
const THROTTLE_MS   = THROTTLE_DAYS * 24 * 60 * 60 * 1000

/**
 * Endpoint puede llamarse con GET (Vercel Cron típicamente usa GET)
 * o POST manual desde un script de admin. Soportamos ambos.
 */
async function handle(request) {
  // Auth — Vercel Cron envía header `authorization: Bearer <CRON_SECRET>`
  // si se configuró la env var. En dev podemos pasar el header a mano
  // con curl. El secret se lee de env CRON_SECRET (no NEXT_PUBLIC_).
  const auth = request.headers.get('authorization') || ''
  const expected = `Bearer ${process.env.CRON_SECRET || ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const sinceCutoff = new Date(Date.now() - THROTTLE_MS).toISOString()

  // 1) Comercios activos con su sistema y owner.
  // `active=true` es lo que usamos para "el sistema del comercio está
  // operativo" — el comercio recién registrado lo es por default.
  const { data: commerces, error: cErr } = await supabaseAdmin
    .from('commerces')
    .select('id, owner_id, name, prog_type')
    .eq('active', true)
  if (cErr) {
    console.error('[check-empty-prize-clubs] error trayendo commerces:', cErr)
    return NextResponse.json({ error: 'Error de DB' }, { status: 500 })
  }

  const stats = { checked: 0, notified: 0, skipped_throttle: 0, skipped_no_clients: 0, skipped_has_prizes: 0 }

  for (const c of commerces || []) {
    stats.checked += 1
    const sys = c.prog_type === 'points' ? 'points' : 'stars'

    // 2) Premios activos del sistema actual.
    const { count: prizesCount } = await supabaseAdmin
      .from('prizes')
      .select('id', { count: 'exact', head: true })
      .eq('commerce_id', c.id)
      .eq('active', true)
      .eq('system_type', sys)

    if ((prizesCount || 0) > 0) {
      stats.skipped_has_prizes += 1
      continue
    }

    // 3) Clientes con balance > 0. Para stars miramos memberships.stars,
    // para points miramos memberships.points. Solo cuenta si > 0.
    const balCol = sys === 'points' ? 'points' : 'stars'
    const { count: clientsWithBalance } = await supabaseAdmin
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('commerce_id', c.id)
      .gt(balCol, 0)

    if ((clientsWithBalance || 0) === 0) {
      stats.skipped_no_clients += 1
      continue
    }

    // 4) Throttle: ¿le mandamos esta notif al dueño en los últimos 7 días?
    const { data: recentNotif } = await supabaseAdmin
      .from('notifications')
      .select('id, created_at')
      .eq('user_id', c.owner_id)
      .eq('type', 'no_prizes_warning')
      .gte('created_at', sinceCutoff)
      .order('created_at', { ascending: false })
      .limit(1)

    if (recentNotif && recentNotif.length > 0) {
      stats.skipped_throttle += 1
      continue
    }

    // 5) Insert.
    const unitWord = sys === 'points' ? 'puntos' : 'estrellas'
    await supabaseAdmin.from('notifications').insert({
      user_id:  c.owner_id,
      type:     'no_prizes_warning',
      title:    'Tus clientes están acumulando sin nada para canjear',
      body:     `${clientsWithBalance} cliente${clientsWithBalance === 1 ? '' : 's'} ya tien${clientsWithBalance === 1 ? 'e' : 'en'} ${unitWord} en tu club, pero todavía no cargaste premios. Cargá uno antes de que se desanimen.`,
      link:     '/comercio/recompensas',
      metadata: {
        clients_with_balance: clientsWithBalance,
        system:               sys,
        commerce_id:          c.id,
        commerce_name:        c.name,
      },
    })
    stats.notified += 1
  }

  console.log('[check-empty-prize-clubs] ejecutado:', stats)
  return NextResponse.json({ ok: true, ...stats })
}

export async function GET(request)  { return handle(request) }
export async function POST(request) { return handle(request) }
