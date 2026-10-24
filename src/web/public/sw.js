// @ts-nocheck -- a service worker scope is not in the DOM lib the project compiles with
// the dashboard needs the live local api, so nothing is cached: this worker only makes the app installable
self.addEventListener('install', () => globalThis.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(globalThis.clients.claim()))
self.addEventListener('fetch', event => event.respondWith(fetch(event.request)))
