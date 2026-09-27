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
