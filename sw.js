/* BitWise service worker
   BUILD is replaced with the commit hash by the GitHub Actions workflow on every
   deploy, so each push produces a new worker → a new cache → an update prompt. */
const BUILD = "__BUILD__";
const CACHE = "bitwise-" + BUILD;
const SHELL = [
  "./", "./index.html", "./manifest.json",
  "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/icon-maskable-192.png", "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png", "./icons/favicon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

/* the page asks us to take over once the user accepts the update */
self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    /* navigation: network first so a fresh deploy shows up on next open */
    if (e.request.mode === "navigate") {
      try {
        const res = await fetch(e.request);
        if (res && res.ok) c.put("./index.html", res.clone());
        return res;
      } catch (err) {
        return (await c.match("./index.html")) || (await c.match("./")) || Response.error();
      }
    }
    /* everything else: cache first, refresh in the background */
    const cached = await c.match(e.request, { ignoreSearch: true });
    const refresh = fetch(e.request).then(res => {
      if (res && res.ok) c.put(e.request, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(refresh); return cached; }
    return (await refresh) || Response.error();
  })());
});
