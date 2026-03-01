const CACHE_NAME = 'anychat-v1'
const STATIC_ASSETS = ['/', '/chat', '/tasks', '/agents', '/settings', '/icon.svg']

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  )
  self.clients.claim()
})

// Fetch — network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.url.includes('/api/')) {
    // Network first
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
  } else {
    // Cache first, then network
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone)).catch(() => {})
        }
        return res
      })).catch(() => caches.match('/'))
    )
  }
})

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json?.() || { title: '⏰ Herinnering', body: 'Je hebt een herinnering!' }
  event.waitUntil(
    self.registration.showNotification(data.title || '⏰ Herinnering', {
      body: data.body || data.message || '',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      data: data,
    })
  )
})

// Notification click — open tasks page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      for (const client of clients) {
        if (client.url.includes('/') && 'focus' in client) return client.focus()
      }
      return self.clients.openWindow('/tasks')
    })
  )
})
