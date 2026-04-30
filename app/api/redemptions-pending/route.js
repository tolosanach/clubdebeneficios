// GET /api/redemptions-pending?commerce_id=...
//
// Lista los canjes en estado 'pending' del comercio. Lo usa el panel
// del dueño para mostrar la solapa "Canjes pendientes" con el detalle
// de cada uno (cliente, premio, código, fecha) y los botones de
// Confirmar / Rechazar.
//
// Devuelve también el conteo total para el badge en el icono de la
// solapa, sin tener que cargar dos endpoints.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getSessionUser() {
  const cookieStore = await cookies()
  const ssr = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await ssr.auth.getUser()
  return user
}

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const commerce_id = url.searchParams.get('commerce_id')
    if (!commerce_id) {
      return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })
    }

    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Auth: caller debe ser owner del comercio o admin.
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single()
    const { data: commerce } = await supabaseAdmin
      .from('commerces').select('owner_id, prog_type').eq('id', commerce_id).single()
    if (!commerce) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    }
    const isAdmin = profile?.role === 'admin'
    const isOwner = commerce.owner_id === user.id
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Cargar pendientes — más nuevo primero. Limit 50 para no sobrecargar
    // el front si por algún motivo se acumularon muchos sin atender.
    const { data: rawPending, error: pErr } = await supabaseAdmin
      .from('redemptions')
      .select('id, code, created_at, user_id, prize_id, membership_id')
      .eq('commerce_id', commerce_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50)
    if (pErr) throw pErr

    // Resolver perfiles + premios por separado (RLS bloquea joins de profile
    // desde service-role hacia el endpoint público, pero acá usamos admin).
    const userIds  = [...new Set((rawPending || []).map(r => r.user_id))]
    const prizeIds = [...new Set((rawPending || []).map(r => r.prize_id))]

    const [{ data: profiles }, { data: prizes }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from('profiles').select('id, full_name, name, email, phone').in('id', userIds)
        : Promise.resolve({ data: [] }),
      prizeIds.length
        ? supabaseAdmin.from('prizes').select('id, name, cost').in('id', prizeIds)
        : Promise.resolve({ data: [] }),
    ])
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
    const prizeMap   = Object.fromEntries((prizes   || []).map(p => [p.id, p]))

    const pending = (rawPending || []).map(r => {
      const prof = profileMap[r.user_id] || {}
      const prz  = prizeMap[r.prize_id]   || {}
      return {
        id:            r.id,
        code:          r.code,
        created_at:    r.created_at,
        membership_id: r.membership_id,
        client: {
          id:    r.user_id,
          name:  prof.full_name || prof.name || 'Cliente',
          email: prof.email || null,
          phone: prof.phone || null,
        },
        prize: {
          id:   r.prize_id,
          name: prz.name || 'Premio',
          cost: prz.cost || 0,
        },
      }
    })

    return NextResponse.json({
      ok:        true,
      count:     pending.length,
      prog_type: commerce.prog_type,
      pending,
    })
  } catch (err) {
    console.error('[redemptions-pending] error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
