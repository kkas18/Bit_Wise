/* End-to-end checks in a real Chromium: key flows, both languages, both themes, a11y. */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { serve } from "../../tools/serve.mjs";

let server, browser, base;
before(async () => {
  server = await serve(0);
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
});
after(async () => { await browser?.close(); server?.close(); });

async function open({ locale = "nb-NO", width = 393, height = 852, scheme = "dark" } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale, hasTouch: true, isMobile: true, colorScheme: scheme, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(base);
  await page.waitForFunction(() => window.BITWISE);
  page.errors = errors;
  return page;
}
const tap = async (page, keys) => { for (const k of keys) await page.click(`#pad [data-k="${k}"]`); };
const text = (page, sel) => page.locator(sel).innerText();

test("only the programmer calculator is present", async () => {
  const page = await open();
  assert.equal(await page.locator("#viewSTD, #sPad, #appSeg").count(), 0);
  assert.equal(await page.getAttribute("html", "lang"), "nb");
  assert.equal(await text(page, "#wordLabel"), "64-bit · usignert");
  await page.context().close();
});

test("bases, conversions and insights", async () => {
  const page = await open();
  await tap(page, ["F", "F"]);
  assert.equal(await text(page, "#mainVal"), "FF");
  assert.match(await text(page, '.conv__row[data-mode="DEC"]'), /255/);
  await page.click('.conv__row[data-mode="BIN"]');
  await page.waitForFunction(() => window.BITWISE.S.mode === "BIN");
  assert.equal(await page.getAttribute('#baseSeg [data-mode="BIN"]', "aria-selected"), "true");
  assert.equal(await page.locator('#pad [data-k="F"]').count(), 0, "BIN keypad has no hex digits");
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test("chained operations, pending line and swap", async () => {
  const page = await open({ locale: "en-US" });
  await page.click('#baseSeg [data-mode="DEC"]');
  await page.waitForFunction(() => window.BITWISE.S.mode === "DEC");
  await tap(page, ["5", "ADD", "3", "ROL", "MUL", "2", "EQ"]);
  assert.equal(await text(page, "#mainVal"), "22", "(5 + ROL 3) × 2");
  await tap(page, ["AC", "3", "SUB", "8"]);
  assert.ok(await page.locator("#pending").isVisible());
  await page.click("#pending");
  await tap(page, ["EQ"]);
  assert.equal(await text(page, "#mainVal"), "5");
  await tap(page, ["AC", "8", "DIV", "0", "EQ"]);
  assert.equal(await text(page, "#mainVal"), "Cannot divide by 0");
  await page.context().close();
});

test("signed toggle, word size and bit inspector", async () => {
  const page = await open();
  await page.click('#bitsSeg [data-bits="8"]');
  await tap(page, ["F", "F"]);
  await page.click("#sgn");
  assert.equal(await page.getAttribute("#sgn", "aria-pressed"), "true");
  assert.match(await text(page, '.conv__row[data-mode="DEC"]'), /-1/);
  await page.click("#fold");
  assert.equal(await page.locator(".bit.on").count(), 8);
  await page.click('.bit[data-bit="7"]');
  assert.equal(await page.evaluate(() => window.BITWISE.S.cur.toString(16)), "7f");
  /* Android back closes the inspector instead of leaving the app */
  await page.goBack();
  await page.waitForFunction(() => !window.BITWISE.UI.inspecting);
  assert.ok(await page.locator("#pad").isVisible());
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test("undo, keyboard and arrow-key tabs", async () => {
  const page = await open();
  await page.keyboard.type("ff&f");
  await page.keyboard.press("Enter");
  assert.equal(await text(page, "#mainVal"), "F");
  await tap(page, ["AC"]);
  const ac = await page.locator('#pad [data-k="AC"]').boundingBox();
  await page.mouse.move(ac.x + 10, ac.y + 10);
  await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
  assert.equal(await text(page, "#mainVal"), "F");
  await page.focus('#baseSeg [data-mode="HEX"]');
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => window.BITWISE.S.mode === "DEC");
  await page.context().close();
});

test("settings: language and theme switch at runtime", async () => {
  const page = await open();
  await page.click("#settingsBtn");
  await page.click('[data-lang-pref="en"]');
  assert.equal(await page.getAttribute("html", "lang"), "en");
  assert.equal(await text(page, "#settingsTitle"), "Settings");
  await page.click('[data-theme-pref="light"]');
  assert.equal(await page.getAttribute("html", "data-theme"), "light");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#settings[open]").count(), 0);
  await page.context().close();
});

test("colour discipline: only the = key uses the accent", async () => {
  const page = await open();
  const accented = await page.evaluate(() => {
    const accent = getComputedStyle(document.querySelector('#pad [data-k="EQ"]')).backgroundColor;
    return [...document.querySelectorAll("button")]
      .filter((b) => b.offsetParent && getComputedStyle(b).backgroundColor === accent)
      .map((b) => b.dataset.k || b.id);
  });
  assert.deepEqual(accented, ["EQ"]);
  await page.context().close();
});

for (const scheme of ["dark", "light"]) {
  test(`accessibility: no serious axe violations (${scheme})`, async () => {
    const page = await open({ scheme });
    for (const inspect of [false, true]) {
      if (inspect) await page.click("#fold");
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const serious = res.violations.filter((v) => ["serious", "critical"].includes(v.impact));
      assert.deepEqual(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`), [], `${scheme}/inspect=${inspect}`);
    }
    await page.context().close();
  });
}

/* ---------------- review fixes ---------------- */
test("Enter activates a focused button; after mouse clicks Enter means =", async () => {
  const page = await open({ locale: "en-US" });
  await page.click('#baseSeg [data-mode="DEC"]');
  await tap(page, ["5", "ADD", "3"]);            /* mouse clicks must not leave focus on a key */
  await page.keyboard.press("Enter");
  assert.equal(await text(page, "#mainVal"), "8");
  await page.focus('#baseSeg [data-mode="DEC"]');   /* arrow-key users land on a tab… */
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.type("2*3");
  await page.keyboard.press("Enter");                  /* …and Enter still means = */
  assert.equal(await text(page, "#mainVal"), "6");
  await tap(page, ["AC", "5", "ADD", "3", "EQ"]);
  await page.focus("#settingsBtn");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#settings[open]").count(), 1, "Enter opened the focused button");
  await page.keyboard.press("Escape");
  assert.equal(await text(page, "#mainVal"), "8", "the value was not touched");
  await page.context().close();
});

test("layout: every key reachable and all conversions visible at small sizes", async () => {
  for (const [width, height] of [[360, 640], [320, 568], [393, 480], [852, 393]]) {
    const page = await open({ width, height, locale: "en-US" });
    await tap(page, ["C", "A", "F", "E"]);
    const g = await page.evaluate(() => {
      const card = document.getElementById("screen").getBoundingClientRect();
      const rows = [...document.querySelectorAll(".conv__row")].every((r) => r.getBoundingClientRect().bottom <= card.bottom + 1);
      const keyH = Math.min(...[...document.querySelectorAll("#pad .k")].map((k) => k.getBoundingClientRect().height));
      return { rows, keyH };
    });
    assert.ok(g.rows, `${width}x${height}: a conversion row is hidden`);
    assert.ok(g.keyH >= 36, `${width}x${height}: keys too small (${g.keyH}px)`);
    await page.click('#pad [data-k="ADD"]');       /* Playwright scrolls into view if needed; fails if unreachable */
    await page.context().close();
  }
});

test("long binary values wrap between 4-bit groups and are never clipped", async () => {
  const page = await open();
  await page.click('#bitsSeg [data-bits="128"]');
  await page.click('#baseSeg [data-mode="BIN"]');
  await page.waitForFunction(() => window.BITWISE.S.mode === "BIN");
  await tap(page, ["NOT"]);
  const r = await page.evaluate(() => {
    const el = document.getElementById("mainVal");
    const node = el.firstChild, s = node.textContent, range = document.createRange();
    const breaks = [];
    let top = null;
    for (let i = 0; i < s.length; i++) {
      range.setStart(node, i); range.setEnd(node, i + 1);
      const t = Math.round(range.getBoundingClientRect().top);
      if (top !== null && t > top + 2 && s[i] !== " ") breaks.push(s[i - 1]);
      top = t;
    }
    return { clipped: el.scrollHeight > el.clientHeight + 1, breaks };
  });
  assert.equal(r.clipped, false);
  assert.ok(r.breaks.length >= 1, "value spans several lines");
  assert.ok(r.breaks.every((c) => c === " "), "every line starts after a group separator");
  await page.context().close();
});

test("copy reports failure honestly", async () => {
  const page = await open({ locale: "en-US" });
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) } });
    document.execCommand = () => false;
  });
  await tap(page, ["F"]);
  await page.click("#mainVal");
  await page.waitForFunction(() => document.getElementById("toast").textContent.includes("Couldn't copy"));
  await page.context().close();
});

test("service worker: survives a broken deploy and leaves other apps' caches alone", async (t) => {
  let broken = false;
  const srv = await serve(0, {
    override: (path) => (broken && (path === "/" || path === "/index.html")
      ? { body: "<!doctype html><title>README</title><h1>Not the app</h1>" } : null),
  });
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  t.after(async () => { await ctx.close(); srv.close(); });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.evaluate(() => caches.open("other-app-v1").then((c) => c.put("/x", new Response("keep me"))));
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);

  broken = true;                                   /* the site now serves a README instead of the app */
  await page.reload();
  await page.waitForFunction(() => !!window.BITWISE, null, { timeout: 5000 });
  assert.ok(await page.locator("#pad").isVisible(), "cached app shown instead of the broken page");
  assert.ok((await page.evaluate(() => caches.keys())).includes("other-app-v1"), "foreign cache kept");

  await ctx.setOffline(true);                       /* the old bitwise-kalkulator.html address works offline */
  await page.goto(url + "bitwise-kalkulator.html");
  await page.waitForFunction(() => !!window.BITWISE, null, { timeout: 5000 });
});

test("the value keeps its size on fractional device pixel ratios", async () => {
  for (const dpr of [1.75, 2.625, 2.75]) {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(base);
    await page.waitForFunction(() => window.BITWISE);
    await page.click('#pad [data-k="F"]');
    const inline = await page.evaluate(() => document.getElementById("mainVal").style.fontSize);
    assert.equal(inline, "", `dpr ${dpr}: a single digit was shrunk to ${inline}`);
    await ctx.close();
  }
});
