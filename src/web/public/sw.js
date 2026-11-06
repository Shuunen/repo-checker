// @ts-nocheck -- a service worker scope is not in the DOM lib the project compiles with
// the dashboard needs the live local api, so nothing is cached: this worker only makes the app installable
globalThis.addEventListener('install', () => globalThis.skipWaiting())
globalThis.addEventListener('activate', event => event.waitUntil(globalThis.clients.claim()))
globalThis.addEventListener('fetch', event => event.respondWith(fetch(event.request)))
