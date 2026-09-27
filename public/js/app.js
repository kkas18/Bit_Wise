/* BitWise — UI layer. Arithmetic and key handling live in core.js, strings in i18n.js. */
import {
  MODES, WORD_SIZES, mask, fmt, literal, popcount, msbIndex, extract,
  f32parts, f64parts, fmtFloat, insights, group,
  createState, pressKey, swapOperands, undoClear, setBit, setWordSize,
} from "./core.js?v=__BUILD__";
import { t, hint, setLang, lang, detectLang, DICT } from "./i18n.js?v=__BUILD__";

const VERSION = "16";
const BUILD = "__BUILD__";

/* ================= utilities ================= */
const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

const prefs = {
  theme: store.get("bw.theme") || "auto",
  lang: store.get("bw.lang") || "auto",
  haptics: store.get("bw.haptics") !== "0",
};

const haptic = (ms) => {
  if (!prefs.haptics) return;
  try { navigator.vibrate && navigator.vibrate(ms); } catch { /* unsupported */ }
};

/* shrink the value until it fits its (em-based) max-height */
function fitText(el) {
  el.classList.remove("sz-m", "sz-s", "sz-xs");
  el.style.fontSize = "";
  const n = el.textContent.length;
  if (n > 90) el.classList.add("sz-xs");
  else if (n > 24) el.classList.add("sz-s");
  else if (n > 13) el.classList.add("sz-m");
  if (!el.clientHeight) return;
  /* overflowing means a hidden line, not the 1–2px of rounding that fractional
     device pixel ratios (2.625, 2.75 …) produce between scroll and client height */
  const overflows = () => el.scrollHeight - el.clientHeight > 0.5 * (parseFloat(getComputedStyle(el).lineHeight) || 16);
  let px = parseFloat(getComputedStyle(el).fontSize) || 24;
  let guard = 40;
  while (overflows() && px > 11 && guard-- > 0) {
    px -= 1.5;
    el.style.fontSize = px + "px";
  }
}

/* segmented control: indicator position + ARIA state (roving tabindex) */
function setSeg(seg, predicate) {
  const btns = [...seg.querySelectorAll(".seg__btn, .tabs__btn")];
  seg.style.setProperty("--n", btns.length);
  btns.forEach((b, i) => {
    const on = predicate(b);
    if (on) seg.style.setProperty("--i", i);
    const role = b.getAttribute("role");
    b.setAttribute(role === "radio" ? "aria-checked" : "aria-selected", on ? "true" : "false");
    b.tabIndex = on ? 0 : -1;
  });
}

/* ================= toast / copy ================= */
let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1600);
}
let lastCopy = "";
function legacyCopy(s) {
  const ta = document.createElement("textarea");
  ta.value = s;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  ta.remove();
  return ok;
}
async function copyText(s) {
  lastCopy = s;
  let ok = false;
  try { await navigator.clipboard.writeText(s); ok = true; } catch { ok = legacyCopy(s); }
  toast(t(ok ? "toast.copied" : "toast.copyFail", { v: s }));
  haptic(ok ? 8 : 30);
}

/* ================= back-button aware layers =================
   Sheets and the inspector push a history entry so Android's back
   gesture closes them instead of leaving the app. */
const layers = [];
function pushLayer(id, close) {
  layers.push({ id, close });
  try { history.pushState({ bwLayer: id }, ""); } catch { /* sandboxed */ }
}
function dropLayer(id) {
  const top = layers[layers.length - 1];
  if (top && top.id === id) history.back();
}
window.addEventListener("popstate", () => {
  const top = layers.pop();
  if (top) top.close();
});

/* ================= state ================= */
const S = createState({
  mode: MODES.includes(store.get("bw.base")) ? store.get("bw.base") : "HEX",
  bits: WORD_SIZES.includes(Number(store.get("bw.bits"))) ? Number(store.get("bw.bits")) : 64,
  signed: store.get("bw.signed") === "1",
});
const UI = { view: "bits", endian: "BE", field: { active: false, a: null, b: null }, inspecting: false, flash: null };
const OP_SYM = { AND: "AND", OR: "OR", XOR: "XOR", ADD: "+", SUB: "−", MUL: "×", DIV: "÷", MOD: "MOD", SHL: "<<", SHR: ">>" };

/* ================= theme + language ================= */
const mqLight = window.matchMedia ? matchMedia("(prefers-color-scheme: light)") : null;
function applyTheme() {
  const light = prefs.theme === "light" || (prefs.theme === "auto" && mqLight && mqLight.matches);
  root.dataset.theme = light ? "light" : "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = light ? "#F3F3F4" : "#0B0B0C";
  setSeg($("themeSeg"), (b) => b.dataset.themePref === prefs.theme);
}
mqLight && mqLight.addEventListener && mqLight.addEventListener("change", () => prefs.theme === "auto" && applyTheme());

function applyLang() {
  setLang(detectLang(prefs.lang));
  root.lang = lang();
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  $("aboutLine").textContent = t("settings.about", { ver: VERSION, build: BUILD.startsWith("__") ? "dev" : BUILD });
  $("helpBody").innerHTML = t("help.sections").map(([h, items]) =>
    `<section><h3>${esc(h)}</h3><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></section>`).join("");
  setSeg($("langSeg"), (b) => b.dataset.langPref === prefs.lang);
  padMode = null;
  render();
}

/* ================= keypad ================= */
const BS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5h10.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9L3.5 12z"/><path d="M12.5 9.5l5 5m0-5l-5 5"/></svg>';
const KEY = {
  AC: ["AC", "fn"], BS: [BS_SVG, "fn"], AND: ["AND", "fn"], OR: ["OR", "fn"], XOR: ["XOR", "fn"],
  NOT: ["NOT", "fn"], SHL: ["&lt;&lt;", "fn"], SHR: ["&gt;&gt;", "fn"], ROL: ["ROL", "fn"], ROR: ["ROR", "fn"],
  MOD: ["MOD", "fn"], NEG: ["±", "fn"], CE: ["CE", "fn"], SWP: ["⇄", "fn"],
  DIV: ["÷", "op"], MUL: ["×", "op"], SUB: ["−", "op"], ADD: ["+", "op"], EQ: ["=", "eq"],
};
const LAYOUTS = {
  HEX: { cols: 6, keys: ["AC", "BS", "AND", "OR", "XOR", "NOT",
    "MOD", "NEG", "SHL", "SHR", "ROL", "ROR",
    "A", "B", "7", "8", "9", "DIV",
    "C", "D", "4", "5", "6", "MUL",
    "E", "F", "1", "2", "3", "SUB",
    "0*2", "00", "EQ*2", "ADD"] },
  DEC: { cols: 5, keys: ["AC", "BS", "AND", "OR", "XOR",
    "NOT", "SHL", "SHR", "ROL", "ROR",
    "MOD", "7", "8", "9", "DIV",
    "NEG", "4", "5", "6", "MUL",
    "00", "1", "2", "3", "SUB",
    "0*2", "EQ*2", "ADD"] },
  OCT: { cols: 6, keys: ["AC", "BS", "AND", "OR", "XOR", "NOT",
    "SHL", "SHR", "ROL", "ROR", "MOD", "NEG",
    "4", "5", "6", "7", "DIV", "MUL",
    "0", "1", "2", "3", "SUB", "ADD",
    "CE", "SWP", "00*2", "EQ*2"] },
  BIN: { cols: 4, keys: ["AC", "BS", "AND", "OR",
    "XOR", "NOT", "SHL", "SHR",
    "ROL", "ROR", "MOD", "NEG",
    "0", "1", "DIV", "MUL",
    "00", "SUB", "ADD", "EQ"] },
};
let padMode = null;
function renderPad() {
  if (padMode === S.mode) return;
  padMode = S.mode;
  const L = LAYOUTS[S.mode];
  const pad = $("pad");
  pad.style.setProperty("--cols", L.cols);
  const slots = L.keys.reduce((n, spec) => n + Number(spec.split("*")[1] || 1), 0);
  root.dataset.rows = String(Math.ceil(slots / L.cols));
  pad.innerHTML = L.keys.map((spec) => {
    const [k, span] = spec.split("*");
    const def = KEY[k];
    const cls = def ? " k--" + def[1] : "";
    const aria = DICT.en["k." + k] ? ` aria-label="${esc(t("k." + k))}"` : "";
    const style = span ? ` style="grid-column:span ${span}"` : "";
    return `<button class="k${cls}" data-k="${k}"${aria}${style}>${def ? def[0] : k}</button>`;
  }).join("");
}

/* ================= rendering ================= */
function renderDisplay() {
  const mv = $("mainVal");
  mv.classList.toggle("is-error", S.err);
  mv.textContent = S.err ? t("err.div0") : fmt(S.cur, S.mode, S.bits, S.signed);
  if (!S.err) fitText(mv); else { mv.classList.remove("sz-m", "sz-s", "sz-xs"); mv.style.fontSize = ""; }

  const pend = $("pending");
  if (S.acc !== null && S.op && !S.err) {
    pend.hidden = false;
    pend.innerHTML = `${esc(fmt(S.acc, S.mode, S.bits, S.signed))} <b>${esc(OP_SYM[S.op])}</b> <span class="swap" aria-hidden="true">⇄</span>`;
  } else pend.hidden = true;

  $("conv").innerHTML = MODES.filter((m) => m !== S.mode).map((m) => {
    const txt = S.err ? "—" : fmt(S.cur, m, S.bits, S.signed);
    return `<button class="conv__row" data-mode="${m}"><span class="conv__lbl">${m}</span><span class="conv__val${txt.length > 30 ? " long" : ""}">${esc(txt)}</span></button>`;
  }).join("");

  /* insights describe a settled value; hide them while an operation is pending */
  $("insight").innerHTML = S.err || S.op ? "" : insights(S.cur, S.mode, S.bits, S.signed).map((i) => {
    const text = t("ins." + i.kind, { v: i.value });
    return `<button class="pill" data-copy="${esc(i.copy || text)}">${i.swatch ? `<span class="pill__swatch" style="background:${esc(i.swatch)}"></span>` : ""}${esc(text)}</button>`;
  }).join("");
}

function fieldRange() {
  const f = UI.field;
  if (f.a === null) return null;
  const b = f.b === null ? f.a : f.b;
  return { hi: Math.max(f.a, b), lo: Math.min(f.a, b) };
}

let lastView = null;
function renderInspector() {
  $("fieldBtn").hidden = UI.view !== "bits";
  $("fieldBtn").setAttribute("aria-pressed", String(UI.field.active));
  $("endBtn").hidden = UI.view !== "bytes";
  $("copyBtn").hidden = UI.view !== "bytes";
  $("endBtn").textContent = UI.endian;
  setSeg($("viewSeg"), (b) => b.dataset.view === UI.view);
  const fold = $("fold");
  fold.setAttribute("aria-expanded", String(UI.inspecting));
  $("inspect").hidden = !UI.inspecting;
  fold.setAttribute("aria-label", t(UI.inspecting ? "a.collapse" : "a.expand"));
  if (!UI.inspecting) return;

  const body = $("inspectBody");
  if (lastView !== UI.view) {
    lastView = UI.view;
    body.style.animation = "none"; void body.offsetWidth; body.style.animation = "";
  }
  const v = mask(S.cur, S.bits);

  if (UI.view === "bits") {
    const pc = popcount(v), mi = msbIndex(v);
    let html = `<div class="statline"><span>${esc(t("stat.set"))}<b>${pc}</b></span><span>${esc(t("stat.msb"))}<b>${mi < 0 ? "—" : mi}</b></span><span>${esc(t("stat.lz"))}<b>${mi < 0 ? S.bits : S.bits - 1 - mi}</b></span></div>`;
    const r = fieldRange();
    if (UI.field.active && r) {
      const fv = extract(v, r.hi, r.lo);
      html += `<div class="fieldline"><span>[${r.hi}:${r.lo}]</span><span class="dim">w=${r.hi - r.lo + 1}</span><span>0x${fv.toString(16).toUpperCase()}</span><span>${fv.toString(10)}</span>${UI.field.b === null ? `<span class="dim">${esc(t("field.pickEnd"))}</span>` : ""}</div>`;
    } else if (UI.field.active) {
      html += `<div class="fieldline"><span class="dim">${esc(t("field.pickFirst"))}</span></div>`;
    }
    html += '<div role="group">';
    for (let byte = S.bits / 8 - 1; byte >= 0; byte--) {
      const hi = byte * 8 + 7, lo = byte * 8;
      const bv = Number((v >> BigInt(lo)) & 0xFFn);
      let cells = "";
      for (let i = hi; i >= lo; i--) {
        if (i === lo + 3) cells += "<span></span>";
        const on = ((v >> BigInt(i)) & 1n) === 1n;
        const insel = UI.field.active && r && UI.field.b !== null && i >= r.lo && i <= r.hi;
        cells += `<button class="bit${on ? " on" : ""}${insel ? " insel" : ""}${UI.flash === i ? " flash" : ""}" data-bit="${i}" aria-pressed="${on}" aria-label="${esc(t("a.bit", { i, v: on ? 1 : 0 }))}">${on ? 1 : 0}</button>`;
      }
      html += `<div class="bitrow"><span class="bitrow__idx">${hi}:${lo}</span><div class="bitrow__bits">${cells}</div><span class="bitrow__hex${bv ? " nz" : ""}">${bv.toString(16).toUpperCase().padStart(2, "0")}</span></div>`;
    }
    body.innerHTML = html + "</div>";
  } else if (UI.view === "float") {
    if (S.bits < 32) { body.innerHTML = `<div class="statline"><span>${esc(t("float.needs32"))}</span></div>`; return; }
    const one = (p, name, width) => {
      const eb = p.e.toString(2).padStart(p.ebits, "0");
      const unb = p.cls === "normal" ? ` = 2^${p.e - p.bias}` : "";
      let strip = "";
      for (let i = width - 1; i >= 0; i--) {
        const on = ((v >> BigInt(i)) & 1n) === 1n ? " on" : "";
        const c = i === width - 1 ? "fs" : (i >= p.mbits ? "fe" : "fm");
        strip += `<span class="fbit ${c}${on}"></span>`;
      }
      return `<div class="frow"><span class="frow__lbl">${name}</span><span class="frow__val">${esc(fmtFloat(p.val, width))}</span><span class="frow__cls" data-c="${p.cls}">${esc(t("fcls." + p.cls))}</span></div>
        <div class="fparts">S ${p.s} · E ${eb}₂ (${p.e}${unb}) · M 0x${p.m.toString(16).toUpperCase()}</div>
        <div class="fstrip" aria-hidden="true">${strip}</div>
        <div class="fgrp" aria-hidden="true"><span style="flex:1">S</span><span style="flex:${p.ebits}">${esc(t("float.expShort"))}</span><span style="flex:${p.mbits}">${esc(t("float.mantShort"))}</span></div>`;
    };
    let html = `<div class="statline"><span><i class="fkey fs"></i>${esc(t("float.sign"))}</span><span><i class="fkey fe"></i>${esc(t("float.exp"))}</span><span><i class="fkey fm"></i>${esc(t("float.mant"))}</span></div>`;
    html += one(f32parts(v), "FLOAT32", 32);
    if (S.bits >= 64) html += one(f64parts(v), "FLOAT64", 64);
    body.innerHTML = html;
  } else {
    const nBytes = S.bits / 8;
    const order = [];
    for (let i = nBytes - 1; i >= 0; i--) order.push(i);
    if (UI.endian === "LE") order.reverse();
    const byteAt = (i) => Number((v >> BigInt(i * 8)) & 0xFFn);
    const ascii = (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "·");
    const str = order.map((i) => ascii(byteAt(i))).join("");
    let rows = `<div class="bytes-str"><span class="lbl">ASCII</span>${esc(str)}</div>`;
    rows += `<div class="byte-head"><span>${esc(t("bytes.byte"))}</span><span>HEX</span><span>DEC</span><span>ASC</span><span class="b-bin">${esc(t("bytes.bin"))}</span></div>`;
    for (const i of order) {
      const b = byteAt(i);
      const asc = esc(ascii(b));
      rows += `<div class="byte-row${b ? " nz" : ""}"><span>${i}</span><span>${b.toString(16).toUpperCase().padStart(2, "0")}</span><span>${b}</span><span>${asc}</span><span class="b-bin">${b.toString(2).padStart(8, "0").replace(/(\d{4})(\d{4})/, "$1 $2")}</span></div>`;
    }
    body.innerHTML = rows;
  }
}

function render() {
  renderPad();
  renderDisplay();
  renderInspector();
  setSeg($("baseSeg"), (b) => b.dataset.mode === S.mode);
  setSeg($("bitsSeg"), (b) => Number(b.dataset.bits) === S.bits);
  $("sgn").setAttribute("aria-pressed", String(S.signed));
  $("wordLabel").textContent = t("word", { bits: S.bits, sign: t(S.signed ? "signed.lc" : "unsigned") });
}

/* ================= actions ================= */
function press(k) {
  const res = pressKey(S, k);
  if (res === "overflow") haptic(30);
  else if (res === "error") haptic(40);
  render();
}
function swap() {
  if (swapOperands(S) === "ok") { haptic(8); render(); }
}
let modeTimer = null;
function setMode(m, dir) {
  const inner = $("dispInner");
  if (modeTimer) { /* a switch is still sliding: finish it now so keys never act on a stale base */
    clearTimeout(modeTimer); modeTimer = null;
    inner.classList.remove("slide-l", "slide-r");
    dir = null;
  }
  if (m === S.mode) { render(); return; }
  S.mode = m; /* state changes immediately; only the visual transition is delayed */
  store.set("bw.base", m);
  haptic(8);
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!dir || reduce) { render(); return; }
  syncPad();
  inner.classList.add(dir === "left" ? "slide-l" : "slide-r");
  modeTimer = setTimeout(() => {
    modeTimer = null;
    render();
    inner.classList.remove("slide-l", "slide-r");
    inner.classList.add(dir === "left" ? "slide-r" : "slide-l");
    requestAnimationFrame(() => requestAnimationFrame(() => inner.classList.remove("slide-l", "slide-r")));
  }, 130);
}
const dirTo = (m) => (MODES.indexOf(m) > MODES.indexOf(S.mode) ? "left" : "right");
/* the keypad must match the base even mid-animation */
function syncPad() { renderPad(); setSeg($("baseSeg"), (b) => b.dataset.mode === S.mode); }
function setBits(n) {
  setWordSize(S, n);
  store.set("bw.bits", String(n));
  UI.field = { active: UI.field.active, a: null, b: null };
  render();
}
function setInspect(open) {
  if (open === UI.inspecting) return;
  UI.inspecting = open;
  $("screen").classList.toggle("is-inspecting", open);
  $("pad").hidden = open;
  if (open) pushLayer("inspect", () => setInspect(false));
  else dropLayer("inspect");
  render();
}
function copyBase(mode) {
  if (!S.err) copyText(literal(S.cur, mode, S.bits, S.signed));
}

/* ================= long-press hints ================= */
const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const sup = (n) => String(n).split("").map((c) => SUP[c] || c).join("");
let hintTimer = null;
function showHintCard(title, html) {
  $("hintKey").textContent = title;
  $("hintTxt").innerHTML = html;
  $("hintcard").hidden = false;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(hideHint, 6000);
}
function hideHint() { $("hintcard").hidden = true; }

const lp = { timer: null, fired: false };
function armLongPress(target) {
  lp.fired = false;
  const b = target.closest("[data-k]");
  if (!b) return;
  const k = b.dataset.k;
  if (k !== "AC" && !hint(k)) return;
  clearTimeout(lp.timer);
  lp.timer = setTimeout(() => {
    lp.fired = true;
    if (k === "AC") {
      if (undoClear(S)) { render(); toast(t("toast.restored")); haptic(12); }
      else press("AC"); /* nothing to restore: a long press still clears */
      return;
    }
    const [title, text, ex] = hint(k);
    showHintCard(title, esc(text) + (ex ? `<div class="hintcard__ex"><span>${esc(DICT[lang()].hintTry)}</span>${esc(ex)}</div>` : ""));
    haptic(15);
  }, 450);
}
const disarm = () => { clearTimeout(lp.timer); lp.timer = null; };

/* ================= events ================= */
const pad = $("pad");
pad.addEventListener("pointerdown", (e) => { if (e.button === 0) armLongPress(e.target); });
["pointerup", "pointercancel", "pointerleave"].forEach((ev) => pad.addEventListener(ev, disarm));
pad.addEventListener("contextmenu", (e) => e.preventDefault());
pad.addEventListener("click", (e) => {
  if (lp.fired) { lp.fired = false; return; }
  const k = e.target.closest("[data-k]");
  if (!k) return;
  haptic(8);
  press(k.dataset.k);
});

$("baseSeg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-mode]");
  if (b) setMode(b.dataset.mode, dirTo(b.dataset.mode));
});
$("bitsSeg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-bits]");
  if (b) { haptic(8); setBits(Number(b.dataset.bits)); }
});
$("sgn").addEventListener("click", () => {
  S.signed = !S.signed;
  store.set("bw.signed", S.signed ? "1" : "0");
  haptic(8); render();
});
$("viewSeg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-view]");
  if (!b) return;
  UI.view = b.dataset.view; haptic(8);
  if (!UI.inspecting) setInspect(true); else render();
});
$("fieldBtn").addEventListener("click", () => {
  UI.field = { active: !UI.field.active, a: null, b: null };
  haptic(8);
  if (UI.field.active && !UI.inspecting) setInspect(true); else render();
});
$("endBtn").addEventListener("click", () => { UI.endian = UI.endian === "BE" ? "LE" : "BE"; haptic(8); render(); });
$("copyBtn").addEventListener("click", () => {
  copyText("0x" + mask(S.cur, S.bits).toString(16).toUpperCase().padStart(S.bits / 4, "0"));
});
$("fold").addEventListener("click", () => { haptic(8); setInspect(!UI.inspecting); });
$("mainVal").addEventListener("click", () => copyBase(S.mode));
$("pending").addEventListener("click", swap);
$("insight").addEventListener("click", (e) => {
  const p = e.target.closest(".pill");
  if (p) copyText(p.dataset.copy);
});

/* conversion rows: tap = switch base, long-press = copy in that base */
const convLP = { timer: null, fired: false };
$("conv").addEventListener("pointerdown", (e) => {
  convLP.fired = false;
  const r = e.target.closest(".conv__row");
  if (!r) return;
  convLP.timer = setTimeout(() => { convLP.fired = true; copyBase(r.dataset.mode); }, 450);
});
["pointerup", "pointercancel", "pointerleave"].forEach((ev) => $("conv").addEventListener(ev, () => clearTimeout(convLP.timer)));
$("conv").addEventListener("click", (e) => {
  if (convLP.fired) { convLP.fired = false; return; }
  const r = e.target.closest(".conv__row");
  if (r) setMode(r.dataset.mode, dirTo(r.dataset.mode));
});

/* bit grid: tap flips, drag paints, long-press explains the weight */
const paint = { start: null, set: false, active: false, fired: false, timer: null, hinted: false };
const bitAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest(".bit") : null; };
const body = $("inspectBody");
body.addEventListener("pointerdown", (e) => {
  paint.fired = false; paint.hinted = false;
  const b = e.target.closest(".bit");
  if (!b) return;
  paint.start = Number(b.dataset.bit);
  paint.set = !b.classList.contains("on");
  paint.active = false;
  paint.timer = setTimeout(() => {
    paint.hinted = true;
    const i = paint.start, val = 1n << BigInt(i);
    showHintCard("BIT " + i, `2${sup(i)} = <code>0x${val.toString(16).toUpperCase()}</code> = ${esc(group(val.toString(10), 3))}`);
    haptic(15);
  }, 450);
});
const endPaint = () => { clearTimeout(paint.timer); paint.start = null; };
body.addEventListener("pointermove", (e) => {
  if (paint.start === null || UI.field.active) return;
  if (e.buttons === 0) { endPaint(); return; } /* button released outside the grid */
  const b = bitAt(e.clientX, e.clientY);
  if (!b) return;
  const i = Number(b.dataset.bit);
  let changed = false;
  if (!paint.active) {
    if (i === paint.start) return;
    clearTimeout(paint.timer);
    paint.active = true; paint.fired = true; haptic(6);
    changed = setBit(S, paint.start, paint.set);
  }
  if (setBit(S, i, paint.set)) changed = true;
  if (changed) render();
});
["pointerup", "pointercancel"].forEach((ev) => window.addEventListener(ev, endPaint));
body.addEventListener("click", (e) => {
  if (paint.fired) { paint.fired = false; return; }
  if (paint.hinted) { paint.hinted = false; return; }
  const b = e.target.closest(".bit");
  if (!b) return;
  const i = Number(b.dataset.bit);
  haptic(6);
  if (UI.field.active) {
    if (UI.field.a === null || UI.field.b !== null) { UI.field.a = i; UI.field.b = null; }
    else UI.field.b = i;
    render();
    return;
  }
  setBit(S, i, !b.classList.contains("on"));
  UI.flash = i;
  render();
  UI.flash = null;
});

/* swipe the display to change base */
{
  const el = $("swipeZone");
  let x0 = 0, y0 = 0, t0 = 0, swiped = false;
  el.addEventListener("touchstart", (e) => { const p = e.touches[0]; x0 = p.clientX; y0 = p.clientY; t0 = Date.now(); swiped = false; }, { passive: true });
  el.addEventListener("touchend", (e) => {
    const p = e.changedTouches[0], dx = p.clientX - x0, dy = p.clientY - y0;
    if (Date.now() - t0 > 600 || Math.abs(dx) < 48 || Math.abs(dy) > Math.abs(dx) * 0.7) return;
    swiped = true;
    const i = MODES.indexOf(S.mode);
    const dir = dx < 0 ? "left" : "right";
    setMode(MODES[dir === "left" ? (i + 1) % 4 : (i + 3) % 4], dir);
  }, { passive: true });
  el.addEventListener("click", (e) => { if (swiped) { e.stopPropagation(); e.preventDefault(); swiped = false; } }, true);
}

/* segmented controls and tabs: arrow keys move the selection */
document.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const btn = e.target.closest && e.target.closest(".seg__btn, .tabs__btn");
  if (!btn) return;
  const all = [...btn.parentElement.querySelectorAll(".seg__btn, .tabs__btn")];
  const next = all[(all.indexOf(btn) + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
  e.preventDefault();
  e.stopPropagation();
  next.focus();
  next.click();
}, true);

document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".hintcard")) hideHint(); }, true);

/* a mouse click must not leave focus on a key, or Enter would repeat that key instead of "=" */
document.addEventListener("mousedown", (e) => {
  if (e.target.closest(".app button")) e.preventDefault();
});

/* hardware keyboard */
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector("dialog[open]")) return;
  /* Enter / Space on a focused control activate that control, as everywhere else —
     except Enter on a tab or segment, which already selected itself with the arrow keys */
  const ctl = e.target !== document.body && e.target.closest("button, a, input, select, textarea, [tabindex]");
  if ((e.key === "Enter" || e.key === " ") && ctl && !(e.key === "Enter" && ctl.matches(".tabs__btn, .seg__btn"))) return;
  const map = { "+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV", "%": "MOD", Enter: "EQ", "=": "EQ",
    Backspace: "BS", Escape: "AC", Delete: "AC", "~": "NOT", "&": "AND", "|": "OR", "^": "XOR" };
  const k = e.key;
  if (/^[0-9]$/.test(k) || (/^[a-fA-F]$/.test(k) && S.mode === "HEX")) { e.preventDefault(); press(k.toUpperCase()); }
  else if (map[k]) { e.preventDefault(); press(map[k]); }
});

/* ================= sheets ================= */
function openSheet(id) {
  const dlg = $(id);
  if (dlg.open) return;
  document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  dlg.showModal();
  dlg.scrollTop = 0;
  pushLayer(id, () => dlg.open && dlg.close());
  haptic(8);
}
document.querySelectorAll("dialog.sheet").forEach((dlg) => {
  dlg.addEventListener("close", () => dropLayer(dlg.id));
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) {
      const r = dlg.getBoundingClientRect();
      if (e.clientY < r.top || e.clientX < r.left || e.clientX > r.right) dlg.close();
    }
    if (e.target.closest("[data-close]")) dlg.close();
  });
});
$("settingsBtn").addEventListener("click", () => openSheet("settings"));
$("helpBtn").addEventListener("click", () => openSheet("help"));
$("openGuide").addEventListener("click", () => { $("settings").close(); setTimeout(() => openSheet("help"), 150); });
$("themeSeg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-theme-pref]");
  if (!b) return;
  prefs.theme = b.dataset.themePref; store.set("bw.theme", prefs.theme);
  applyTheme(); haptic(8);
});
$("langSeg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lang-pref]");
  if (!b) return;
  prefs.lang = b.dataset.langPref; store.set("bw.lang", prefs.lang);
  applyLang(); haptic(8);
});
$("hapticsToggle").checked = prefs.haptics;
$("hapticsToggle").addEventListener("change", (e) => {
  prefs.haptics = e.target.checked; store.set("bw.haptics", prefs.haptics ? "1" : "0");
  haptic(10);
});

/* ================= install (PWA) ================= */
let installEvt = null;
const isStandalone = () => {
  try {
    return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true ||
      document.referrer.startsWith("android-app://");
  } catch { return false; }
};
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvt = e;
  $("installBtn").hidden = false;
});
if (!isStandalone() && /iphone|ipad|ipod/i.test(navigator.userAgent)) $("installBtn").hidden = false;
$("installBtn").addEventListener("click", async () => {
  haptic(10);
  if (installEvt) {
    installEvt.prompt();
    try {
      const c = await installEvt.userChoice;
      if (c && c.outcome === "accepted") toast(t("toast.installing"));
    } catch { /* dismissed */ }
    installEvt = null;
    $("installBtn").hidden = true;
    return;
  }
  const key = location.protocol === "file:" ? "install.local" : /iphone|ipad|ipod/i.test(navigator.userAgent) ? "install.ios" : "install.other";
  showHintCard(t("install.title"), esc(t(key)));
});
window.addEventListener("appinstalled", () => {
  toast(t("toast.installed"));
  installEvt = null;
  $("installBtn").hidden = true;
});

/* ================= offline + updates ================= */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  /* reload only when the user accepted an update — the first install also
     fires controllerchange (clients.claim) and must not wipe what they typed */
  let updateAccepted = false, refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!updateAccepted || refreshing) return;
    refreshing = true;
    location.reload();
  });
  /* announce offline support only once a worker has actually installed and activated */
  navigator.serviceWorker.ready.then(() => {
    if (!store.get("bw.sw")) { store.set("bw.sw", "1"); toast(t("toast.offline")); }
  });
  navigator.serviceWorker.register("./sw.js").then((reg) => {
    const offer = (w) => {
      if (!navigator.serviceWorker.controller) return;
      $("updateBar").hidden = false;
      $("updateBtn").onclick = () => { updateAccepted = true; $("updateBar").hidden = true; w.postMessage("SKIP_WAITING"); };
    };
    if (reg.waiting) offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      if (w) w.addEventListener("statechange", () => { if (w.state === "installed") offer(w); });
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") reg.update().catch(() => {});
    });
  }).catch(() => {});
}

/* ================= init ================= */
applyTheme();
applyLang();
window.addEventListener("resize", renderDisplay);
/* re-fit the value once the real fonts have replaced the fallback */
if (document.fonts) document.fonts.ready.then(renderDisplay);

/* test surface (used by the Playwright checks; harmless in production) */
window.BITWISE = {
  S, UI, press, setMode, setBits, setInspect,
  lastCopy: () => lastCopy,
  applyLang: (l) => { prefs.lang = l; applyLang(); },
  applyTheme: (th) => { prefs.theme = th; applyTheme(); },
};
