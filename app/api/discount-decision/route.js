// POST /api/discount-decision
// Body: { commerce_id, membership_id, promotion_id, decision: 'renew'|'decline' }
//
// Centraliza la decisión del dueño después de que un cliente canjea un
// cupón discount_next:
//   - decision='renew'   → upsert client_promotion con status='active' y
//                          expires_at recalculado según la promo del comercio.
//                          Notifica a ambas partes que se renovó.
//   - decision='decline' → no toca DB. Notifica a ambas partes que NO se
//                          renovó. El cliente NO va a recibir el cupón de
//                          nuevo en futuros scans (ya no se auto-otorga).
//
// Solo el dueño del comercio o un admin pueden tomar esta decisión.

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

    const { commerce_id, membership_id, promotion_id, decision } = await request.json()
    if (!commerce_id || !membership_id || !promotion_id || !decision) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }
    if (decision !== 'renew' && decision !== 'decline') {
      return NextResponse.json({ error: 'decision inválido' }, { status: 400 })
    }

    // Verificar que el caller es dueño del comercio (o admin).
    const { data: commerce } = await supabaseAdmin
      .from('commerces')
      .select('id, name, slug, owner_id')
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

    // Verificar membership pertenece al comercio.
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('id, user_id, commerce_id')
      .eq('id', membership_id)
      .single()
    if (!membership || membership.commerce_id !== commerce_id) {
      return NextResponse.json({ error: 'Membership inválida' }, { status: 400 })
    }

    // Datos para las notifs
    const { data: clientProfile } = await supabaseAdmin
      .from('profiles').select('full_name, name').eq('id', membership.user_id).single()
    const clientFirstName = (clientProfile?.full_name || clientProfile?.name || 'Cliente').split(' ')[0]
    const clubLink = commerce.slug ? `/club/${commerce.slug}` : '/'

    // Datos de la promo
    const { data: promo } = await supabaseAdmin
      .from('promotions')
      .select('id, value, expiration_type, expiration_date, expiration_days, expires_at, active')
      .eq('id', promotion_id)
      .eq('commerce_id', commerce_id)
      .single()
    if (!promo) return NextResponse.json({ error: 'Promo no encontrada' }, { status: 404 })
    const valueTxt = promo.value ? `${promo.value}% OFF` : 'tu descuento'

    if (decision === 'renew') {
      // No permitimos renovar si la promo del comercio está apagada o vencida.
      const nowIso = new Date().toISOString()
      if (!promo.active || (promo.expires_at && promo.expires_at <= nowIso)) {
        return NextResponse.json({
          ok: false,
          error: 'promo_inactive',
          message: 'Esta promoción del comercio ya no está activa.',
        }, { status: 400 })
      }

      // Recalcular expires_at según la config actual de la promo (no usar
      // el viejo expires_at que llegó del frontend, así si el dueño cambió
      // la config se respeta lo nuevo).
      let expiresAt
      if (promo.expiration_type === 'relative') {
        const d = new Date()
        d.setDate(d.getDate() + (promo.expiration_days || 7))
        d.setHours(23, 59, 59, 999)
        expiresAt = d.toISOString()
      } else {
        expiresAt = promo.expiration_date || promo.expires_at
      }
      if (!expiresAt) {
        return NextResponse.json({ error: 'Promo sin fecha de vencimiento' }, { status: 400 })
      }

      // Upsert: si el cliente tenía una fila vieja en used, la pisamos con active.
      const { error: upErr } = await supabaseAdmin.from('client_promotions').upsert({
        promotion_id,
        membership_id,
        granted_at: nowIso,
        expires_at: expiresAt,
        status:     'active',
        used_at:    null,
      }, { onConflict: 'promotion_id,membership_id' })
      if (upErr) throw upErr

      // Notif a ambas partes
      await notifyBoth({
        clientUserId: membership.user_id,
        ownerUserId:  commerce.owner_id,
        client: {
          type:  'discount_renewed',
          title: `${commerce.name} te renovó el descuento`,
          body:  `Volvés a tener ${valueTxt} para tu próxima compra.`,
          link:  clubLink,
          metadata: { commerce_id, promotion_id, kind: 'discount_renewed' },
        },
        owner: {
          type:  'discount_renewed',
          title: `Renovaste el descuento de ${clientFirstName}`,
          body:  `Le queda ${valueTxt} listo para su próxima compra.`,
          link:  '/',
          metadata: { commerce_id, user_id: membership.user_id, promotion_id, kind: 'discount_renewed' },
        },
      })

      return NextResponse.json({ ok: true, decision: 'renew', expires_at: expiresAt })
    }

    // decision === 'decline'
    await notifyBoth({
      clientUserId: membership.user_id,
      ownerUserId:  commerce.owner_id,
      client: {
        type:  'discount_declined',
        title: `Tu descuento en ${commerce.name} no fue renovado`,
        body:  'Ya usaste el cupón. Si querés conservar beneficios, seguí visitándolos.',
        link:  clubLink,
        metadata: { commerce_id, promotion_id, kind: 'discount_declined' },
      },
      owner: {
        type:  'discount_declined',
        title: `No le renovaste el descuento a ${clientFirstName}`,
        body:  `${clientFirstName} ya no tiene cupón pendiente para su próxima compra.`,
        link:  '/',
        metadata: { commerce_id, user_id: membership.user_id, promotion_id, kind: 'discount_declined' },
      },
    })

    return NextResponse.json({ ok: true, decision: 'decline' })
  } catch (err) {
    console.error('[discount-decision]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
