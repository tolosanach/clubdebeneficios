// POST /api/grant-promotion
// Body: { commerce_id, membership_id, promotion_id }
//
// Permite al dueño (o admin) otorgar manualmente una promo configurada del
// comercio a un cliente sumado al club. Útil para casos especiales — el
// dueño busca al cliente en la pestaña "Clientes", entra a su ficha y desde
// ahí le regala un cupón discount_next (o double_points para días puntuales).
//
// Hace upsert en client_promotions con status='active' y expires_at calculado
// según la config de la promo. Notifica al cliente para que vea el beneficio
// nuevo en su tarjeta del club.

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

    const { commerce_id, membership_id, promotion_id } = await request.json()
    if (!commerce_id || !membership_id || !promotion_id) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // Verificar dueño/admin
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

    // Verificar membership pertenece al comercio
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('id, user_id, commerce_id')
      .eq('id', membership_id)
      .single()
    if (!membership || membership.commerce_id !== commerce_id) {
      return NextResponse.json({ error: 'Membership inválida' }, { status: 400 })
    }

    // Cargar promo y validar que pertenece al comercio y está activa
    const { data: promo } = await supabaseAdmin
      .from('promotions')
      .select('id, type, value, description, active, expires_at, expiration_type, expiration_date, expiration_days, days')
      .eq('id', promotion_id)
      .eq('commerce_id', commerce_id)
      .single()
    if (!promo) return NextResponse.json({ error: 'Promo no encontrada' }, { status: 404 })
    const nowIso = new Date().toISOString()
    if (!promo.active) {
      return NextResponse.json({ error: 'La promoción está pausada' }, { status: 400 })
    }
    if (promo.expires_at && promo.expires_at <= nowIso) {
      return NextResponse.json({ error: 'La promoción del comercio ya venció' }, { status: 400 })
    }

    // Solo discount_next se otorga por cliente (las double_points aplican a
    // días específicos del comercio, no son "del cliente"). Si en el futuro
    // sumamos otros tipos otorgables, agregalos acá.
    if (promo.type !== 'discount_next') {
      return NextResponse.json({
        error: 'Esta promo no se puede otorgar a un cliente individual.',
      }, { status: 400 })
    }

    // Calcular expires_at del cupón otorgado
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
      return NextResponse.json({ error: 'La promo no tiene fecha de vencimiento configurada.' }, { status: 400 })
    }

    // Upsert (sobreescribe cualquier client_promotion vieja para esta pareja —
    // si el cliente tenía una `used` o `expired`, queda activa de nuevo).
    const { error: upErr } = await supabaseAdmin
      .from('client_promotions')
      .upsert({
        promotion_id,
        membership_id,
        granted_at: nowIso,
        expires_at: expiresAt,
        status:     'active',
        used_at:    null,
      }, { onConflict: 'promotion_id,membership_id' })
    if (upErr) throw upErr

    // Notif al cliente y al dueño (confirmación de la acción)
    try {
      const { data: clientProfile } = await supabaseAdmin
        .from('profiles').select('full_name, name').eq('id', membership.user_id).single()
      const clientFirstName = (clientProfile?.full_name || clientProfile?.name || 'Cliente').split(' ')[0]
      const valueTxt = promo.value ? `${promo.value}% OFF` : 'un descuento'
      const clubLink = commerce.slug ? `/club/${commerce.slug}` : '/'

      await notifyBoth({
        clientUserId: membership.user_id,
        ownerUserId:  commerce.owner_id,
        client: {
          type:  'discount_granted',
          title: `${commerce.name} te regaló un descuento`,
          body:  `Tenés ${valueTxt} para tu próxima compra. Vale hasta el ${new Date(expiresAt).toLocaleDateString('es-AR')}.`,
          link:  clubLink,
          metadata: { commerce_id, promotion_id, kind: 'discount_granted' },
        },
        owner: {
          type:  'discount_granted',
          title: `Le regalaste un beneficio a ${clientFirstName}`,
          body:  `Le otorgaste ${valueTxt} a ${clientFirstName} desde su ficha.`,
          link:  '/',
          metadata: { commerce_id, user_id: membership.user_id, promotion_id, kind: 'discount_granted' },
        },
      })
    } catch (e) {
      console.error('[grant-promotion] error notifs:', e)
    }

    return NextResponse.json({ ok: true, expires_at: expiresAt })
  } catch (err) {
    console.error('[grant-promotion]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
