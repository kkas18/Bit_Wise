/* BitWise — UI layer. Pure maths lives in core.js, strings in i18n.js. */
import {
  MODES, BASE, WORD_SIZES, mask, toSigned, fmt, literal, applyOp, opNOT, opNEG, rol, ror,
  popcount, msbIndex, extract, f32parts, f64parts, fmtFloat, insights, group,
  evaluate, edit, tidy, numToken, parseNum, hasOperation, repeatTail,
  formatNumberString, formatResult, renderTokens,
} from "./core.js";
import { t, hint, setLang, lang, loc, detectLang, DICT } from "./i18n.js";

const VERSION = "14";
const BUILD = "__BUILD__";
const HIST_MAX = 40;

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

/* shrink a display line until it fits its (em-based) max-height */
function fitText(el) {
  el.classList.remove("sz-m", "sz-s", "sz-xs");
  el.style.fontSize = "";
  const n = el.textContent.length;
  if (el.dataset.fit === "mono" && n > 90) el.classList.add("sz-xs");
  else if (n > 24) el.classList.add("sz-s");
  else if (n > 13) el.classList.add("sz-m");
  if (!el.clientHeight) return;
  let px = parseFloat(getComputedStyle(el).fontSize) || 24;
  let guard = 40;
  while (el.scrollHeight > el.clientHeight + 1 && px > 12 && guard-- > 0) {
    px -= 1.5;
    el.style.fontSize = px + "px";
  }
}

/* segmented control: position indicator + ARIA state */
function setSeg(seg, predicate) {
  const btns = [...seg.querySelectorAll(".seg__btn")];
  seg.style.setProperty("--n", btns.length);
  btns.forEach((b, i) => {
    const on = predicate(b);
    if (on) seg.style.setProperty("--i", i);
    const role = b.getAttribute("role");
    b.setAttribute(role === "radio" ? "aria-checked" : "aria-selected", on ? "true" : "false");
    if (role === "tab" || role === "radio") b.tabIndex = on ? 0 : -1;
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
function copyText(s) {
  lastCopy = s;
  try { navigator.clipboard && navigator.clipboard.writeText(s).catch(() => {}); } catch { /* denied */ }
  toast(t("toast.copied", { v: s }));
  haptic(8);
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

/* ================= theme + language ================= */
const mqLight = window.matchMedia ? matchMedia("(prefers-color-scheme: light)") : null;
function applyTheme() {
  const light = prefs.theme === "light" || (prefs.theme === "auto" && mqLight && mqLight.matches);
  root.dataset.theme = light ? "light" : "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = light ? "#F1F2F5" : "#0B0D11";
  setSeg($("themeSeg"), (b) => b.dataset.themePref === prefs.theme);
}
mqLight && mqLight.addEventListener && mqLight.addEventListener("change", () => prefs.theme === "auto" && applyTheme());

function applyLang() {
  setLang(detectLang(prefs.lang));
  root.lang = lang();
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  $("dotKey").textContent = loc().decimal;
  $("aboutLine").textContent = t("settings.about", { ver: VERSION, build: BUILD.startsWith("__") ? "dev" : BUILD });
  $("helpBody").innerHTML = t("help.sections").map(([h, items]) =>
    `<section><h3>${esc(h)}</h3><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></section>`).join("");
  setSeg($("langSeg"), (b) => b.dataset.langPref === prefs.lang);
  syncSciLabel();
  padMode = null;
  renderAll();
}

/* ================= app switch ================= */
const APP = { mode: store.get("bw.app") === "PRG" ? "PRG" : "STD" };
function setAccent() {
  root.dataset.accent = APP.mode === "STD" ? "std" : S.mode.toLowerCase();
}
function applyApp() {
  $("viewSTD").hidden = APP.mode !== "STD";
  $("viewPRG").hidden = APP.mode !== "PRG";
  setSeg($("appSeg"), (b) => b.dataset.app === APP.mode);
  setAccent();
  renderAll();
  store.set("bw.app", APP.mode);
}
function setApp(m, animate = true) {
  if (m === APP.mode) return;
  haptic(10);
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!animate || reduce) { APP.mode = m; applyApp(); return; }
  const dir = m === "PRG" ? "l" : "r";
  const out = $(APP.mode === "PRG" ? "viewPRG" : "viewSTD");
  out.classList.add("slide-" + dir);
  setTimeout(() => {
    out.classList.remove("slide-l", "slide-r");
    APP.mode = m;
    applyApp();
    const inn = $(m === "PRG" ? "viewPRG" : "viewSTD");
    inn.classList.add(dir === "l" ? "slide-r" : "slide-l");
    requestAnimationFrame(() => requestAnimationFrame(() => inn.classList.remove("slide-l", "slide-r")));
  }, 150);
}
function renderAll() {
  if (APP.mode === "STD") { renderStd(); renderTape(); } else render();
}

/* =====================================================================
   STANDARD / SCIENTIFIC
   ===================================================================== */
const SD = {
  tokens: [], fresh: false,
  deg: store.get("bw.deg") !== "rad",
  second: false,
  mem: parseFloat(store.get("bw.mem")) || 0,
  hist: [],
  err: null,          /* error code while an error is shown */
  lastTokens: null,   /* the expression that produced the current result */
  rep: null,          /* trailing [op, num] for = = = */
  undo: null,
};

function loadHistory() {
  try {
    const raw = JSON.parse(store.get("bw.hist") || "[]");
    SD.hist = raw.slice(-HIST_MAX).map((h) => {
      if (h && Array.isArray(h.t)) return h;
      /* v13 entries: {e: "12 + 3", r: "15"} */
      const r = parseFloat(String(h.r || "0").replace(/[\s ]/g, "").replace("−", "-"));
      return { e: String(h.e || ""), r: numToken(isFinite(r) ? r : 0) };
    });
  } catch { SD.hist = []; }
}
const saveHistory = () => store.set("bw.hist", JSON.stringify(SD.hist));

function currentValue() {
  if (SD.err) return null;
  try { return tidy(evaluate(SD.tokens, { deg: SD.deg })); } catch { return null; }
}

function renderStd() {
  const L = loc();
  const ro = document.querySelector(".readout");
  const ex = $("sExpr"), rs = $("sResult");
  ro.classList.remove("is-typing", "is-error");
  if (SD.err) {
    ro.classList.add("is-error");
    ex.textContent = SD.lastTokens ? renderTokens(SD.lastTokens, L) : "";
    rs.textContent = t("err." + SD.err);
    ex.style.fontSize = ""; rs.style.fontSize = "";
  } else if (SD.fresh) {
    ex.textContent = SD.lastTokens ? renderTokens(SD.lastTokens, L) + " =" : "";
    rs.textContent = formatResult(parseNum(SD.tokens[0] ? SD.tokens[0].v : "0"), L);
    ex.style.fontSize = "";
    fitText(rs);
  } else if (!SD.tokens.length) {
    ex.textContent = "";
    rs.textContent = "0";
    fitText(rs);
  } else {
    ro.classList.add("is-typing");
    ex.textContent = renderTokens(SD.tokens, L);
    let preview = "";
    if (hasOperation(SD.tokens)) {
      try { preview = formatResult(evaluate(SD.tokens, { deg: SD.deg }), L); } catch { preview = ""; }
    }
    rs.textContent = preview;
    rs.style.fontSize = "";
    fitText(ex);
  }
  $("memBadge").hidden = SD.mem === 0;
  $("angleBadge").textContent = SD.deg ? "DEG" : "RAD";
  $("angleBadge").hidden = !$("sci").classList.contains("is-open");
  const second = document.querySelector('#sciGrid [data-k="SECOND"]');
  second.setAttribute("aria-pressed", String(SD.second));
  document.querySelectorAll("#sciGrid [data-alt]").forEach((b) => {
    if (!b.dataset.main) b.dataset.main = b.textContent;
    b.textContent = SD.second ? b.dataset.alt : b.dataset.main;
  });
  document.querySelector('#sciGrid [data-k="DEG"]').textContent = SD.deg ? "DEG" : "RAD";
}

function renderTape() {
  const L = loc();
  const tape = $("tape");
  $("histClear").hidden = SD.hist.length === 0;
  if (!SD.hist.length) {
    tape.innerHTML = `<div class="tape__empty"><b>${esc(t("hist.empty"))}</b><span>${esc(t("hist.emptySub"))}</span></div>`;
    return;
  }
  tape.innerHTML = '<div class="tape__fill"></div>' + SD.hist.map((h, i) => {
    const expr = h.t ? renderTokens(h.t, L) : h.e;
    return `<button class="tape__row" data-i="${i}"><span class="tape__expr">${esc(expr)}</span><span class="tape__res">${esc(formatResult(parseNum(h.r), L))}</span></button>`;
  }).join("");
  tape.scrollTop = tape.scrollHeight;
}

function pushHistory(tokens, value) {
  SD.hist.push({ t: tokens, r: numToken(value) });
  if (SD.hist.length > HIST_MAX) SD.hist.shift();
  saveHistory();
  renderTape();
}

const STD_OP = { ADD: "+", SUB: "-", MUL: "*", DIV: "/", POW: "^" };
function stdEdit(key, arg) {
  const s = edit({ tokens: SD.tokens, fresh: SD.fresh }, key, arg);
  SD.tokens = s.tokens;
  SD.fresh = s.fresh;
}

function stdEquals() {
  if (SD.fresh) {
    if (!SD.rep) return;
    SD.tokens = [SD.tokens[0], ...SD.rep];
  }
  if (!SD.tokens.length) return;
  const tokens = SD.tokens.slice();
  if (!hasOperation(tokens)) { /* a bare number: nothing to calculate or log */
    try { SD.tokens = [{ t: "num", v: numToken(evaluate(tokens)) }]; } catch { return; }
    SD.fresh = true; SD.lastTokens = null; SD.rep = null;
    return;
  }
  try {
    const v = tidy(evaluate(tokens, { deg: SD.deg }));
    SD.rep = repeatTail(tokens);
    SD.lastTokens = tokens;
    pushHistory(tokens, v);
    SD.tokens = [{ t: "num", v: numToken(v) }];
    SD.fresh = true;
  } catch (e) {
    if (e.code === "syntax") { toast(t("err.syntax")); haptic(30); return; }
    SD.err = e.code || "domain";
    SD.lastTokens = tokens;
    haptic(40);
  }
}

function pressStd(k) {
  if (SD.err) { /* any key dismisses an error; AC/⌫/= only dismiss */
    SD.err = null;
    SD.tokens = []; SD.fresh = false;
    if (k === "AC" || k === "BS" || k === "EQ") { renderStd(); return; }
  }
  if (/^[0-9]$/.test(k)) stdEdit("digit", k);
  else switch (k) {
    case "DOT": stdEdit("dot"); break;
    case "ADD": case "SUB": case "MUL": case "DIV": case "POW": stdEdit("op", STD_OP[k]); break;
    case "PAREN": stdEdit("paren"); break;
    case "LP": stdEdit("lp"); break;
    case "RP": stdEdit("rp"); break;
    case "PCT": stdEdit("post", "%"); break;
    case "SQ": stdEdit("post", SD.second ? "cube" : "sq"); break;
    case "INV": stdEdit("post", "inv"); break;
    case "FACT": stdEdit("post", "!"); break;
    case "SQRT": stdEdit("fn", SD.second ? "cbrt" : "sqrt"); break;
    case "SIN": stdEdit("fn", SD.second ? "asin" : "sin"); break;
    case "COS": stdEdit("fn", SD.second ? "acos" : "cos"); break;
    case "TAN": stdEdit("fn", SD.second ? "atan" : "tan"); break;
    case "LN": stdEdit("fn", SD.second ? "exp" : "ln"); break;
    case "LOG": stdEdit("fn", SD.second ? "pow10" : "log"); break;
    case "PI": stdEdit("const", "pi"); break;
    case "EULER": stdEdit("const", "e"); break;
    case "EE": stdEdit("exp"); break;
    case "NEG": stdEdit("neg"); break;
    case "BS": stdEdit("back"); break;
    case "AC":
      if (SD.tokens.length) SD.undo = { tokens: SD.tokens, fresh: SD.fresh, lastTokens: SD.lastTokens };
      stdEdit("clear"); SD.lastTokens = null; SD.rep = null;
      break;
    case "EQ": stdEquals(); break;
    case "SECOND": SD.second = !SD.second; break;
    case "DEG": SD.deg = !SD.deg; store.set("bw.deg", SD.deg ? "deg" : "rad"); break;
    case "MR":
      if (SD.second) { SD.mem = 0; store.set("bw.mem", "0"); toast(t("toast.memClear")); }
      else stdEdit("insert", numToken(SD.mem));
      break;
    case "MPLUS": {
      const v = currentValue();
      if (v === null) break;
      SD.mem = tidy(SD.second ? SD.mem - v : SD.mem + v);
      store.set("bw.mem", String(SD.mem));
      if (!SD.fresh) SD.lastTokens = SD.tokens.slice();
      SD.tokens = [{ t: "num", v: numToken(v) }];
      SD.fresh = true;
      break;
    }
  }
  renderStd();
}

function undoStd() {
  if (!SD.undo) return false;
  SD.tokens = SD.undo.tokens; SD.fresh = SD.undo.fresh; SD.lastTokens = SD.undo.lastTokens;
  SD.undo = null; SD.err = null;
  renderStd();
  return true;
}

function copyStd() {
  const v = SD.fresh ? parseNum(SD.tokens[0].v) : currentValue();
  if (v === null || SD.err) return;
  copyText(formatNumberString(numToken(v), { decimal: loc().decimal, groupSep: "" }));
}

/* =====================================================================
   PROGRAMMER
   ===================================================================== */
const S = {
  mode: ["HEX", "DEC", "OCT", "BIN"].includes(store.get("bw.base")) ? store.get("bw.base") : "HEX",
  bits: WORD_SIZES.includes(Number(store.get("bw.bits"))) ? Number(store.get("bw.bits")) : 64,
  signed: store.get("bw.signed") === "1",
  cur: 0n, acc: null, op: null, fresh: true, err: false,
  view: "bits", endian: "BE", field: { active: false, a: null, b: null },
  inspecting: false, rep: null, undo: null, flash: null,
  operand: false, /* a second operand was entered since the last operator */
};
const OP_SYM = { AND: "AND", OR: "OR", XOR: "XOR", ADD: "+", SUB: "−", MUL: "×", DIV: "÷", MOD: "MOD", SHL: "<<", SHR: ">>" };

const BS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5h10.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9L3.5 12z"/><path d="M12.5 9.5l5 5m0-5l-5 5"/></svg>';
const KEY = {
  AC: ["AC", "clear"], BS: [BS_SVG, "fn"], AND: ["AND", "fn"], OR: ["OR", "fn"], XOR: ["XOR", "fn"],
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
  pad.innerHTML = L.keys.map((spec) => {
    const [k, span] = spec.split("*");
    const def = KEY[k];
    const label = def ? def[0] : k;
    const cls = def && def[1] !== "digit" ? " k--" + def[1] : "";
    const aria = DICT.en["k." + k] ? ` aria-label="${esc(t("k." + k))}"` : "";
    const style = span ? ` style="grid-column:span ${span}"` : "";
    return `<button class="k${cls}" data-k="${k}"${aria}${style}>${label}</button>`;
  }).join("");
}

function renderDisplay() {
  const mv = $("mainVal");
  mv.dataset.fit = "mono";
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
    const cls = txt.length > 30 ? " long" : "";
    return `<button class="conv__row" data-mode="${m}"><span class="conv__lbl">${m}</span><span class="conv__val${cls}">${esc(txt)}</span></button>`;
  }).join("");

  $("insight").innerHTML = S.err ? "" : insights(S.cur, S.mode, S.bits).map((i) => {
    const text = t("ins." + i.kind, { v: i.value });
    const copy = i.copy || text;
    return `<button class="pill" data-copy="${esc(copy)}">${i.swatch ? `<span class="pill__swatch" style="background:${esc(i.swatch)}"></span>` : ""}${esc(text)}</button>`;
  }).join("");
}

function fieldRange() {
  const f = S.field;
  if (f.a === null) return null;
  const b = f.b === null ? f.a : f.b;
  return { hi: Math.max(f.a, b), lo: Math.min(f.a, b) };
}

let lastView = null;
function renderInspector() {
  $("fieldBtn").hidden = S.view !== "bits";
  $("fieldBtn").setAttribute("aria-pressed", String(S.field.active));
  $("endBtn").hidden = S.view !== "bytes";
  $("copyBtn").hidden = S.view !== "bytes";
  $("endBtn").textContent = S.endian;
  setSeg($("viewSeg"), (b) => b.dataset.view === S.view);
  const fold = $("fold");
  fold.setAttribute("aria-expanded", String(S.inspecting));
  fold.setAttribute("aria-label", t(S.inspecting ? "a.collapse" : "a.expand"));
  if (!S.inspecting) return;

  const body = $("inspectBody");
  if (lastView !== S.view) {
    lastView = S.view;
    body.style.animation = "none"; void body.offsetWidth; body.style.animation = "";
  }
  const v = mask(S.cur, S.bits);

  if (S.view === "bits") {
    const pc = popcount(v), mi = msbIndex(v);
    let html = `<div class="statline"><span class="stat">${esc(t("stat.set"))} <b>${pc}</b></span><span class="stat">${esc(t("stat.msb"))} <b>${mi < 0 ? "—" : mi}</b></span><span class="stat">${esc(t("stat.lz"))} <b>${mi < 0 ? S.bits : S.bits - 1 - mi}</b></span></div>`;
    const r = fieldRange();
    if (S.field.active && r) {
      const fv = extract(v, r.hi, r.lo);
      html += `<div class="fieldline"><span>[${r.hi}:${r.lo}]</span><span class="dim">w=${r.hi - r.lo + 1}</span><span>0x${fv.toString(16).toUpperCase()}</span><span>${fv.toString(10)}</span>${S.field.b === null ? `<span class="dim">${esc(t("field.pickEnd"))}</span>` : ""}</div>`;
    } else if (S.field.active) {
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
        const insel = S.field.active && r && S.field.b !== null && i >= r.lo && i <= r.hi;
        cells += `<button class="bit${on ? " on" : ""}${insel ? " insel" : ""}${S.flash === i ? " flash" : ""}" data-bit="${i}" aria-pressed="${on}" aria-label="${esc(t("a.bit", { i, v: on ? 1 : 0 }))}">${on ? 1 : 0}</button>`;
      }
      html += `<div class="bitrow"><span class="bitrow__idx">${hi}:${lo}</span><div class="bitrow__bits">${cells}</div><span class="bitrow__hex${bv ? " nz" : ""}">${bv.toString(16).toUpperCase().padStart(2, "0")}</span></div>`;
    }
    body.innerHTML = html + "</div>";
  } else if (S.view === "float") {
    if (S.bits < 32) { body.innerHTML = `<div class="statline"><span class="stat">${esc(t("float.needs32"))}</span></div>`; return; }
    const one = (p, name, width) => {
      const eb = p.e.toString(2).padStart(p.ebits, "0");
      const unb = p.cls === "normal" ? ` = 2^${p.e - p.bias}` : "";
      let strip = "";
      for (let i = width - 1; i >= 0; i--) {
        const on = ((v >> BigInt(i)) & 1n) === 1n ? " on" : "";
        const c = i === width - 1 ? "fs" : (i >= p.mbits ? "fe" : "fm");
        strip += `<span class="fbit ${c}${on}"></span>`;
      }
      return `<div class="frow"><span class="frow__lbl">${name}</span><span class="frow__val">${esc(fmtFloat(p.val))}</span><span class="frow__cls" data-c="${p.cls}">${p.cls}</span></div>
        <div class="fparts">S ${p.s} · E ${eb}₂ (${p.e}${unb}) · M 0x${p.m.toString(16).toUpperCase()}</div>
        <div class="fstrip" aria-hidden="true">${strip}</div>
        <div class="fgrp" aria-hidden="true"><span style="flex:1">S</span><span style="flex:${p.ebits}">EXP</span><span style="flex:${p.mbits}">MANTISSA</span></div>`;
    };
    let html = `<div class="statline"><span class="stat"><i class="fkey fs"></i>${esc(t("float.sign"))}</span><span class="stat"><i class="fkey fe"></i>${esc(t("float.exp"))}</span><span class="stat"><i class="fkey fm"></i>${esc(t("float.mant"))}</span></div>`;
    html += one(f32parts(v), "FLOAT32", 32);
    if (S.bits >= 64) html += one(f64parts(v), "FLOAT64", 64);
    body.innerHTML = html;
  } else {
    const nBytes = S.bits / 8;
    let str = "";
    for (let i = nBytes - 1; i >= 0; i--) {
      const b = Number((v >> BigInt(i * 8)) & 0xFFn);
      str += b >= 32 && b < 127 ? String.fromCharCode(b) : "·";
    }
    let rows = `<div class="bytes-str"><span class="lbl">ASCII</span>${esc(str)}</div>`;
    rows += `<div class="byte-head"><span>${esc(t("bytes.byte"))}</span><span>HEX</span><span>DEC</span><span>ASC</span><span class="b-bin">${esc(t("bytes.bin"))}</span></div>`;
    const order = [];
    for (let i = nBytes - 1; i >= 0; i--) order.push(i);
    if (S.endian === "LE") order.reverse();
    for (const i of order) {
      const b = Number((v >> BigInt(i * 8)) & 0xFFn);
      const asc = b >= 32 && b < 127 ? esc(String.fromCharCode(b)) : "·";
      rows += `<div class="byte-row${b ? " nz" : ""}" style="--w:${(b / 255 * 100).toFixed(1)}%"><span>${i}</span><span>${b.toString(16).toUpperCase().padStart(2, "0")}</span><span>${b}</span><span>${asc}</span><span class="b-bin">${b.toString(2).padStart(8, "0").replace(/(\d{4})(\d{4})/, "$1 $2")}</span></div>`;
    }
    body.innerHTML = rows;
  }
}

function render() {
  setAccent();
  renderPad();
  renderDisplay();
  renderInspector();
  setSeg($("baseSeg"), (b) => b.dataset.mode === S.mode);
  setSeg($("bitsSeg"), (b) => Number(b.dataset.bits) === S.bits);
  const sgn = $("sgn");
  sgn.textContent = t(S.signed ? "signed" : "unsigned");
  sgn.setAttribute("aria-pressed", String(S.signed));
}

function clearErr() { if (S.err) { S.err = false; S.cur = 0n; S.acc = null; S.op = null; S.fresh = true; S.operand = false; } }
function inputDigit(d) {
  clearErr();
  const base = BASE[S.mode];
  const digits = d === "00" ? [0n, 0n] : [BigInt(parseInt(d, 16))];
  if (S.fresh) { S.cur = 0n; S.fresh = false; }
  S.operand = true;
  for (const dg of digits) {
    if (dg >= base) return;
    const next = S.cur * base + dg;
    if (next !== mask(next, S.bits)) { haptic(30); return; }
    S.cur = next;
  }
}
function pressOp(op) {
  clearErr();
  try {
    if (S.acc !== null && S.op && S.operand) { S.acc = applyOp(S.acc, S.cur, S.op, S.bits, S.signed); S.cur = S.acc; }
    else if (S.acc === null || !S.op) S.acc = S.cur;
    S.op = op; S.fresh = true; S.operand = false;
  } catch { S.err = true; S.acc = null; S.op = null; haptic(40); }
}
function pressEq() {
  clearErr();
  if (S.acc === null || !S.op) {
    if (S.rep) {
      try { S.cur = applyOp(S.cur, S.rep.b, S.rep.op, S.bits, S.signed); } catch { S.err = true; haptic(40); }
      S.fresh = true;
    }
    return;
  }
  const b = S.cur;
  try { S.cur = applyOp(S.acc, S.cur, S.op, S.bits, S.signed); S.rep = { op: S.op, b }; } catch { S.err = true; haptic(40); }
  S.acc = null; S.op = null; S.fresh = true; S.operand = false;
}
function press(k) {
  switch (k) {
    case "AC":
      if (!S.err && (S.cur !== 0n || S.acc !== null)) S.undo = { cur: S.cur, acc: S.acc, op: S.op };
      S.cur = 0n; S.acc = null; S.op = null; S.fresh = true; S.err = false; S.rep = null; S.operand = false; break;
    case "BS": clearErr(); if (!S.fresh) S.cur = S.cur / BASE[S.mode]; break;
    case "CE": clearErr(); S.cur = 0n; S.fresh = true; S.operand = true; break;
    case "SWP": swapOperands(); return;
    case "NOT": clearErr(); S.cur = opNOT(S.cur, S.bits); S.fresh = true; S.operand = true; break;
    case "NEG": clearErr(); S.cur = opNEG(S.cur, S.bits); S.fresh = true; S.operand = true; break;
    case "ROL": clearErr(); S.cur = rol(S.cur, S.bits); S.fresh = true; S.operand = true; break;
    case "ROR": clearErr(); S.cur = ror(S.cur, S.bits); S.fresh = true; S.operand = true; break;
    case "EQ": pressEq(); break;
    case "AND": case "OR": case "XOR": case "ADD": case "SUB":
    case "MUL": case "DIV": case "MOD": case "SHL": case "SHR": pressOp(k); break;
    default: inputDigit(k);
  }
  render();
}
function swapOperands() {
  if (S.acc === null || !S.op || S.err) return;
  const a = S.acc; S.acc = S.cur; S.cur = a; S.fresh = true; S.operand = true;
  haptic(8); render();
}
function undoPrg() {
  if (!S.undo) return false;
  S.cur = S.undo.cur; S.acc = S.undo.acc; S.op = S.undo.op; S.undo = null; S.fresh = true; S.operand = S.op !== null;
  render();
  return true;
}
function setMode(m, dir) {
  if (m === S.mode) return;
  store.set("bw.base", m);
  const inner = $("dispInner");
  haptic(8);
  if (!dir) { S.mode = m; render(); return; }
  inner.classList.add(dir === "left" ? "slide-l" : "slide-r");
  setTimeout(() => {
    S.mode = m; render();
    inner.classList.remove("slide-l", "slide-r");
    inner.classList.add(dir === "left" ? "slide-r" : "slide-l");
    requestAnimationFrame(() => requestAnimationFrame(() => inner.classList.remove("slide-l", "slide-r")));
  }, 140);
}
function setBits(n) {
  S.bits = n; store.set("bw.bits", String(n));
  S.cur = mask(S.cur, n);
  if (S.acc !== null) S.acc = mask(S.acc, n);
  S.field = { active: S.field.active, a: null, b: null };
  render();
}
function setInspect(open) {
  if (open === S.inspecting) return;
  S.inspecting = open;
  $("prgScreen").classList.toggle("is-inspecting", open);
  $("pad").hidden = open;
  if (open) pushLayer("inspect", () => setInspect(false));
  else dropLayer("inspect");
  render();
}
function copyBase(mode) {
  if (S.err) return;
  copyText(literal(S.cur, mode, S.bits, S.signed));
}
function setBitTo(i, on) {
  const m = 1n << BigInt(i);
  const nv = mask(on ? (S.cur | m) : (S.cur & ~m), S.bits);
  if (nv !== mask(S.cur, S.bits)) { clearErr(); S.cur = nv; S.fresh = true; S.operand = true; render(); }
}

/* =====================================================================
   Long-press hints
   ===================================================================== */
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
function showKeyHint(k) {
  const h = hint(k);
  if (!h) return false;
  const [title, text, ex] = h;
  showHintCard(title, esc(text) + (ex ? `<div class="hintcard__ex"><span>${esc(DICT[lang()].hintTry)}</span>${esc(ex)}</div>` : ""));
  return true;
}

/* one long-press engine for every keypad */
let lp = { timer: null, fired: false };
function armLongPress(target, isStd) {
  lp.fired = false;
  const b = target.closest("[data-k]");
  if (!b) return;
  const k = b.dataset.k;
  if (k !== "AC" && !hint(k)) return;
  clearTimeout(lp.timer);
  lp.timer = setTimeout(() => {
    lp.fired = true;
    if (k === "AC") {
      const ok = isStd ? undoStd() : undoPrg();
      toast(t(ok ? "toast.restored" : "toast.nothing"));
      haptic(12);
      return;
    }
    if (showKeyHint(k)) haptic(15);
  }, 450);
}
const disarm = () => { clearTimeout(lp.timer); lp.timer = null; };
function consumeLongPress() { if (lp.fired) { lp.fired = false; return true; } return false; }

/* =====================================================================
   Events
   ===================================================================== */
function bindKeypad(el, handler, isStd) {
  el.addEventListener("pointerdown", (e) => { if (e.button === 0) armLongPress(e.target, isStd); });
  el.addEventListener("pointerup", disarm);
  el.addEventListener("pointercancel", disarm);
  el.addEventListener("pointerleave", disarm);
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  el.addEventListener("click", (e) => {
    if (consumeLongPress()) return;
    const k = e.target.closest("[data-k]");
    if (!k) return;
    haptic(8);
    handler(k.dataset.k);
  });
}
bindKeypad($("pad"), press, false);
bindKeypad($("sPad"), pressStd, true);
bindKeypad($("sciGrid"), pressStd, true);

$("appSeg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-app]");
  if (b) setApp(b.dataset.app);
});
$("baseSeg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-mode]");
  if (!b) return;
  setMode(b.dataset.mode, MODES.indexOf(b.dataset.mode) > MODES.indexOf(S.mode) ? "left" : "right");
});
$("bitsSeg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-bits]");
  if (b) { haptic(8); setBits(Number(b.dataset.bits)); }
});
$("sgn").addEventListener("click", () => {
  S.signed = !S.signed; store.set("bw.signed", S.signed ? "1" : "0");
  haptic(8); render();
});
$("viewSeg").addEventListener("click", (e) => {
  const b = e.target.closest("[data-view]");
  if (!b) return;
  S.view = b.dataset.view; haptic(8);
  if (!S.inspecting) setInspect(true); else render();
});
$("fieldBtn").addEventListener("click", () => {
  S.field = { active: !S.field.active, a: null, b: null };
  haptic(8);
  if (S.field.active && !S.inspecting) setInspect(true); else render();
});
$("endBtn").addEventListener("click", () => { S.endian = S.endian === "BE" ? "LE" : "BE"; haptic(8); render(); });
$("copyBtn").addEventListener("click", () => {
  copyText("0x" + mask(S.cur, S.bits).toString(16).toUpperCase().padStart(S.bits / 4, "0"));
});
$("fold").addEventListener("click", () => { haptic(8); setInspect(!S.inspecting); });
$("mainVal").addEventListener("click", () => copyBase(S.mode));
$("pending").addEventListener("click", swapOperands);
$("insight").addEventListener("click", (e) => {
  const p = e.target.closest(".pill");
  if (p) copyText(p.dataset.copy);
});

/* conversion rows: tap = switch base, long-press = copy in that base */
let convLP = { timer: null, fired: false };
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
  if (!r) return;
  setMode(r.dataset.mode, MODES.indexOf(r.dataset.mode) > MODES.indexOf(S.mode) ? "left" : "right");
});

/* bit grid: tap flips, drag paints, long-press explains the weight */
const paint = { start: null, set: false, active: false, fired: false, timer: null, hinted: false };
const bitAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest(".bit") : null; };
$("inspectBody").addEventListener("pointerdown", (e) => {
  const b = e.target.closest(".bit");
  if (!b) return;
  paint.fired = false; paint.hinted = false;
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
$("inspectBody").addEventListener("pointermove", (e) => {
  if (paint.start === null || S.field.active) return;
  const b = bitAt(e.clientX, e.clientY);
  if (!b) return;
  const i = Number(b.dataset.bit);
  if (!paint.active) {
    if (i === paint.start) return;
    clearTimeout(paint.timer);
    paint.active = true; paint.fired = true; haptic(6);
    setBitTo(paint.start, paint.set);
  }
  setBitTo(i, paint.set);
});
["pointerup", "pointercancel"].forEach((ev) => $("inspectBody").addEventListener(ev, () => { clearTimeout(paint.timer); paint.start = null; }));
$("inspectBody").addEventListener("click", (e) => {
  if (paint.fired) { paint.fired = false; return; }
  if (paint.hinted) { paint.hinted = false; return; }
  const b = e.target.closest(".bit");
  if (!b) return;
  const i = Number(b.dataset.bit);
  haptic(6);
  if (S.field.active) {
    if (S.field.a === null || S.field.b !== null) { S.field.a = i; S.field.b = null; }
    else S.field.b = i;
    render();
    return;
  }
  clearErr();
  S.cur = mask(S.cur ^ (1n << BigInt(i)), S.bits);
  S.fresh = true; S.operand = true; S.flash = i;
  render();
  S.flash = null;
});

/* standard: tape, readout, drawer */
let tapeLP = { timer: null, fired: false };
$("tape").addEventListener("pointerdown", (e) => {
  tapeLP.fired = false;
  const r = e.target.closest(".tape__row");
  if (!r) return;
  tapeLP.timer = setTimeout(() => {
    tapeLP.fired = true;
    SD.hist.splice(Number(r.dataset.i), 1);
    saveHistory(); renderTape();
    toast(t("hist.removed")); haptic(12);
  }, 500);
});
["pointerup", "pointercancel", "pointerleave"].forEach((ev) => $("tape").addEventListener(ev, () => clearTimeout(tapeLP.timer)));
$("tape").addEventListener("scroll", () => clearTimeout(tapeLP.timer), { passive: true });
$("tape").addEventListener("click", (e) => {
  if (tapeLP.fired) { tapeLP.fired = false; return; }
  const r = e.target.closest(".tape__row");
  if (!r) return;
  haptic(8);
  SD.err = null;
  stdEdit("insert", SD.hist[Number(r.dataset.i)].r);
  renderStd();
});
let clearArmed = null;
$("histClear").addEventListener("click", () => {
  const btn = $("histClear");
  if (!clearArmed) {
    btn.classList.add("is-armed"); haptic(15);
    toast(t("hist.clearConfirm"));
    clearArmed = setTimeout(() => { clearArmed = null; btn.classList.remove("is-armed"); }, 2500);
    return;
  }
  clearTimeout(clearArmed); clearArmed = null; btn.classList.remove("is-armed");
  SD.hist = []; saveHistory(); renderTape();
  toast(t("hist.cleared")); haptic(20);
});
$("sResult").addEventListener("click", copyStd);

function syncSciLabel() {
  $("sciToggle").setAttribute("aria-label", t($("sci").classList.contains("is-open") ? "a.sciClose" : "a.sciOpen"));
}
function setSci(open) {
  const d = $("sci");
  d.classList.toggle("is-open", open);
  $("sciToggle").setAttribute("aria-expanded", String(open));
  syncSciLabel();
  store.set("bw.sci", open ? "1" : "0");
  $("angleBadge").hidden = !open;
}
$("sciToggle").addEventListener("click", () => { haptic(8); setSci(!$("sci").classList.contains("is-open")); });

/* swipes: display changes base (PRG); keypad changes calculator */
function swipe(el, onSwipe, { min = 56, ratio = 0.6 } = {}) {
  let x0 = 0, y0 = 0, t0 = 0, swiped = false;
  el.addEventListener("touchstart", (e) => { const p = e.touches[0]; x0 = p.clientX; y0 = p.clientY; t0 = Date.now(); swiped = false; }, { passive: true });
  el.addEventListener("touchend", (e) => {
    const p = e.changedTouches[0], dx = p.clientX - x0, dy = p.clientY - y0;
    if (Date.now() - t0 > 600 || Math.abs(dx) < min || Math.abs(dy) > Math.abs(dx) * ratio) return;
    disarm();
    swiped = true;
    onSwipe(dx < 0 ? "left" : "right");
  }, { passive: true });
  /* swallow the click that a completed swipe would otherwise trigger */
  el.addEventListener("click", (e) => { if (swiped) { e.stopPropagation(); e.preventDefault(); swiped = false; } }, true);
}
swipe($("swipeZone"), (dir) => {
  const i = MODES.indexOf(S.mode);
  setMode(MODES[dir === "left" ? (i + 1) % 4 : (i + 3) % 4], dir);
}, { min: 48, ratio: 0.7 });
swipe($("pad"), (dir) => dir === "right" && setApp("STD"));
swipe($("sPad"), (dir) => dir === "left" && setApp("PRG"));

/* segmented controls: arrow keys move the selection (roving tabindex) */
document.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const btn = e.target.closest && e.target.closest(".seg__btn");
  if (!btn) return;
  const all = [...btn.parentElement.querySelectorAll(".seg__btn")];
  const next = all[(all.indexOf(btn) + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
  e.preventDefault();
  e.stopPropagation();
  next.focus();
  next.click();
}, true);

/* hint card: any tap elsewhere dismisses */
document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".hintcard")) hideHint(); }, true);

/* keyboard */
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector("dialog[open]")) return;
  const k = e.key;
  if (APP.mode === "STD") {
    const map = { "+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV", "^": "POW", "%": "PCT", "!": "FACT",
      "(": "LP", ")": "RP", Enter: "EQ", "=": "EQ", Backspace: "BS", Escape: "AC", Delete: "AC", ".": "DOT", ",": "DOT" };
    if (/^[0-9]$/.test(k)) { e.preventDefault(); pressStd(k); }
    else if (map[k]) { e.preventDefault(); pressStd(map[k]); }
    return;
  }
  const map = { "+": "ADD", "-": "SUB", "*": "MUL", "/": "DIV", "%": "MOD", Enter: "EQ", "=": "EQ",
    Backspace: "BS", Escape: "AC", Delete: "AC", "~": "NOT", "&": "AND", "|": "OR" };
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
    if (e.target === dlg) { /* click on the backdrop */
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
  navigator.serviceWorker.register("./sw.js").then((reg) => {
    if (!store.get("bw.sw")) { store.set("bw.sw", "1"); toast(t("toast.offline")); }
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

/* keep the history pinned to its newest line whenever the tape resizes */
if (window.ResizeObserver) new ResizeObserver(() => { const tp = $("tape"); tp.scrollTop = tp.scrollHeight; }).observe($("tape"));

/* ================= init ================= */
loadHistory();
setSci(store.get("bw.sci") === "1");
applyTheme();
applyLang();
applyApp();
window.addEventListener("resize", () => (APP.mode === "STD" ? renderStd() : renderDisplay()));

/* test surface (used by the Playwright checks; harmless in production) */
window.BITWISE = {
  S, SD, APP, press, pressStd, setApp, setMode, setBits, setInspect,
  lastCopy: () => lastCopy, applyLang: (l) => { prefs.lang = l; applyLang(); },
  applyTheme: (th) => { prefs.theme = th; applyTheme(); },
};
