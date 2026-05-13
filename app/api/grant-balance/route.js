// POST /api/grant-balance
// Body: { commerce_id, membership_id, amount }
//
// Permite al dueño sumar estrellas o puntos manualmente al balance
// de un cliente. El sistema activo (stars/points) lo determina el
// campo prog_type del comercio — el cliente solo tiene uno activo.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'
import { notifyBoth } from '../../../lib/notify-server'

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

    const { commerce_id, membership_id, amount } = await request.json()
    if (!commerce_id || !membership_id || !amount) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }
    const parsed = parseInt(amount, 10)
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 9999) {
      return NextResponse.json({ error: 'Cantidad inválida (1–9999)' }, { status: 400 })
    }

    // Verificar que el caller es dueño o admin
    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, name, slug, owner_id, prog_type')
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

    // Verificar membership pertenece al comercio
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('id, user_id, commerce_id, stars, points')
      .eq('id', membership_id)
      .single()
    if (!membership || membership.commerce_id !== commerce_id) {
      return NextResponse.json({ error: 'Membership inválida' }, { status: 400 })
    }

    const isStars = commerce.prog_type === 'stars'
    const col     = isStars ? 'stars' : 'points'
    const newVal  = (membership[col] || 0) + parsed

    const { error: upErr } = await supabaseAdmin
      .from('memberships')
      .update({ [col]: newVal })
      .eq('id', membership_id)
    if (upErr) throw upErr

    // Notificaciones
    try {
      const { data: clientProfile } = await supabaseAdmin
        .from('profiles').select('full_name, name').eq('id', membership.user_id).single()
      const clientName = (clientProfile?.full_name || clientProfile?.name || 'Cliente').split(' ')[0]
      const unitLabel  = isStars ? (parsed === 1 ? 'estrella' : 'estrellas') : (parsed === 1 ? 'punto' : 'puntos')
      const clubLink   = commerce.slug ? `/club/${commerce.slug}` : '/'

      await notifyBoth({
        clientUserId: membership.user_id,
        ownerUserId:  commerce.owner_id,
        client: {
          type:  'visit',
          title: `${commerce.name} te sumó ${parsed} ${unitLabel}`,
          body:  `Tu saldo actualizado: ${newVal} ${unitLabel}.`,
          link:  clubLink,
          metadata: { commerce_id, membership_id, amount: parsed, kind: 'manual_grant' },
        },
        owner: {
          type:  'visit',
          title: `Le sumaste ${parsed} ${unitLabel} a ${clientName}`,
          body:  `Saldo nuevo de ${clientName}: ${newVal} ${unitLabel}.`,
          link:  '/',
          metadata: { commerce_id, membership_id, user_id: membership.user_id, amount: parsed, kind: 'manual_grant' },
        },
      })
    } catch (e) {
      console.error('[grant-balance] error notifs:', e)
    }

    return NextResponse.json({ ok: true, new_value: newVal, col })
  } catch (err) {
    console.error('[grant-balance]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
