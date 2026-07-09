// POST /api/admin/repush-discount-notifications?commerce_slug=enigma
// Usa notifyBoth() para reenviar notificaciones de cambios de descuento CON PUSH REAL
// (no solo insert en BD como antes)

import { notifyBoth } from '@/lib/notify-server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function POST(req) {
  try {
    // Guard: utilidad admin. Solo se ejecuta con el CRON_SECRET (mismo patrón
    // que los endpoints de cron). Sin él respondía a cualquier request anónimo.
    if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const commerceSlug = searchParams.get('commerce_slug')

    if (!commerceSlug) {
      return Response.json({ error: 'commerce_slug required' }, { status: 400 })
    }

    // 1. Obtener el comercio y su dueño
    const { data: commerce, error: commerceError } = await supabaseAdmin
      .from('commerces')
      .select('id, owner_id, name')
      .eq('slug', commerceSlug)
      .single()

    if (commerceError || !commerce) {
      return Response.json({ error: 'Commerce not found' }, { status: 404 })
    }

    // 2. Obtener la promo de discount_next activa
    const { data: promos } = await supabaseAdmin
      .from('promotions')
      .select('id, value, description, expires_at')
      .eq('commerce_id', commerce.id)
      .eq('type', 'discount_next')
      .eq('active', true)

    if (!promos || promos.length === 0) {
      return Response.json({ message: 'No active discount promos found' }, { status: 200 })
    }

    const promo = promos[0] // Tomamos la primera (debería haber solo una)

    // 3. Obtener todos los clientes con client_promotions activos para esta promo
    const { data: clientPromos } = await supabaseAdmin
      .from('client_promotions')
      .select('membership:memberships(user_id)')
      .eq('promotion_id', promo.id)
      .eq('status', 'active')

    if (!clientPromos || clientPromos.length === 0) {
      return Response.json({ message: 'No active client promotions' }, { status: 200 })
    }

    // 4. Para cada cliente, enviar notif con notifyBoth (que dispara push)
    const results = []

    for (const cp of clientPromos) {
      const clientUserId = cp.membership?.user_id
      if (!clientUserId) continue

      try {
        await notifyBoth({
          clientUserId,
          ownerUserId: commerce.owner_id,
          client: {
            type: 'discount_granted',
            title: `¡Tu cupón en ${commerce.name} mejoró!`,
            body: `Ahora tenés ${promo.value}% OFF en tu próxima compra. Válido hasta el ${new Date(promo.expires_at).toLocaleDateString('es-AR')}. ¡Aprovechalo!`,
            link: null,
            metadata: { commerce_id: commerce.id, discount_pct: promo.value },
          },
          owner: {
            type: 'discount_granted',
            title: 'Notificación de descuento actualizado',
            body: `El cupón de ${commerce.name} se actualizó a ${promo.value}% OFF.`,
            link: null,
            metadata: { commerce_id: commerce.id },
          },
        })
        results.push({ user_id: clientUserId, status: 'sent' })
      } catch (err) {
        console.error('[repush] error notifying user:', err)
        results.push({ user_id: clientUserId, status: 'error', error: err.message })
      }
    }

    return Response.json({
      commerce: commerce.name,
      promo: { value: promo.value, description: promo.description },
      clients_notified: results.length,
      results,
    })
  } catch (e) {
    console.error('[repush-discount]', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
