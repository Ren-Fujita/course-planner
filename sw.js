'use strict';

// Generated from every shipped app asset. Rebuilding changes this revision.
const REVISION = '1.0.0-6c9b062cd69a';
const BASE = new URL(self.registration.scope);
const PREFIX = 'shunan-course-planner:' + encodeURIComponent(BASE.pathname) + ':';
const CACHE = PREFIX + REVISION;
const SHELL = [
  './', './index.html', './manifest.webmanifest', './pwa.js', './pwa.css',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
].map(path => new URL(path, BASE).href);
const PATHS = new Set(SHELL.map(url => new URL(url).pathname));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' })));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
    // An update waits until the user chooses to restart, or all old tabs close.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Never cache other apps, external references, JSON backups or non-GET requests.
  if (request.method !== 'GET' || url.origin !== BASE.origin || !PATHS.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Keep the HTML and its matching assets together until the next activation.
    const cached = await cache.match(new URL(url.pathname, BASE.origin).href);
    if (cached) return cached;
    return fetch(request);
  })());
});
