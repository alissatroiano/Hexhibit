import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { generateDoorCode, MAX_ALL_SAME_RETRIES, REJECT_FROM } from "../assets/js/random.js";
import { constantSource, cyclingSource, prngSource } from "./helpers/sources.js";
import { n, byteSeq, groupedStream } from "./helpers/arbitraries.js";

const RUNS = 200;
const allSame = (s) => [...s].every((c) => c === s[0]);

// Feature: per-game-door-code, Property 1: A generated code is never all-identical
test("Property 1: A generated code is never all-identical", () => {
  fc.assert(
    fc.property(n, byteSeq, (len, seq) => {
      assert.equal(allSame(generateDoorCode(cyclingSource(seq), len)), false);
    }),
    { numRuns: RUNS }
  );
  // Constant sources are the worst case: every attempt is all-identical.
  fc.assert(
    fc.property(n, fc.integer({ min: 0, max: 249 }), (len, b) => {
      assert.equal(allSame(generateDoorCode(constantSource(b), len)), false);
    }),
    { numRuns: RUNS }
  );
});

// Feature: per-game-door-code, Property 2: Code length equals the artwork count
test("Property 2: Code length equals the artwork count", () => {
  fc.assert(
    fc.property(n, byteSeq, (len, seq) => {
      assert.equal(generateDoorCode(cyclingSource(seq), len).length, len);
    }),
    { numRuns: RUNS }
  );
});

// Feature: per-game-door-code, Property 3: Every code character is a digit
test("Property 3: Every code character is a digit", () => {
  fc.assert(
    fc.property(n, byteSeq, (len, seq) => {
      const code = generateDoorCode(cyclingSource(seq), len);
      assert.equal(typeof code, "string");
      assert.match(code, /^[0-9]+$/);
    }),
    { numRuns: RUNS }
  );
});

// Feature: per-game-door-code, Property 4: Equal byte sequences give equal codes
test("Property 4: Equal byte sequences give equal codes", () => {
  fc.assert(
    fc.property(n, byteSeq, (len, seq) => {
      assert.equal(
        generateDoorCode(cyclingSource(seq), len),
        generateDoorCode(cyclingSource(seq), len)
      );
    }),
    { numRuns: RUNS }
  );
});

// Feature: per-game-door-code, Property 5: Different sources are not all the same
test("Property 5: Different sources are not all the same", () => {
  fc.assert(
    fc.property(
      n,
      fc.uniqueArray(fc.integer({ min: 0, max: 0x7fffffff }), { minLength: 50, maxLength: 60 }),
      (len, seeds) => {
        const codes = new Set(seeds.map((s) => generateDoorCode(prngSource(s), len)));
        assert.ok(codes.size > 1, "50+ seeds produced one single code");
      }
    ),
    { numRuns: RUNS }
  );
});

// Reference model: accepted bytes mod 10 (cycled), chunked by N, first
// non-identical chunk wins, else the 11th chunk with the Fix_Up applied.
function modelCode(groups, len) {
  const accepted = groups.map(([, b]) => b % 10);
  const chunk = (k) =>
    Array.from({ length: len }, (_, i) => accepted[(k * len + i) % accepted.length]);
  for (let k = 0; k <= MAX_ALL_SAME_RETRIES; k += 1) {
    const c = chunk(k);
    if (!c.every((d) => d === c[0])) return c.join("");
  }
  const last = chunk(MAX_ALL_SAME_RETRIES);
  last[len - 1] = (last[len - 1] + 1) % 10;
  return last.join("");
}

// Feature: per-game-door-code, Property 6: Mapping matches the reference model
test("Property 6: Mapping matches the reference model", () => {
  fc.assert(
    fc.property(n, groupedStream, (len, groups) => {
      const bytes = groups.flatMap(([discarded, b]) => [...discarded, b]);
      assert.ok(bytes.every((b) => b <= 255) && REJECT_FROM === 250);
      assert.equal(generateDoorCode(cyclingSource(bytes), len), modelCode(groups, len));
    }),
    { numRuns: RUNS }
  );
});
