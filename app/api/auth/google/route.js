// GET /api/auth/google
//
// Inicia el flujo OAuth de Google directamente (sin pasar por el endpoint
// de Supabase), de modo que Google muestre "Ir a benefix.com.ar" en vez
// del dominio interno de Supabase.
//
// Query params:
//   next  — ruta relativa a la que redirigir después del login (default: '/')
//
// El valor de `next` viaja en el `state` de OAuth (base64url) para sobrevivir
// el round-trip por Google sin exponer datos sensibles en la URL de callback.

import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)

  const next = searchParams.get('next') || '/'
  const safeNext = next.startsWith('/') ? next : '/'

  const state = Buffer.from(JSON.stringify({ next: safeNext }))
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  `${origin}/api/auth/google/callback`,
    response_type: 'code',
    scope:         'openid email profile',
    state,
    prompt:        'select_account',
    access_type:   'offline',
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )
}
