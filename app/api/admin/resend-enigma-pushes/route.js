// POST /api/admin/resend-enigma-pushes
// Reenvía todos los pushes de notificaciones discount_granted para clientes de Enigma (últimas 2 horas)

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

let _webPushPromise = null
async function getWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return null
  if (!_webPushPromise) {
    _webPushPromise = (async () => {
      try {
        const wp = await import('web-push')
        const lib = wp.default || wp
        lib.setVapidDetails(
          process.env.VAPID_SUBJECT || 'mailto:soporte@clufix.com.ar',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY,
        )
        return lib
      } catch (e) {
        console.warn('[resend-enigma] web-push error:', e?.message)
        return null
      }
    })()
  }
  return _webPushPromise
}

export async function POST(req) {
  try {
    // Guard: utilidad admin. Solo se ejecuta con el CRON_SECRET (mismo patrón
    // que los endpoints de cron). Sin él respondía a cualquier request anónimo.
    if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 1. Obtener commerce_id de Enigma
    const { data: enigma, error: enigmaError } = await supabaseAdmin
      .from('commerces')
      .select('id')
      .ilike('name', 'enigma')
      .single()

    if (enigmaError || !enigma) {
      return Response.json({ error: 'Enigma commerce not found' }, { status: 404 })
    }

    // 2. Obtener todos los memberships de Enigma
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('user_id')
      .eq('commerce_id', enigma.id)

    if (!memberships || memberships.length === 0) {
      return Response.json({ message: 'No members found for Enigma' }, { status: 200 })
    }

    const userIds = memberships.map(m => m.user_id)

    // 3. Obtener notificaciones discount_granted de esos users (últimas 2 horas)
    const { data: notifs } = await supabaseAdmin
      .from('notifications')
      .select('id, user_id, type, title, body, link')
      .in('user_id', userIds)
      .eq('type', 'discount_granted')
      .gt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())

    if (!notifs || notifs.length === 0) {
      return Response.json({ message: 'No recent discount_granted notifications found' }, { status: 200 })
    }

    // 4. Para cada notificación, obtener push_subscriptions y enviar pushes
    const webpush = await getWebPush()
    if (!webpush) {
      return Response.json({ error: 'Web push not configured' }, { status: 500 })
    }

    const allResults = []

    for (const notif of notifs) {
      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', notif.user_id)

      if (!subs || subs.length === 0) {
        allResults.push({
          notification_id: notif.id,
          user_id: notif.user_id,
          subscriptions_targeted: 0,
          results: [],
        })
        continue
      }

      const payload = JSON.stringify({
        title: notif.title,
        body: notif.body || '',
        link: notif.link || '/',
        type: notif.type,
        notifId: notif.id,
      })

      const pushOpts = { urgency: 'high', TTL: 60 * 60 * 24 }

      const results = await Promise.all(
        subs.map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload,
              pushOpts,
            )
            return { subscription_id: s.id, success: true }
          } catch (err) {
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              await supabaseAdmin.from('push_subscriptions').delete().eq('id', s.id)
            }
            return { subscription_id: s.id, success: false, error: err?.message }
          }
        })
      )

      allResults.push({
        notification_id: notif.id,
        user_id: notif.user_id,
        subscriptions_targeted: subs.length,
        results,
      })
    }

    return Response.json({
      commerce: 'Enigma',
      total_notifications: notifs.length,
      results: allResults,
    })
  } catch (e) {
    console.error('[resend-enigma]', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
