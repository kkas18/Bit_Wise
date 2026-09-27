/* Guards for the app shell: every module URL carries the build stamp, so a
   service worker can never serve a page modules from two different builds. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (p) => readFile(new URL("../public/" + p, import.meta.url), "utf8");

test("app.js imports version-stamped modules", async () => {
  const app = await read("js/app.js");
  const imports = [...app.matchAll(/from\s+"(\.\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(imports.length >= 2);
  for (const url of imports) assert.match(url, /\?v=__BUILD__$/, url);
});

test("index.html loads stamped assets and carries the app marker", async () => {
  const html = await read("index.html");
  assert.match(html, /style\.css\?v=__BUILD__/);
  assert.match(html, /js\/app\.js\?v=__BUILD__/);
  assert.match(html, /data-app="bitwise"/);
});

test("the service worker precaches exactly the stamped modules and fonts that exist", async () => {
  const sw = await read("sw.js");
  for (const m of ["./style.css", "./js/app.js", "./js/core.js", "./js/i18n.js"]) assert.ok(sw.includes(`v("${m}")`), m);
  assert.match(sw, /k\.startsWith\(PREFIX\)/, "only BitWise caches are deleted");
  const css = await read("style.css");
  const fonts = [...css.matchAll(/url\((fonts\/[^)]+)\)/g)].map((m) => "./" + m[1]);
  for (const f of fonts) assert.ok(sw.includes(`"${f}"`), "font not precached: " + f);
});
