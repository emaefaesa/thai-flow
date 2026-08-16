const CACHE_NAME = 'thai-flow-v7';
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./img/places/aow-leuk.webp",
  "./img/places/ayutthaya-temple-generic.webp",
  "./img/places/bangkok-city.webp",
  "./img/places/bangkok-temple-generic.webp",
  "./img/places/chiangmai-temple-generic.webp",
  "./img/places/doi-suthep-courtyard.webp",
  "./img/places/doi-suthep-main.webp",
  "./img/places/elephant-nature-park.webp",
  "./img/places/grand-palace.webp",
  "./img/places/kohtao-coast.webp",
  "./img/places/kohtao-snorkel-generic.webp",
  "./img/places/rajadamnern.webp",
  "./img/places/sai-nuan.webp",
  "./img/places/shark-bay.webp",
  "./img/places/siam-square.webp",
  "./img/places/tanote-bay.webp",
  "./img/places/temple-generic.webp",
  "./img/places/wat-arun-front.webp",
  "./img/places/wat-arun-wide.webp",
  "./img/places/wat-pho.webp",
  "./img/places/wat-phra-singh.webp"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
