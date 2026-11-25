# Design Document

## Overview

The landing page intro currently lives in two inline `<script>` blocks in `index.html`: one plays the intro video and reveals the page, the other runs a scroll-driven image expansion and a magnetic-button effect that reference elements (`.media`, `.btn`) that do not exist in the current markup, so they are dead code. This feature extracts the intro logic into a new ES module `assets/js/landing.js`, adds a mute toggle button, fixes the playback-reliability gaps (rejected `play()`, `error` event, double-reveal), removes the dead scripts and the `#videoClickLayer`/`.video-click-layer` leftovers, corrects markup defects (duplicate `<title>`, absolute video path, missing favicon, missing `rel="noopener"`), de-duplicates the `prefers-reduced-motion` block in `assets/css/landing.css`, and updates `README.md` and `.kiro/steering/structure.md` to describe `index.html` as the landing page and `play.html` as the game entry point.

No persistence is introduced. The intro plays on every load; nothing is written to `localStorage`, `sessionStorage`, cookies, or the URL, consistent with the `tech` steering's "nothing is saved yet" rule for anything outside the planned save-and-resume feature.

## Architecture

```
index.html
  <video id="introVideo" muted autoplay playsinline>          (relative src, no inline scripts)
  <button id="muteToggleBtn">                                  (new, inside #videoIntroWrapper)
  <button id="skipIntroBtn">
  <script type="module" src="assets/js/landing.js">            (single module load, no inline scripts)

assets/js/landing.js  (new ES module)
  initLandingIntro()   - wires DOM refs, starts playback, attaches listeners
  reveal()             - idempotent fade-out + removal of the overlay
  toggleMute(video, button) - pure-ish toggle of muted state + button label/aria-pressed
  prefersReducedMotion() - reads the media query once

assets/css/landing.css
  - removes .video-click-layer rule
  - removes rules that only served the deleted scroll-expansion/magnetic-button scripts
  - de-duplicates the prefers-reduced-motion block
  - adds .mute-toggle-btn rule (Antonio, uppercase, 0.16em letter-spacing, existing tokens, 44px tap target)
  - adds a :focus-visible rule for the intro overlay's controls and the CTA link
```

No other module in the game app (`assets/js/main.js`, `state.js`, `corridor.js`, etc.) is touched; `play.html` and its game logic are out of scope. `index.html` stops being a candidate for game-markup tests — confirmed by inspection that no existing test under `test/` currently asserts game markup against `index.html`, so Requirements 6.3/6.4 are satisfied by a new guard test rather than by editing an existing one.

## Components and Interfaces

### `assets/js/landing.js`

```js
// Intro-video playback, mute toggle, and reveal for the Hexhibit landing page (index.html).
// No persistence: nothing here reads or writes localStorage, sessionStorage, cookies, or the URL.

const MUTE_LABEL = "MUTE";
const UNMUTE_LABEL = "UNMUTE";

/** True when the visitor has asked for reduced motion. Read once per call, not cached, so it
 *  reflects the current OS/browser setting if it changes mid-session. */
export function prefersReducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Flips the video's muted state and syncs the button's label/aria-pressed to match.
 * Pure with respect to playback: never calls play(), pause(), or touches currentTime,
 * so the video keeps playing from wherever it was (Requirement 1.9).
 * Returns the new muted value for callers/tests that want it.
 */
export function toggleMute(video, button) {
  video.muted = !video.muted;
  button.textContent = video.muted ? UNMUTE_LABEL : MUTE_LABEL;
  button.setAttribute("aria-pressed", String(!video.muted));
  return video.muted;
}

/**
 * Fades out and removes the intro overlay. Safe to call multiple times or from multiple
 * triggers (ended, error, rejected play(), Skip) — only the first call has any effect
 * (Requirement 2.6).
 */
export function createReveal(wrapper, video) {
  let done = false;
  return function reveal() {
    if (done) return;
    done = true;
    video.pause();
    if (prefersReducedMotion()) {
      wrapper.remove();
      return;
    }
    wrapper.classList.add("fade-out");
    setTimeout(() => wrapper.remove(), 850);
  };
}

/** Wires the DOM for the intro overlay. Called once on module load. */
export function initLandingIntro(doc = document) {
  const wrapper = doc.getElementById("videoIntroWrapper");
  const video = doc.getElementById("introVideo");
  const skipBtn = doc.getElementById("skipIntroBtn");
  const muteBtn = doc.getElementById("muteToggleBtn");
  if (!wrapper || !video || !skipBtn || !muteBtn) return;

  const reveal = createReveal(wrapper, video);

  muteBtn.textContent = UNMUTE_LABEL;
  muteBtn.setAttribute("aria-pressed", "false");
  muteBtn.addEventListener("click", () => toggleMute(video, muteBtn));

  video.addEventListener("ended", reveal);
  video.addEventListener("error", reveal);
  skipBtn.addEventListener("click", reveal);

  const playResult = video.play();
  if (playResult && typeof playResult.catch === "function") {
    playResult.catch(reveal);
  }
}

initLandingIntro();
```

Design choices:
- `createReveal` returns a closure holding its own `done` flag instead of a module-level flag, so each call to `initLandingIntro` (including in tests, which can call it against a fresh `document`-like fixture) gets independent state.
- `toggleMute` and `createReveal`/`reveal` take their DOM nodes as parameters instead of reading globals, so they are unit-testable in Node without a browser, matching the existing style of `assets/js/state.js` (pure functions over passed-in state).
- `initLandingIntro` is the only function that touches `document` directly and is guarded so a missing element (e.g. in a future markup change) fails safe instead of throwing.

### `index.html` changes

- Remove the duplicate first `<title>Landing Page</title>`, keep `<title>Hexhibit</title>`.
- Add `<link rel="icon" href="assets/images/favicon.png">` in `<head>`.
- Change the video source to `assets/videos/hexhibit.mp4` (relative) and add the `muted` attribute on `<video>`.
- Remove `#videoClickLayer` and its element.
- Add the mute button markup inside `#videoIntroWrapper`:
  ```html
  <button id="muteToggleBtn" class="mute-toggle-btn" type="button" aria-pressed="false">UNMUTE</button>
  ```
- Replace both inline `<script>` blocks with a single `<script type="module" src="assets/js/landing.js"></script>`.
- Add `rel="noopener"` to the CTA link: `<a href="play.html" target="_blank" rel="noopener" class="cta-btn">`.

### `assets/css/landing.css` changes

- Delete `.video-click-layer` rule block.
- Delete the second, duplicate `@media (prefers-reduced-motion: reduce)` block (keep one).
- Add `.mute-toggle-btn`: positioned near `.skip-intro-btn` (e.g. `bottom: 24px; left: 24px;`), `font-family: "Antonio", sans-serif`, `text-transform: uppercase`, `letter-spacing: 0.16em`, `min-width: 44px; min-height: 44px;`, using `var(--ink)`/`var(--bg)`-equivalent existing tokens already used by `.skip-intro-btn` (`rgba(255,255,255,.7)` on `rgba(0,0,0,.5)`, consistent with the existing skip button so both read as a matched pair).
- Add a `:focus-visible` rule covering `.mute-toggle-btn`, `.skip-intro-btn`, `.cta-btn`, and `.open-btn` with a visible outline using `var(--accent)` or `#fff` depending on the dark overlay context, checked for AA contrast against its background.
- No rule is removed that is still used by `.nav`, `.hero`, `.jumbotron`, `.headline`, `.subtitle`, or the modal — those are kept. Only rules that exclusively supported the deleted scroll-expansion/magnetic-button script (there are none with dedicated selectors today, since `.media`/`.btn` rules don't exist in this file) are confirmed absent; this satisfies 4.5 without deleting shared rules.

### Docs

- `.kiro/steering/structure.md`: update the layout block to show `index.html` as landing page, add `play.html`, `assets/css/landing.css`, `assets/js/landing.js` to the tree.
- `README.md`: add/update a section describing `index.html` as the landing page with the intro video and mute control, and `play.html` as the game entry point reached via "Enter Hexhibit".

## Data Models

No data model changes. No new persisted or transmitted data; `landing.js` holds only transient in-memory DOM references and the `done` flag inside `createReveal`'s closure, discarded on navigation/reload.

## Error Handling

| Condition | Handling |
|---|---|
| `video.play()` returns a rejected promise (e.g. autoplay blocked) | `reveal()` runs immediately, so the visitor sees the landing page instead of a stuck black screen (Req 2.2). |
| `video` fires `error` | `reveal()` runs (Req 2.3). |
| Required DOM nodes are missing (`wrapper`, `video`, `skipBtn`, `muteBtn`) | `initLandingIntro` returns early without throwing, so a markup regression doesn't break the rest of the page. |
| `reveal()` invoked more than once (ended + error + skip race, or rapid double-click) | Guarded by the `done` flag; only the first call has effect (Req 2.6). |
| `prefers-reduced-motion: reduce` | `reveal()` skips the fade class/timeout and removes the overlay immediately (Req 2.8). |

## Testing Strategy

Tests are added under `test/` using `node --test`, consistent with the existing suite (`test/smoke.test.js`, `test/state.test.js`, `test/hygiene.test.js`). `landing.js`'s exported functions (`toggleMute`, `createReveal`, `prefersReducedMotion`) are plain functions over passed-in objects, so they can be unit- and property-tested with small fake DOM objects (plain objects with the handful of properties/methods used: `muted`, `textContent`, `setAttribute`, `classList.add`, `remove`, `pause`), without a browser or jsdom dependency, matching the project's "no added dependencies" rule.

- **Unit/example tests** (`test/landing.test.js`):
  - Markup checks on `index.html` text: exactly one `<title>Hexhibit</title>`, no inline `<script>` (only the one `type="module"` tag), relative video `src="assets/videos/hexhibit.mp4"`, `muted` attribute present, `<link rel="icon" href="assets/images/favicon.png">` present, `rel="noopener"` alongside `target="_blank"` on the CTA link, no `#videoClickLayer` id in the markup, a `<button id="muteToggleBtn">` with no emoji/icon characters.
  - CSS checks on `assets/css/landing.css` text: no `.video-click-layer` rule, exactly one `@media (prefers-reduced-motion: reduce)` block, a `.mute-toggle-btn` rule with `text-transform: uppercase` and a `letter-spacing: 0.16em` declaration and a `min-width`/`min-height` of at least `44px`.
  - Reveal sequence example: build a fake `wrapper`/`video`, call the returned `reveal()` once, assert `video.pause` was called, `wrapper.classList.add("fade-out")` was called (when not reduced-motion), and after advancing the fake timer `wrapper.remove` was called.
  - Reduced-motion example: with `prefersReducedMotion` stubbed to return `true`, assert `reveal()` calls `wrapper.remove()` without adding `fade-out`.
  - Initial label example: after `initLandingIntro` wiring (or directly asserting the markup default), the mute button starts as `"UNMUTE"` / `aria-pressed="false"`.
  - Guard test for Requirement 6.3/6.4: scan `test/**/*.test.js` source text for `index.html` combined with game-only identifiers (`introVideo`... no — game identifiers such as `doorCode`, `corridor`, `#slots`) and assert none exist, so a future game test can't accidentally target `index.html`.
- **Property tests** (same file, using the project's existing hand-rolled "generate many inputs" style seen in `test/state.test.js`/`test/random.test.js`, since `fast-check` is listed as a dev-only dependency already available per the `tech` steering):
  - **Property 1** (toggle): generated over many `{ initialMuted: boolean, currentTime: number, paused: boolean }` fixtures.
  - **Property 2** (reveal exactly once): generated over many trigger-call-count/order combinations.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Mute toggle is consistent and playback-preserving

For any fake video object with any starting `muted` boolean, any `currentTime` number, and any `paused` boolean, and any fake button object with any starting `textContent`/`aria-pressed`, calling `toggleMute(video, button)` SHALL flip `video.muted` to its opposite, SHALL set `button.textContent` to `"MUTE"` when the new `video.muted` is `false` and to `"UNMUTE"` when it is `true`, SHALL set `button.getAttribute("aria-pressed")` to the string form of the new `video.muted` being `false`, and SHALL leave `video.currentTime` and `video.paused` unchanged from their values before the call.

**Validates: Requirements 1.4, 1.5, 1.9**

### Property 2: Reveal runs its effects exactly once regardless of trigger count or order

For any sequence of 1 to N calls to the `reveal` function returned by `createReveal(wrapper, video)` (N ≥ 1, calls made in any order and from any simulated trigger), `video.pause` SHALL be called exactly once, `wrapper.remove` SHALL be called exactly once (after the fade timeout, or immediately under reduced motion), and `wrapper.classList.add("fade-out")` SHALL be called at most once and only when reduced motion is not in effect.

**Validates: Requirements 2.6, 2.7, 2.8**
