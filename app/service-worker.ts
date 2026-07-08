/// <reference types="@sveltejs/kit" />
import { build, files, version } from "$service-worker";

const CACHE_NAME = `bluemoji-cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => (self as unknown as ServiceWorkerGlobalScope).skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => (self as unknown as ServiceWorkerGlobalScope).clients.claim()),
  );
});

// Network-first for navigations and API calls (XRPC/image data changes
// constantly and must never go stale offline-first); cache-first for the
// immutable build assets and static files listed above.
self.addEventListener("fetch", (event) => {
  const { request } = event as FetchEvent;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isBuildAsset = ASSETS.includes(url.pathname);

  if (isBuildAsset) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error())),
  );
});
