// GET /api/auth/google/callback
//
// Recibe el code de Google, lo intercambia por tokens, y crea la sesión
// de Supabase vía signInWithIdToken. Las cookies de sesión quedan
// seteadas en la respuesta antes del redirect final.

import { NextResponse } from 'next/server'
import { createSupabaseServer } from '../../../../../lib/supabase-server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code      = searchParams.get('code')
  const authError = searchParams.get('error')
  const stateRaw  = searchParams.get('state') || ''

  // Recuperar el `next` del state
  let next = '/'
  try {
    const decoded = Buffer.from(
      stateRaw.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString()
    const state = JSON.parse(decoded)
    if (typeof state.next === 'string' && state.next.startsWith('/')) {
      next = state.next
    }
  } catch {}

  if (authError || !code) {
    return NextResponse.redirect(`${origin}/?error=auth`)
  }

  // Intercambiar el authorization code por tokens de Google
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  `${origin}/api/auth/google/callback`,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('Google token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(`${origin}/?error=auth`)
  }

  const tokens = await tokenRes.json()

  if (!tokens.id_token) {
    console.error('No id_token in Google response')
    return NextResponse.redirect(`${origin}/?error=auth`)
  }

  // Crear la sesión de Supabase a partir del ID token de Google.
  // signInWithIdToken verifica el token con Google y crea/actualiza
  // el usuario en Supabase, luego setea las cookies de sesión.
  const supabase = await createSupabaseServer()
  const { error: supaErr } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token:    tokens.id_token,
  })

  if (supaErr) {
    console.error('signInWithIdToken error:', supaErr.message)
    return NextResponse.redirect(`${origin}/?error=auth`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
