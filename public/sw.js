// shikounohako Service Worker
// GitHub Pages のサブパス配信を考慮し、相対パスでキャッシュする。
const VERSION = 'v1'
const CACHE_NAME = `shikounohako-${VERSION}`

// インストール時は何もキャッシュしない（初回アクセス時に都度キャッシュ）
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(Promise.resolve())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // 同一オリジン（GitHub Pages 内）だけキャッシュ対象
  if (url.origin !== self.location.origin) return

  // Google API 系はキャッシュしない
  if (url.hostname.endsWith('googleapis.com')) return
  if (url.hostname.endsWith('google.com')) return

  // ナビゲーションリクエストはネットワーク優先（更新が即反映されるように）
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          const cache = await caches.open(CACHE_NAME)
          cache.put(req, fresh.clone())
          return fresh
        } catch {
          const cache = await caches.open(CACHE_NAME)
          const cached = await cache.match(req)
          if (cached) return cached
          // オフライン時のフォールバック（index.html）
          const fallback = await cache.match('./index.html')
          return fallback ?? new Response('Offline', { status: 503 })
        }
      })(),
    )
    return
  }

  // 静的アセットは cache-first
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(req)
      if (cached) return cached
      try {
        const fresh = await fetch(req)
        if (fresh.ok) cache.put(req, fresh.clone())
        return fresh
      } catch {
        return cached ?? new Response('Offline', { status: 503 })
      }
    })(),
  )
})
