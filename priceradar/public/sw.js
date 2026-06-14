// 比价雷达 · PriceRadar — Service Worker（离线可用 + 资源缓存）
// 策略：
//   - 应用外壳(HTML/CSS/JS/图标)：stale-while-revalidate，秒开且后台更新
//   - 导航请求：网络优先，离线时回退缓存的 index.html
//   - /api/*：网络优先（价格要新鲜），离线时返回友好 JSON，不长期缓存
const VERSION = 'pr-v1';
const SHELL = `shell-${VERSION}`;
const SHELL_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.mjs',
  './js/api.mjs',
  './js/radar.mjs',
  './js/store.mjs',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 跨域(如真实店铺链接)放行

  // API：网络优先，离线返回提示
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: '离线中：无法获取实时比价，请联网后重试', products: [] }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        })
      )
    );
    return;
  }

  // 导航：网络优先，离线回退外壳
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  // 静态资源：stale-while-revalidate
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.ok) caches.open(SHELL).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
