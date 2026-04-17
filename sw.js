// =============================================
// SERVICE WORKER – Coach Finanzas PWA
// =============================================

const CACHE_NAME = 'finanzas-v1';

const ASSETS = [
  '/Track-Finanzas/',
  '/Track-Finanzas/index.html',
  '/Track-Finanzas/css/app.css',
  '/Track-Finanzas/js/config.js',
  '/Track-Finanzas/js/db.js',
  '/Track-Finanzas/js/analytics.js',
  '/Track-Finanzas/js/app.js',
  '/Track-Finanzas/manifest.json',
];

// Instalar: cachear archivos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para assets, network-first para API
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase y CDNs → siempre red
  if (url.hostname.includes('supabase') || url.hostname.includes('cdn.jsdelivr')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Assets locales → cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
