// GET /api/commerce-clients?commerce_id=X
//
// Devuelve la lista de memberships del comercio con los datos del profile
// adjuntos (name, full_name, email, phone, avatar_url). Usa service role
// para bypassear las RLS de `profiles` — la policy de profiles solo deja
// a cada user ver su propio profile, así que el dueño NO puede traer los
// nombres de sus clientes vía cliente directo. Este endpoint resuelve eso
// en el server con auth guard de ownership.
//
// Auth: solo dueño del comercio o admin global.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function GET(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const commerceId = url.searchParams.get('commerce_id')
    if (!commerceId) {
      return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })
    }

    // Verificar dueño/admin
    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, owner_id')
      .eq('id', commerceId)
      .single()
    if (!commerce) return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    if (commerce.owner_id !== user.id) {
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user.id).single()
      if (callerProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    // Trae memberships con profile join (admin client → ignora RLS)
    const { data: memberships, error } = await supabaseAdmin
      .from('memberships')
      .select('*, profiles(id, name, full_name, email, phone, avatar_url)')
      .eq('commerce_id', commerceId)
      .order('last_visit', { ascending: false, nullsLast: true })

    if (error) throw error

    // Normalizamos: agregamos `display_name` como el primer no-vacío entre
    // full_name y name. El frontend puede leerlo directo sin tener que
    // hacer fallbacks en cada lugar.
    const items = (memberships || []).map(m => {
      const p = m.profiles || {}
      const display_name = (p.full_name && p.full_name.trim())
        || (p.name && p.name.trim())
        || null
      return {
        ...m,
        profiles: p ? { ...p, display_name } : null,
      }
    })

    return NextResponse.json({ ok: true, items })
  } catch (err) {
    console.error('[commerce-clients]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
