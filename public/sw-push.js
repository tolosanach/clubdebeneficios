// public/sw-push.js
// Service Worker mínimo para web push.
// Lo registra `lib/push-client.js` solo si el user da permiso.
//
// IMPORTANTE: este SW NO cachea nada (no hace de PWA offline). Su única
// responsabilidad es recibir el `push` event del browser, mostrar la notif
// nativa, y al click abrir/enfocar la app en el link correspondiente.

self.addEventListener('install', (event) => {
  // Activar el nuevo SW inmediatamente sin esperar a que se cierren las tabs.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Fetch passthrough — no cacheamos nada (no es un PWA offline-first), pero
// los criterios de "installable PWA" de Chrome/Edge requieren que el SW
// tenga al menos un fetch handler registrado. Sin esto, el evento
// `beforeinstallprompt` nunca se dispara y no aparece el cartel "Instalar app".
self.addEventListener('fetch', (event) => {
  // No-op: dejamos que el browser maneje la request normalmente.
  return
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'Benefix', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Benefix'
  const options = {
    body:    data.body || '',
    icon:    '/icon-192.png',
    badge:   '/icon-192.png',
    data:    { link: data.link || '/', notifId: data.notifId },
    tag:     data.notifId ? `notif-${data.notifId}` : 'benefix',
    renotify: true,
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Avisar a las tabs abiertas para que refresquen el drawer de notifs.
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => clients.forEach(c => c.postMessage({ type: 'benefix:notification', notifId: data.notifId }))),
    ])
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification.data?.link || '/'

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    // Si hay una tab abierta de la app, le pedimos foco y navegamos.
    for (const client of allClients) {
      if ('focus' in client) {
        try {
          await client.focus()
          if ('navigate' in client && link) {
            await client.navigate(link)
          }
          return
        } catch {}
      }
    }
    // Si no hay tab abierta, abrimos una nueva.
    if (self.clients.openWindow) {
      await self.clients.openWindow(link)
    }
  })())
})
