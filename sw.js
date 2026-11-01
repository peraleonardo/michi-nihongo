/* Service worker di Michi.
   >>> Per forzare l'aggiornamento sui dispositivi, cambia VERSION (e APP_VERSION in js/core.js) ad ogni pubblicazione. <<< */
const VERSION = '2.3.0';
const CACHE = 'michi-' + VERSION;
const AUDIO_CACHE = 'michi-audio-2'; // cambia il numero (anche in js/audio.js) quando rigeneri i file audio: così i dispositivi riscaricano le nuove registrazioni
const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/style.css',
  'js/core.js', 'js/audio.js', 'js/quiz.js', 'js/study.js', 'js/jlpt.js', 'js/jlpt-read.js', 'js/jlpt-listen.js', 'js/frasi.js', 'js/main.js', 'js/exam.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'data/kana.json', 'data/strokes.json', 'data/kanji-elenco.json', 'data/frasi.json'
].concat(['n5', 'n4', 'n3'].flatMap(l => ['kanji', 'vocabolario', 'grammatica', 'testi', 'ascolto', 'esercizi'].map(t => `data/${t}-${l}.json`)));

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled(CORE.map(u => c.add(new Request(u, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('michi-') && k !== CACHE && k !== AUDIO_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

// Risposta 206 per gli audio in cache (Safari richiede le Range request per l'audio)
async function rangeResponse(req, res) {
  const range = req.headers.get('range');
  if (!range || !res) return res;
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d+)-(\d*)/.exec(range);
  const start = +m[1], end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: {
    'Content-Type': res.headers.get('Content-Type') || 'audio/mp4',
    'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
    'Content-Length': String(end - start + 1) } });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.includes('/audio/')) {
    e.respondWith((async () => {
      const hit = await caches.match(req.url, { cacheName: AUDIO_CACHE });
      if (hit) return rangeResponse(req, hit);
      return fetch(req);
    })());
    return;
  }

  // dati: rete prima (contenuti sempre aggiornati se online), cache come ripiego
  if (url.pathname.includes('/data/')) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
        return res;
      } catch (err) {
        const hit = await caches.match(req, { cacheName: CACHE, ignoreSearch: true });
        return hit || new Response('[]', { status: 404 });
      }
    })());
    return;
  }

  // resto: cache prima (versionata), poi rete
  e.respondWith((async () => {
    const hit = await caches.match(req, { cacheName: CACHE, ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
      return res;
    } catch (err) {
      if (req.mode === 'navigate') return (await caches.match('index.html', { cacheName: CACHE })) || Response.error();
      return Response.error();
    }
  })());
});
