self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())

self.addEventListener('push', (event) => {
  let title = 'Puzometr'
  let body = 'Time to log your meal!'
  try {
    const data = event.data?.json()
    if (data?.title) title = data.title
    if (data?.body) body = data.body
  } catch {}
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/mascot/happy.png',
      badge: '/mascot/happy.png',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus()
      return clients.openWindow('/')
    })
  )
})
