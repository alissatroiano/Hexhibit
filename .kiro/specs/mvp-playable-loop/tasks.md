# Implementation Plan: mvp-playable-loop

> Digits and the door code are superseded by per-game-door-code; see its Superseded criteria table.

## Overview

The plan turns the single-file prototype into the data-driven playable loop in small steps. The order is: test tooling, exhibition data and loader, game state, puzzle registry, the `riddle` and `choice` puzzle types, then the remaining module extraction and gallery/door/escape wiring, and finally tests, accessibility checks and the README.

Implementation language: JavaScript (ES modules, no build step). Tests use `node --test` with `fast-check` as the only dev dependency.

Ground rules for every task:

- The app stays runnable after each task. Serve it with a static server from the repo root (for example `npx serve .` or `python -m http.server`), because ES modules and `fetch` of JSON do not work from `file://`.
- Pure-logic tasks are checked with `node --test`. UI tasks are checked in a browser at 390px, 768px and 1440px wide, in both themes, with the console open (steering: "verify in a browser at desktop and phone widths before marking it done").
- Until task 10.1, the prototype script `assets/js/script.js` keeps running unchanged. New modules under `assets/js/` are added without being imported by the page until a task wires them in.
- Do not rename or move `assets/images/hexhibit-logo.png` or `assets/images/favicon.png`.

## Tasks

- [x] 1. Add test tooling
  - Create `package.json` with `"type": "module"`, a `test` script of `node --test`, and `fast-check` under `devDependencies` only. Run `npm install`.
  - Add `test/smoke.test.js` with one trivial passing test so `node --test` runs and exits 0.
  - Confirm `index.html` does not reference `package.json`, `node_modules` or `test/`.
  - _Requirements: 15.3, 15.4, 15.7, 1.2_

- [x] 2. Create the exhibition data and schema
  - [x] 2.1 Create `content/default-exhibition.json`
    - Include `title`, all seven `messages` keys (`enterEscape`, `doorLocked`, `doorUnlocked`, `staffOnly`, `escaped`, `doorNudge`, `digitsFound` with `{found}` and `{total}`), and exactly 3 artworks with short placeholder text.
    - Give each artwork `id`, `title`, `artist`, `year` (string), `medium`, `size`, `curatorNote`, `lesson`, two `#rrggbb` `colors`, and one puzzle with `type`, `prompt`, `hint`, `nudge`, `explanation` and a one-character `digit`. Use at least one `riddle` (with `answers`) and one `choice` (with `options` and `correctIndex`).
    - Use theatrical, friendly museum voice with no gore. No emoji.
    - Verify the file opens as valid JSON (for example `node -e "JSON.parse(require('fs').readFileSync('content/default-exhibition.json','utf8'))"`).
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 2.2 Create `content/exhibition.schema.json`
    - Write JSON Schema (draft 2020-12) documenting the root, the seven required `messages` keys, the artwork fields, the common puzzle fields, and `riddle` and `choice` fields (`if/then` on `type`).
    - Set `additionalProperties: true` on artwork and puzzle objects, bound `artworks` to 3 to 6 items, and state in the root `description` that the `?exhibition=` parameter is a testing aid and not a share link.
    - Verify the file parses as JSON.
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.9, 3.12_

- [x] 3. Implement the exhibition loader (`assets/js/content.js`)
  - [x] 3.1 Implement validation helpers
    - Export `DEFAULT_EXHIBITION_PATH`, `MIN_ARTWORKS`, `MAX_ARTWORKS`, `REQUIRED_MESSAGE_KEYS`, `validateExhibition(data, registry)`, `computeDoorCode`, `fillTemplate` and `wallFor`.
    - `validateExhibition` never throws, returns the input object untouched plus `doorCode`, and reports every problem with a field path (for example `artworks[1].puzzle.digit`). Enforce the rules in the design: root types, seven message keys, 3 to 6 artworks, unique non-empty ids, string fields, `colors` as two `#rrggbb` strings, `digit` matching `^[0-9]$`, `registry.has(type)`, and type-specific errors from `registry.validate`.
    - Keep the module free of `document`, `window` and `localStorage` access at import time.
    - Check by importing the module in Node with a stub registry and validating `content/default-exhibition.json`.
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.8, 2.9, 15.1, 15.2_

  - [x] 3.2 Implement `resolveExhibitionPath` and `loadExhibition`
    - `resolveExhibitionPath(search, baseHref)` returns `{ok:true, path}` (path `null` when the parameter is absent) or `{ok:false, reason}`. Reject empty values, control characters or whitespace, a leading `//`, backslashes, `%`, any scheme, any `..` segment, and any value that resolves to a different origin. Allow `content/other.json` and `/content/other.json`.
    - `loadExhibition(path, fetchFn, registry)` takes an injected `fetchFn` and returns the `validateExhibition` result shape. Network errors, non-2xx responses and JSON parse failures return `ok:false` with a `(fetch)` error and never throw.
    - Check in Node with a stub `fetch`.
    - _Requirements: 3.4, 3.5, 3.10, 3.11, 15.2_

  - [ ]* 3.3 Write property test for the exhibition round trip
    - Create `test/helpers/arbitraries.js` with the `validExhibition` arbitrary (N from 3 to 6, unique ids, mixed `riddle` and `choice` puzzles, `x_`-prefixed unknown optional fields, digits `0` to `9`).
    - In `test/content.property.test.js`, add one `fc.assert` with `numRuns: 100` or more, tagged `// Feature: mvp-playable-loop, Property 1: Exhibition round trip`.
    - **Property 1: Exhibition round trip**
    - **Validates: Requirements 3.7**

  - [ ]* 3.4 Write property test for the door code
    - Add to `test/content.property.test.js`: for any valid exhibition, `doorCode.length === N` and `doorCode[i] === artworks[i].puzzle.digit`. Tag `// Feature: mvp-playable-loop, Property 2: Door code is the digits in artwork order`.
    - **Property 2: Door code is the digits in artwork order**
    - **Validates: Requirements 3.6, 3.8**

  - [ ]* 3.5 Write example tests for validation and path rejection
    - In `test/content.test.js`, cover the rejection table for 3.2 (missing field, each missing `messages` key, wrong type, 2 and 7 artworks, duplicate ids, `digit` of `"10"`, `""`, `"a"` and the number `7`, unknown puzzle type, bad hex color), asserting the error path.
    - Cover 3.3 (`correctIndex` of `-1`, `options.length`, `1.5`) and 3.11 (`https://x.test/a.json`, `HTTP://x`, `//x.test/a.json`, `a\\b.json`, `../a.json`, `a/../b.json`, `%2e%2e/a.json`, `javascript:alert(1)`, a tab or newline value, empty value; accepted: `content/other.json`, `/content/other.json`).
    - Cover `loadExhibition` with a stub `fetch` (non-2xx, thrown error, invalid JSON), `fillTemplate`, and `wallFor`.
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.11, 15.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `node --test`. Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement game state (`assets/js/state.js`)
  - [x] 5.1 Implement the state module
    - Export `PHASES`, `createState(artworkIds)`, `themeFor(phase)`, `enterEscape`, `markSolved`, `submitCode`, `returnToGallery`, `markViewed` and `revealHint`, as specified in the design. Transitions mutate the single state object and return a boolean, except `submitCode`, which returns `"unsolved"`, `"wrong"` or `"correct"`.
    - Refuse transitions from the wrong phase with no change. `markSolved` rejects ids not in `artworkIds` and moves to `solved` when all are solved. `submitCode` returns `"unsolved"` in `escape` even for the right code, compares `input.trim()` exactly, and moves `solved → escaped` only on a match. `returnToGallery` clears all three sets and resets `currentIndex`. `revealHint` is idempotent.
    - No `document`, `window` or `localStorage` access.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 15.1, 15.2_

  - [ ]* 5.2 Write property test for state invariants
    - Add `opSequence(ids)` to `test/helpers/arbitraries.js`. In `test/state.property.test.js`, add one `fc.assert` (100 or more runs) checking the phase is always one of the four values, `viewed`, `solved` and `hints` stay subsets of the artwork ids, `returnToGallery` empties all three sets, `revealHint` twice equals once, and a refused operation leaves a deep copy of the state unchanged. Tag `// Feature: mvp-playable-loop, Property 3: Phase and set invariants hold under any operation sequence`.
    - **Property 3: Phase and set invariants hold under any operation sequence**
    - **Validates: Requirements 6.2, 6.8, 6.10, 11.6**

  - [ ]* 5.3 Write property test for door submission
    - Add to `test/state.property.test.js`: `submitCode` returns `"correct"` and moves to `escaped` if and only if the phase is `solved` and `input.trim() === doorCode`; in `escape` it returns `"unsolved"` even for the right code; every other case leaves the state unchanged. Tag `// Feature: mvp-playable-loop, Property 5: Door submission succeeds only in solved with the exact code`.
    - **Property 5: Door submission succeeds only in `solved` with the exact code**
    - **Validates: Requirements 6.5, 6.6, 12.2, 12.3, 12.4**

  - [ ]* 5.4 Write example tests for transitions
    - In `test/state.test.js`, cover each transition, refusals from the wrong phase, `themeFor`, a foreign id passed to `markSolved`, leading-zero door codes, and the `escape → solved` step on the last solved puzzle.
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

- [x] 6. Create the puzzle registry skeleton (`assets/js/puzzles/index.js`)
  - Export `hasType(type)` using `Object.hasOwn`, `getHandler(type)`, and `registry` (`{has, validate}`) over an initially empty `HANDLERS` map.
  - Document the handler contract in a comment: each file exports `type`, `validate(puzzle, path)`, `evaluate(puzzle, answer)` and `render(root, puzzle, ctx)`, and touches `document` only inside `render`.
  - Check in Node that `hasType("constructor")` and `hasType("__proto__")` are `false`.
  - _Requirements: 8.1, 8.3, 8.6_

- [x] 7. Implement the riddle puzzle type
  - [x] 7.1 Create `assets/js/puzzles/riddle.js` and register it
    - Export `type`, `normalize(s)` (trim, collapse whitespace, lower-case), `validate` (non-empty `answers` array whose entries are non-empty after normalization), `evaluate` (`"correct"` when the normalized answer equals a normalized accepted answer, otherwise `"incorrect"`, including empty input), and `render` (labeled `<input type="text" autocomplete="off">`, Enter calls `ctx.onSubmit`, returns `{getAnswer, focus}`).
    - Import it into `assets/js/puzzles/index.js` and add it to `HANDLERS`.
    - Check in Node that `evaluate` and `validate` import and run without a browser.
    - _Requirements: 8.2, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 7.2 Write property test for riddle normalization
    - In `test/riddle.property.test.js`, add one `fc.assert` (100 or more runs) over ASCII accepted answers with random per-character casing and random surrounding whitespace, asserting `"correct"`, and that any string normalizing to empty is `"incorrect"`. Tag `// Feature: mvp-playable-loop, Property 4: Riddle answers ignore case and surrounding whitespace`.
    - **Property 4: Riddle answers ignore case and surrounding whitespace**
    - **Validates: Requirements 9.2, 9.3, 9.6, 9.7**

  - [ ]* 7.3 Write example tests for the riddle handler
    - In `test/riddle.test.js`, cover accepted variants, internal whitespace collapse, empty submission, a wrong answer, `validate` rejecting an empty `answers` array and a blank accepted answer, and a note that Unicode case mapping (for example `ß`) is outside Property 4.
    - _Requirements: 9.2, 9.3, 9.4, 9.6_

- [x] 8. Implement the choice puzzle type
  - [x] 8.1 Create `assets/js/puzzles/choice.js`, register it, and add its styles
    - Export `type`, `validate` (2 to 6 non-empty string `options`, integer `correctIndex` in range), `evaluate` (`"correct"` only when `Number.isInteger(answer) && answer === correctIndex`), and `render` (a `<fieldset>` with `<legend>` and one native radio per option inside a `<label class="opt">`, in order; `getAnswer()` returns the selected index or `null`).
    - Register it in `assets/js/puzzles/index.js`.
    - Add `.opt` styles to `assets/css/style.css` using existing tokens only: 1px `--line` border, square corners, `min-height:44px`, `accent-color:var(--accent)`, and `.opt:has(input:checked)` with a 2px `--ink` border so selection is not color-only.
    - _Requirements: 8.2, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 1.4, 1.5_

  - [ ]* 8.2 Write example tests for the choice handler
    - In `test/choice.test.js`, cover correct and incorrect indexes, `null` and non-integer answers, and `validate` rejecting `correctIndex` of `-1`, `options.length` and `1.5`, one option, seven options, and a blank option.
    - _Requirements: 10.3, 10.4, 3.3_

  - [ ]* 8.3 Write tests tying the default exhibition and schema to the real registry
    - In `test/default-exhibition.test.js`, assert the default exhibition validates with the real registry, has 3 artworks, and contains both `riddle` and `choice`.
    - Assert `REQUIRED_MESSAGE_KEYS` equals the `messages.required` list in `content/exhibition.schema.json`.
    - _Requirements: 2.6, 2.7, 15.1_

- [x] 9. Checkpoint - Ensure all tests pass
  - Run `node --test`. Ensure all tests pass, ask the user if questions arise.

- [x] 10. Move the app into ES modules and load the exhibition
  - [x] 10.1 Convert the prototype script into `assets/js/main.js`
    - Move the contents of `assets/js/script.js` into `assets/js/main.js` with no behavior change, load it with `<script type="module" src="assets/js/main.js">`, and delete `assets/js/script.js` and the empty `assets/js/` folder. Fix any globals the module scope breaks.
    - Verify in a browser (static server) at desktop and phone widths that the prototype still plays end to end and the console is clean.
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.10, 1.11_

  - [x] 10.2 Extract the dialog into `assets/js/modal.js`
    - Implement `initModal`, `openDialog(spec)`, `closeDialog`, `setStatus(text, kind)` and `isOpen`, and use them from `main.js` for the existing prototype dialogs.
    - Write all text with `textContent` and build the image as a square-cornered gradient `div`. Set `aria-modal="true"` and `aria-labelledby` to the heading. On open, save the opener, set `inert` on `.top`, `.viewport` and `.bar`, and focus the first interactive control. Wrap Tab and Shift+Tab inside the card as a fallback. Escape and a backdrop click close it. On close, remove `inert` and return focus to the opener (fallback `#next`).
    - Keep `#fb` as a permanent `role="status"` element. `setStatus` prefixes plain-text labels ("Not quite.", "Correct.", "Hint:") and shakes only for `bad` when reduced motion is off.
    - In `assets/css/style.css`, set the close button to 44×44, add `.fb.bad{color:var(--bad)}`, `.fb.ok{color:var(--accent)}`, `.fb.hint{color:var(--muted)}`, remove the hard-coded `#e5484d`, and drop the inline `border-radius:8px`.
    - Verify at 390px, 768px and 1440px in both themes: focus enters and returns, Tab wraps, Escape closes, close button is at least 44px, no rounded image corners.
    - _Requirements: 5.6, 11.1, 11.10, 13.2, 13.3, 13.4, 13.5, 13.6, 13.10, 1.5_

  - [x] 10.3 Boot from the exhibition with banner and fallback
    - In `index.html`, add a `#banner` (`role="status"`) and a `#fatal` container, and replace the hard-coded `0/6 solved` text with an empty element filled by script.
    - In `main.js`, resolve `?exhibition=` with `resolveExhibitionPath`, call `loadExhibition` with the real `registry`, and on an unsafe, unreachable or invalid custom file show the banner (first 3 field paths plus a "Show all" disclosure) and load the default. If the default also fails, show the `#fatal` screen. Wrap boot in try/catch and never call `console.error`.
    - Replace the hard-coded artworks, puzzles, answers, hints and dialog copy in `main.js` with values read from the loaded exhibition (plaque text, puzzle prompt, hint, nudge, explanation, `messages`). Until task 11.3 the corridor still uses its prototype geometry, so temporarily keep only the first N paintings the prototype lays out.
    - Add `.banner` styles to `assets/css/style.css` using existing tokens (`--panel`, 1px `--line`, Antonio label, 44px dismiss button).
    - Verify in a browser: default loads; `?exhibition=content/missing.json`, `?exhibition=https://x.test/a.json` and `?exhibition=../x.json` show the banner and load the default with no uncaught errors (a browser network line for the 404 is expected).
    - _Requirements: 1.7, 3.4, 3.5, 3.9, 3.10, 3.11, 2.8_

- [x] 11. Generate the corridor from the artwork count
  - [x] 11.1 Create `assets/js/corridor.js` with layout and gradient helpers
    - Export the named constants (`STOP_SPACING`, `STOP_OFFSET`, `DOOR_GAP`, `DOOR_VIEW_DIST`, `EXIT_OVERSHOOT`, assist window, speeds, `WALL_X`, `TURN_DEG`), `computeLayout(n)` (pure) and `artGradient(colors)`. `computeLayout(6)` must give stops `[260, 710, 1160, 1610, 2060, 2510]`, door stop 2800, exit stop 2950, door z `-3200`.
    - Comment the reason for each 3D value.
    - Check with `node -e` that `computeLayout(6)` matches the prototype numbers and `computeLayout(3)` is shorter.
    - _Requirements: 4.2, 4.4, 4.5, 4.9_

  - [ ]* 11.2 Write example tests for `computeLayout`
    - In `test/corridor-layout.test.js`, assert the N=6 prototype numbers, the N=3 stops, that the door is a constant distance beyond the last stop, and that the length grows with N.
    - _Requirements: 4.2, 4.5_

  - [x] 11.3 Build the corridor, slots and counters from N
    - Implement `buildCorridor(exhibition, hooks, opts)` returning `{markDone, reset, setDoorOpenable, setLockLabel, walkTo, openDoor, goHome, destroy}`, and move the camera, mouse look, wheel, W/S/arrow, Back/Next, turn-to-face, "CLICK TO INSPECT" cue, click assist and door glow out of `main.js` into it, with comments explaining the camera and 3D math (including `--len` plane sizing).
    - Create N framed paintings alternating left then right, N stops, one door stop and the corridor length from `computeLayout`. Remove old paintings before rebuilding. Give paintings `tabindex="0"` and an `aria-label` with Enter activation, and give the door `tabindex="0"`, `role="button"`, an `aria-label` and Enter/Space activation. Activation opens the dialog immediately when within the click-assist window, otherwise walks to the stop and then opens it.
    - Render N door-code slots and `viewed` and `solved` counters with N as the total. Keep `corridor.js` free of puzzle types and phases.
    - Verify: the default (N=3) shows 3 paintings, 3 slots and a shorter corridor. Temporarily point `?exhibition=` at a 6-artwork test file and compare against the prototype geometry, adjusting the plane offset until they match (design open point 6). Remove or keep the test file under `content/` as a documented sample. Check 390px, 768px and 1440px.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 4.9, 1.6, 1.7, 13.1_

- [x] 12. Drive the app from the state machine
  - [x] 12.1 Wire `state.js` and a single `render()`
    - Create the state with `createState(ids)` after the exhibition loads. Delete every `hx-theme` read and write so the page always starts in `gallery`. Write `data-theme`, the theme button label and `disabled`, the progress text, the slots and the lock label only from one `render()` function.
    - Progress text: `<viewed>/<N> artworks viewed` in `gallery` and `<solved>/<N> solved` otherwise, with no timer or score. Call `markViewed` when a plaque opens.
    - Verify: reload during After-Hours always starts in the gallery, and no `localStorage` access remains (search the code).
    - _Requirements: 1.8, 1.9, 5.2, 5.3, 5.4, 6.3, 6.9, 7.6_

  - [x] 12.2 Add the one-way switch and gallery door message
    - Theme button labels: "Enter escape room →" (enabled) in `gallery`, "Locked in" (disabled) in `escape` and `solved`, "Back to gallery" (enabled) in `escaped`.
    - Clicking in `gallery` opens a confirm dialog with `messages.enterEscape`, "Step inside" (calls `enterEscape`) and "Stay in the gallery" (closes). In `gallery`, activating the door shows `messages.staffOnly`.
    - Verify in a browser with the keyboard only: cancel keeps the gallery, confirm switches to the dark theme and the button reads "Locked in" and is disabled.
    - _Requirements: 5.5, 7.1, 7.2, 7.3, 7.4, 7.5, 6.4_

- [x] 13. Puzzle dialog through the registry
  - [x] 13.1 Open puzzles by type and check answers
    - In `escape` and `solved`, activating a painting opens the puzzle scene. Get the handler with `getHandler(puzzle.type)` (no branching on type names), call `render`, and give the dialog Check, Hint and Close controls.
    - On `incorrect`, show `puzzle.nudge` via `setStatus(..., "bad")` with the shake. On `correct`, call `markSolved`, keep the dialog open, hide the answer area and Hint, show `puzzle.explanation` and the digit via `setStatus(..., "ok")`, show a Continue button that closes the dialog, fill the matching slot, and call `corridor.markDone(i)`. An empty or missing answer shows the nudge. Attempts are unlimited.
    - Verify with the default exhibition: wrong riddle, empty riddle, wrong choice, no choice selected, then correct answers. Slots fill, counter reads `n/3 solved`, and the last solve moves the phase to `solved`.
    - _Requirements: 8.4, 8.5, 9.1, 9.5, 10.1, 10.4, 11.1, 11.2, 11.3, 11.4, 11.9, 11.10, 6.5_

  - [x] 13.2 Add the single hint and the solved-artwork view
    - The Hint button shows `puzzle.hint` via `setStatus(..., "hint")` and calls `revealHint`. Pressing it again shows the same text with no state change. One hint per puzzle, no cost, no progress block.
    - Reopening a solved artwork shows the explanation and digit, hides the answer area and Hint, and shows Continue.
    - Verify the keyboard flow (Tab to Hint, Enter, then Escape) and that focus returns to the painting.
    - _Requirements: 11.5, 11.6, 11.7, 11.8, 11.9, 13.1_

- [x] 14. Door code, escape and return
  - [x] 14.1 Door dialog and escape sequence
    - In `escape` and `solved`, activating the door opens `messages.doorLocked`, `fillTemplate(messages.digitsFound, {found, total})` and a numeric keypad input (`inputmode="numeric"`) with a "Check" button.
    - On submit, call `submitCode(state, input, doorCode)`. `"unsolved"` tells the player to solve every puzzle first. `"wrong"` shows `messages.doorNudge` with the shake. `"correct"` sets a `busy` flag, closes the dialog, changes LOCKED to UNLOCKED, walks to the exit stop, swings the door after `DOOR_SWING_DELAY`, then opens the escaped dialog (`messages.escaped`) after `ESCAPE_DIALOG_DELAY` and clears `busy`. While `busy`, ignore door activation and disable the theme button. No results screen, score or recap.
    - Verify: wrong code, right code too early (phase `escape`), then the full solve and a correct code.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.8, 6.6_

  - [x] 14.2 Escaped dialog and return to the gallery
    - The escaped dialog offers "Return to the gallery" and "Stay a moment". "Stay a moment" closes the dialog and leaves the phase `escaped`. "Return to the gallery" calls `returnToGallery`, `corridor.reset()`, walks the camera to the start instantly, and re-renders (light theme, empty slots, no done marks, door closed and LOCKED).
    - In `escaped`, activating the door opens `messages.doorUnlocked` with the same two buttons, and the theme button "Back to gallery" does the same as "Return to the gallery".
    - Verify a second full loop works after returning, and the console stays empty through gallery → escaped → gallery.
    - _Requirements: 12.5, 12.6, 12.7, 7.5, 13.11_

- [x] 15. Motion, accessibility and responsive polish
  - [x] 15.1 Reduced motion and tap targets
    - In `corridor.js`, listen to `matchMedia("(prefers-reduced-motion: reduce)")` live and set the camera directly to its target when it matches. Use short separate delay constants for the door and escaped dialog. In `assets/css/style.css`, disable `.world` transitions, the vignette flicker, the door swing and the shake under reduced motion.
    - Ensure every dialog button, input, option label, the close button, the theme button and Back/Next are at least 44px high and wide, adding `min-height` and `min-width` rules with existing tokens.
    - Verify with the browser's reduced-motion emulation: no flicker, no door swing, the camera jumps to its target, and wrong answers show text without a shake.
    - _Requirements: 13.6, 13.7, 11.11, 1.5_

  - [x] 15.2 Responsive, contrast and no-emoji pass
    - Check every screen (gallery, plaque, puzzle, door, banner, fatal screen, escaped) at 390px, 768px and 1440px in both themes for no horizontal scroll, no clipped controls, the stacked top bar and hidden hint text on phones.
    - Check 4.5:1 contrast for body, muted and status text in both themes (adjust an existing token pair only if it fails, defining both themes), and that feedback always pairs text with color. Confirm no emoji in markup, JSON or JS.
    - Run a full keyboard-only playthrough with the console open and fix anything found.
    - _Requirements: 13.1, 13.8, 13.9, 13.10, 13.11, 13.12, 1.5_

- [x] 16. Update the README
  - Rewrite `README.md` to describe what Hexhibit is, how to run it with a static server (with the command and the reason `file://` is unsupported), the actual repository layout, and how to run tests (`npm install`, `node --test`, `fast-check` is dev-only and never loaded by the browser).
  - Add an authoring section with a minimal `riddle` and `choice` example and a link to `content/exhibition.schema.json`. Document `?exhibition=<relative path>` as a testing aid with its rejection rules, state it is not a share link, and note that a missing file shows a browser network line.
  - Remove or mark as planned the unbuilt features (extra puzzle types, educator studio, share links, audio). Add a short "Built with Kiro" section about steering and specs.
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 3.12_

- [x] 17. Final checkpoint - Ensure all tests pass and the loop works
  - Run `node --test` and the browser checklist from the design (keyboard playthrough, 390px, 768px and 1440px in both themes, dialog focus behavior, reduced motion, `?exhibition=` cases, empty console). Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. Core implementation tasks are never optional.
- Each task references specific requirements for traceability. Properties 1 to 5 in the design map to tasks 3.3, 3.4, 5.2, 7.2 and 5.3.
- Browser verification bullets in each UI task follow the steering rule to check desktop and phone widths before marking a task done.
- `.gitginore` is misspelled in the repo, so `node_modules/` is not ignored once `npm install` runs. This is outside the spec; rename it to `.gitignore` before committing.
- Tests use ES modules and run with `node --test` with no build step.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2"] },
    { "id": 5, "tasks": ["3.3", "3.5"] },
    { "id": 6, "tasks": ["3.4"] },
    { "id": 7, "tasks": ["4"] },
    { "id": 8, "tasks": ["5.1"] },
    { "id": 9, "tasks": ["5.2", "5.4"] },
    { "id": 10, "tasks": ["5.3"] },
    { "id": 11, "tasks": ["6"] },
    { "id": 12, "tasks": ["7.1"] },
    { "id": 13, "tasks": ["7.2", "7.3"] },
    { "id": 14, "tasks": ["8.1"] },
    { "id": 15, "tasks": ["8.2", "8.3"] },
    { "id": 16, "tasks": ["9"] },
    { "id": 17, "tasks": ["10.1"] },
    { "id": 18, "tasks": ["10.2"] },
    { "id": 19, "tasks": ["10.3"] },
    { "id": 20, "tasks": ["11.1"] },
    { "id": 21, "tasks": ["11.2"] },
    { "id": 22, "tasks": ["11.3"] },
    { "id": 23, "tasks": ["12.1"] },
    { "id": 24, "tasks": ["12.2"] },
    { "id": 25, "tasks": ["13.1"] },
    { "id": 26, "tasks": ["13.2"] },
    { "id": 27, "tasks": ["14.1"] },
    { "id": 28, "tasks": ["14.2"] },
    { "id": 29, "tasks": ["15.1"] },
    { "id": 30, "tasks": ["15.2"] },
    { "id": 31, "tasks": ["16"] },
    { "id": 32, "tasks": ["17"] }
  ]
}
```
