/**
 * Service Worker - Bodega Mayorista
 * Caché offline para carga rápida
 */

<<<<<<< HEAD
const CACHE_NAME = 'bodega-mayorista-v4';
=======
const CACHE_NAME = 'bodega-mayorista-v7-static-optimized';
>>>>>>> 43f9ece (Optimize frontend/backend, implement advanced admin search, and fix imports)
const STATIC_ASSETS = [
    '/tienda/',
    '/tienda/index.html',
    '/tienda/catalogo.html',
    '/tienda/carrito.html',
    '/tienda/checkout.html',
    '/tienda/login.html',
    '/tienda/css/tienda.css',
    '/tienda/css/tienda.min.css',
    '/tienda/css/index.css',
    '/tienda/css/catalogo.css',
    '/tienda/css/carrito.css',
    '/tienda/css/login.css',
    '/tienda/css/checkout.css',
    '/tienda/css/pago-resultado.css',
    '/tienda/css/reset-password.css',
    '/tienda/js/tienda.js',
    '/tienda/js/index.js',
    '/tienda/js/catalogo.js',
    '/tienda/js/carrito.js',
    '/tienda/js/login.js',
    '/tienda/js/checkout.js',
    '/tienda/js/pago-resultado.js',
    '/tienda/js/reset-password.js',
    '/tienda/img/bg-tech-products.png',
    '/tienda/img/logo.png',
    '/tienda/favicon.png',
    '/tienda/favicon-192.png',
    '/tienda/img/zone_apple.png',
    '/tienda/img/zone_android.png',
    '/tienda/img/zone_cacharros.png',
    '/tienda/img/zone_accesorios.png'
];

// Install - Cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch - Cache first, then network (Stale-While-Revalidate Strategy)
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip API requests - always fetch from network
    if (request.url.includes('/api/')) return;

    event.respondWith(
        (async () => {
            try {
                // 1. Try to get from cache
                const cachedResponse = await caches.match(request);

                if (cachedResponse) {
                    // Strategy: Stale-While-Revalidate
                    // Return cached content immediately, but update cache in background
                    event.waitUntil(
                        (async () => {
                            try {
                                const networkResponse = await fetch(request);
                                // Cache valid responses (including opaque for external images)
                                if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
                                    const cache = await caches.open(CACHE_NAME);
                                    cache.put(request, networkResponse.clone());
                                }
                            } catch (err) {
                                // Ignore background update errors (offline)
                            }
                        })()
                    );
                    return cachedResponse;
                }

                // 2. If not in cache, fetch from network
                const networkResponse = await fetch(request);

                // 3. Cache the new response
                if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(request, networkResponse.clone());
                }

                return networkResponse;

            } catch (error) {
                console.warn('[SW] Fetch failed:', request.url);

                // 4. Offline Fallback
                if (request.headers.get('Accept').includes('text/html')) {
                    const fallback = await caches.match('/tienda/index.html');
                    if (fallback) return fallback;
                }

                // Critical: Return a valid Response to avoid "Failed to convert value to Response"
                return new Response('Office / Network Error', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
        })()
    );
});
