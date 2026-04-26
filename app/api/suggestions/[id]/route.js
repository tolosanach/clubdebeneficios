// PATCH /api/suggestions/[id]
// Body: { action: 'read' | 'dismiss' }
//
// 'read'    → solo marca read_at, sigue visible en el buzón
// 'dismiss' → marca dismissed_at, desaparece del buzón. La misma rule_key
//             para ese commerce_id no se vuelve a generar por 14 días.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function PATCH(request, { params }) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const id = params.id
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const action = body.action

    if (action !== 'read' && action !== 'dismiss') {
      return NextResponse.json({ error: 'action debe ser read o dismiss' }, { status: 400 })
    }

    const update = action === 'read'
      ? { read_at: new Date().toISOString() }
      : { dismissed_at: new Date().toISOString() }

    const { data, error } = await supabaseAdmin
      .from('suggestions')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[suggestions PATCH] db error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    return NextResponse.json({ suggestion: data })
  } catch (err) {
    console.error('[suggestions PATCH]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
