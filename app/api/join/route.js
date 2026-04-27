// POST /api/join  { commerce_id, phone? }
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'
import { applyPendingGrant } from '../../../lib/applyPendingGrant'
import { notifyBoth } from '../../../lib/notify-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await request.json()
    const { commerce_id, phone } = body
    if (!commerce_id) return NextResponse.json({ error: 'Falta commerce_id' }, { status: 400 })

    // Verificar que el comercio existe
    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, name, plan, owner_id, slug')
      .eq('id', commerce_id)
      .eq('active', true)
      .single()

    if (!commerce) return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })

    // ¿Ya es miembro? Usamos maybeSingle() para no tirar error cuando no existe.
    const { data: existing } = await supabaseAdmin
      .from('memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('commerce_id', commerce_id)
      .maybeSingle()

    if (existing) return NextResponse.json({ ok: true, already_member: true })

    // Verificar límite de plan
    const PLAN_LIMITS = { free: 30, starter: 60, pro: null }
    const limit = PLAN_LIMITS[commerce.plan || 'free']
    if (limit !== null) {
      const { count } = await supabaseAdmin
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('commerce_id', commerce_id)
      if (count >= limit) {
        return NextResponse.json({ error: 'plan_limit_reached' }, { status: 403 })
      }
    }

    // Save phone to profile if provided
    if (phone) {
      await supabaseAdmin
        .from('profiles')
        .update({ phone })
        .eq('id', user.id)
    }

    // Crear membership con status 'active' para que aparezca como miembro
    // efectivo desde el primer momento (bug previo: status='pending' hacía
    // que /club/[slug] siguiera mostrando el slide "Deslizá para unirte").
    const { data: newMem, error: memErr } = await supabaseAdmin
      .from('memberships')
      .insert({ user_id: user.id, commerce_id, points: 0, stars: 0, visits_count: 0, status: 'active' })
      .select('id')
      .single()

    if (memErr) throw memErr

    // Aplicar pending_grants si existe alguno asociado al teléfono del cliente.
    // Útil para migraciones de clientes preexistentes (ej: Enigma migrando 350
    // clientes con descuento de bienvenida + puntos iniciales).
    let grantApplied = null
    if (newMem?.id && phone) {
      try {
        grantApplied = await applyPendingGrant({
          commerceId:   commerce_id,
          membershipId: newMem.id,
          phone,
        })
      } catch (e) {
        // No bloquear el join si falla el grant; loggear y seguir.
        console.error('applyPendingGrant failed:', e)
      }
    }

    // ─── NOTIFICACIONES ──────────────────────────────────────────────────
    // Cliente nuevo se unió al club: aviso a ambas partes.
    try {
      const { data: clientProfile } = await supabaseAdmin
        .from('profiles').select('full_name').eq('id', user.id).single()
      const clientFirstName = (clientProfile?.full_name || 'Un nuevo cliente').split(' ')[0]
      const clubLink = commerce.slug ? `/club/${commerce.slug}` : '/'
      await notifyBoth({
        clientUserId: user.id,
        ownerUserId:  commerce.owner_id,
        client: {
          type:  'join',
          title: `¡Te uniste al club de ${commerce.name}!`,
          body:  'Ya podés sumar visitas y canjear premios.',
          link:  clubLink,
          metadata: { commerce_id, kind: 'join' },
        },
        owner: {
          type:  'join',
          title: `${clientFirstName} se sumó a tu club`,
          body:  'Acabás de tener un nuevo cliente.',
          link:  '/',
          metadata: { commerce_id, user_id: user.id, kind: 'join' },
        },
      })
    } catch (e) {
      console.error('[join] error enviando notificaciones:', e)
    }

    return NextResponse.json({
      ok:             true,
      already_member: false,
      commerce_name:  commerce.name,
      membership_id:  newMem?.id,
      grant_applied:  grantApplied,  // { grant_id, points_applied, promo_applied } o null
    })
  } catch (err) {
    console.error('join error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
