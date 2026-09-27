/* BitWise calculation core — pure functions, no DOM.
   Shared by the app (browser, ES module) and the unit tests (node:test). */

/* ===================================================================
   Programmer calculator (BigInt, fixed word size, immediate execution)
   =================================================================== */
export const MODES = ["HEX", "DEC", "OCT", "BIN"];
export const BASE = { HEX: 16n, DEC: 10n, OCT: 8n, BIN: 2n };
export const GROUP = { HEX: 4, DEC: 3, OCT: 3, BIN: 4 };
export const WORD_SIZES = [8, 16, 32, 64, 128];

export const mask = (v, bits) => v & ((1n << BigInt(bits)) - 1n);
export const toSigned = (v, bits) => {
  v = mask(v, bits);
  return v >= (1n << BigInt(bits - 1)) ? v - (1n << BigInt(bits)) : v;
};
export const fromSigned = (v, bits) => mask(v, bits);
export const popcount = (v) => { let c = 0; while (v) { c += Number(v & 1n); v >>= 1n; } return c; };
export const msbIndex = (v) => { if (v === 0n) return -1; let i = -1; while (v) { v >>= 1n; i++; } return i; };
export const extract = (v, hi, lo) => (v >> BigInt(lo)) & ((1n << BigInt(hi - lo + 1)) - 1n);

export function group(str, n, sep = " ") {
  const neg = str.startsWith("-");
  if (neg) str = str.slice(1);
  const out = [];
  for (let i = str.length; i > 0; i -= n) out.unshift(str.slice(Math.max(0, i - n), i));
  return (neg ? "-" : "") + out.join(sep);
}

export function fmt(v, mode, bits, signed) {
  v = mask(v, bits);
  if (mode === "DEC") return group((signed ? toSigned(v, bits) : v).toString(10), 3);
  return group(v.toString(Number(BASE[mode])).toUpperCase(), GROUP[mode]);
}

/* the value as it should be pasted into source code */
export function literal(v, mode, bits, signed) {
  v = mask(v, bits);
  if (mode === "DEC") return (signed ? toSigned(v, bits) : v).toString(10);
  const pre = { HEX: "0x", OCT: "0o", BIN: "0b" }[mode];
  return pre + v.toString(Number(BASE[mode])).toUpperCase();
}

export class DivZero extends Error { constructor() { super("div0"); this.code = "div0"; } }

export function applyOp(a, b, op, bits, signed) {
  const M = BigInt(bits);
  switch (op) {
    case "AND": return mask(a & b, bits);
    case "OR": return mask(a | b, bits);
    case "XOR": return mask(a ^ b, bits);
    case "ADD": return mask(a + b, bits);
    case "SUB": return mask(a - b, bits);
    case "MUL": return mask(a * b, bits);
    case "DIV": {
      if (mask(b, bits) === 0n) throw new DivZero();
      if (signed) return fromSigned(toSigned(a, bits) / toSigned(b, bits), bits);
      return mask(a, bits) / mask(b, bits);
    }
    case "MOD": {
      if (mask(b, bits) === 0n) throw new DivZero();
      if (signed) return fromSigned(toSigned(a, bits) % toSigned(b, bits), bits);
      return mask(a, bits) % mask(b, bits);
    }
    case "SHL": { const n = b >= M ? M : b; return mask(a << n, bits); }
    case "SHR": {
      const n = b >= M ? M : b;
      if (signed) return fromSigned(toSigned(a, bits) >> n, bits);
      return mask(a, bits) >> n;
    }
  }
  throw new Error("unknown op " + op);
}
export const opNOT = (v, bits) => mask(~v, bits);
export const opNEG = (v, bits) => mask(-v, bits);
export const rol = (v, bits) => mask((v << 1n) | (mask(v, bits) >> BigInt(bits - 1)), bits);
export const ror = (v, bits) => mask((mask(v, bits) >> 1n) | ((v & 1n) << BigInt(bits - 1)), bits);

/* IEEE 754 decode of a bit pattern */
export function f32parts(v) {
  const x = Number(mask(v, 32));
  const dv = new DataView(new ArrayBuffer(4));
  dv.setUint32(0, x);
  const val = dv.getFloat32(0);
  const s = (x >>> 31) & 1, e = (x >>> 23) & 0xFF, m = x & 0x7FFFFF;
  const cls = e === 255 ? (m ? "NaN" : "Infinity") : e === 0 ? (m ? "subnormal" : "zero") : "normal";
  return { s, e, m: BigInt(m), val, cls, bias: 127, ebits: 8, mbits: 23 };
}
export function f64parts(v) {
  v = mask(v, 64);
  const dv = new DataView(new ArrayBuffer(8));
  dv.setBigUint64(0, v);
  const val = dv.getFloat64(0);
  const s = Number((v >> 63n) & 1n), e = Number((v >> 52n) & 0x7FFn), m = v & 0xFFFFFFFFFFFFFn;
  const cls = e === 2047 ? (m ? "NaN" : "Infinity") : e === 0 ? (m ? "subnormal" : "zero") : "normal";
  return { s, e, m, val, cls, bias: 1023, ebits: 11, mbits: 52 };
}
export function fmtFloat(val) {
  if (Number.isNaN(val)) return "NaN";
  if (!isFinite(val)) return val > 0 ? "+∞" : "−∞";
  if (val === 0) return Object.is(val, -0) ? "−0" : "0";
  const a = Math.abs(val);
  if (a >= 1e-4 && a < 1e15) return String(parseFloat(val.toPrecision(9)));
  return val.toExponential(6);
}

/* Insight engine: recognises what a value probably means.
   Returns language-neutral descriptors; the UI turns them into text. */
export function insights(v, mode, bits) {
  const out = [];
  v = mask(v, bits);
  if (v === 0n) return out;
  if (mode === "OCT" && v <= 0o7777n) {
    const p = Number(v & 0o777n);
    const rwx = (n) => ((n & 4) ? "r" : "-") + ((n & 2) ? "w" : "-") + ((n & 1) ? "x" : "-");
    const s = rwx(p >> 6) + rwx((p >> 3) & 7) + rwx(p & 7);
    out.push({ kind: "chmod", value: s, copy: s });
  }
  if (mode === "HEX" && v > 0xFFFn && v <= 0xFFFFFFn) {
    const hx = "#" + v.toString(16).toUpperCase().padStart(6, "0");
    out.push({ kind: "color", value: hx, swatch: hx, copy: hx });
  }
  if (mode === "HEX" && v > 0xFFFFFFn && v <= 0xFFFFFFFFn) {
    const ip = [24, 16, 8, 0].map((sh) => Number((v >> BigInt(sh)) & 0xFFn)).join(".");
    out.push({ kind: "ipv4", value: ip, copy: ip });
  }
  if (v >= 32n && v <= 126n) out.push({ kind: "ascii", value: String.fromCharCode(Number(v)) });
  if (mode === "DEC" && v >= 946684800n && v <= 4102444800n) {
    const iso = new Date(Number(v) * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";
    out.push({ kind: "unix", value: iso, copy: iso });
  }
  const named = {
    "255": "u8", "65535": "u16", "4294967295": "u32", "18446744073709551615": "u64",
    "127": "i8", "32767": "i16", "2147483647": "i32", "9223372036854775807": "i64",
  }[v.toString()];
  if (named) out.push({ kind: "max", value: named });
  if ((v & (v - 1n)) === 0n) out.push({ kind: "pow2", value: msbIndex(v) });
  else if (!named && ((v + 1n) & v) === 0n) out.push({ kind: "lowmask", value: msbIndex(v) + 1 });
  return out.slice(0, 2);
}

/* ===================================================================
   Standard / scientific calculator — expression engine
   Tokens:
     {t:"num", v:"12.5E-3"}   number literal as typed ("." decimal, "E" exponent)
     {t:"op",  v:"+|-|*|/|^"}
     {t:"lp"} {t:"rp"}
     {t:"fn",  v:"sin|cos|tan|asin|acos|atan|ln|log|sqrt|cbrt|exp|pow10"} (includes its "(")
     {t:"post",v:"%|!|sq|cube|inv"}
     {t:"const", v:"pi|e"}
   =================================================================== */
export class CalcError extends Error {
  constructor(code) { super(code); this.code = code; }
}
/* error codes: "div0" division by zero, "domain" invalid input, "overflow", "syntax" */

const FN = {
  sin: (x, deg) => trig(Math.sin, x, deg),
  cos: (x, deg) => trig(Math.cos, x, deg),
  tan: (x, deg) => {
    if (deg && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-12) throw new CalcError("domain");
    const r = trig(Math.tan, x, deg);
    if (Math.abs(r) > 1e15) throw new CalcError("domain");
    return r;
  },
  asin: (x, deg) => { if (x < -1 || x > 1) throw new CalcError("domain"); return fromRad(Math.asin(x), deg); },
  acos: (x, deg) => { if (x < -1 || x > 1) throw new CalcError("domain"); return fromRad(Math.acos(x), deg); },
  atan: (x, deg) => fromRad(Math.atan(x), deg),
  ln: (x) => { if (x <= 0) throw new CalcError("domain"); return Math.log(x); },
  log: (x) => { if (x <= 0) throw new CalcError("domain"); return Math.log10(x); },
  sqrt: (x) => { if (x < 0) throw new CalcError("domain"); return Math.sqrt(x); },
  cbrt: (x) => Math.cbrt(x),
  exp: (x) => Math.exp(x),
  pow10: (x) => Math.pow(10, x),
};
function trig(f, x, deg) {
  const r = f(deg ? x * Math.PI / 180 : x);
  return Math.abs(r) < 1e-12 ? 0 : r;
}
function fromRad(r, deg) { return deg ? r * 180 / Math.PI : r; }

function factorial(x) {
  if (x < 0 || Math.abs(x - Math.round(x)) > 1e-9) throw new CalcError("domain");
  const n = Math.round(x);
  if (n > 170) throw new CalcError("overflow");
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function parseNum(s) {
  /* tolerate an unfinished exponent while typing: "1.5E" / "1.5E-" */
  const clean = s.replace(/E-?$/, "");
  if (clean === "" || clean === "." || clean === "-") return 0;
  const n = Number(clean);
  if (Number.isNaN(n)) throw new CalcError("syntax");
  return n;
}

/* Recursive-descent evaluator with conventional precedence:
     expr    := term (('+'|'-') term)*          a ± b%  → a ± a·b/100
     term    := factor (('*'|'/'|implicit) factor)*
     factor  := ('-'|'+') factor | power
     power   := postfix ('^' factor)?           right-associative, -2^2 = -4
     postfix := primary ('%'|'!'|'sq'|'cube'|'inv')*
     primary := num | const | '(' expr ')' | fn expr ')'
   Unclosed parentheses are closed implicitly. */
export function evaluate(tokens, { deg = true } = {}) {
  let i = 0;
  const peek = () => tokens[i];
  const startsPrimary = (t) => t && (t.t === "num" || t.t === "const" || t.t === "lp" || t.t === "fn");

  function expr() {
    let left = term();
    while (peek() && peek().t === "op" && (peek().v === "+" || peek().v === "-")) {
      const op = tokens[i++].v;
      if (!peek()) break; /* trailing operator while typing: ignore */
      const right = term();
      const rv = right.pct ? left.v * right.v : right.v;
      left = { v: op === "+" ? left.v + rv : left.v - rv };
    }
    return left;
  }
  function term() {
    let left = factor();
    for (;;) {
      const t = peek();
      if (t && t.t === "op" && (t.v === "*" || t.v === "/")) {
        i++;
        if (!peek()) break;
        const r = factor().v;
        if (t.v === "/" && r === 0) throw new CalcError("div0");
        left = { v: t.v === "*" ? left.v * r : left.v / r };
      } else if (startsPrimary(t)) {
        left = { v: left.v * factor().v }; /* implicit multiplication: 2π, 3(4), 2sin(30) */
      } else break;
    }
    return left;
  }
  function factor() {
    const t = peek();
    if (t && t.t === "op" && (t.v === "-" || t.v === "+")) {
      i++;
      if (!peek()) return { v: 0 };
      const f = factor();
      return t.v === "-" ? { v: -f.v, pct: f.pct } : f;
    }
    return power();
  }
  function power() {
    const base = postfix();
    const t = peek();
    if (t && t.t === "op" && t.v === "^") {
      i++;
      if (!peek()) return base;
      const ex = factor().v;
      const r = Math.pow(base.v, ex);
      if (Number.isNaN(r)) throw new CalcError("domain");
      return { v: r };
    }
    return base;
  }
  function postfix() {
    let node = primary();
    while (peek() && peek().t === "post") {
      const p = tokens[i++].v;
      if (p === "%") node = { v: node.v / 100, pct: true };
      else if (p === "!") node = { v: factorial(node.v) };
      else if (p === "sq") node = { v: node.v * node.v };
      else if (p === "cube") node = { v: node.v * node.v * node.v };
      else if (p === "inv") {
        if (node.v === 0) throw new CalcError("div0");
        node = { v: 1 / node.v };
      }
    }
    return node;
  }
  function closeParen() {
    if (peek() && peek().t === "rp") i++;
  }
  function primary() {
    const t = tokens[i++];
    if (!t) throw new CalcError("syntax");
    if (t.t === "num") return { v: parseNum(t.v) };
    if (t.t === "const") return { v: t.v === "pi" ? Math.PI : Math.E };
    if (t.t === "lp") {
      if (peek() && peek().t === "rp") throw new CalcError("syntax");
      const v = expr().v;
      closeParen();
      return { v };
    }
    if (t.t === "fn") {
      if (!peek() || peek().t === "rp") throw new CalcError("syntax");
      const x = expr().v;
      closeParen();
      return { v: FN[t.v](x, deg) };
    }
    throw new CalcError("syntax");
  }

  if (!tokens.length) return 0;
  const out = expr();
  if (i < tokens.length) throw new CalcError("syntax");
  if (!isFinite(out.v)) throw new CalcError(Number.isNaN(out.v) ? "domain" : "overflow");
  return out.v;
}

/* Normalise floating point noise: 0.1+0.2 → 0.3, keeps 12 significant digits */
export function tidy(x) {
  if (!isFinite(x)) return x;
  const r = parseFloat(x.toPrecision(12));
  return Object.is(r, -0) ? 0 : r;
}

/* Canonical "typed" string for a number, suitable as a num token value */
export function numToken(x) {
  x = tidy(x);
  let s = String(x);
  if (s.includes("e")) s = s.replace("e+", "E").replace("e", "E");
  return s;
}

/* Does the token list contain anything worth previewing (an operation)? */
export function hasOperation(tokens) {
  return tokens.some((t) => t.t !== "num") || tokens.length > 1;
}

export function openParens(tokens) {
  let n = 0;
  for (const t of tokens) {
    if (t.t === "lp" || t.t === "fn") n++;
    else if (t.t === "rp") n--;
  }
  return n;
}

/* ---------- editing: pure reducer over the token list ----------
   state = {tokens, fresh}  (fresh = the tokens hold a finished result) */
const MAX_DIGITS = 15;
const endsValue = (t) => t && (t.t === "num" || t.t === "rp" || t.t === "const" || t.t === "post");

export function edit(state, key, arg) {
  let tokens = state.tokens.slice();
  let fresh = state.fresh;
  const last = () => tokens[tokens.length - 1];
  const startNew = () => { if (fresh) { tokens = []; fresh = false; } };
  const keepResult = () => { fresh = false; };

  switch (key) {
    case "digit": {
      startNew();
      const l = last();
      if (l && l.t === "num") {
        if (l.v.replace(/[-.E]/g, "").length >= MAX_DIGITS) break;
        tokens[tokens.length - 1] = { t: "num", v: l.v === "0" ? arg : l.v === "-0" ? "-" + arg : l.v + arg };
      } else {
        if (endsValue(l)) tokens.push({ t: "op", v: "*" }); /* (2+3)4 reads as (2+3) × 4 */
        tokens.push({ t: "num", v: arg });
      }
      break;
    }
    case "dot": {
      startNew();
      const l = last();
      if (l && l.t === "num") {
        if (!l.v.includes(".") && !l.v.includes("E")) tokens[tokens.length - 1] = { t: "num", v: l.v + "." };
      } else tokens.push({ t: "num", v: "0." });
      break;
    }
    case "exp": { /* EE: scientific-notation entry */
      keepResult();
      const l = last();
      if (l && l.t === "num" && !l.v.includes("E") && /\d/.test(l.v)) {
        tokens[tokens.length - 1] = { t: "num", v: l.v.replace(/\.$/, "") + "E" };
      }
      break;
    }
    case "op": {
      keepResult();
      const l = last();
      if (l && l.t === "num" && /E$/.test(l.v)) { /* 1.5E then − → negative exponent */
        if (arg === "-") tokens[tokens.length - 1] = { t: "num", v: l.v + "-" };
        break;
      }
      if (!l) {
        if (arg === "-") tokens.push({ t: "op", v: "-" });
        else tokens.push({ t: "num", v: "0" }, { t: "op", v: arg });
      } else if (l.t === "op") {
        const prev = tokens[tokens.length - 2];
        if (arg === "-" && l.v !== "-" && l.v !== "+") tokens.push({ t: "op", v: "-" }); /* 2 × −3 */
        else if (prev && prev.t === "op") { tokens.splice(-2, 2, { t: "op", v: arg }); } /* "× −" then "+" */
        else if (!prev || prev.t === "lp" || prev.t === "fn") { if (arg === "-") tokens[tokens.length - 1] = l; }
        else tokens[tokens.length - 1] = { t: "op", v: arg };
      } else if (l.t === "lp" || l.t === "fn") {
        if (arg === "-") tokens.push({ t: "op", v: "-" });
      } else tokens.push({ t: "op", v: arg });
      break;
    }
    case "lp": startNew(); tokens.push({ t: "lp" }); break;
    case "rp": {
      keepResult();
      if (openParens(tokens) > 0 && endsValue(last())) tokens.push({ t: "rp" });
      break;
    }
    case "paren": { /* smart ( ) key: close when it makes sense, otherwise open */
      if (!fresh && openParens(tokens) > 0 && endsValue(last())) tokens.push({ t: "rp" });
      else { startNew(); tokens.push({ t: "lp" }); }
      break;
    }
    case "fn": startNew(); tokens.push({ t: "fn", v: arg }); break;
    case "const": startNew(); tokens.push({ t: "const", v: arg }); break;
    case "post": {
      keepResult();
      if (endsValue(last())) tokens.push({ t: "post", v: arg });
      break;
    }
    case "insert": { /* a number from memory or history */
      const l = last();
      if (fresh || !l) tokens = [{ t: "num", v: arg }];
      else if (l.t === "num") tokens[tokens.length - 1] = { t: "num", v: arg };
      else {
        if (endsValue(l)) tokens.push({ t: "op", v: "*" }); /* (2+3) then MR → (2+3) × m */
        tokens.push({ t: "num", v: arg });
      }
      fresh = false;
      break;
    }
    case "neg": { /* ± toggles the sign of the number being typed */
      keepResult();
      const l = last();
      if (l && l.t === "num") {
        tokens[tokens.length - 1] = { t: "num", v: l.v.startsWith("-") ? l.v.slice(1) : "-" + l.v };
      } else if (!l || l.t === "op" || l.t === "lp" || l.t === "fn") {
        tokens.push({ t: "num", v: "-0" });
      } else {
        tokens.unshift({ t: "op", v: "-" }, { t: "lp" });
        tokens.push({ t: "rp" });
      }
      break;
    }
    case "back": {
      if (fresh) { tokens = []; fresh = false; break; }
      const l = last();
      if (!l) break;
      if (l.t === "num" && l.v.length > 1 && l.v !== "-0") {
        const v = l.v.slice(0, -1);
        if (v === "-" || v === "") tokens.pop();
        else tokens[tokens.length - 1] = { t: "num", v };
      } else tokens.pop();
      break;
    }
    case "clear": tokens = []; fresh = false; break;
  }
  return { tokens, fresh };
}

/* For "= = =": the trailing "op number" at depth 0 of an expression, if any */
export function repeatTail(tokens) {
  const n = tokens.length;
  if (n < 3) return null;
  const a = tokens[n - 2], b = tokens[n - 1];
  if (a.t !== "op" || b.t !== "num" || openParens(tokens) !== 0) return null;
  const before = tokens[n - 3];
  if (!endsValue(before)) return null;
  return [a, b];
}

/* ---------- presentation helpers (locale aware, but pure) ---------- */
export function formatNumberString(s, { decimal = ".", groupSep = "," } = {}) {
  /* s is a canonical literal ("-1234.5E-3"); group the integer part */
  let neg = s.startsWith("-");
  if (neg) s = s.slice(1);
  let exp = "";
  const ei = s.indexOf("E");
  if (ei >= 0) { exp = s.slice(ei); s = s.slice(0, ei); }
  const [int, frac] = s.split(".");
  let out = group(int || "0", 3, groupSep);
  if (s.includes(".")) out += decimal + (frac || "");
  if (exp) out += exp.replace("-", "−");
  return (neg ? "−" : "") + out;
}

export function formatResult(x, loc) {
  if (!isFinite(x)) return "";
  x = tidy(x);
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e15 || a < 1e-6)) {
    const [m, e] = x.toExponential(9).split("e");
    return formatNumberString(String(parseFloat(m)), loc) + "E" + e.replace("+", "").replace("-", "−");
  }
  return formatNumberString(String(x), loc);
}

const OP_GLYPH = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^" };
const FN_GLYPH = {
  sin: "sin(", cos: "cos(", tan: "tan(", asin: "sin⁻¹(", acos: "cos⁻¹(", atan: "tan⁻¹(",
  ln: "ln(", log: "log(", sqrt: "√(", cbrt: "∛(", exp: "e^(", pow10: "10^(",
};
const POST_GLYPH = { "%": "%", "!": "!", sq: "²", cube: "³", inv: "⁻¹" };

export function renderTokens(tokens, loc) {
  let s = "";
  tokens.forEach((t, idx) => {
    const prev = tokens[idx - 1];
    switch (t.t) {
      case "num": s += formatNumberString(t.v, loc); break;
      case "op": {
        const unary = t.v === "-" && (!prev || prev.t === "op" || prev.t === "lp" || prev.t === "fn");
        s += unary ? "−" : " " + OP_GLYPH[t.v] + " ";
        break;
      }
      case "lp": s += "("; break;
      case "rp": s += ")"; break;
      case "fn": s += FN_GLYPH[t.v]; break;
      case "post": s += POST_GLYPH[t.v]; break;
      case "const": s += t.v === "pi" ? "π" : "e"; break;
    }
  });
  return s.replace(/\s+/g, " ").trim();
}
