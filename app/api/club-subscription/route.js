// /api/club-subscription
//
// Manejo de la "campanita" del cliente por club. 3 verbos:
//
//   GET    ?commerce_id=X    → devuelve { ok, subscribed, notify_prizes, notify_promos }
//   POST   { commerce_id }   → crea/upsert con ambos toggles en true
//   PATCH  { commerce_id, notify_prizes?, notify_promos? } → actualiza toggles
//   DELETE { commerce_id }   → desuscribir (delete row)
//
// Auth: solo el dueño del row puede leer/escribir (RLS lo enforza, pero
// igual chequeamos getUser() acá para devolver 401 limpio).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

async function getUser() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const commerceId = new URL(request.url).searchParams.get('commerce_id')
  if (!commerceId) return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })

  const { data: sub } = await supabaseAdmin
    .from('club_subscriptions')
    .select('id, notify_prizes, notify_promos, created_at')
    .eq('user_id', user.id)
    .eq('commerce_id', commerceId)
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    subscribed:    !!sub,
    notify_prizes: sub?.notify_prizes ?? false,
    notify_promos: sub?.notify_promos ?? false,
  })
}

export async function POST(request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const { commerce_id } = body
  if (!commerce_id) return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })

  // Upsert — si ya existe, no rompe.
  const { data, error } = await supabaseAdmin
    .from('club_subscriptions')
    .upsert(
      { user_id: user.id, commerce_id, notify_prizes: true, notify_promos: true },
      { onConflict: 'user_id,commerce_id' },
    )
    .select('id, notify_prizes, notify_promos')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, subscribed: true, ...data })
}

export async function PATCH(request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const { commerce_id, notify_prizes, notify_promos } = body
  if (!commerce_id) return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })

  const updates = {}
  if (typeof notify_prizes === 'boolean') updates.notify_prizes = notify_prizes
  if (typeof notify_promos === 'boolean') updates.notify_promos = notify_promos
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('club_subscriptions')
    .update(updates)
    .eq('user_id', user.id)
    .eq('commerce_id', commerce_id)
    .select('id, notify_prizes, notify_promos')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, subscribed: true, ...data })
}

export async function DELETE(request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const commerceId = body.commerce_id || new URL(request.url).searchParams.get('commerce_id')
  if (!commerceId) return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('club_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('commerce_id', commerceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, subscribed: false })
}
