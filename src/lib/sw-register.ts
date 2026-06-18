// Service Worker 登録（本番のみ）
export function registerSW(): void {
  if (!('serviceWorker' in navigator)) return
  if (import.meta.env.DEV) return

  window.addEventListener('load', () => {
    const swUrl = new URL('./sw.js', import.meta.url).href
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.warn('SW registration failed:', err)
    })
  })
}
