'use client'

// SwRegister — registra el service worker al cargar la app, independiente
// de si el user dio permiso de push. Es necesario tenerlo registrado para
// que el navegador considere al sitio "instalable" como PWA y dispare el
// evento `beforeinstallprompt`.
//
// El SW también se usa después para web push (cuando el user da permiso),
// pero la registración es siempre primero acá.
//
// Montar UNA sola vez en algún lugar global (ej: app/page.js root).

import { useEffect } from 'react'

const SW_PATH = '/sw-push.js'

export default function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // Registramos sin esperar a load para que esté disponible antes posible.
    // Evitamos doble registro: si ya está registrado, lo reutilizamos.
    navigator.serviceWorker.getRegistration(SW_PATH)
      .then(existing => existing || navigator.serviceWorker.register(SW_PATH))
      .catch(err => console.warn('[sw] registration failed:', err?.message))
  }, [])

  return null
}
