// GET  /api/user/profile  — retorna el perfil del usuario autenticado
// PUT  /api/user/profile  — actualiza name y phone

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getAuthUser() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, name, email, avatar_url, phone, role, created_at')
    .eq('id', user.id)
    .single()

  const [{ count: clubs_count }, { count: total_visits }, { count: total_redemptions }] = await Promise.all([
    supabaseAdmin.from('memberships').select('*', { count:'exact', head:true }).eq('user_id', user.id),
    supabaseAdmin.from('visits').select('*', { count:'exact', head:true }).eq('user_id', user.id),
    supabaseAdmin.from('redemptions').select('*', { count:'exact', head:true }).eq('user_id', user.id),
  ])

  return NextResponse.json({
    ok: true,
    profile: { ...profile, clubs_count, total_visits, total_redemptions },
  })
}

export async function PUT(request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const { name, phone } = body

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ name: name?.trim() || null, phone: phone?.trim() || null })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
