/* Minimal static server for public/ — used by `npm run serve` and the e2e tests. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../public/", import.meta.url));
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
  ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

/* options.override(path) may return {status, type, body} to replace a response
   (the e2e tests use it to simulate a broken deploy). */
export function serve(port = 0, { override } = {}) {
  const server = createServer(async (req, res) => {
    let path;
    try { path = decodeURIComponent(new URL(req.url, "http://x").pathname); }
    catch { res.writeHead(400).end("bad request"); return; }
    const forced = override && override(path);
    if (forced) { res.writeHead(forced.status || 200, { "Content-Type": forced.type || "text/html; charset=utf-8" }).end(forced.body); return; }
    const file = normalize(join(ROOT, path.endsWith("/") ? path + "index.html" : path));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8080;
  serve(port).then(() => console.log(`BitWise on http://localhost:${port}/`));
}
