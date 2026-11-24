import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

import {
  PHASES,
  createState,
  enterEscape,
  markSolved,
  markViewed,
  revealHint,
  submitCode,
  returnToGallery,
  revealedDigit,
} from "../assets/js/state.js";
import { n as nArb, opSequence } from "./helpers/arbitraries.js";
import { constantSource, cyclingSource, prngSource } from "./helpers/sources.js";

const makeIds = (n) => Array.from({ length: n }, (_, i) => `art-${i}`);

function snapshot(s) {
  return {
    phase: s.phase,
    artworkIds: [...s.artworkIds],
    viewed: [...s.viewed].sort(),
    solved: [...s.solved].sort(),
    hints: [...s.hints].sort(),
    currentIndex: s.currentIndex,
    doorCode: s.doorCode,
  };
}

// A wrong code of the right length that is never equal to `code`.
function wrongOf(code) {
  const first = String((Number(code[0]) + 1) % 10);
  return first + code.slice(1);
}

function inputFor(mode, code) {
  const real = code ?? "123";
  if (mode === "right") return real;
  if (mode === "padded") return `  ${real}\t\n`;
  if (mode === "wrong") return wrongOf(real);
  return "not-a-code";
}

function checkInvariants(s, n) {
  assert.ok(PHASES.includes(s.phase));
  for (const set of [s.solved, s.viewed, s.hints]) {
    for (const id of set) assert.ok(s.artworkIds.includes(id));
  }
  assert.equal(s.doorCode === null, s.phase === "gallery");
  if (s.doorCode !== null) {
    assert.equal(typeof s.doorCode, "string");
    assert.equal(s.doorCode.length, n);
    assert.match(s.doorCode, /^[0-9]+$/);
    assert.ok(new Set(s.doorCode).size > 1, "code is all-identical");
  }
  for (let i = 0; i < n; i++) {
    const d = revealedDigit(s, i);
    if (s.solved.has(s.artworkIds[i])) assert.equal(d, s.doorCode[i]);
    else assert.equal(d, null);
  }
}

// Feature: per-game-door-code, Property 8: State invariants hold under any operation sequence
test("Property 8: State invariants hold under any operation sequence", () => {
  fc.assert(
    fc.property(
      nArb.chain((n) => fc.tuple(fc.constant(n), opSequence(makeIds(n)), fc.integer(), fc.boolean())),
      ([n, ops, seed, useCycling]) => {
        const ids = makeIds(n);
        const source = useCycling
          ? cyclingSource([seed & 0xff, (seed >>> 8) & 0xff, 7, 42, 199, 3])
          : prngSource(seed);
        const s = createState(ids);
        checkInvariants(s, n);

        for (const op of ops) {
          const before = snapshot(s);
          const callsBefore = source.calls;
          let refused = false;
          let success = false;

          switch (op.kind) {
            case "enter":
              success = enterEscape(s, source);
              refused = !success;
              if (refused) assert.equal(source.calls, callsBefore, "refused enterEscape drew bytes");
              break;
            case "return":
              success = returnToGallery(s);
              refused = !success;
              break;
            case "viewed":
              refused = !markViewed(s, op.id);
              break;
            case "solved":
              refused = !markSolved(s, op.id);
              break;
            case "hint":
              refused = !revealHint(s, op.id);
              break;
            case "submit": {
              const res = submitCode(s, inputFor(op.mode, s.doorCode));
              refused = res !== "correct";
              break;
            }
          }

          checkInvariants(s, n);
          if (refused) assert.deepEqual(snapshot(s), before, `refused ${op.kind} changed state`);

          const entered = op.kind === "enter" && success;
          const returned = op.kind === "return" && success;
          if (entered) assert.equal(before.doorCode, null);
          if (returned) assert.equal(s.doorCode, null);
          if (!entered && !returned) assert.equal(s.doorCode, before.doorCode);
        }
      }
    ),
    { numRuns: 200 }
  );
});

// Build a state in the requested phase; the code comes from a seeded source.
function stateInPhase(n, phase, seed) {
  const ids = makeIds(n);
  const s = createState(ids);
  if (phase === "gallery") return s;
  enterEscape(s, prngSource(seed));
  if (phase === "escape") return s;
  if (phase === "solved") {
    ids.forEach((id) => markSolved(s, id));
    return s;
  }
  // escaped
  ids.forEach((id) => markSolved(s, id));
  assert.equal(submitCode(s, s.doorCode), "correct");
  return s;
}

// Feature: per-game-door-code, Property 9: Door submission succeeds only in solved with the session code
test("Property 9: Door submission succeeds only in solved with the session code", () => {
  fc.assert(
    fc.property(
      nArb,
      fc.constantFrom(...PHASES),
      fc.integer(),
      fc.constantFrom("right", "padded", "wrong", "garbage", "empty"),
      fc.string({ maxLength: 8 }),
      (n, phase, seed, mode, random) => {
        const s = stateInPhase(n, phase, seed);
        const code = s.doorCode ?? "000";
        const input = mode === "empty" ? random : inputFor(mode, code);
        const before = snapshot(s);
        const expectCorrect = phase === "solved" && input.trim() === s.doorCode;
        const res = submitCode(s, input);

        if (expectCorrect) {
          assert.equal(res, "correct");
          assert.equal(s.phase, "escaped");
        } else {
          assert.equal(res, phase === "escape" ? "unsolved" : "wrong");
          assert.deepEqual(snapshot(s), before);
        }
        if (phase === "escape" && s.doorCode !== null) {
          // Even the exact code is refused until every puzzle is solved.
          assert.equal(submitCode(s, s.doorCode), "unsolved");
          assert.equal(s.phase, "escape");
        }
      }
    ),
    { numRuns: 200 }
  );
});

// ---- Example tests ----

test("createState starts with doorCode null", () => {
  const s = createState(makeIds(3));
  assert.equal(s.doorCode, null);
  assert.equal(s.phase, "gallery");
});

test("enterEscape stores a code of length N for every N", () => {
  for (let n = 3; n <= 6; n++) {
    const s = createState(makeIds(n));
    assert.equal(enterEscape(s, prngSource(n)), true);
    assert.equal(s.phase, "escape");
    assert.equal(s.doorCode.length, n);
  }
});

test("enterEscape in a non-gallery phase makes zero source calls", () => {
  for (const phase of ["escape", "solved", "escaped"]) {
    const s = stateInPhase(3, phase, 5);
    const src = constantSource(1);
    const before = snapshot(s);
    assert.equal(enterEscape(s, src), false);
    assert.equal(src.calls, 0);
    assert.deepEqual(snapshot(s), before);
  }
});

test("returnToGallery clears the code and progress", () => {
  const s = stateInPhase(3, "escaped", 9);
  assert.equal(returnToGallery(s), true);
  assert.equal(s.phase, "gallery");
  assert.equal(s.doorCode, null);
  assert.equal(s.solved.size, 0);
});

test("a second game with a different source stores a different code", () => {
  const s = createState(makeIds(6));
  enterEscape(s, cyclingSource([1, 2, 3, 4, 5, 6]));
  const first = s.doorCode;
  makeIds(6).forEach((id) => markSolved(s, id));
  assert.equal(submitCode(s, first), "correct");
  returnToGallery(s);
  enterEscape(s, cyclingSource([9, 8, 7, 6, 5, 4]));
  assert.notEqual(s.doorCode, first);
  assert.equal(s.doorCode, "987654");
});

test("submitCode uses the stored code and ignores a third argument", () => {
  const s = createState(makeIds(3));
  enterEscape(s, cyclingSource([1, 2, 3]));
  makeIds(3).forEach((id) => markSolved(s, id));
  assert.equal(submitCode.length, 2);
  assert.equal(submitCode(s, "999", "123"), "wrong");
  assert.equal(submitCode(s, " 123 ", "999"), "correct");
});

test("enterEscape failures throw and leave the state unchanged", () => {
  const throwing = () => {
    throw new Error("no entropy");
  };
  const cases = [
    { ids: makeIds(3), source: throwing },
    { ids: makeIds(3), source: () => 300 },
    { ids: makeIds(3), source: () => "7" },
    { ids: makeIds(2), source: constantSource(4) },
    { ids: makeIds(7), source: constantSource(4) },
  ];
  for (const { ids, source } of cases) {
    const s = createState(ids);
    const before = snapshot(s);
    assert.throws(() => enterEscape(s, source));
    assert.deepEqual(snapshot(s), before);
    assert.equal(s.phase, "gallery");
    assert.equal(s.doorCode, null);
    assert.equal(s.solved.size, 0);
  }
});

test("revealedDigit is null for bad indexes and before entering", () => {
  const s = createState(makeIds(3));
  assert.equal(revealedDigit(s, 0), null);
  enterEscape(s, cyclingSource([1, 2, 3]));
  assert.equal(revealedDigit(s, -1), null);
  assert.equal(revealedDigit(s, 3), null);
  assert.equal(revealedDigit(s, 1.5), null);
  markSolved(s, "art-1");
  assert.equal(revealedDigit(s, 1), "2");
  assert.equal(revealedDigit(s, 0), null);
});
