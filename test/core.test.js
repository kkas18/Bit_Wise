import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mask, toSigned, fmt, literal, applyOp, opNOT, opNEG, rol, ror, popcount, msbIndex, extract,
  f32parts, f64parts, fmtFloat, insights, createState, pressKey, swapOperands, undoClear, setBit, setWordSize,
} from "../public/js/core.js";

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

/* ---------------- key state machine ---------------- */
const keys = (s, list) => list.map((k) => pressKey(s, k));

test("chained operations evaluate left to right", () => {
  const s = createState({ mode: "DEC" });
  keys(s, ["1", "2", "ADD", "3", "MUL", "2", "EQ"]);
  assert.equal(s.cur, 30n);
});

test("unary keys keep the pending operation", () => {
  const s = createState({ mode: "DEC" });
  keys(s, ["5", "ADD", "3", "ROL", "MUL", "2", "EQ"]);
  assert.equal(s.cur, 22n, "(5 + ROL 3) × 2");
});

test("operator replacement and repeated equals", () => {
  const s = createState({ mode: "DEC" });
  keys(s, ["5", "ADD", "SUB", "2", "EQ"]);
  assert.equal(s.cur, 3n);
  keys(s, ["EQ", "EQ"]);
  assert.equal(s.cur, mask(-1n, 64), "repeats − 2 twice");
});

test("digits outside the base are rejected, overflow is blocked", () => {
  const s = createState({ mode: "OCT", bits: 8 });
  assert.equal(pressKey(s, "9"), "rejected");
  const h = createState({ mode: "HEX", bits: 8 });
  keys(h, ["F", "F"]);
  assert.equal(pressKey(h, "F"), "overflow");
  assert.equal(h.cur, 0xFFn);
});

test("division by zero sets error, next digit recovers", () => {
  const s = createState({ mode: "DEC" });
  assert.deepEqual(keys(s, ["8", "DIV", "0", "EQ"]).at(-1), "error");
  assert.equal(s.err, true);
  pressKey(s, "7");
  assert.equal(s.err, false);
  assert.equal(s.cur, 7n);
});

test("swap, undo and backspace", () => {
  const s = createState({ mode: "DEC" });
  keys(s, ["3", "SUB", "8"]);
  assert.equal(swapOperands(s), "ok");
  pressKey(s, "EQ");
  assert.equal(s.cur, 5n);
  keys(s, ["AC", "4", "2", "BS"]);
  assert.equal(s.cur, 4n);
  keys(s, ["ADD", "1", "AC"]);
  assert.equal(undoClear(s), true);
  assert.equal(s.op, "ADD");
  pressKey(s, "EQ");
  assert.equal(s.cur, 5n);
});

test("bits and word size", () => {
  const s = createState();
  setBit(s, 8, true);
  assert.equal(s.cur, 256n);
  assert.equal(setBit(s, 8, true), false, "no change");
  setWordSize(s, 8);
  assert.equal(s.cur, 0n, "masked to 8 bits");
});

/* ---------------- review fixes ---------------- */
test("an error forgets the repeated operation", () => {
  const s = createState({ mode: "DEC" });
  keys(s, ["5", "ADD", "3", "EQ", "8", "DIV", "0", "EQ"]);
  assert.equal(s.err, true);
  pressKey(s, "EQ");
  assert.equal(s.err, false);
  assert.equal(s.cur, 0n, "no stale + 3 replayed");
});

test("undo only restores a clear that nothing followed", () => {
  const s = createState({ mode: "DEC" });
  keys(s, ["1", "2", "3", "4", "AC", "5", "MUL", "6", "EQ"]);
  assert.equal(undoClear(s), false);
  assert.equal(s.cur, 30n, "the newer result survives");
});

test("00 is all-or-nothing on overflow", () => {
  const s = createState({ mode: "HEX", bits: 8 });
  keys(s, ["1"]);
  assert.equal(pressKey(s, "00"), "overflow");
  assert.equal(s.cur, 1n, "not half-applied to 0x10");
});

test("floats print exactly (shortest round-trip, whole integers in full)", async () => {
  const { fmtFloat, f32parts: f32, f64parts: f64 } = await import("../public/js/core.js");
  assert.equal(fmtFloat(f64(0x4271F71FB04CB000n).val), "1234567890123");
  assert.equal(fmtFloat(f32(0x56800001n).val, 32), "70368752566272");
  assert.equal(fmtFloat(f32(0x40490FDBn).val, 32), "3.1415927");
  assert.equal(fmtFloat(f32(0x3DCCCCCDn).val, 32), "0.1");
  assert.equal(fmtFloat(-2.5), "−2.5");
});

test("hint chips follow signed DEC values", () => {
  assert.deepEqual(insights(3000000000n, "DEC", 32, true), [], "negative in signed mode: no Unix time");
  assert.deepEqual(insights(0xFFFFFFFFFFFFFFFFn, "DEC", 64, true), [], "-1 is not 'max u64'");
  assert.equal(insights(3000000000n, "DEC", 32, false)[0].kind, "unix");
});

test("rejected keys keep the undo; word size changes mask it", () => {
  const s = createState({ mode: "OCT" });
  keys(s, ["7", "7", "AC"]);
  assert.equal(pressKey(s, "9"), "rejected");
  assert.equal(undoClear(s), true, "a rejected digit did not wipe the undo");
  assert.equal(s.cur, 0o77n);
  const w = createState({ mode: "HEX", bits: 64 });
  keys(w, ["F", "F", "F", "F", "AC"]);
  setWordSize(w, 8);
  undoClear(w);
  assert.equal(w.cur, 0xFFn, "restored value fits 8 bits");
});

test("minus signs are typographic everywhere in float output", async () => {
  const { fmtFloat } = await import("../public/js/core.js");
  assert.equal(fmtFloat(-1.5e-7), "−1.5e−7");
});
