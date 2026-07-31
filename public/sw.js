const CACHE = "qrkuy-v1"
const PRECACHED = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
]

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHED))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) =>
      Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  )
})
