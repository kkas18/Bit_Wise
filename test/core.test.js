import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mask, toSigned, fmt, literal, applyOp, opNOT, opNEG, rol, ror, popcount, msbIndex, extract,
  f32parts, f64parts, fmtFloat, insights, evaluate, edit, tidy, numToken, repeatTail,
  formatNumberString, formatResult, renderTokens, openParens, CalcError,
} from "../public/js/core.js";

const NB = { decimal: ",", groupSep: " " };
const EN = { decimal: ".", groupSep: "," };

/* ---------------- programmer core ---------------- */
test("mask and two's complement", () => {
  assert.equal(mask(0x1FFn, 8), 0xFFn);
  assert.equal(toSigned(0xFFn, 8), -1n);
  assert.equal(toSigned(0x7Fn, 8), 127n);
  assert.equal(opNEG(1n, 8), 0xFFn);
  assert.equal(opNOT(0n, 16), 0xFFFFn);
});

test("formatting per base", () => {
  assert.equal(fmt(255n, "HEX", 64, false), "FF");
  assert.equal(fmt(255n, "BIN", 64, false), "1111 1111");
  assert.equal(fmt(255n, "OCT", 64, false), "377");
  assert.equal(fmt(1234567n, "DEC", 64, false), "1 234 567");
  assert.equal(fmt(0xFFn, "DEC", 8, true), "-1");
  assert.equal(literal(255n, "HEX", 64, false), "0xFF");
  assert.equal(literal(255n, "BIN", 64, false), "0b11111111");
});

test("binary operators", () => {
  assert.equal(applyOp(0xF3n, 0x0Fn, "AND", 8, false), 0x03n);
  assert.equal(applyOp(0xF0n, 0x0Fn, "OR", 8, false), 0xFFn);
  assert.equal(applyOp(0xFFn, 0x0Fn, "XOR", 8, false), 0xF0n);
  assert.equal(applyOp(0xFFn, 1n, "ADD", 8, false), 0n, "wraps");
  assert.equal(applyOp(10n, 3n, "MOD", 8, false), 1n);
  assert.equal(applyOp(1n, 4n, "SHL", 8, false), 16n);
  assert.equal(applyOp(0x80n, 1n, "SHR", 8, true), 0xC0n, "arithmetic shift keeps sign");
  assert.equal(applyOp(0x80n, 1n, "SHR", 8, false), 0x40n);
  assert.equal(applyOp(mask(-7n, 8), 2n, "DIV", 8, true), mask(-3n, 8), "signed truncating division");
  assert.throws(() => applyOp(1n, 0n, "DIV", 8, false), { code: "div0" });
});

test("rotations and bit helpers", () => {
  assert.equal(rol(0x80n, 8), 0x01n);
  assert.equal(ror(0x01n, 8), 0x80n);
  assert.equal(popcount(0xF0Fn), 8);
  assert.equal(msbIndex(0n), -1);
  assert.equal(msbIndex(0x100n), 8);
  assert.equal(extract(0xABCDn, 11, 4), 0xBCn);
});

test("IEEE 754 decoding", () => {
  const p = f32parts(0x3F800000n);
  assert.equal(p.val, 1);
  assert.equal(p.cls, "normal");
  assert.equal(f32parts(0x7F800000n).cls, "Infinity");
  assert.equal(f64parts(0x3FF0000000000000n).val, 1);
  assert.equal(fmtFloat(-0), "−0");
  assert.equal(fmtFloat(0.1), "0.1");
});

test("insights", () => {
  assert.deepEqual(insights(0o755n, "OCT", 64)[0], { kind: "chmod", value: "rwxr-xr-x", copy: "rwxr-xr-x" });
  assert.equal(insights(0xFF5733n, "HEX", 64)[0].value, "#FF5733");
  assert.equal(insights(0xC0A80001n, "HEX", 64)[0].value, "192.168.0.1");
  assert.equal(insights(0x48n, "HEX", 64)[0].value, "H");
  assert.equal(insights(0n, "HEX", 64).length, 0);
});

/* ---------------- expression engine ---------------- */
const N = (v) => ({ t: "num", v });
const O = (v) => ({ t: "op", v });

test("precedence and associativity", () => {
  assert.equal(evaluate([N("2"), O("+"), N("3"), O("*"), N("4")]), 14);
  assert.equal(evaluate([N("2"), O("^"), N("3"), O("^"), N("2")]), 512);
  assert.equal(evaluate([O("-"), N("2"), O("^"), N("2")]), -4);
  assert.equal(evaluate([N("2"), O("^"), O("-"), N("1")]), 0.5);
  assert.equal(evaluate([N("10"), O("-"), N("4"), O("-"), N("3")]), 3);
  assert.equal(evaluate([N("8"), O("/"), N("4"), O("/"), N("2")]), 1);
});

test("parentheses, implicit multiplication and auto-close", () => {
  assert.equal(evaluate([{ t: "lp" }, N("2"), O("+"), N("3"), { t: "rp" }, O("*"), N("4")]), 20);
  assert.equal(evaluate([N("2"), { t: "lp" }, N("3"), O("+"), N("1")]), 8, "unclosed paren closes");
  assert.equal(tidy(evaluate([N("2"), { t: "const", v: "pi" }])), tidy(2 * Math.PI));
});

test("smart percent", () => {
  assert.equal(evaluate([N("200"), O("+"), N("10"), { t: "post", v: "%" }]), 220);
  assert.equal(evaluate([N("200"), O("-"), N("10"), { t: "post", v: "%" }]), 180);
  assert.equal(evaluate([N("50"), O("*"), N("10"), { t: "post", v: "%" }]), 5);
  assert.equal(evaluate([N("50"), { t: "post", v: "%" }]), 0.5);
});

test("functions in degrees and radians", () => {
  assert.equal(tidy(evaluate([{ t: "fn", v: "sin" }, N("30"), { t: "rp" }])), 0.5);
  assert.equal(evaluate([{ t: "fn", v: "cos" }, N("90")]), 0);
  assert.equal(tidy(evaluate([{ t: "fn", v: "asin" }, N("1")])), 90);
  assert.equal(tidy(evaluate([{ t: "fn", v: "sin" }, { t: "const", v: "pi" }], { deg: false })), 0);
  assert.equal(evaluate([{ t: "fn", v: "log" }, N("1000")]), 3);
  assert.equal(evaluate([{ t: "fn", v: "sqrt" }, N("16")]), 4);
  assert.equal(evaluate([{ t: "fn", v: "cbrt" }, N("27")]), 3);
  assert.equal(evaluate([N("5"), { t: "post", v: "!" }]), 120);
  assert.equal(evaluate([N("3"), { t: "post", v: "sq" }]), 9);
  assert.equal(evaluate([N("4"), { t: "post", v: "inv" }]), 0.25);
});

test("errors carry codes", () => {
  const code = (tokens) => { try { evaluate(tokens); return null; } catch (e) { assert.ok(e instanceof CalcError); return e.code; } };
  assert.equal(code([N("1"), O("/"), N("0")]), "div0");
  assert.equal(code([{ t: "fn", v: "sqrt" }, N("-1")]), "domain");
  assert.equal(code([{ t: "fn", v: "ln" }, N("0")]), "domain");
  assert.equal(code([{ t: "fn", v: "tan" }, N("90")]), "domain");
  assert.equal(code([N("171"), { t: "post", v: "!" }]), "overflow");
  assert.equal(code([{ t: "lp" }]), "syntax");
});

test("floating point noise is tidied", () => {
  assert.equal(tidy(evaluate([N("0.1"), O("+"), N("0.2")])), 0.3);
  assert.equal(numToken(1e21), "1E21");
  assert.equal(numToken(-0), "0");
});

test("scientific notation entry", () => {
  assert.equal(evaluate([N("1.5E3")]), 1500);
  assert.equal(evaluate([N("2E-3")]), 0.002);
  assert.equal(evaluate([N("7E")]), 7, "unfinished exponent tolerated");
});

/* ---------------- editing reducer ---------------- */
const run = (keys, start = { tokens: [], fresh: false }) =>
  keys.reduce((s, [k, a]) => edit(s, k, a), start);

test("typing builds tokens", () => {
  const s = run([["digit", "1"], ["digit", "2"], ["dot"], ["digit", "5"], ["op", "+"], ["digit", "3"]]);
  assert.deepEqual(s.tokens, [N("12.5"), O("+"), N("3")]);
  assert.equal(evaluate(s.tokens), 15.5);
});

test("operator replacement and unary minus", () => {
  let s = run([["digit", "2"], ["op", "+"], ["op", "*"]]);
  assert.deepEqual(s.tokens, [N("2"), O("*")]);
  s = run([["digit", "2"], ["op", "*"], ["op", "-"], ["digit", "3"]]);
  assert.equal(evaluate(s.tokens), -6);
  s = run([["op", "-"], ["digit", "5"]]);
  assert.equal(evaluate(s.tokens), -5);
  s = run([["op", "*"]]);
  assert.deepEqual(s.tokens, [N("0"), O("*")]);
});

test("result continues or restarts", () => {
  const done = { tokens: [N("42")], fresh: true };
  assert.deepEqual(edit(done, "digit", "7").tokens, [N("7")], "digit starts over");
  assert.deepEqual(edit(done, "op", "+").tokens, [N("42"), O("+")], "operator continues");
  assert.deepEqual(edit(done, "back").tokens, [], "backspace clears a result");
});

test("digit after a closing value inserts ×", () => {
  const s = run([["lp"], ["digit", "2"], ["rp"], ["digit", "3"]]);
  assert.equal(evaluate(s.tokens), 6);
});

test("sign toggle and backspace", () => {
  let s = run([["digit", "5"], ["neg"]]);
  assert.deepEqual(s.tokens, [N("-5")]);
  s = run([["neg"], ["digit", "4"]]);
  assert.deepEqual(s.tokens, [N("-4")]);
  s = run([["digit", "1"], ["digit", "2"], ["back"]]);
  assert.deepEqual(s.tokens, [N("1")]);
  s = run([["digit", "1"], ["back"]]);
  assert.deepEqual(s.tokens, []);
});

test("smart paren key", () => {
  const s = run([["paren"], ["digit", "2"], ["op", "+"], ["digit", "3"], ["paren"], ["op", "*"], ["digit", "2"]]);
  assert.equal(openParens(s.tokens), 0);
  assert.equal(evaluate(s.tokens), 10);
});

test("EE key", () => {
  const s = run([["digit", "3"], ["exp"], ["op", "-"], ["digit", "2"]]);
  assert.deepEqual(s.tokens, [N("3E-2")]);
  assert.equal(evaluate(s.tokens), 0.03);
});

test("repeat tail for = = =", () => {
  assert.deepEqual(repeatTail([N("5"), O("+"), N("3")]), [O("+"), N("3")]);
  assert.equal(repeatTail([N("5")]), null);
});

/* ---------------- presentation ---------------- */
test("locale number formatting", () => {
  assert.equal(formatNumberString("1234567.25", EN), "1,234,567.25");
  assert.equal(formatNumberString("1234567.25", NB), "1 234 567,25");
  assert.equal(formatNumberString("-12.", NB), "−12,");
  assert.equal(formatResult(0.1 + 0.2, NB), "0,3");
  assert.equal(formatResult(1e21, EN), "1E21");
  assert.equal(formatResult(1.5e-7, NB), "1,5E−7");
});

test("token rendering", () => {
  const t = [N("2"), O("*"), O("-"), N("3"), O("+"), { t: "fn", v: "sqrt" }, N("16"), { t: "rp" }];
  assert.equal(renderTokens(t, EN), "2 × −3 + √(16)");
});

test("inserting a number after a closed value multiplies explicitly", () => {
  const s = run([["lp"], ["digit", "2"], ["op", "+"], ["digit", "3"], ["rp"], ["insert", "-4"]]);
  assert.deepEqual(s.tokens.slice(-2), [O("*"), N("-4")]);
  assert.equal(evaluate(s.tokens), -20);
  assert.equal(renderTokens(s.tokens, EN), "(2 + 3) × −4");
});
