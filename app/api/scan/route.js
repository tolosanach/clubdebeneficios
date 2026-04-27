// POST /api/scan
// Body: { qr_code: "CLUB-UUID", commerce_id: "uuid" }

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
      .select('prog_type, prog_pts, prog_goal, plan, owner_id, prog_min_purchase, name, slug')
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
        .select('id, promotion_id, expires_at, status, granted_at, promotions:promotions(id, type, value, expires_at)')
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

        // Registrar el canje de descuento en `redemptions` para que aparezca
        // junto a los canjes de premios en el historial. kind='discount' lo
        // distingue del kind='prize' del catálogo.
        try {
          // Buscar el value (% off) de la promo para guardarlo en discount_value.
          const promoValue = activeDiscount.promotions?.value
            ?? validPromos.find(p => p.id === activeDiscount.promotion_id)?.value
            ?? null
          await supabaseAdmin.from('redemptions').insert({
            user_id,
            commerce_id,
            membership_id:  membership.id,
            kind:           'discount',
            promotion_id:   activeDiscount.promotion_id,
            discount_value: promoValue,
            points_spent:   0,
          })
        } catch (e) {
          console.error('Error registrando canje de descuento:', e)
        }
      }
    }

    // ── Otorgamiento de discount_next ──
    // Se hace UNA SOLA vez en /api/join (cuando el cliente se suma al club).
    // El scan solo MARCA COMO USED la promo activa que el cliente trajera.
    // La renovación de un cupón ya canjeado pasa por /api/discount-decision
    // disparado por el modal "¿Renovar?" del frontend. Esto le da al dueño
    // control total: si dice "no renovar", el cliente NO recibe el cupón
    // de nuevo en visitas posteriores.

    // Premio más barato para saber si puede canjear
    const { data: cheapestPrize } = await supabaseAdmin
      .from('prizes')
      .select('cost')
      .eq('commerce_id', commerce_id)
      .eq('active', true)
      .order('cost', { ascending: true })
      .limit(1)
      .single()

    // ─── NOTIFICACIONES ─────────────────────────────────────────────────────
    // Mandamos siempre 2 notifs cruzadas: una al cliente y una al dueño.
    // Cliente: "sumaste X en Y", Dueño: "registraste visita de Z".
    // Si además se canjeó un descuento, notificamos eso también.
    try {
      const commerceName = commerce.name || 'el negocio'
      const clientFirstName = (profile.full_name || 'Cliente').split(' ')[0]
      const clubLink = commerce.slug ? `/club/${commerce.slug}` : '/'
      const isStars = commerce.prog_type === 'stars'
      const unitLabel = isStars ? 'estrella' : 'punto'
      const earned = isStars ? (skip_star ? 0 : 1) : ptsPerVisit

      // Visita registrada (no notificamos si skip_star y no hay descuento — el evento es invisible)
      if (earned > 0 || discountRedeemed) {
        const earnedTxt = earned > 0
          ? `Sumaste ${earned} ${unitLabel}${earned !== 1 ? (isStars ? 's' : 's') : ''}`
          : 'Tu visita quedó registrada'
        await notifyBoth({
          clientUserId: user_id,
          ownerUserId:  commerce.owner_id,
          client: {
            type:  'visit',
            title: `${earnedTxt} en ${commerceName}`,
            body:  isStars
              ? `Llevás ${newTotal} estrella${newTotal !== 1 ? 's' : ''} en este club.`
              : `Tu saldo: ${newTotal} puntos.`,
            link:  clubLink,
            metadata: { commerce_id, kind: 'visit' },
          },
          owner: {
            type:  'visit',
            title: `Registraste una visita de ${clientFirstName}`,
            body:  isStars
              ? `Le sumaste ${earned > 0 ? '1 estrella' : '0 estrellas'} (lleva ${newTotal} en total).`
              : `Le sumaste ${ptsPerVisit} puntos (saldo: ${newTotal}).`,
            link:  '/',
            metadata: { commerce_id, user_id, kind: 'visit' },
          },
        })
      }

      // Canje de descuento (si aplicó uno en esta visita)
      if (discountRedeemed) {
        const promo = (validPromos || []).find(p => p.id === discountRedeemed.promo_id)
        const value = promo?.value
        const valueTxt = value ? `${value}% OFF` : 'tu descuento'
        await notifyBoth({
          clientUserId: user_id,
          ownerUserId:  commerce.owner_id,
          client: {
            type:  'discount_redeem',
            title: `Aplicaste ${valueTxt} en ${commerceName}`,
            body:  '¡Aprovechaste tu cupón de descuento de próxima compra!',
            link:  clubLink,
            metadata: { commerce_id, kind: 'discount_redeem', promotion_id: discountRedeemed.promo_id },
          },
          owner: {
            type:  'discount_redeem',
            title: `${clientFirstName} usó su descuento`,
            body:  `Le aplicaste ${valueTxt}. Si querés renovárselo, hacelo desde el escaneo.`,
            link:  '/',
            metadata: { commerce_id, user_id, kind: 'discount_redeem', promotion_id: discountRedeemed.promo_id },
          },
        })
      }
    } catch (e) {
      console.error('[scan] error enviando notificaciones:', e)
    }

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
