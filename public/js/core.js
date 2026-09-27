/* BitWise calculation core — pure functions, no DOM.
   Programmer arithmetic on BigInt with a fixed word size.
   Shared by the app (browser, ES module) and the unit tests (node:test). */
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
   Key handling — a small state machine, DOM-free so it can be tested.
   state: {mode, bits, signed, cur, acc, op, fresh, err, operand, rep, undo}
   =================================================================== */
export const BINARY_OPS = ["AND", "OR", "XOR", "ADD", "SUB", "MUL", "DIV", "MOD", "SHL", "SHR"];

export function createState(over = {}) {
  return {
    mode: "HEX", bits: 64, signed: false,
    cur: 0n, acc: null, op: null,
    fresh: true, err: false,
    operand: false, /* a second operand was entered since the last operator */
    rep: null,      /* last {op, b} for repeated = */
    undo: null,     /* snapshot restored by long-pressing AC */
    ...over,
  };
}

function clearErr(s) {
  if (s.err) { s.err = false; s.cur = 0n; s.acc = null; s.op = null; s.fresh = true; s.operand = false; }
}

function inputDigit(s, d) {
  clearErr(s);
  const base = BASE[s.mode];
  const digits = d === "00" ? [0n, 0n] : [BigInt(parseInt(d, 16))];
  if (digits.some((x) => x >= base)) return "rejected";
  if (s.fresh) { s.cur = 0n; s.fresh = false; }
  s.operand = true;
  for (const dg of digits) {
    const next = s.cur * base + dg;
    if (next !== mask(next, s.bits)) return "overflow";
    s.cur = next;
  }
  return "ok";
}

function pressOp(s, op) {
  clearErr(s);
  try {
    if (s.acc !== null && s.op && s.operand) { s.acc = applyOp(s.acc, s.cur, s.op, s.bits, s.signed); s.cur = s.acc; }
    else if (s.acc === null || !s.op) s.acc = s.cur;
    s.op = op; s.fresh = true; s.operand = false;
  } catch { s.err = true; s.acc = null; s.op = null; return "error"; }
  return "ok";
}

function pressEq(s) {
  clearErr(s);
  if (s.acc === null || !s.op) {
    if (!s.rep) return "ok";
    try { s.cur = applyOp(s.cur, s.rep.b, s.rep.op, s.bits, s.signed); } catch { s.err = true; return "error"; }
    s.fresh = true;
    return "ok";
  }
  const b = s.cur;
  let res = "ok";
  try { s.cur = applyOp(s.acc, s.cur, s.op, s.bits, s.signed); s.rep = { op: s.op, b }; }
  catch { s.err = true; res = "error"; }
  s.acc = null; s.op = null; s.fresh = true; s.operand = false;
  return res;
}

const unary = (s, f) => { clearErr(s); s.cur = f(s.cur, s.bits); s.fresh = true; s.operand = true; return "ok"; };

/* Applies one key to the state (mutating it). Returns "ok" | "rejected" | "overflow" | "error". */
export function pressKey(s, k) {
  switch (k) {
    case "AC":
      if (!s.err && (s.cur !== 0n || s.acc !== null)) s.undo = { cur: s.cur, acc: s.acc, op: s.op };
      s.cur = 0n; s.acc = null; s.op = null; s.fresh = true; s.err = false; s.rep = null; s.operand = false;
      return "ok";
    case "BS": clearErr(s); if (!s.fresh) s.cur = s.cur / BASE[s.mode]; return "ok";
    case "CE": clearErr(s); s.cur = 0n; s.fresh = true; s.operand = true; return "ok";
    case "SWP": return swapOperands(s);
    case "NOT": return unary(s, opNOT);
    case "NEG": return unary(s, opNEG);
    case "ROL": return unary(s, rol);
    case "ROR": return unary(s, ror);
    case "EQ": return pressEq(s);
    default:
      if (BINARY_OPS.includes(k)) return pressOp(s, k);
      return inputDigit(s, k);
  }
}

export function swapOperands(s) {
  if (s.acc === null || !s.op || s.err) return "rejected";
  const a = s.acc; s.acc = s.cur; s.cur = a; s.fresh = true; s.operand = true;
  return "ok";
}

export function undoClear(s) {
  if (!s.undo) return false;
  s.cur = s.undo.cur; s.acc = s.undo.acc; s.op = s.undo.op; s.undo = null;
  s.fresh = true; s.operand = s.op !== null; s.err = false;
  return true;
}

export function setBit(s, i, on) {
  const m = 1n << BigInt(i);
  const nv = mask(on ? (s.cur | m) : (s.cur & ~m), s.bits);
  if (nv === mask(s.cur, s.bits)) return false;
  clearErr(s); s.cur = nv; s.fresh = true; s.operand = true;
  return true;
}

export function setWordSize(s, n) {
  s.bits = n;
  s.cur = mask(s.cur, n);
  if (s.acc !== null) s.acc = mask(s.acc, n);
}
