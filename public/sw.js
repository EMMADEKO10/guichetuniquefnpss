const CACHE_NAME = 'fnpss-static-v1';
const PRECACHE_URLS = [
  '/brand/logo-fnpss.png',
  '/brand/favicon-fnpss.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Ne jamais mettre en cache les appels API souverains
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req));
    return;
  }

  // Ressources de marque & manifeste : cache-first
  if (url.pathname.startsWith('/brand/') || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // Navigations HTML : network-first avec secours hors-ligne propre en français
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(
          `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FNPSS — Mode Hors-Ligne</title><style>body{font-family:sans-serif;background:#f4f6f9;color:#0a2540;padding:24px;max-width:540px;margin:40px auto}div{background:#fff;padding:24px;border-radius:10px;border:1px solid #dbe2ea;border-top:4px solid #b83d08}a{color:#065a82;font-weight:700}</style></head><body><div><h1>Connexion 3G / Internet interrompue</h1><p>Le Guichet Unique FNPSS n'arrive pas à joindre le serveur pour le moment. Vos brouillons enregistrés sur cet appareil restent conservés en toute sécurité.</p><p><a href="/">Réessayer l'ouverture du portail</a></p></div></body></html>`,
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      )
    );
  }
});
