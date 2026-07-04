// POST /api/push/test
//
// Endpoint de diagnostico — el user lo invoca para verificar si el push
// del navegador esta funcionando para sus subscriptions activas. Devuelve
// detalle de cada intento (subscription, exito o error completo) para
// facilitar el debugging desde el cliente.
//
// Auth: cualquier user autenticado puede testear los pushes de SU cuenta.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

async function getSessionUser() {
  const cookieStore = await cookies()
  const ssr = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  )
  const { data: { user } } = await ssr.auth.getUser()
  return user
}

export async function POST() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Diagnostico de configuracion
    const vapidPub  = process.env.VAPID_PUBLIC_KEY
    const vapidPriv = process.env.VAPID_PRIVATE_KEY
    const vapidSub  = process.env.VAPID_SUBJECT || 'mailto:soporte@clufix.com.ar'

    if (!vapidPub || !vapidPriv) {
      return NextResponse.json({
        ok: false,
        error: 'VAPID keys no estan configuradas en el server',
        env: {
          has_public:  !!vapidPub,
          has_private: !!vapidPriv,
          has_subject: !!process.env.VAPID_SUBJECT,
        },
      }, { status: 500 })
    }

    // Cargar subs del user
    const { data: subs, error: subsErr } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, user_agent, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (subsErr) {
      return NextResponse.json({ ok: false, error: 'Error cargando subscriptions: ' + subsErr.message }, { status: 500 })
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json({
        ok: false,
        error: 'No tenes ninguna push subscription registrada. Aceptá las notificaciones en el banner.',
        subs_count: 0,
      })
    }

    // Cargar web-push
    let webpush
    try {
      const wp = await import('web-push')
      webpush = wp.default || wp
      webpush.setVapidDetails(vapidSub, vapidPub, vapidPriv)
    } catch (e) {
      return NextResponse.json({
        ok: false,
        error: 'No se pudo cargar el modulo web-push: ' + (e?.message || ''),
      }, { status: 500 })
    }

    const payload = JSON.stringify({
      title:   'Test push — Clufix',
      body:    'Si ves esto, los push notifications funcionan en este dispositivo.',
      link:    '/',
      type:    'redeem_pending',  // criticos: requireInteraction + urgency:high
      notifId: `test-${Date.now()}`,
    })

    // Testear cada subscription
    const results = []
    for (const s of subs) {
      const ua = (s.user_agent || '').slice(0, 80)
      const endpointHost = (() => {
        try { return new URL(s.endpoint).host } catch { return 'unknown' }
      })()
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { urgency: 'high', TTL: 60 * 60 },
        )
        results.push({ id: s.id, endpoint_host: endpointHost, ua, ok: true })
      } catch (err) {
        results.push({
          id: s.id,
          endpoint_host: endpointHost,
          ua,
          ok: false,
          status: err?.statusCode,
          message: err?.message || String(err),
          body: typeof err?.body === 'string' ? err.body.slice(0, 200) : null,
        })
        // Si el endpoint no existe mas, lo limpiamos
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', s.id)
        }
      }
    }

    return NextResponse.json({
      ok: results.some(r => r.ok),
      subs_count: subs.length,
      results,
    })
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 })
  }
}
