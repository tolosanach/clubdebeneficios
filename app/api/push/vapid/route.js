// GET /api/push/vapid → devuelve la VAPID public key para que el cliente
// pueda armar la PushSubscription. Se evita hardcodear la key en el bundle.
import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY || ''
  if (!key) {
    return NextResponse.json({ ok: false, error: 'push_not_configured' })
  }
  return NextResponse.json({ ok: true, publicKey: key })
}
