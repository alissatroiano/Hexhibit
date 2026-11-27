import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import fc from "fast-check";
import * as content from "../assets/js/content.js";
import { registry } from "../assets/js/puzzles/index.js";
import { MIN_CODE_LENGTH, MAX_CODE_LENGTH } from "../assets/js/random.js";
import { validExhibition } from "./helpers/arbitraries.js";

const { validateExhibition, MIN_ARTWORKS, MAX_ARTWORKS } = content;
const readJson = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const deepKeys = (v, out = []) => {
  if (v && typeof v === "object") {
    for (const [k, c] of Object.entries(v)) {
      out.push(k);
      deepKeys(c, out);
    }
  }
  return out;
};

// Feature: per-game-door-code, Property 7: Exhibition round trip, with or without digit
// Validates: Requirements 5.3, 5.4, 5.5, 5.6, 5.7, 8.2
test("Feature: per-game-door-code, Property 7: Exhibition round trip, with or without digit", () => {
  fc.assert(
    fc.property(validExhibition, (ex) => {
      const loaded = validateExhibition(JSON.parse(JSON.stringify(ex)), registry);
      assert.equal(loaded.ok, true, JSON.stringify(loaded.errors));
      assert.deepStrictEqual(loaded.exhibition, JSON.parse(JSON.stringify(ex)));
      assert.equal("doorCode" in loaded, false);
      assert.equal("doorCode" in loaded.exhibition, false);
    }),
    { numRuns: 200 }
  );
});

// Requirements 5.3, 5.4, 5.5
test("validation accepts exhibitions without digit and with digit values of any type", () => {
  const base = () => readJson("content/default-exhibition.json");
  assert.equal(validateExhibition(base(), registry).ok, true);
  for (const value of ["x", 12, null, {}]) {
    const ex = base();
    ex.artworks.forEach((a) => {
      a.puzzle.digit = value;
    });
    const res = validateExhibition(ex, registry);
    assert.equal(res.ok, true, `digit ${JSON.stringify(value)}`);
    assert.equal("doorCode" in res, false);
  }
});

// Requirement 5.6
test("computeDoorCode is not exported", () => {
  assert.equal("computeDoorCode" in content, false);
});

// Requirements 6.1 to 6.4, 6.6, 5.3
test("default exhibition: 6 artworks, unique ids, credited images, mixed puzzles, no digit, 7 messages", () => {
  const ex = readJson("content/default-exhibition.json");
  assert.equal(ex.artworks.length, 6);
  const ids = ex.artworks.map((a) => a.id);
  assert.equal(new Set(ids).size, 6);
  for (const a of ex.artworks) {
    assert.ok(a.image && a.credit, `${a.id} needs an image and a credit`);
  }
  const types = ex.artworks.map((a) => a.puzzle.type);
  assert.ok(types.filter((t) => t === "riddle").length >= 2);
  assert.ok(types.filter((t) => t === "choice").length >= 2);
  assert.equal(deepKeys(ex).includes("digit"), false);
  assert.deepEqual(Object.keys(ex.messages).sort(), [...content.REQUIRED_MESSAGE_KEYS].sort());
  assert.equal(Object.keys(ex.messages).length, 7);
  assert.ok("exitClosed" in ex.messages);
  const res = validateExhibition(ex, registry);
  assert.equal(res.ok, true, JSON.stringify(res.errors));
});

// Requirements 5.1, 5.2, 7.4
test("schema: digit is optional, deprecated and untyped; root description updated", () => {
  const schema = readJson("content/exhibition.schema.json");
  const puzzle = schema.$defs.puzzle;
  assert.equal(puzzle.required.includes("digit"), false);
  assert.equal(puzzle.properties.digit.deprecated, true);
  assert.equal("type" in puzzle.properties.digit, false);
  assert.equal(puzzle.additionalProperties, true);
  assert.match(schema.description, /generated/);
  assert.equal(schema.description.includes("puzzle digits in artwork order"), false);
});

// Requirement 6.6 (code length follows the artwork count)
test("code length limits equal artwork count limits", () => {
  assert.equal(MIN_CODE_LENGTH, MIN_ARTWORKS);
  assert.equal(MAX_CODE_LENGTH, MAX_ARTWORKS);
});
