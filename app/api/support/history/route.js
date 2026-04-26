// GET /api/support/history?role=client|merchant
// Devuelve la conversación abierta del usuario (creando una si no existe en
// el primer mensaje, no acá) + sus últimos mensajes para hidratar el drawer.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const url  = new URL(request.url)
    const role = url.searchParams.get('role') === 'merchant' ? 'merchant' : 'client'

    const { data: conv } = await supabaseAdmin
      .from('support_conversations')
      .select('id, role, status, created_at')
      .eq('user_id', user.id)
      .eq('role', role)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!conv) {
      return NextResponse.json({ conversation_id: null, messages: [] })
    }

    const { data: msgs } = await supabaseAdmin
      .from('support_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conv.id)
      .in('role', ['user','assistant'])
      .order('created_at', { ascending: true })
      .limit(60)

    return NextResponse.json({ conversation_id: conv.id, messages: msgs || [] })
  } catch (err) {
    console.error('Support history error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
