// POST /api/admin/resend-pushes?notification_id=xxx
// Reenvía el push de una notificación específica (por si se perdió o no se envió la primera vez)

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
        console.warn('[resend-pushes] web-push error:', e?.message)
        return null
      }
    })()
  }
  return _webPushPromise
}

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url)
    const notificationId = searchParams.get('notification_id')

    if (!notificationId) {
      return Response.json({ error: 'notification_id required' }, { status: 400 })
    }

    // 1. Obtener la notificación
    const { data: notif, error: notifError } = await supabaseAdmin
      .from('notifications')
      .select('id, user_id, type, title, body, link')
      .eq('id', notificationId)
      .single()

    if (notifError || !notif) {
      return Response.json({ error: 'Notification not found' }, { status: 404 })
    }

    // 2. Obtener push_subscriptions del user
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', notif.user_id)

    if (!subs || subs.length === 0) {
      return Response.json({ message: 'No push subscriptions found for this user' }, { status: 200 })
    }

    // 3. Enviar pushes
    const webpush = await getWebPush()
    if (!webpush) {
      return Response.json({ error: 'Web push not configured' }, { status: 500 })
    }

    const payload = JSON.stringify({
      title: notif.title,
      body: notif.body || '',
      link: notif.link || '/',
      type: notif.type,
      notifId: notif.id,
    })

    const CRITICAL_TYPES = new Set(['redeem_pending', 'discount_pending'])
    const pushOpts = CRITICAL_TYPES.has(notif.type)
      ? { urgency: 'high', TTL: 60 * 60 * 24 }
      : { urgency: 'normal', TTL: 60 * 60 * 4 }

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

    return Response.json({
      notification_id: notif.id,
      subscriptions_targeted: subs.length,
      results,
    })
  } catch (e) {
    console.error('[resend-pushes]', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
