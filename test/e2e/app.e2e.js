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
const tap = async (page, scope, keys) => { for (const k of keys) await page.click(`${scope} [data-k="${k}"]`); };
const text = (page, sel) => page.locator(sel).innerText();

test("standard: precedence, live preview, result and history (nb)", async () => {
  const page = await open();
  assert.equal(await page.getAttribute("html", "lang"), "nb");
  await tap(page, "#sPad", ["2", "ADD", "3", "MUL", "4"]);
  assert.equal(await text(page, "#sExpr"), "2 + 3 × 4");
  assert.equal(await text(page, "#sResult"), "14");
  await tap(page, "#sPad", ["EQ"]);
  assert.equal(await text(page, "#sResult"), "14");
  assert.equal(await page.locator(".tape__row").count(), 1);
  await tap(page, "#sPad", ["1", "DIV", "4", "EQ"]);
  assert.equal(await text(page, "#sResult"), "0,25", "Norwegian decimal comma");
  await tap(page, "#sPad", ["1", "DIV", "0", "EQ"]);
  assert.equal(await text(page, "#sResult"), "Kan ikke dele på 0");
  await tap(page, "#sPad", ["AC"]);
  assert.equal(await text(page, "#sResult"), "0");
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test("scientific drawer, 2nd functions and English locale", async () => {
  const page = await open({ locale: "en-US", scheme: "light" });
  assert.equal(await page.getAttribute("html", "data-theme"), "light");
  await page.click("#sciToggle");
  await tap(page, "#sciGrid", ["SECOND", "SIN"]);
  await tap(page, "#sPad", ["1"]);
  await tap(page, "#sciGrid", ["RP"]);
  await tap(page, "#sPad", ["EQ"]);
  assert.equal(await text(page, "#sResult"), "90");
  await tap(page, "#sPad", ["2", "0", "0", "0"]);
  assert.equal(await text(page, "#sExpr"), "2,000", "English grouping");
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test("programmer: bases, insights, bit inspector", async () => {
  const page = await open();
  await page.click('[data-app="PRG"]');
  await tap(page, "#pad", ["F", "F"]);
  assert.equal(await text(page, "#mainVal"), "FF");
  assert.match(await text(page, '.conv__row[data-mode="DEC"]'), /255/);
  await page.click('.conv__row[data-mode="BIN"]');
  await page.waitForFunction(() => window.BITWISE.S.mode === "BIN");
  assert.equal(await page.getAttribute("html", "data-accent"), "bin");
  await page.click("#fold");
  assert.equal(await page.locator(".bit.on").count(), 8);
  await page.click('.bit[data-bit="8"]');
  assert.equal(await page.evaluate(() => window.BITWISE.S.cur.toString(16)), "1ff");
  /* Android back closes the inspector instead of leaving the app */
  await page.goBack();
  await page.waitForFunction(() => !window.BITWISE.S.inspecting);
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test("undo, memory, keyboard and v13 history migration", async () => {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, locale: "nb-NO", reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("bw.hist", JSON.stringify([{ e: "1 000 × 2", r: "2 000" }]));
    }
  });
  const page = await ctx.newPage();
  await page.goto(base);
  await page.waitForFunction(() => window.BITWISE);
  const rows = (await page.locator(".tape__row").allInnerTexts()).map((r) => r.replace(/[\u202F\u00A0]/g, " "));
  assert.deepEqual(rows, ["1 000 × 2\n2 000"], "v13 entries survive the upgrade");

  await page.keyboard.type("(2+3)*4^2");
  assert.equal(await text(page, "#sExpr"), "(2 + 3) × 4 ^ 2");
  await page.keyboard.press("Enter");
  assert.equal(await text(page, "#sResult"), "80");

  await page.click("#sciToggle");
  await tap(page, "#sciGrid", ["MPLUS"]);
  assert.ok(await page.locator("#memBadge").isVisible());
  await tap(page, "#sPad", ["AC"]);
  await tap(page, "#sciGrid", ["MR"]);
  assert.equal(await text(page, "#sExpr"), "80");

  /* long-press AC brings a cleared expression back */
  await tap(page, "#sPad", ["AC", "7", "MUL", "6", "AC"]);
  const ac = await page.locator('#sPad [data-k="AC"]').boundingBox();
  await page.mouse.move(ac.x + 10, ac.y + 10);
  await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
  assert.equal(await text(page, "#sExpr"), "7 × 6");

  /* segmented controls are keyboard operable */
  await page.focus('#appSeg [data-app="STD"]');
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => window.BITWISE.APP.mode === "PRG");
  await ctx.close();
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

for (const scheme of ["dark", "light"]) {
  test(`accessibility: no serious axe violations (${scheme})`, async () => {
    const page = await open({ scheme });
    for (const app of ["STD", "PRG"]) {
      await page.click(`[data-app="${app}"]`);
      await page.waitForTimeout(250);
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const serious = res.violations.filter((v) => ["serious", "critical"].includes(v.impact));
      assert.deepEqual(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`), [], `${app}/${scheme}`);
    }
    await page.context().close();
  });
}
