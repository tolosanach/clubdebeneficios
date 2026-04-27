// POST /api/delete-commerce
// Body: { commerce_id }
//
// Elimina el comercio del user logueado junto con todos sus datos asociados:
// memberships, visits, redemptions, prizes, promotions, client_promotions,
// pending_grants, commerce_activity, reviews. La cuenta del usuario NO se
// borra — el dueño queda como user sin comercio (puede registrar otro o
// seguir usando la app como cliente).
//
// Auth: solo el dueño del comercio o un admin global. Acción irreversible.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { commerce_id } = await request.json()
    if (!commerce_id) {
      return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })
    }

    // Verificar que el caller es dueño del comercio (o admin global)
    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, owner_id, name')
      .eq('id', commerce_id)
      .single()
    if (!commerce) return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    if (commerce.owner_id !== user.id) {
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user.id).single()
      if (callerProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    // Borrado en cascada — orden importa: hijos antes que padres.
    // Las tablas opcionales se envuelven en try/catch por si no existen.
    // client_promotions cae junto con sus memberships (ON DELETE CASCADE),
    // pero por las dudas las borramos explícito.
    const { data: memberships } = await supabaseAdmin
      .from('memberships').select('id').eq('commerce_id', commerce_id)
    const membershipIds = (memberships || []).map(m => m.id)

    if (membershipIds.length > 0) {
      await supabaseAdmin.from('client_promotions').delete().in('membership_id', membershipIds)
    }

    await supabaseAdmin.from('redemptions').delete().eq('commerce_id', commerce_id)
    await supabaseAdmin.from('visits').delete().eq('commerce_id', commerce_id)
    await supabaseAdmin.from('memberships').delete().eq('commerce_id', commerce_id)
    await supabaseAdmin.from('prizes').delete().eq('commerce_id', commerce_id)
    await supabaseAdmin.from('promotions').delete().eq('commerce_id', commerce_id)

    // Tablas que pueden no existir en todos los schemas — best-effort
    const optionalDeletes = [
      'pending_grants',
      'commerce_activity',
      'reviews',
    ]
    for (const tbl of optionalDeletes) {
      try {
        await supabaseAdmin.from(tbl).delete().eq('commerce_id', commerce_id)
      } catch (_) {}
    }

    // Finalmente, el comercio
    const { error: delErr } = await supabaseAdmin.from('commerces').delete().eq('id', commerce_id)
    if (delErr) throw delErr

    // Bajar el role del dueño a 'client' — no tiene más comercio asociado.
    // Solo si el role era 'commerce_owner' (no tocamos admins). Esto hace
    // que al recargar la app, el navbar oculte los botones del ojo y "Mi
    // Negocio", y el scanner deje de mostrar las opciones de owner
    // (registrar visita, mostrar QR del negocio).
    if (commerce.owner_id === user.id) {
      try {
        const { data: prof } = await supabaseAdmin
          .from('profiles').select('role').eq('id', user.id).single()
        if (prof?.role === 'commerce_owner') {
          await supabaseAdmin.from('profiles').update({ role: 'client' }).eq('id', user.id)
        }
      } catch (e) {
        console.error('[delete-commerce] no pude bajar role a client:', e)
      }
    }

    return NextResponse.json({ ok: true, name: commerce.name })
  } catch (err) {
    console.error('[delete-commerce]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
