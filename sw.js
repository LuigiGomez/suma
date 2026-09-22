const CACHE = 'suma-construye-v2';
const ARCHIVOS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-512-maskable.png'];

// Guarda cada archivo por separado: si uno falla, los demas igual quedan en cache.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.all(
      ARCHIVOS.map(u => fetch(u, {cache: 'reload'})
        .then(r => (r && r.ok) ? c.put(u, r) : null)
        .catch(() => null))
    )).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache primero. La red solo se usa si el archivo no esta guardado,
// y nunca se responde con undefined (eso rompia la carga).
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const esNavegacion = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copia = res.clone();
          caches.open(CACHE).then(c => { try { c.put(req, copia); } catch (err) {} });
        }
        return res;
      }).catch(() => {
        if (esNavegacion) {
          return caches.match('./index.html').then(
            idx => idx || new Response(
              '<h1 style="font-family:sans-serif;padding:24px">Abre el juego una vez con internet para guardarlo</h1>',
              {headers: {'Content-Type': 'text/html; charset=utf-8'}}
            )
          );
        }
        return new Response('', {status: 504, statusText: 'sin conexion'});
      });
    })
  );
});
