/**
 * Kitty 账本 Service Worker — 离线缓存壳
 * 策略：cache-first，对所有同源 GET 请求先查 cache，没有再走网络。
 */
const CACHE = 'kitty-ledger-v13';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/report.css',
  './js/app.js',
  './js/db.js',
  './js/ai.js',
  './icons/app/icon-192.png',
  './icons/app/icon-512.png',
  './icons/kitty/sweet-home/9_11_house.png',
  './icons/kitty/dessert/7_41_apple.png',
  './icons/kitty/dessert/7_11_flower-kitty.png',
  './icons/kitty/misc/3_12_vinyl-music.png',
  './icons/kitty/office-life/10_41_note-pad.png',
  './icons/kitty/office-life/10_21_laptop.png',
  './icons/kitty/life-travel/8_42_shopping-cart.png',
  './icons/kitty/life-travel/8_11_notebook.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 只处理同源 GET
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => {
      // 顺手把新请求的也缓存起来（小资源）
      if (resp.ok && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html'))) {
        const clone = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
      }
      return resp;
    }))
  );
});
