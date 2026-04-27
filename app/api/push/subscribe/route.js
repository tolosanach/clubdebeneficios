// POST /api/push/subscribe   { endpoint, keys: { p256dh, auth } }
// DELETE /api/push/subscribe { endpoint }
//
// Guarda/elimina la PushSubscription del navegador del user.
// El service worker en `public/sw-push.js` recibe las pushes que dispara
// `lib/notify-server.js` con web-push.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '../../../../lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

export async function POST(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await request.json()
    const { endpoint, keys, userAgent } = body || {}
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 })
    }

    // Upsert: si ya existe el endpoint, lo actualizamos (puede haber cambiado
    // de user en el mismo navegador).
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id:    user.id,
        endpoint,
        p256dh:     keys.p256dh,
        auth:       keys.auth,
        user_agent: userAgent || null,
      }, { onConflict: 'endpoint' })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const endpoint = body?.endpoint
    if (!endpoint) return NextResponse.json({ error: 'Falta endpoint' }, { status: 400 })

    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push/subscribe DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
