import fc from "fast-check";

// Code length: the number of artworks.
export const n = fc.integer({ min: 3, max: 6 });

// Up to 80 arbitrary bytes followed by one accepted byte (0..249), so a cycling
// source never sees 100 consecutive discarded bytes.
export const byteSeq = fc
  .tuple(
    fc.array(fc.integer({ min: 0, max: 255 }), { maxLength: 80 }),
    fc.integer({ min: 0, max: 249 })
  )
  .map(([a, b]) => [...a, b]);

// Groups of (0..5 discarded bytes 250..255, then one accepted byte 0..249).
export const groupedStream = fc.array(
  fc.tuple(
    fc.array(fc.integer({ min: 250, max: 255 }), { maxLength: 5 }),
    fc.integer({ min: 0, max: 249 })
  ),
  { minLength: 1, maxLength: 80 }
);

// Operation sequences for state tests. Ids are indexes into the id list; an index
// at or past ids.length means an unknown id. A "submit" step carries a mode that
// the test resolves against the current state.doorCode (right, wrong, or padded).
export function opSequence(ids) {
  const idx = fc.integer({ min: 0, max: ids.length + 1 });
  const idOf = (i) => (i < ids.length ? ids[i] : `unknown-${i}`);
  const op = fc.oneof(
    fc.constant({ kind: "enter" }),
    fc.constant({ kind: "return" }),
    idx.map((i) => ({ kind: "viewed", id: idOf(i) })),
    idx.map((i) => ({ kind: "solved", id: idOf(i) })),
    idx.map((i) => ({ kind: "hint", id: idOf(i) })),
    fc
      .constantFrom("right", "padded", "wrong", "garbage")
      .map((mode) => ({ kind: "submit", mode }))
  );
  return fc.array(op, { minLength: 1, maxLength: 60 });
}

// ---- Exhibition arbitrary (content tests) ----
const word = fc.constantFrom("lantern", "echo", "tide", "candle", "window", "stair");
const text = fc.array(word, { minLength: 1, maxLength: 4 }).map((w) => w.join(" "));
const hexColor = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 6, maxLength: 6 })
  .map((d) => "#" + d.map((x) => x.toString(16)).join(""));
const jsonValueNormalized = fc
  .jsonValue()
  .map((v) => JSON.parse(JSON.stringify(v)));
// Unknown fields must start with "x_" so they can never collide with real fields.
const extras = fc.dictionary(
  word.map((w) => `x_${w}`),
  jsonValueNormalized,
  { maxKeys: 3 }
);

const commonPuzzle = fc.record({
  prompt: text,
  hint: text,
  nudge: text,
  explanation: text,
});

const riddlePuzzle = fc.record({
  type: fc.constant("riddle"),
  answers: fc.array(text, { minLength: 1, maxLength: 3 }),
});

const choicePuzzle = fc
  .array(text, { minLength: 2, maxLength: 6 })
  .chain((options) =>
    fc.record({
      type: fc.constant("choice"),
      options: fc.constant(options),
      correctIndex: fc.integer({ min: 0, max: options.length - 1 }),
    })
  );

// `digit` is absent, or any normalized JSON value of any type (including null).
const puzzle = fc
  .tuple(
    commonPuzzle,
    fc.oneof(riddlePuzzle, choicePuzzle),
    fc.record({ digit: jsonValueNormalized }, { requiredKeys: [] }),
    extras
  )
  .map(([c, t, d, x]) => ({ ...x, ...c, ...t, ...d }));

const artworkBody = fc.record({
  title: text,
  artist: text,
  year: text,
  medium: text,
  size: text,
  curatorNote: text,
  lesson: text,
  colors: fc.tuple(hexColor, hexColor),
  puzzle,
});

// 3 to 6 artworks with unique ids, mixed puzzle types, optional x_ fields.
export const validExhibition = fc
  .tuple(
    fc.array(fc.tuple(artworkBody, extras), { minLength: 3, maxLength: 6 }),
    text,
    extras
  )
  .map(([arts, title, topExtras]) => ({
    ...topExtras,
    title,
    messages: {
      enterEscape: "a",
      doorLocked: "b",
      doorUnlocked: "c",
      exitClosed: "d",
      escaped: "e",
      doorNudge: "f",
      digitsFound: "{found}/{total}",
    },
    artworks: arts.map(([body, x], i) => ({ ...x, id: `art-${i}`, ...body })),
  }));

// ---- dual-mode-visual-architecture arbitraries ----

// Viewport: topBarHeight never exceeds the viewport height.
export const viewportArb = fc
  .tuple(fc.integer({ min: 360, max: 1920 }), fc.integer({ min: 640, max: 1080 }))
  .chain(([width, height]) =>
    fc.record({
      width: fc.constant(width),
      height: fc.constant(height),
      topBarHeight: fc.integer({ min: 0, max: height }),
    })
  );

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const segment = fc.constantFrom("lantern", "echo", "tide", "candle", "window", "stair");
const safeImagePath = fc
  .tuple(
    fc.array(segment, { maxLength: 2 }),
    segment,
    fc.constantFrom(...IMAGE_EXTS)
  )
  .map(([dirs, name, ext]) => ["assets/images/art", ...dirs, name].join("/") + ext);

// Each unsafe path breaks exactly one rule of isSafeArtworkImagePath.
const unsafeImagePath = fc
  .tuple(safeImagePath, fc.constantFrom("scheme", "slash", "doubleSlash", "backslash", "dotdot", "query", "fragment", "prefix", "ext", "empty"))
  .map(([p, kind]) => {
    switch (kind) {
      case "scheme": return "https://example.com/" + p;
      case "slash": return "/" + p;
      case "doubleSlash": return "//" + p;
      case "backslash": return p.replace("art/", "art\\");
      case "dotdot": return p.replace("art/", "art/../");
      case "query": return p + "?x=1";
      case "fragment": return p + "#x";
      case "prefix": return p.replace("assets/images/art/", "assets/other/");
      case "ext": return p.replace(/\.[a-z]+$/, ".gif");
      default: return "";
    }
  });

// Safe and unsafe paths, plus arbitrary strings.
export const artworkImagePathArb = fc.oneof(
  safeImagePath,
  unsafeImagePath,
  fc.string({ maxLength: 40 })
);

// Saved game: doorCode has one digit per artwork id; solved and hintsUsed are
// subsets of the ids (hintsUsed matches the Game_State `hints` set).
export const savedGameArb = n.chain((count) => {
  const artworkIds = Array.from({ length: count }, (_, i) => `art-${i}`);
  return fc.record({
    v: fc.constant(1),
    artworkIds: fc.constant(artworkIds),
    doorCode: fc
      .array(fc.integer({ min: 0, max: 9 }), { minLength: count, maxLength: count })
      .map((d) => d.join("")),
    solved: fc.subarray(artworkIds),
    hintsUsed: fc.subarray(artworkIds),
  });
});

export const UI_KEYS = [
  "escapeCta",
  "afterHoursHint",
  "solvedMarker",
  "viewedMarker",
  "lockedLabel",
  "unlockedLabel",
  "modeAnnouncement",
  "sessionResumed",
];

// Random subset of the seven ui keys, each with a string value.
export const uiSubsetArb = fc
  .subarray(UI_KEYS)
  .chain((keys) =>
    fc.record(Object.fromEntries(keys.map((k) => [k, text])))
  );
