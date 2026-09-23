const CACHE = 'cuenta-construye-v2';
const ARCHIVOS = ['./cuenta.html', './cuenta.webmanifest', './icon-cuenta-192.png', './icon-cuenta-512.png'];

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

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const esPagina = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  if (esPagina) {
    // Red primero, pero con 2.5 s de paciencia: si la red esta lenta o bloqueada,
    // se abre igual de rapido desde la copia guardada.
    const conTiempo = new Promise((ok, falla) => {
      const reloj = setTimeout(() => falla(new Error('lento')), 2500);
      fetch(req).then(r => { clearTimeout(reloj); ok(r); }, err => { clearTimeout(reloj); falla(err); });
    });
    e.respondWith(
      conTiempo.then(res => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then(c => { try { c.put('./cuenta.html', copia); } catch (err) {} });
        }
        return res;
      }).catch(() => caches.match('./cuenta.html').then(
        hit => hit || new Response('<h1 style="font-family:sans-serif;padding:24px">Abre el juego una vez con internet</h1>',
          {headers: {'Content-Type': 'text/html; charset=utf-8'}})
      ))
    );
    return;
  }

  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') {
        const copia = res.clone();
        caches.open(CACHE).then(c => { try { c.put(req, copia); } catch (err) {} });
      }
      return res;
    }).catch(() => new Response('', {status: 504})))
  );
});
