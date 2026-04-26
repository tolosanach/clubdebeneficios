// POST /api/leave-club  { commerce_id }
// Borra la membership del usuario autenticado en el comercio especificado.
// Solo borra la propia membership del user (chequeo por user_id en el query).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { commerce_id } = await request.json().catch(() => ({}))
    if (!commerce_id) {
      return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })
    }

    const { error: delErr } = await supabaseAdmin
      .from('memberships')
      .delete()
      .eq('user_id', user.id)
      .eq('commerce_id', commerce_id)

    if (delErr) {
      console.error('[leave-club]', delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[leave-club]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
