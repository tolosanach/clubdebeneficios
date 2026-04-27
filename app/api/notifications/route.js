// GET  /api/notifications        → lista las notifs del user logueado
// PATCH /api/notifications        → marca todas como leídas (mark-all-read)
//
// Auth via @supabase/ssr (cookies). Las RLS policies de la tabla ya filtran
// por user_id, pero igual usamos el cliente admin para evitar problemas con
// joins / counts.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function getUser() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET(request) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10), 100)

    const [{ data: items }, { count: unread }] = await Promise.all([
      supabaseAdmin
        .from('notifications')
        .select('id, type, title, body, link, metadata, read_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null),
    ])

    return NextResponse.json({
      ok: true,
      items: items || [],
      unread_count: unread || 0,
    })
  } catch (err) {
    console.error('[notifications GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Marcar todas como leídas (acción global del drawer)
export async function PATCH() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[notifications PATCH all]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
