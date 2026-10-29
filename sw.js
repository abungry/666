﻿﻿﻿// Service Worker：静态资源缓存，API 请求不走缓存
// 作者：周梓润
const CACHE_NAME = 'sac-static-v16';
const STATIC_ASSETS = [
    './',
    'index.html',
    'main.html',
    'main.css',
    'main.js',
    'theme.css',
    'refresh.css',
    'companion.css',
    'companion.js',
    'welcome.html',
    'welcome.css',
    'welcome.js',
    'energy.css',
    'energy.js',
    'energy-refresh.css',
    'look.css',
    'beijing_places.js',
    'beijing_places_extended.js',
    'assets/companion/companion_normal.png',
    'assets/companion/companion_shy.png',
    'assets/companion/companion_happy.png',
    'assets/companion/xingye_normal.png',
    'assets/companion/xingye_shy.png',
    'assets/companion/xingye_happy.png',
    'assets/companion/fengling_normal.png',
    'assets/companion/fengling_shy.png',
    'assets/companion/fengling_happy.png',
    'assets/companion/mengdie_normal.png',
    'assets/companion/mengdie_shy.png',
    'assets/companion/mengdie_happy.png',
    'assets/companion/lanyin_normal.png',
    'assets/companion/lanyin_shy.png',
    'assets/companion/lanyin_happy.png',
    'assets/companion/hiyori_normal.png',
    'assets/live2d/lib/pixi.min.js',
    'assets/live2d/lib/live2dcubismcore.min.js',
    'assets/live2d/lib/pixi-live2d-cubism4.min.js',
    'assets/live2d/hiyori/Hiyori.model3.json',
    'assets/live2d/hiyori/Hiyori.moc3',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'manifest.json'
];

// 安装：预缓存核心静态资源（单个失败不阻塞安装）
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url)))
        ).then(() => self.skipWaiting())
    );
});

// 激活：清理旧版本缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    // API 请求永远直连后端，不缓存
    if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') return;
    // 跨域资源（CDN、瓦片）不拦截，交给浏览器
    if (url.origin !== self.location.origin) return;

    // 同源静态资源：网络优先（始终拿到最新代码），断网时回退缓存
    event.respondWith(
        fetch(event.request).then(response => {
            if (response && response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
        }).catch(() =>
            caches.match(event.request).then(cached => cached || Response.error())
        )
    );
});
