import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { validateExhibition } from "../assets/js/content.js";
import { registry } from "../assets/js/puzzles/index.js";

// Runs on every shipped exhibition in content/*.json (the schema file excluded).
// Used by the validate-exhibition hook: schema compliance, local images, puzzle solvability.
const ROOT = new URL("../", import.meta.url);
const files = readdirSync(new URL("content/", ROOT)).filter(
  (f) => f.endsWith(".json") && !f.endsWith(".schema.json")
);
const IMAGE_PATH = /^assets\/images\/art\/[^?#\\:]*\.(jpg|jpeg|png|webp)$/;
const EMOJI = /\p{Extended_Pictographic}/u;
const normalize = (s) => s.trim().replace(/\s+/g, " ").toLowerCase();

const strings = (v, out = []) => {
  if (typeof v === "string") out.push(v);
  else if (v && typeof v === "object") Object.values(v).forEach((c) => strings(c, out));
  return out;
};

for (const file of files) {
  const data = JSON.parse(readFileSync(new URL(`content/${file}`, ROOT), "utf8"));

  test(`${file}: passes runtime schema validation`, () => {
    const result = validateExhibition(structuredClone(data), registry);
    assert.equal(result.ok, true, JSON.stringify(result.errors));
  });

  test(`${file}: images are local, credited and present on disk`, () => {
    for (const a of data.artworks) {
      for (const key of ["image", "hauntedImage"]) {
        if (a[key] === undefined) continue;
        assert.match(a[key], IMAGE_PATH, `${a.id}.${key} must be a local path under assets/images/art/`);
        assert.ok(!a[key].split("/").includes(".."), `${a.id}.${key} must not contain ..`);
        assert.ok(existsSync(new URL(a[key], ROOT)), `${a.id}.${key} file is missing: ${a[key]}`);
      }
      if (a.image !== undefined) assert.ok(a.credit?.trim(), `${a.id} has an image but no credit`);
      if (a.hauntedImage !== undefined) assert.ok(a.image, `${a.id} has hauntedImage without image`);
    }
  });

  test(`${file}: every puzzle is solvable`, () => {
    for (const a of data.artworks) {
      const p = a.puzzle;
      assert.ok(registry.has(p.type), `${a.id}: unknown puzzle type ${p.type}`);
      if (p.type === "riddle") {
        assert.ok(p.answers.length > 0 && p.answers.every((x) => normalize(x) !== ""), `${a.id}: riddle needs non-empty answers`);
      }
      if (p.type === "choice") {
        assert.ok(Number.isInteger(p.correctIndex) && p.correctIndex >= 0 && p.correctIndex < p.options.length, `${a.id}: correctIndex out of range`);
        assert.equal(new Set(p.options.map(normalize)).size, p.options.length, `${a.id}: duplicate options`);
      }
    }
    assert.equal(new Set(data.artworks.map((a) => a.id)).size, data.artworks.length, "duplicate artwork ids");
  });

  test(`${file}: no hardcoded door digits and no emoji`, () => {
    for (const a of data.artworks) assert.equal("digit" in a.puzzle, false, `${a.id}: remove puzzle.digit`);
    assert.equal("doorCode" in data, false, "exhibition must not contain a doorCode");
    for (const s of strings(data)) assert.equal(EMOJI.test(s), false, `emoji found in: ${s}`);
  });
}
