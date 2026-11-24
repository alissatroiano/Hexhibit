// Feature: per-game-door-code, task 5.1: source-text and leak rules (Requirements 2.8, 3.4).
// Static checks read the app sources as text; runtime checks import the pure modules in Node.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { prngSource } from "./helpers/sources.js";

const read = (rel) => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), "utf8");

// ---- Scanner -------------------------------------------------------------------------------------
// Walks the source once, respecting '', "" and template literals, so "//" inside a string such as a
// URL is not mistaken for a comment. Returns the source without comments, and the statements split
// on ";" outside strings. Template literals stay in one piece, including their ${...} parts.
// Limitation: regex literals are not recognised (main.js has none).
function skipTemplate(src, i) {
  // src[i] is the opening backtick; returns the index just after the closing one.
  i += 1;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") i += 2;
    else if (c === "`") return i + 1;
    else if (c === "$" && src[i + 1] === "{") i = skipBraces(src, i + 2);
    else i += 1;
  }
  return i;
}
function skipBraces(src, i) {
  // i is just after "${"; returns the index just after the matching "}".
  let depth = 1;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === "`") i = skipTemplate(src, i);
    else if (c === '"' || c === "'") i = skipQuoted(src, i);
    else {
      if (c === "{") depth += 1;
      else if (c === "}") depth -= 1;
      i += 1;
    }
  }
  return i;
}
function skipQuoted(src, i) {
  const q = src[i];
  i += 1;
  while (i < src.length && src[i] !== q) i += src[i] === "\\" ? 2 : 1;
  return i + 1;
}
export function scan(src) {
  let out = "";
  const statements = [];
  let cur = "";
  const push = (text) => { out += text; cur += text; };
  let i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { while (i < src.length && src[i] !== "\n") i += 1; }
    else if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); i = e === -1 ? src.length : e + 2; push(" "); }
    else if (c === '"' || c === "'") { const j = skipQuoted(src, i); push(src.slice(i, j)); i = j; }
    else if (c === "`") { const j = skipTemplate(src, i); push(src.slice(i, j)); i = j; }
    else if (c === ";") { out += c; statements.push(cur.trim()); cur = ""; i += 1; }
    else { push(c); i += 1; }
  }
  if (cur.trim()) statements.push(cur.trim());
  return { code: out, statements };
}
const norm = (s) => s.replace(/\s+/g, " ").trim();

// ---- Sink allowlist scan -------------------------------------------------------------------------
// Names that carry the door code (or a digit of it) in main.js: S (holds doorCode), doorCode,
// revealedDigit, and any variable assigned from a revealedDigit(...) call.
const BASE_TAINTED = ["S", "doorCode", "revealedDigit"];
// Calls and properties that could move a value into an attribute, the URL, storage or the console.
const SINKS = [
  "setAttribute(", "setAttributeNS(", ".dataset", ".title", ".ariaLabel", "aria-", ".id =", ".name =",
  ".value =", ".href", ".src", ".innerHTML", ".outerHTML", "insertAdjacentHTML", ".style", "classList",
  "location", "history.", "localStorage", "sessionStorage", "console.",
];
// The only statements that may mention a tainted name together with a sink or a textContent write.
// Each is compared whole, after whitespace is collapsed.
export const ALLOWLIST = [
  // Passes the phase, never the code, to the theme attribute.
  "root.dataset.theme = themeFor(S.phase)",
  "root.dataset.theme = themeFor(ph)",
  // The slot text: the return value of revealedDigit, or a bullet when it is null.
  'e.textContent = d ?? "•"',
  // Progress counters: sizes of the solved and viewed sets, not the code.
  '$("prog").textContent = dk ? `${S.solved.size}/${n} solved` : `${S.viewed.size}/${n} artworks viewed`',
].map(norm);
// Text sinks that are allowed by call, not by statement: setStatus(...) writes the dialog status text,
// and show(...) opens the dialog with its text. They are still checked against SINKS above.
const TEXT_CALLS = [/\bsetStatus\s*\(/, /\bshow\s*\(/];

export function taintedNames(code) {
  const names = new Set(BASE_TAINTED);
  for (const m of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*revealedDigit\s*\(/g)) names.add(m[1]);
  return [...names];
}
const mentions = (stmt, name) => new RegExp(`(?<![\\w$.])${name.replace(/\$/g, "\\$")}(?![\\w$])`).test(stmt);

/** Returns the statements that break the leak rules (empty when clean). */
export function findLeaks(src) {
  const { code, statements } = scan(src);
  const tainted = taintedNames(code);
  const bad = [];
  for (const stmt of statements) {
    if (!tainted.some((t) => mentions(stmt, t))) continue;
    if (ALLOWLIST.includes(norm(stmt))) continue;
    const sink = SINKS.find((s) => stmt.includes(s));
    if (sink) { bad.push(`${sink} :: ${norm(stmt)}`); continue; }
    if (/\.textContent\s*=/.test(stmt) && !TEXT_CALLS.some((re) => re.test(stmt))) bad.push(`textContent :: ${norm(stmt)}`);
  }
  return bad;
}

// ---- Static checks on the app sources ------------------------------------------------------------
const main = scan(read("assets/js/main.js"));
const stateSrc = scan(read("assets/js/state.js"));
const random = scan(read("assets/js/random.js"));
const content = scan(read("assets/js/content.js"));
const modal = scan(read("assets/js/modal.js"));

test("scanner ignores comments and keeps '//' inside strings", () => {
  const { code } = scan('const u = "http://x"; // console.log(1)\n/* localStorage */ const v = `a//b`;');
  assert.ok(code.includes('"http://x"') && code.includes("`a//b`"));
  assert.ok(!code.includes("console") && !code.includes("localStorage"));
});

test("scanner flags leaks it should catch", () => {
  assert.equal(findLeaks('el.setAttribute("data-x", S.doorCode);').length, 1);
  assert.equal(findLeaks("const d = revealedDigit(S, 0); el.title = d;").length, 1);
  assert.equal(findLeaks("const d = revealedDigit(S, 0); other.textContent = d;").length, 1);
  assert.equal(findLeaks("const d = revealedDigit(S, 0); localStorage.setItem('k', d);").length, 1);
  assert.equal(findLeaks('const d = revealedDigit(S, 0); a.textContent = d ?? "x";').length, 1);
  assert.equal(findLeaks("// el.setAttribute('a', S)\nconst z = 1;").length, 0);
});

test("random.js has no Math.random, crypto, window or document", () => {
  for (const word of ["Math.random", "crypto", "window", "document"]) {
    assert.ok(!random.code.includes(word), `random.js mentions ${word}`);
  }
});

test("random.js and state.js import in Node", async () => {
  await import("../assets/js/random.js");
  await import("../assets/js/state.js");
});

test("main.js has no code reads, no logging, no storage, no URL writes", () => {
  const c = main.code;
  assert.ok(!/\.digit\b/.test(c), ".digit");
  assert.ok(!/\bdoorCode\b/.test(c), "doorCode");
  assert.ok(!/\bCODE\b/.test(c), "CODE");
  assert.ok(!/\bconsole\s*\./.test(c), "console.*");
  assert.ok(!/\b(localStorage|sessionStorage)\b/.test(c), "storage");
  assert.ok(!/\blocation\s*\.\s*hash\b/.test(c), "location.hash");
  assert.ok(!/\bhistory\s*\./.test(c), "history.*");
  assert.ok(!/%\s*10\b/.test(c), "% 10");
  // location is only read (search, href); it is never assigned or navigated.
  assert.ok(!/\blocation\s*(\.\s*\w+)?\s*=(?!=)/.test(c), "location assignment");
  assert.ok(!/\blocation\s*\.\s*(assign|replace)\s*\(/.test(c), "location.assign/replace");
});

test("main.js does not expose S or anything else on window", () => {
  const c = main.code;
  assert.ok(!/\bwindow\s*\.\s*S\b/.test(c), "window.S");
  assert.ok(!/\bwindow\s*\.\s*[\w$]+\s*=(?!=)/.test(c), "window.<name> = ...");
  assert.ok(!/\bwindow\s*\[[^\]]*\]\s*=(?!=)/.test(c), "window[...] = ...");
  assert.ok(!/\b(globalThis|self)\s*(\.\s*[\w$]+|\[[^\]]*\])\s*=(?!=)/.test(c), "globalThis assignment");
  assert.ok(!/Object\s*\.\s*(assign|defineProperty)\s*\(\s*(window|globalThis)\b/.test(c), "window defineProperty/assign");
  assert.ok(/^let\s+S\b|[\r\n]let\s+S\b/.test(c), "S must be a module-scoped let");
});

test("main.js has exactly one getRandomValues call, inside byteSource", () => {
  const calls = main.code.match(/getRandomValues/g) ?? [];
  assert.equal(calls.length, 1);
  assert.ok(/const\s+byteSource\s*=\s*\(\)\s*=>\s*\{[^}]*getRandomValues[^}]*\}/.test(main.code), "getRandomValues outside byteSource");
});

test("main.js reports a lock failure as info, never bad", () => {
  assert.ok(/setStatus\(\s*LOCK_FAILED_TEXT\s*,\s*"info"\s*\)/.test(main.code));
  const uses = [...main.code.matchAll(/setStatus\(\s*LOCK_FAILED_TEXT\s*,\s*([^)]*)\)/g)];
  assert.ok(uses.length > 0 && uses.every((m) => m[1].trim() === '"info"'), "LOCK_FAILED_TEXT kind");
  assert.ok(!/LOCK_FAILED_TEXT[^;]*"bad"/.test(main.code));
});

test('modal.js keeps info: "" in STATUS_PREFIX', () => {
  assert.ok(/STATUS_PREFIX\s*=\s*\{[^}]*\binfo:\s*""/.test(modal.code));
});

test("content.js has no computeDoorCode and no DIGIT", () => {
  assert.ok(!/computeDoorCode/.test(content.code));
  assert.ok(!/\bDIGIT\b/.test(content.code));
});

test("main.js sinks: no tainted value reaches an attribute, URL, storage or console", () => {
  const tainted = taintedNames(main.code);
  assert.ok(tainted.includes("d"), "expected d (assigned from revealedDigit) to be tracked");
  assert.deepEqual(findLeaks(read("assets/js/main.js")), []);
});

test("main.js keeps the allowlisted statements it relies on", () => {
  // If main.js changes shape, the allowlist must be reviewed, so every entry must still be used or absent on purpose.
  const stmts = main.statements.map(norm);
  assert.ok(stmts.includes(ALLOWLIST[1]) || stmts.includes(ALLOWLIST[0]), "theme statement");
  assert.ok(stmts.includes(ALLOWLIST[2]), "slot text statement");
  assert.ok(stmts.includes(ALLOWLIST[3]), "progress statement");
});

// ---- Runtime checks ------------------------------------------------------------------------------
const { createState, enterEscape, markSolved, returnToGallery, revealedDigit } = await import("../assets/js/state.js");
const ids = (n) => Array.from({ length: n }, (_, i) => `a${i}`);

test("revealedDigit is null for every unsolved artwork, for every solved subset", () => {
  for (let n = 3; n <= 6; n += 1) {
    for (let mask = 0; mask < 2 ** n - 1; mask += 1) {
      const s = createState(ids(n));
      assert.equal(enterEscape(s, prngSource(n * 100 + mask)), true);
      for (let i = 0; i < n; i += 1) if (mask & (1 << i)) markSolved(s, `a${i}`);
      for (let i = 0; i < n; i += 1) {
        const solved = Boolean(mask & (1 << i));
        const d = revealedDigit(s, i);
        if (solved) assert.equal(d, s.doorCode[i]);
        else assert.equal(d, null, `n=${n} mask=${mask} index=${i}`);
      }
    }
  }
});

test("revealedDigit is null before the game starts, after return, and for bad indices", () => {
  const s = createState(ids(3));
  for (let i = -1; i <= 3; i += 1) assert.equal(revealedDigit(s, i), null);
  enterEscape(s, prngSource(7));
  ids(3).forEach((id) => markSolved(s, id));
  s.phase = "escaped";
  returnToGallery(s);
  for (let i = 0; i < 3; i += 1) assert.equal(revealedDigit(s, i), null);
  for (const bad of [-1, 3, 1.5, NaN, "0", undefined]) assert.equal(revealedDigit(s, bad), null);
});

test("the default exhibition has no doorCode or digit key at any depth", () => {
  const keys = [];
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { keys.push(k); walk(x); }
  };
  walk(JSON.parse(read("content/default-exhibition.json")));
  assert.ok(keys.length > 0);
  assert.ok(!keys.includes("doorCode"), "doorCode key");
  assert.ok(!keys.includes("digit"), "digit key");
});
