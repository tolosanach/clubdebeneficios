// POST /api/scan
// Body: { qr_code: "CLUB-UUID", commerce_id: "uuid" }

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../lib/supabase-server'
import { applyPendingGrant } from '../../../lib/applyPendingGrant'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    // ── AUTH GUARD ─────────────────────────────────────────────────────────
    // El scan solo lo puede ejecutar el dueño (o admin) del comercio. Sin
    // esta verificación, cualquier usuario autenticado podía inyectar visitas
    // en cualquier comercio conociendo el commerce_id (público vía slug).
    const supabase = await createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { qr_code, commerce_id, amount, skip_star } = await request.json()

    if (!qr_code || !commerce_id) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const user_id = qr_code.replace('CLUB-', '')

    // Verificar que el usuario existe
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'QR inválido' }, { status: 404 })
    }

    // Obtener configuración del comercio (incluye owner_id para validar autoría).
    const { data: commerce, error: commerceError } = await supabaseAdmin
      .from('commerces')
      .select('prog_type, prog_pts, prog_goal, plan, owner_id, prog_min_purchase')
      .eq('id', commerce_id)
      .single()

    if (commerceError || !commerce) {
      return NextResponse.json({ error: 'Comercio no encontrado' }, { status: 404 })
    }

    // Verificar que el caller es el dueño del comercio. Admin global pasa
    // también (rol leído de profiles para no bloquear soporte/operaciones).
    if (commerce.owner_id !== user.id) {
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles').select('role').eq('id', user.id).single()
      if (callerProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    // Verificar límite de plan antes de crear membresía nueva
    const PLAN_LIMITS = { free: 30, starter: 60, pro: null }
    const planLimit = PLAN_LIMITS[commerce.plan || 'free']

    // Sistema de puntos: 1 punto = 1 peso. El cashier ingresa el monto de
    // la compra en el scanner y cada peso suma 1 punto. Si no llega amount
    // (compatibilidad con flow viejo), fallback a prog_pts. Para estrellas
    // siempre +1 por escaneo.
    let basePts = 1
    if (commerce.prog_type === 'points') {
      const amt = parseInt(amount, 10)
      basePts = Number.isFinite(amt) && amt > 0 ? amt : (commerce.prog_pts || 1)
    }

    // Sistema de estrellas con compra mínima: la validación se hace ahora vía
    // gate modal en el frontend (cashier confirma "sí/no aplica"). Si llega
    // skip_star=true, no se suma estrella pero sí se procesa la visita para
    // que el cliente reciba el cupón de descuento próximo (si hay promo activa).

    // Cargar todas las promos activas del comercio (doble puntos + descuentos)
    const now = new Date().toISOString()
    const { data: activePromos } = await supabaseAdmin
      .from('promotions')
      .select('id, type, value, expires_at, expiration_type, expiration_date, expiration_days')
      .eq('commerce_id', commerce_id)
      .eq('active', true)
    const validPromos = (activePromos || []).filter(p =>
      !p.expires_at || p.expires_at > now
    )
    const hasDouble = validPromos.some(p => p.type === 'double_points')
    const ptsPerVisit = hasDouble ? basePts * 2 : basePts

    // Obtener o crear membresía (race-safe via UPSERT con UNIQUE(user_id, commerce_id))
    let { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('id, points, stars, visits_count')
      .eq('user_id', user_id)
      .eq('commerce_id', commerce_id)
      .maybeSingle()

    if (!membership) {
      // Verificar límite de plan antes de crear membresía nueva
      if (planLimit !== null) {
        const { count: currentCount } = await supabaseAdmin
          .from('memberships')
          .select('id', { count: 'exact', head: true })
          .eq('commerce_id', commerce_id)
        if (currentCount >= planLimit) {
          return NextResponse.json({
            error: 'plan_limit_reached',
            message: 'El comercio alcanzó el límite de clientes de su plan.',
            plan: commerce.plan || 'free',
            limit: planLimit,
          }, { status: 403 })
        }
      }
      // UPSERT race-safe: si dos scans concurrentes intentan crear, uno gana via
      // UNIQUE(user_id, commerce_id) y el otro recupera la fila ganadora.
      const { data: upserted, error: memErr } = await supabaseAdmin
        .from('memberships')
        .upsert(
          { user_id, commerce_id, points: 0, stars: 0, visits_count: 0 },
          { onConflict: 'user_id,commerce_id', ignoreDuplicates: false }
        )
        .select('id, points, stars, visits_count')
        .single()
      if (memErr) throw memErr
      membership = upserted

      // Aplicar pending_grants si el cliente fue pre-cargado (migración de
      // clientes existentes). Buscamos por el teléfono del profile.
      try {
        const { data: prof } = await supabaseAdmin
          .from('profiles').select('phone').eq('id', user_id).single()
        if (prof?.phone) {
          const grant = await applyPendingGrant({
            commerceId:   commerce_id,
            membershipId: membership.id,
            phone:        prof.phone,
          })
          if (grant && grant.points_applied) {
            // Refrescar el balance para que el resto del scan continue con valores correctos.
            const { data: refreshed } = await supabaseAdmin
              .from('memberships').select('points, stars').eq('id', membership.id).single()
            if (refreshed) {
              membership.points = refreshed.points
              membership.stars  = refreshed.stars
            }
          }
        }
      } catch (e) {
        console.error('applyPendingGrant in scan failed:', e)
      }
    }

    // Registrar la visita con puntos ganados
    const { data: visit, error: visitError } = await supabaseAdmin
      .from('visits')
      .insert({ user_id, commerce_id, points_earned: ptsPerVisit })
      .select()
      .single()

    if (visitError) throw visitError

    // Actualizar membresía (puntos/estrellas + visitas + última visita)
    const newVisits = (membership.visits_count || 0) + 1
    const updateData = {
      visits_count: newVisits,
      last_visit:   new Date().toISOString(),
      status:       'active',  // primera visita activa la membresía (pending → active, idempotente)
    }
    // Stars: sumar 1 estrella SALVO que el cashier confirmó "no aplica" el mínimo.
    if (commerce.prog_type === 'stars') {
      if (!skip_star) updateData.stars = (membership.stars || 0) + 1
      else            updateData.stars = (membership.stars || 0)  // no cambia
    } else {
      updateData.points = (membership.points || 0) + ptsPerVisit
    }

    await supabaseAdmin.from('memberships').update(updateData).eq('id', membership.id)

    const newTotal = commerce.prog_type === 'stars'
      ? updateData.stars
      : updateData.points

    // ── Canje de descuento: si el cliente ya tenía un cupón discount_next
    // activo cuando llegó a esta visita, lo marcamos como "used" (canjeado)
    // y reportamos al frontend para que el cashier pueda renovarlo. ──
    let discountRedeemed = null
    if (membership?.id) {
      const { data: existingCoupons } = await supabaseAdmin
        .from('client_promotions')
        .select('id, promotion_id, expires_at, status, granted_at, promotions:promotions(id, type, expires_at)')
        .eq('membership_id', membership.id)
        .eq('status', 'active')
      const activeDiscount = (existingCoupons || []).find(cp =>
        cp.promotions?.type === 'discount_next' &&
        (!cp.expires_at || new Date(cp.expires_at) > new Date())
      )
      if (activeDiscount) {
        await supabaseAdmin.from('client_promotions')
          .update({ status: 'used', used_at: new Date().toISOString() })
          .eq('id', activeDiscount.id)
        discountRedeemed = {
          promo_id:   activeDiscount.promotion_id,
          expires_at: activeDiscount.expires_at,
        }
      }
    }

    // Otorgar promos de descuento activas al cliente (si no las tiene ya)
    const discountPromos = validPromos.filter(p => p.type === 'discount_next')
    for (const promo of discountPromos) {
      const { data: existing } = await supabaseAdmin
        .from('client_promotions')
        .select('id')
        .eq('promotion_id', promo.id)
        .eq('membership_id', membership.id)
        .eq('status', 'active')
        .maybeSingle()
      if (existing) continue  // ya la tiene activa, no duplicar

      let expiresAt
      if (promo.expiration_type === 'relative') {
        const d = new Date()
        d.setDate(d.getDate() + (promo.expiration_days || 7))
        d.setHours(23, 59, 59, 999)
        expiresAt = d.toISOString()
      } else {
        expiresAt = promo.expiration_date || promo.expires_at
      }
      if (!expiresAt) continue  // sin fecha de vencimiento definida, no otorgar

      await supabaseAdmin.from('client_promotions').upsert({
        promotion_id:  promo.id,
        membership_id: membership.id,
        granted_at:    new Date().toISOString(),
        expires_at:    expiresAt,
        status:        'active',
      }, { onConflict: 'promotion_id,membership_id', ignoreDuplicates: true })
    }

    // Premio más barato para saber si puede canjear
    const { data: cheapestPrize } = await supabaseAdmin
      .from('prizes')
      .select('cost')
      .eq('commerce_id', commerce_id)
      .eq('active', true)
      .order('cost', { ascending: true })
      .limit(1)
      .single()

    return NextResponse.json({
      ok:            true,
      member_name:   profile.full_name || 'Cliente',
      visit_count:   newVisits,
      points_now:    newTotal,
      points_earned: ptsPerVisit,
      double_active: hasDouble,
      can_redeem:    cheapestPrize ? newTotal >= cheapestPrize.cost : false,
      prog_type:     commerce.prog_type,
      visit_id:      visit.id,
      membership_id: membership.id,
      user_id:       user_id,
      // discount_redeemed: { promo_id, expires_at } cuando el cliente acaba de
      // canjear un cupón de descuento — el frontend ofrece "renovar?".
      discount_redeemed: discountRedeemed,
      // skip_star: que el frontend pueda mostrar "no se sumó estrella" si aplica.
      star_skipped:  commerce.prog_type === 'stars' && !!skip_star,
    })
  } catch (err) {
    console.error('Scan error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
