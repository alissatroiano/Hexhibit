# Design Document

## Overview

This feature adds an optional local `image` field to artworks (rendered in the Corridor and the Inspect Dialog, with a silent fallback to the existing gradient on a missing field or a load error) and polishes five areas of `assets/css/style.css`: tap-target sizing, ceiling geometry, glass placards, the door-code unlock glow, and a pointer-tracked lantern spotlight in After-Hours Mode. No framework, bundler or new dependency is introduced; everything stays plain ES modules and CSS, per `tech.md`.

Facts established by reading the current source (cited by file and area, not line numbers that will shift):

- **`.ceiling` has a geometry bug today.** `.floor` translates `translate3d(0, 180px, var(--zc))` and `.wall-left`/`.wall-right` sit at `top: -180px; height: 360px` (so their top edge is at world y = -180px). `.ceiling` translates `translate3d(0, -180.5px, var(--zc))` — off by 0.5px from the wall's top edge, which is the visible seam. Fixing it is a one-token change (`-180.5px` → `-180px`) that makes the ceiling meet the walls exactly, for any viewport width, because the mismatch is in the fixed transform, not in responsive sizing.
- **The tap-target rule exists but is wrong.** `style.css` already has a block target `.btn, .tog, .x, .banner-x, .card button, .card input:not([type=radio]), .opt` with `height: auto; margin-bottom: 20px;`. `.x` and `.banner-x` already set explicit `44px` width/height elsewhere, and `.opt` already sets `min-height: 44px`. `.btn`, `.tog`, `.pill` and `.card button` (which includes `.btn`/`.btn.ghost` buttons built by `modal.js`) have **no `min-height` anywhere** and this block's `margin-bottom: 20px` is exactly what Requirement 5.2 forbids. The fix replaces that rule's `margin-bottom: 20px` with nothing and adds `min-height: 44px` to the selector list (plus `.pill`, which the current block omits even though the design system calls it a Tap_Target).
- **`.card` has no `backdrop-filter` and no explicit `border-radius` today.** It currently reads `background: var(--wallA); border: 1px solid var(--line); box-shadow: 0 24px 70px var(--shadow); padding: 1.75rem` with no radius (defaults to square, already ≤ 8px, so Requirement 7.5 is satisfied by doing nothing to radius). Requirements 7.1-7.3 and 7.6 are net-new rules to add.
- **`.slot.on` has no transition today.** It only sets `background`, `color`, `border-color`. Requirement 8.1 is net-new. The `prefers-reduced-motion` block (which already lists `.door, .shake, .vig, [data-theme=dark] .vig, .world`) needs `.slot.on` added for Requirement 8.3, and the Vignette pointer-position update (new JS) needs to be gated by the same media query for Requirement 9.6, not by adding `.vig` again (it is already there for the CSS transition side; the JS side needs its own `matchMedia` check, mirroring the pattern `corridor.js` already uses for `reduced.matches`).
- **The dark-mode `.vig` CSS already implements the spotlight's rendering and defaults.** `[data-theme=dark] .vig` already renders `radial-gradient(circle 380px at var(--mx, 50%) var(--my, 50%), ...)`, and the base `.vig` already has `pointer-events: none`. Requirements 9.2, 9.3 and 9.7 are **already satisfied** and need only a regression test, not a code change. What is missing is the JavaScript that writes `--mx`/`--my` in response to pointer movement (Requirements 9.1, 9.4, 9.5, 9.6, 9.8) — there is currently no pointer listener anywhere in the codebase that touches `--mx`/`--my`.
- **Image rendering is entirely unbuilt.** `corridor.js`'s painting builder only creates `div.art` with `art.style.background = artGradient(p.colors)`; `modal.js`'s `openDialog` only builds `div.art` the same way from `spec.image.colors`. Neither module creates an `img` anywhere, and `content.js`'s `validateExhibition`/`validateArtwork` has no `image` handling. The schema's `artwork` definition has no `image` property.
- **Schema and validator conventions to follow.** `content.js` already has a `checkString` helper and an `ARTWORK_STRING_FIELDS` list used for required string fields; `image` is optional, so it needs its own small check function rather than reuse of `checkString` (which flags *any* non-string, required or not). Validation errors use `{ path, message }` with `path` built as `` `${path}.${key}` `` (e.g. `artworks[2].image`), which already satisfies "naming the Artwork and the `image` field" (Requirements 1.4-1.10) by construction once the path is built the same way.

## Architecture

One new module, `assets/js/spotlight.js`, is added; otherwise the module boundaries in `structure.md` are unchanged. The new module fits the structure steering rule ("Add modules **only when a task needs it**"): the spotlight gating predicate and frame coalescer must be testable in Node, and `main.js` touches the DOM at import time, so the DOM-free logic needs its own file. `spotlight.js` has no DOM access, so it needs no change to the layout described in `structure.md`. Other changes land in the existing files along existing seams:

```
content/
  exhibition.schema.json   # + optional "image" string property on $defs/artwork
  default-exhibition.json  # + image on one artwork, referencing an existing assets/images/ file
assets/js/
  content.js               # + validateImagePath() and its call from validateArtwork()
  corridor.js               # + buildArtVisual() used when building each .art element
  modal.js                  # + image rendering via buildArtVisual() from corridor.js
  spotlight.js              # NEW, DOM-free: shouldTrackPointer() + createSpotlightScheduler()
  main.js                   # + thin pointermove listener wiring spotlight.js to .vig
assets/css/style.css        # ceiling fix, tap-target fix, .art img rule, glass card, slot glow,
                             # lantern spotlight defaults (already present) + reduced-motion entries
README.md                   # + image field docs and example
```

A new tiny helper, `buildArtVisual`, is added to `corridor.js` (which already exports pure helpers like `artGradient` and is imported by nothing DOM-specific at module load time) and reused by `modal.js` so the "set gradient background, then try to add an `img` that falls back to the gradient on error" logic is written once. This keeps the puzzle-type extensibility rule intact: image handling is a property of an artwork, not of a puzzle type, so it never touches `assets/js/puzzles/`.

### Component: Image path validation (`content.js`)

```js
// Accepts absence; rejects non-strings and unsafe forms. Mirrors the style of
// resolveExhibitionPath's checks but scoped to a field, not a URL.
const IMAGE_PREFIX = "assets/images/";

function validateImagePath(art, path, errors) {
  if (art.image === undefined) return; // optional field (Requirement 1.2)
  const v = art.image;
  if (typeof v !== "string") {
    errors.push({ path: `${path}.image`, message: `must be a string, got ${describe(v)}` });
    return;
  }
  if (/^https?:/i.test(v)) errors.push({ path: `${path}.image`, message: "must not be an http(s) URL" });
  else if (v.startsWith("//")) errors.push({ path: `${path}.image`, message: "must not start with //" });
  else if (v.includes("\\")) errors.push({ path: `${path}.image`, message: "must not contain a backslash" });
  else if (v.split("/").includes("..")) errors.push({ path: `${path}.image`, message: "must not contain a .. segment" });
  else if (v.startsWith("/")) errors.push({ path: `${path}.image`, message: "must not start with /" });
  else if (!v.startsWith(IMAGE_PREFIX)) errors.push({ path: `${path}.image`, message: `must start with "${IMAGE_PREFIX}"` });
}
```

Called from `validateArtwork` alongside the existing `ARTWORK_STRING_FIELDS.forEach(...)` and `validateColors(...)` calls, using the same `path` (`` `artworks[${i}]` ``) so error paths read `artworks[2].image`, satisfying "naming the Artwork and the field" for every rejection case. Order of checks matters only for which single message is reported when a string violates more than one rule (e.g. `"http://x/.."` is reported as a scheme violation first) — the requirements only ask that *a* validation error is reported naming the artwork and field, not that every applicable rule fires, so first-match-wins is sufficient and keeps the function simple.

### Component: Shared art-image builder (`corridor.js`, reused by `modal.js`)

```js
/**
 * Build the two-layer art visual used by both the Corridor and the Inspect Dialog:
 * a gradient background (always present, so it shows while the image loads or if there
 * is no image) and, when imagePath is given, an <img> layered on top that silently
 * removes itself on error, reverting to the plain gradient. No console output, ever,
 * so a missing file degrades without noise (Requirement 3.3).
 * @param {string[]} colors two hex colors for the gradient fallback
 * @param {string|undefined} imagePath validated Image_Path, or undefined
 * @param {string} altText "" for decorative use (Corridor), or the artwork title (Inspect Dialog)
 * @returns {HTMLDivElement} a `.art` element
 */
export function buildArtVisual(colors, imagePath, altText) {
  const art = document.createElement("div");
  art.className = "art";
  art.style.background = artGradient(colors); // set synchronously, so it is always "behind" (Req 3.4)
  if (imagePath) {
    const img = document.createElement("img");
    img.src = imagePath;
    img.alt = altText;
    img.addEventListener("error", () => img.remove(), { once: true }); // silent (Req 3.1-3.3)
    art.appendChild(img);
  }
  return art;
}
```

- **Corridor usage** (replaces the current two lines `art.className = "art"; art.style.background = artGradient(p.colors);` in the painting-building loop): `const art = buildArtVisual(p.colors, p.image, "");` — `alt=""` because the figure itself already carries `aria-label="Inspect painting i of n: {title}"`, so the image stays decorative and the accessible name comes from the figure (Requirement 2.3).
- **Modal usage** (replaces the current `if (spec.image) { const img = el("div", "art"); img.style.background = gradientFor(spec.image.colors); dynEl.append(img); }` in `openDialog`): the `spec.image` shape passed from `main.js`'s `show()` helper gains the artwork's `image` and `title`, e.g. `image: img != null ? { colors: P[img].colors, path: P[img].image, title: P[img].title } : null`, and `openDialog` calls `dynEl.append(buildArtVisual(spec.image.colors, spec.image.path, spec.image.title))` — `alt` is the artwork title here because the dialog image is the subject being inspected, not a decorative repeat of a labelled control (Requirement 2.4). `modal.js` imports `buildArtVisual` from `corridor.js`; this is a one-way dependency already implied by `main.js` importing from both, and does not create a cycle (`corridor.js` imports nothing from `modal.js`).

This keeps `gradientFor` in `modal.js` unused for images going forward, but it is left in place since nothing in the requirements asks to remove it and other call sites may still reference the plain gradient box; if it becomes dead code that is a cleanup decision outside this feature's scope.

### Component: Pointer-tracked lantern spotlight (`spotlight.js`, wired from `main.js`)

The CSS side (`[data-theme=dark] .vig` radial gradient centered at `var(--mx,50%) var(--my,50%)`, `.vig { pointer-events:none }`) already exists and is unchanged. The logic is split so it can be tested in Node: `assets/js/spotlight.js` is DOM-free (no `document`, `window` or `requestAnimationFrame` references) and holds the gating predicate and the frame coalescer with an injectable scheduler. `main.js` only wires a `pointermove` listener to it.

```js
// assets/js/spotlight.js (DOM-free)

// Pure: decides whether a pointermove should move the spotlight.
export function shouldTrackPointer({ isDark, reducedMotion, pointerType }) {
  return isDark && !reducedMotion && pointerType !== "touch";
}

// At most one write per animation frame: many pointermove events between frames only
// overwrite the pending position, and the single scheduled frame writes the latest one.
// `raf` is injected so tests can use a fake scheduler instead of real frames.
export function createSpotlightScheduler({ raf, write }) {
  let frame = 0, x = 0, y = 0;
  return function update(nextX, nextY) {
    x = nextX; y = nextY;
    if (frame) return;
    frame = raf(() => { frame = 0; write(x, y); });
  };
}
```

```js
// assets/js/main.js (wiring only)
import { shouldTrackPointer, createSpotlightScheduler } from "./spotlight.js";

const vig = document.querySelector(".vig");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const spotlight = createSpotlightScheduler({
  raf: (fn) => requestAnimationFrame(fn),
  write: (x, y) => {
    vig.style.setProperty("--mx", `${(x / innerWidth * 100).toFixed(2)}%`);
    vig.style.setProperty("--my", `${(y / innerHeight * 100).toFixed(2)}%`);
  },
});
window.addEventListener("pointermove", (e) => {
  if (!shouldTrackPointer({ isDark: dark(), reducedMotion: reducedMotionQuery.matches, pointerType: e.pointerType })) return;
  spotlight(e.clientX, e.clientY);
});
```
- **Requirement 9.1/9.2/9.3**: satisfied — the listener writes `--mx`/`--my` on `.vig`, the dark-mode CSS already renders from them, and the `var(--mx, 50%)` fallback already centers the spotlight before any write happens.
- **Requirement 9.4/9.6/9.8**: satisfied by `shouldTrackPointer` returning `false` for light mode, reduced motion, or a touch pointer — in every such case the `main.js` listener returns before calling the scheduler, so `--mx`/`--my` are simply never written (not written-then-ignored; genuinely untouched), matching "stop updating" / "apply no pointer-driven updates" literally.
- **Requirement 9.5**: satisfied by the `spotlightFrame` guard — multiple `pointermove` events between frames overwrite `pendingX/pendingY` but only the first one in a given frame schedules a `requestAnimationFrame` callback, and that callback resets the guard before the next frame, so at most one `--mx`/`--my` write happens per animation frame no matter how many events arrived.
- This code never calls `corridor.walkTo` or touches `S`, so it stays outside `hygiene.test.js`'s tainted-name sink scan; it only reads `dark()` (already used elsewhere in `main.js`) and `e.clientX/clientY/pointerType`, none of which are tainted names.

## Components and Interfaces

See the "Component" subsections above for the three code components this feature touches:

- **Image path validation** — `assets/js/content.js`, new `validateImagePath(art, path, errors)`, called from the existing `validateArtwork`.
- **Shared art-image builder** — `assets/js/corridor.js`, new exported `buildArtVisual(colors, imagePath, altText)`, used by the painting-building loop in `buildCorridor` and imported by `assets/js/modal.js`'s `openDialog`.
- **Pointer-tracked lantern spotlight** — `assets/js/main.js`, new exported pure predicate `shouldTrackPointer({ isDark, reducedMotion, pointerType })` plus a `pointermove` listener that writes `--mx`/`--my` on `.vig`, throttled to one write per animation frame.

No other module's public interface changes. `content.js`'s `validateExhibition` keeps its existing signature and return shape (`{ ok, exhibition }` or `{ ok, errors }`); `corridor.js`'s `buildCorridor` keeps its existing signature; `modal.js`'s `openDialog(spec)` keeps its existing signature, with `spec.image` gaining two optional keys (`path`, `title`) alongside the existing `colors`.

## Data Models

### Schema addition (`content/exhibition.schema.json`, inside `$defs/artwork/properties`)

```json
"image": {
  "type": "string",
  "description": "Optional path to a local image file under assets/images/, used instead of the generated gradient. Must start with \"assets/images/\", and must not be an http(s) URL, start with \"//\" or \"/\", contain a \"..\" segment, or contain a backslash. The runtime validator in assets/js/content.js enforces these rules; the schema documents the type only, matching the existing pattern for other fields."
}
```

Not added to `required`, matching Requirement 1.1/1.2. No `pattern` is added to the schema itself (the rejection rules are expressed in prose and enforced by `content.js`, matching the existing convention in this schema where `puzzle.digit` is documented-but-unenforced-here and runtime-enforced fields like `colors` do carry a `pattern` — `image`'s rules are more varied than a single regex can express clearly, so prose + runtime validation keeps the schema readable, consistent with how `id`'s uniqueness rule is also described in prose and enforced only at runtime).

### Exhibition JSON (`content/default-exhibition.json`)

One artwork (`the-patient-watcher`, the first in the corridor) gains `"image": "assets/images/hexhibit-logo.png"` — this reuses an image file that already ships in the repository (`assets/images/hexhibit-logo.png`), so Requirement 4.1's "references an existing file" holds without adding a new binary asset. (If a more thematic image is added to `assets/images/` later, swapping the path is a one-line change; using the existing logo file keeps this design's file-system footprint at zero new binaries, and nothing in the requirements asks for a *new* image asset — only a valid, existing-file reference.)

### Artwork image contract (informal type, not a new class)

```
Artwork.image?: string   // Valid_Image_Path | undefined
```

No runtime object wraps this; it flows as a plain string from JSON through `validateExhibition` (unchanged passthrough, since `validateExhibition` returns `data` untouched per its existing doc comment) to `corridor.js`/`modal.js` as `p.image`.

## Error Handling

- **Validation errors** (Requirement 1.4-1.10): reported through the existing `{ path, message }` array returned by `validateExhibition`, with no new error-handling path — `main.js`'s existing `showBanner`/`loadExhibitionOrDefault` already renders whatever errors come back and falls back to the default exhibition (Requirement 1.11), unchanged.
- **Image load failure** (Requirement 3.1-3.3): handled entirely inside `buildArtVisual`'s `error` listener (`{ once: true }` so it cannot fire twice and cannot leak a listener after the element is removed). It calls only `img.remove()` — no `console.error`, no `alert`, no state mutation, no re-render trigger — so play continues with the gradient already showing underneath, and `hygiene.test.js`-style static scans (which forbid `console.*` in the scanned files) stay satisfied for any file this code is added to.
- **Schema/doc drift**: not a runtime error path; covered by the `content.test.js`-style static assertions described under Testing Strategy.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Missing image is always accepted

For any otherwise-valid exhibition in which every artwork omits the `image` field, `validateExhibition` returns `ok: true`.

**Validates: Requirements 1.2**

### Property 2: Valid image paths are always accepted

For any otherwise-valid exhibition and any string built as `"assets/images/" + s` where `s` contains no `..` path segment, no backslash, and does not itself start with `/` or contain `//` at the start of the whole path, setting that string as an artwork's `image` field leaves `validateExhibition`'s result `ok: true`.

**Validates: Requirements 1.3**

### Property 3: Each rejected path form is always rejected with a field-specific error

For any otherwise-valid exhibition, any artwork index `i`, and any string `s` matching one of the rejected forms below, setting `artworks[i].image = s` makes `validateExhibition` return `ok: false` with at least one error whose `path` equals `` `artworks[${i}].image` ``:
- `s` starts with `http://` or `https://` followed by any suffix,
- `s` starts with `//` followed by any suffix,
- `s` contains a `..` path segment anywhere,
- `s` starts with `/` (and does not start with `//`, already covered above),
- `s` contains a backslash anywhere,
- `s` is `"assets/images/"`-prefixed-rule-violating, i.e. any string not starting with `assets/images/` (and not already one of the forms above).

**Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.8, 1.9**

### Property 4: Non-string image values are always rejected

For any otherwise-valid exhibition, any artwork index `i`, and any JSON value `v` that is not a string (number, boolean, `null`, array, or object), setting `artworks[i].image = v` makes `validateExhibition` return `ok: false` with at least one error whose `path` equals `` `artworks[${i}].image` ``.

**Validates: Requirements 1.10**

### Property 5: Corridor renders an image when given a valid path, and falls back otherwise

For any artwork colors, any artwork title, and any value of `image` (a Valid_Image_Path string, or absent): `buildArtVisual(colors, image, "")` always sets a non-empty gradient `background` on the returned element; it contains exactly one `img` child with `src` equal to `image` and `alt === ""` when `image` is a non-empty string, and contains no `img` child when `image` is absent.

**Validates: Requirements 2.1, 2.3, 2.6, 3.4**

### Property 6: Inspect Dialog renders an image titled by the artwork, and falls back otherwise

For any artwork colors, any artwork title, and any value of `image` (a Valid_Image_Path string, or absent): `buildArtVisual(colors, image, title)` contains exactly one `img` child with `src === image` and `alt === title` when `image` is a non-empty string, and contains no `img` child when `image` is absent.

**Validates: Requirements 2.2, 2.4, 3.4**

### Property 7: An image error always reverts to the gradient and touches nothing else

For any artwork colors and any non-empty `image` string, building the visual with `buildArtVisual(colors, image, anyAltText)` and then dispatching an `error` event on its `img` child results in: the element having no `img` child afterward, its `background` style unchanged from what was set before the event, and no other property of the returned `.art` element mutated by the handler.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 8: Slot text always reflects solved state, never color alone

For any number of artworks between 3 and 6 and any subset of them marked solved after `enterEscape`, the text rendered into each slot (`revealedDigit(S, i) ?? "•"`) is the digit string for every solved index and the literal `"•"` for every unsolved index, so the two states are always distinguishable by text content alone.

**Validates: Requirements 8.4**

### Property 9: Pointer tracking is gated identically regardless of event history

For any combination of `isDark` (boolean), `reducedMotion` (boolean) and `pointerType` (`"mouse" | "pen" | "touch"`), `shouldTrackPointer({ isDark, reducedMotion, pointerType })` returns `true` if and only if `isDark` is `true`, `reducedMotion` is `false`, and `pointerType` is not `"touch"` — and this result depends only on the three inputs given, never on prior calls.

**Validates: Requirements 9.4, 9.6, 9.8**

### Property 10: At most one spotlight write per animation frame

For any sequence of `pointermove` events with `shouldTrackPointer` true, delivered synchronously before a scheduled animation frame callback runs, the number of times `--mx`/`--my` are actually written to `.vig` equals the number of animation frame callbacks that ran, never the number of events delivered — and the values written are always those of the most recent event before that callback ran.

**Validates: Requirements 9.1, 9.5**

## Testing Strategy

**Property tests** (Node's built-in test runner + `fast-check`, matching the existing `test/*.test.js` pattern and `test/helpers/arbitraries.js` style; minimum 100 iterations each):

- Properties 1-4 extend `test/content.test.js` using a generator built the same way as the existing `validExhibition` arbitrary in `test/helpers/arbitraries.js`, plus small new arbitraries for rejected-path-form strings (one `fc.oneof` per rejected family) and for non-string JSON values (`fc.anything().filter(v => typeof v !== "string")`).
- Properties 5-7 concern DOM behavior. **Decision (resolved): no DOM dev-dependency is added** (`tech.md` forbids new dependencies without asking). Instead, the image-builder decision logic is extracted into pure, DOM-free helpers in `content.js`: `isValidImagePath(value)` (the single source of truth used by `validateImagePath`) and `resolveArtImage(image, title, decorative)`, which returns `{ src, alt }` or `null`. `buildArtVisual` is a thin DOM wrapper over `resolveArtImage`. Properties 5 and 6 are property-tested against `resolveArtImage` with fast-check. Property 7 (error reverts to gradient) and the DOM wiring are covered by static source checks (the `error` listener calls only `img.remove()`, no `console.*`, both call sites use `buildArtVisual`) plus the manual browser verification task. These DOM-related tests are marked optional.
- Property 8 extends `test/hygiene.test.js`'s existing `revealedDigit` test pattern (it already iterates every `n` from 3-6 and every solved-subset `mask`), adding the slot-text assertion next to the existing digit assertion.
- Property 9 is a pure unit/property test for `shouldTrackPointer` imported from `assets/js/spotlight.js` in `test/spotlight.test.js`, generated over `fc.boolean(), fc.boolean(), fc.constantFrom("mouse","pen","touch")`.
- Property 10 is tested against `createSpotlightScheduler` from `assets/js/spotlight.js` by injecting a fake `raf` (a simple queue-based stand-in, following the same "inject the effectful boundary" pattern `test/helpers/sources.js` already uses for `crypto.getRandomValues`) so the coalescing logic is exercised without real frames or real timers.

**Example/unit tests** (static CSS-text and JSON-content checks, following `content.test.js`'s existing pattern of `readFileSync` + `assert.match`/`assert.ok`):

- Requirement 2.5: `style.css` contains an `.art img` rule with `object-fit: cover` (and implicitly `width`/`height: 100%` to fill the frame).
- Requirements 4.1, 4.2: the default exhibition has at least one artwork with an `image` field, that path exists on disk (`fs.existsSync`), and `validateExhibition(defaultExhibition, registry).ok === true`.
- Requirement 1.1, 10.7: the schema's `$defs.artwork.properties.image` exists with `type: "string"`.
- Requirements 5.1, 5.2, 10.4: `style.css`'s tap-target rule's selector list includes `.pill`, `.btn.ghost` (or `.btn`, matched via `:is()`/plain `.btn` plus a note that `.btn.ghost` is a `.btn`), and a `button` inside `.card` rule, each with `min-height: 44px` somewhere in the cascade and no rule anywhere setting `margin-bottom: 20px` on those selectors.
- Requirements 7.1, 7.2, 10.5: `.card`'s rule block contains both `backdrop-filter: blur(16px)` and `-webkit-backdrop-filter: blur(16px)`.
- Requirements 7.3, 7.5, 7.6: a translucent card-background token is defined in both the `:root` block and the `:root[data-theme=dark]` block, `.card`'s `border-radius` (if any) is ≤ 8px, and an `@supports not (backdrop-filter: blur(1px))` block raises the card background's opacity.
- Requirement 6.1, 6.2, 6.3: the `.ceiling` rule's `translate3d` Y component has the same magnitude as `.floor`'s (currently `180px` both), a comment near `.ceiling` explains the choice, and `.viewport`'s `perspective: 750px` plus the `translateZ`-based transform structure in `.floor`/`.wall-left`/`.wall-right`/`.wall-back`/`.ceiling` are unchanged in form.
- Requirements 8.1, 8.2, 8.3, 10.6: `.slot.on` (or `.slot`) declares a `transition` covering border/color/box-shadow with a duration between `300ms` and `700ms`; the existing `prefers-reduced-motion` block's selector list includes `.slot` or `.slot.on`; `.slot`'s base (non-`.on`) rule still uses `var(--muted)`.
- Requirements 9.2, 9.3, 9.7 (regression only, already passing today): `[data-theme=dark] .vig` is a `radial-gradient(... at var(--mx, 50%) var(--my, 50%) ...)` and base `.vig` has `pointer-events: none`.
- Requirements 4.3, 4.4: a light-touch check that `README.md` contains the string `"image"` near the artwork-authoring section and shows a fenced example block containing `"image":`.

**Manual/browser verification** (per `tech.md`'s "verify in a browser at desktop and phone widths before marking it done" and Requirement 5.3, which is not automatable in this Node-only test setup): confirm at 390px, 768px and 1440px in both themes that (a) the ceiling shows no seam at the walls, (b) tap targets measure ≥44px and sit with no extra gap below them, (c) the lantern spotlight follows the mouse in dark mode and stays centered with `prefers-reduced-motion` or on a touch device, and (d) a deliberately-broken image path (e.g. temporarily renaming the referenced file) shows the gradient with no console error.
