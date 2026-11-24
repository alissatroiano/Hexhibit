// Exhibition content helpers. Pure: no document, window or localStorage access.
// The puzzle registry is passed in so this module never imports puzzle handlers.

export const DEFAULT_EXHIBITION_PATH = "content/default-exhibition.json";
export const MIN_ARTWORKS = 3;
export const MAX_ARTWORKS = 6;
export const REQUIRED_MESSAGE_KEYS = [
  "enterEscape",
  "doorLocked",
  "doorUnlocked",
  "exitClosed",
  "escaped",
  "doorNudge",
  "digitsFound",
];

const ARTWORK_STRING_FIELDS = [
  "title", "artist", "year", "medium", "size", "curatorNote", "lesson",
];
const PUZZLE_STRING_FIELDS = ["prompt", "hint", "nudge", "explanation"];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const DIGIT = /^[0-9]$/;

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function describe(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "an array";
  return `a ${typeof v}`;
}

function checkString(obj, key, path, errors) {
  if (typeof obj[key] !== "string") {
    errors.push({ path: `${path}.${key}`, message: `must be a string, got ${describe(obj[key])}` });
  }
}

function validateColors(colors, path, errors) {
  if (!Array.isArray(colors) || colors.length !== 2) {
    errors.push({ path, message: "must be an array of exactly two #rrggbb strings" });
    return;
  }
  colors.forEach((c, i) => {
    if (typeof c !== "string" || !HEX_COLOR.test(c)) {
      errors.push({ path: `${path}[${i}]`, message: "must be a #rrggbb color string" });
    }
  });
}

function validatePuzzle(puzzle, path, registry, errors) {
  if (!isPlainObject(puzzle)) {
    errors.push({ path, message: `must be an object, got ${describe(puzzle)}` });
    return;
  }
  checkString(puzzle, "type", path, errors);
  PUZZLE_STRING_FIELDS.forEach((k) => checkString(puzzle, k, path, errors));
  if (typeof puzzle.digit !== "string" || !DIGIT.test(puzzle.digit)) {
    errors.push({ path: `${path}.digit`, message: "must be a single digit string, 0 to 9" });
  }
  if (typeof puzzle.type !== "string") return;
  if (!registry.has(puzzle.type)) {
    errors.push({ path: `${path}.type`, message: `unknown puzzle type "${puzzle.type}"` });
    return;
  }
  // Type-specific rules live in the handler so adding a type never touches this file.
  const typeErrors = registry.validate(puzzle.type, puzzle, path);
  if (Array.isArray(typeErrors)) {
    typeErrors.forEach((message) => {
      errors.push({ path, message: String(message) });
    });
  }
}

function validateArtwork(art, i, seenIds, registry, errors) {
  const path = `artworks[${i}]`;
  if (!isPlainObject(art)) {
    errors.push({ path, message: `must be an object, got ${describe(art)}` });
    return;
  }
  if (typeof art.id !== "string" || art.id === "") {
    errors.push({ path: `${path}.id`, message: "must be a non-empty string" });
  } else if (seenIds.has(art.id)) {
    errors.push({ path: `${path}.id`, message: `duplicate id "${art.id}"` });
  } else {
    seenIds.add(art.id);
  }
  ARTWORK_STRING_FIELDS.forEach((k) => checkString(art, k, path, errors));
  validateColors(art.colors, `${path}.colors`, errors);
  validatePuzzle(art.puzzle, `${path}.puzzle`, registry, errors);
}

/**
 * Validate parsed exhibition JSON. Never throws; reports every problem.
 * Returns the input object untouched (so unknown optional fields survive)
 * and the door code beside it.
 */
export function validateExhibition(data, registry) {
  const errors = [];
  try {
    if (!isPlainObject(data)) {
      return { ok: false, errors: [{ path: "(root)", message: `must be an object, got ${describe(data)}` }] };
    }
    if (typeof data.title !== "string") {
      errors.push({ path: "title", message: `must be a string, got ${describe(data.title)}` });
    }

    if (!isPlainObject(data.messages)) {
      errors.push({ path: "messages", message: `must be an object, got ${describe(data.messages)}` });
    } else {
      REQUIRED_MESSAGE_KEYS.forEach((k) => {
        if (typeof data.messages[k] !== "string") {
          errors.push({ path: `messages.${k}`, message: "is required and must be a string" });
        }
      });
    }

    if (!Array.isArray(data.artworks)) {
      errors.push({ path: "artworks", message: `must be an array, got ${describe(data.artworks)}` });
    } else {
      const n = data.artworks.length;
      if (n < MIN_ARTWORKS || n > MAX_ARTWORKS) {
        errors.push({
          path: "artworks",
          message: `must contain ${MIN_ARTWORKS} to ${MAX_ARTWORKS} artworks, found ${n}`,
        });
      }
      const seenIds = new Set();
      data.artworks.forEach((art, i) => validateArtwork(art, i, seenIds, registry, errors));
    }

    if (errors.length > 0) return { ok: false, errors };
    return { ok: true, exhibition: data, doorCode: computeDoorCode(data.artworks) };
  } catch (err) {
    errors.push({ path: "(root)", message: `unexpected validation failure: ${err && err.message}` });
    return { ok: false, errors };
  }
}

const UNSAFE_CHARS = /[\u0000-\u0020\u007f]/;
const HAS_SCHEME = /^[a-z][a-z0-9+.\-]*:/i;

/**
 * Same-site relative path check for ?exhibition=. Pure.
 * Returns { ok:true, path } (path null when the parameter is absent)
 * or { ok:false, reason }. Nothing is fetched here.
 */
export function resolveExhibitionPath(search, baseHref) {
  try {
    const params = new URLSearchParams(search || "");
    if (!params.has("exhibition")) return { ok: true, path: null };
    const value = params.get("exhibition");
    if (value === "") return { ok: false, reason: "empty value" };
    if (UNSAFE_CHARS.test(value)) return { ok: false, reason: "control character or whitespace" };
    if (value.startsWith("//")) return { ok: false, reason: "protocol-relative URL" };
    if (value.includes("\\")) return { ok: false, reason: "backslash" };
    if (value.includes("%")) return { ok: false, reason: "percent-encoding" };
    if (HAS_SCHEME.test(value)) return { ok: false, reason: "URL scheme" };
    if (value.split("/").includes("..")) return { ok: false, reason: "parent directory segment" };
    // Defense in depth: the resolved URL must stay on the page's origin.
    if (new URL(value, baseHref).origin !== new URL(baseHref).origin) {
      return { ok: false, reason: "different origin" };
    }
    return { ok: true, path: value };
  } catch (err) {
    return { ok: false, reason: "invalid path" };
  }
}

/**
 * Fetch, parse and validate an exhibition. Never throws.
 * fetchFn is injected so tests need no network.
 */
export async function loadExhibition(path, fetchFn, registry) {
  const fail = (message) => ({ ok: false, errors: [{ path: "(fetch)", message }] });
  let data;
  try {
    const res = await fetchFn(path);
    if (!res || !res.ok) {
      return fail(`could not load ${path} (status ${res ? res.status : "none"})`);
    }
    data = await res.json();
  } catch (err) {
    return fail(`could not load or parse ${path}: ${err && err.message}`);
  }
  return validateExhibition(data, registry);
}

/** Door code is each artwork's puzzle digit, in artwork order. */
export function computeDoorCode(artworks) {
  return artworks.map((a) => a.puzzle.digit).join("");
}

/** Replace {found} and {total} placeholders. */
export function fillTemplate(str, vars) {
  return String(str).replace(/\{(found|total)\}/g, (m, key) =>
    vars && vars[key] !== undefined ? String(vars[key]) : m
  );
}

/** Even index hangs on the left (North Wall), odd on the right (South Wall). */
export function wallFor(index) {
  return index % 2 === 0 ? "North Wall" : "South Wall";
}
