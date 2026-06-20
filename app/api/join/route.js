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
      .select('id, name, plan, owner_id, slug, prog_type')
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
    // NOTA: El trigger enforce_membership_limit_trigger en DB valida atomicamente
    // que no se excedan los límites de plan, previniendo race conditions.
    const { data: newMem, error: memErr } = await supabaseAdmin
      .from('memberships')
      .insert({ user_id: user.id, commerce_id, points: 0, stars: 0, visits_count: 0, status: 'active' })
      .select('id')
      .single()

    if (memErr) {
      // Si el trigger rechazó por límite de plan, devolver 403
      if (memErr.message?.includes('plan_limit_exceeded')) {
        return NextResponse.json({ error: 'plan_limit_reached' }, { status: 403 })
      }
      throw memErr
    }

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

    // ── Otorgar al nuevo cliente todas las promos activas del comercio ──
    // discount_next: cupón "descuento próxima compra" — se otorga UNA SOLA vez.
    //   Después, la renovación queda 100% en manos del dueño (modal "¿Renovar?").
    // double_points: no se otorga per-cliente, pero se detecta si hoy aplica
    //   para mostrárselo al cliente en la pantalla de bienvenida.
    let grantedDiscounts = []
    let hasDoubleToday   = false
    if (newMem?.id) {
      try {
        const nowIso   = new Date().toISOString()
        const todayDow = new Date().getDay()  // 0=domingo … 6=sábado
        const { data: promos } = await supabaseAdmin
          .from('promotions')
          .select('id, type, value, days, expiration_type, expiration_date, expiration_days, expires_at')
          .eq('commerce_id', commerce_id)
          .eq('active', true)
        const validPromos = (promos || []).filter(p => !p.expires_at || p.expires_at > nowIso)

        // ¿Hay double_points activa hoy?
        hasDoubleToday = validPromos.some(p => {
          if (p.type !== 'double_points') return false
          if (!Array.isArray(p.days) || p.days.length === 0) return true
          return p.days.some(d => Number(d) === todayDow)
        })

        // Otorgar discount_next activas
        for (const promo of validPromos.filter(p => p.type === 'discount_next')) {
          let expiresAt
          if (promo.expiration_type === 'relative') {
            const d = new Date()
            d.setDate(d.getDate() + (promo.expiration_days || 7))
            d.setHours(23, 59, 59, 999)
            expiresAt = d.toISOString()
          } else {
            // expires_at es el campo vivo (se actualiza cuando el dueño edita
            // la vigencia desde el panel). expiration_date es el valor del
            // form al momento de crear la promo y NUNCA se actualiza en
            // ediciones posteriores — usarlo como prioridad hacía que los
            // clientes nuevos siguieran recibiendo la fecha vieja aunque el
            // dueño ya hubiera extendido/cambiado la vigencia.
            expiresAt = promo.expires_at || promo.expiration_date
          }
          if (!expiresAt) continue

          await supabaseAdmin.from('client_promotions').upsert({
            promotion_id:  promo.id,
            membership_id: newMem.id,
            granted_at:    nowIso,
            expires_at:    expiresAt,
            status:        'active',
          }, { onConflict: 'promotion_id,membership_id', ignoreDuplicates: true })
          grantedDiscounts.push({ promotion_id: promo.id, value: promo.value, expires_at: expiresAt })
        }
      } catch (e) {
        console.error('[join] error otorgando promos:', e)
      }
    }

    // ─── NOTIFICACIONES ──────────────────────────────────────────────────
    // Cliente nuevo se unió al club: aviso a ambas partes.
    try {
      const { data: clientProfile } = await supabaseAdmin
        .from('profiles').select('full_name, name').eq('id', user.id).single()
      const clientFirstName = (clientProfile?.full_name || clientProfile?.name || 'Un nuevo cliente').split(' ')[0]
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
      ok:                true,
      already_member:    false,
      commerce_name:     commerce.name,
      membership_id:     newMem?.id,
      grant_appl