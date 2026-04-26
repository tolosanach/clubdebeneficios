import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { name, phone, country, province, city } = await request.json()

  if (!phone?.trim()) {
    return NextResponse.json({ error: 'El teléfono es obligatorio' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      name:                 name?.trim()    || null,
      phone:                phone.trim(),
      country:              country?.trim() || null,
      province:             province?.trim()|| null,
      city:                 city?.trim()    || null,
      onboarding_completed: true,
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
