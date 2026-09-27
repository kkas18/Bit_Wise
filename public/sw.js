/* BitWise service worker
   BUILD is replaced with the commit hash by the deploy workflow on every
   push, so each deploy produces a new worker → a new cache → an update prompt.

   Rules that keep an installed app working through bad deploys and outages:
   - every app file is requested with ?v=BUILD, so a page never mixes modules
     from two builds;
   - a new worker installs only if the whole app shell downloaded and the
     start page really is BitWise — otherwise the current version keeps running;
   - a start page from the network is used (and cached) only when it is the
     BitWise app; anything else (a 404, a README from a misconfigured deploy)
     falls back to the cached app;
   - only BitWise's own caches are ever deleted (the origin is shared). */
const BUILD = "__BUILD__";
const PREFIX = "bitwise-";
const CACHE = PREFIX + BUILD;
const APP_MARKER = 'data-app="bitwise"';
const v = (url) => `${url}?v=${BUILD}`;

/* the app cannot run without these */
const SHELL = ["./manifest.json", v("./style.css"), v("./js/app.js"), v("./js/core.js"), v("./js/i18n.js")];
/* nice to have offline; a failure here does not block the update */
const EXTRAS = [
  "./fonts/ibm-plex-sans-latin-300-normal.woff2", "./fonts/ibm-plex-sans-latin-400-normal.woff2",
  "./fonts/ibm-plex-sans-latin-500-normal.woff2", "./fonts/ibm-plex-mono-latin-400-normal.woff2",
  "./icons/icon-192.png", "./icons/icon-512.png",
  "./icons/icon-maskable-192.png", "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png", "./icons/favicon.svg",
];

const fresh = (url) => new Request(url, { cache: "reload" });

/* "app": the response is a BitWise page; "this": it is this worker's own build */
async function inspectPage(res) {
  if (!res || !res.ok || !(res.headers.get("content-type") || "").includes("text/html")) return "other";
  const html = await res.clone().text();
  if (!html.includes(APP_MARKER)) return "other";
  return html.includes(v("js/app.js")) ? "this" : "app";
}

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const page = await fetch(fresh("./"));
    if ((await inspectPage(page)) !== "this") throw new Error("start page is not this BitWise build — keeping the current version");
    const c = await caches.open(CACHE);
    await c.addAll(SHELL.map(fresh));
    await c.put("./", page);
    await Promise.all(EXTRAS.map((u) => c.add(fresh(u)).catch(() => {})));
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

/* the page asks us to take over once the user accepts the update */
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);

    if (req.mode === "navigate") {
      const path = new URL(req.url).pathname;
      const isPage = path.endsWith("/") || path.endsWith(".html"); /* index.html, bitwise-kalkulator.html … */
      if (!isPage) {
        /* e.g. opening manifest.json in a tab: pass through, never store it as the app */
        try { return await fetch(req); } catch { return Response.error(); }
      }
      /* network first, so a fresh deploy shows up on the next launch */
      try {
        const res = await fetch(req);
        const kind = await inspectPage(res);
        if (kind === "this") c.put("./", res.clone());
        if (kind !== "other") return res; /* a newer build is fine online; its worker caches it */
        return (await c.match("./")) || res;
      } catch {
        return (await c.match("./")) || Response.error();
      }
    }

    /* everything else: cache first, refresh in the background */
    const cached = await c.match(req);
    const refresh = fetch(req).then((res) => {
      if (res && res.ok) c.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(refresh); return cached; }
    return (await refresh) || Response.error();
  })());
});
