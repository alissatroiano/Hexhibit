import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { webcrypto } from "node:crypto";
import {
  generateDoorCode,
  drawDigit,
  MAX_ALL_SAME_RETRIES,
  MAX_DRAWS_PER_DIGIT,
  REJECT_FROM,
} from "../assets/js/random.js";
import {
  constantSource,
  cyclingSource,
  sequenceSource,
  scriptedSource,
  prngSource,
} from "./helpers/sources.js";
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

// ---- Example tests (Requirement 8.5, 8.6, 8.8, 8.10) ----

const LENGTHS = [3, 4, 5, 6];
const lastDigit = (s) => Number(s[s.length - 1]);

// Req 8.5: Fix_Up path with a constant source, for each N and several bytes.
test("Fix_Up: constant source gives a non-identical code for every N", () => {
  for (const len of LENGTHS) {
    for (const b of [0, 3, 7, 9, 10, 249]) {
      const src = constantSource(b);
      const code = generateDoorCode(src, len);
      const d = b % 10;
      assert.equal(code.length, len);
      assert.equal(allSame(code), false, `N=${len} b=${b}`);
      assert.equal(lastDigit(code), (d + 1) % 10, `N=${len} b=${b}`);
      assert.equal(code.slice(0, -1), String(d).repeat(len - 1));
      // 11 attempts of N digits each, then terminate.
      assert.equal(src.calls, (MAX_ALL_SAME_RETRIES + 1) * len, `N=${len} b=${b}`);
    }
  }
});

// Req 8.6: retry-success, first attempt all identical.
test("Retry: second attempt is returned, no Fix_Up applied", () => {
  for (const len of LENGTHS) {
    const varied = [1, 2, 3, 4, 5, 6].slice(0, len);
    const src = scriptedSource([...Array(len).fill(3), ...varied]);
    const code = generateDoorCode(src, len);
    assert.equal(code, varied.join(""));
    assert.equal(src.calls, 2 * len);
  }
});

// Req 8.6: retry-success on the 11th (last) attempt, still no Fix_Up.
test("Retry: success on the 11th attempt is returned unchanged", () => {
  for (const len of LENGTHS) {
    const varied = [1, 2, 3, 4, 5, 6].slice(0, len);
    const identical = Array(MAX_ALL_SAME_RETRIES * len).fill(3);
    const src = scriptedSource([...identical, ...varied]);
    const code = generateDoorCode(src, len);
    assert.equal(code, varied.join(""));
    assert.equal(src.calls, (MAX_ALL_SAME_RETRIES + 1) * len);
  }
});

// Req 1.7, 8.8: bad N throws RangeError before the source is called.
test("generateDoorCode throws RangeError for N of 2, 7, 3.5 and NaN", () => {
  for (const bad of [2, 7, 3.5, NaN]) {
    const src = constantSource(1);
    assert.throws(() => generateDoorCode(src, bad), RangeError, `N=${bad}`);
    assert.equal(src.calls, 0, `source called for N=${bad}`);
  }
});

// Req 1.8, 8.8: invalid source values throw and never return a code.
test("generateDoorCode throws for invalid source values", () => {
  for (const bad of [-1, 256, 1.5, NaN, "7", undefined]) {
    assert.throws(() => generateDoorCode(() => bad, 4), TypeError, `value=${String(bad)}`);
  }
  assert.throws(() => generateDoorCode(undefined, 4), TypeError);
});

// Req 1.9, 8.8: a source that always returns 255 throws, not loops.
test("constantSource(255) throws after exactly 100 calls", () => {
  const direct = constantSource(255);
  assert.throws(() => drawDigit(direct), Error);
  assert.equal(direct.calls, MAX_DRAWS_PER_DIGIT);
  const viaGenerator = constantSource(255);
  assert.throws(() => generateDoorCode(viaGenerator, 3), Error);
  assert.equal(viaGenerator.calls, MAX_DRAWS_PER_DIGIT);
});

// Req 8.10: a getRandomValues based source gives the right length and characters.
test("webcrypto-based source gives correct length and digit characters", () => {
  const source = () => webcrypto.getRandomValues(new Uint8Array(1))[0];
  for (const len of LENGTHS) {
    for (let i = 0; i < 50; i += 1) {
      const code = generateDoorCode(source, len);
      assert.equal(code.length, len);
      assert.match(code, /^[0-9]+$/);
      assert.equal(allSame(code), false);
    }
  }
});

// Req 8.10: no modulo bias. Bytes 0..249 once each hit every digit 25 times.
test("bytes 0..249 map to each digit exactly 25 times", () => {
  const bytes = Array.from({ length: REJECT_FROM }, (_, i) => i);
  const src = sequenceSource(bytes);
  const counts = Array(10).fill(0);
  for (let i = 0; i < REJECT_FROM; i += 1) counts[drawDigit(src)] += 1;
  assert.deepEqual(counts, Array(10).fill(25));
  assert.equal(src.calls, REJECT_FROM);
});

test("bytes 250..255 are discarded, then 7 returns 7 after 7 calls", () => {
  const src = sequenceSource([250, 251, 252, 253, 254, 255, 7]);
  assert.equal(drawDigit(src), 7);
  assert.equal(src.calls, 7);
});
