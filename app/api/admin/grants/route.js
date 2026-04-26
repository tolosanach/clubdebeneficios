// GET  /api/admin/grants?commerce_id=X    — lista grants del comercio (todos)
// Solo admins pueden invocar.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function ensureAdmin() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', status: 401 }
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Solo admins', status: 403 }
  return { user }
}

export async function GET(request) {
  const auth = await ensureAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const url = new URL(request.url)
  const commerceId = url.searchParams.get('commerce_id')
  if (!commerceId) return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('pending_grants')
    .select('id, name, phone, email, starting_points, promo_id, applied_at, created_at')
    .eq('commerce_id', commerceId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, grants: data || [] })
}
