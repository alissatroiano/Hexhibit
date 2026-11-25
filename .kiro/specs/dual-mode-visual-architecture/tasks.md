# Implementation Plan: Dual-Mode Visual Architecture

## Overview

The plan builds the pure, Node-testable modules first (`image.js`, `content.js` with schema and default exhibition fields, `state.js` restore helper, `session.js`, and the pure helpers of `gallery.js`). It then adds CSS and HTML, the DOM modules (gallery rendering, flashlight, corridor entrance pose, image fallback), and finally wires everything in `main.js`. Steering and README updates, manual verification, and a final checkpoint close the plan.

Language: JavaScript (ES modules, no framework, no bundler). Tests use `node --test` with `fast-check` as a dev-only dependency. Property tests run at least 100 iterations and carry the tag `// Feature: dual-mode-visual-architecture, Property N: <title>`.

## Tasks

- [~] 1. Add shared test arbitraries
  - Extend `test/helpers/arbitraries.js` with `viewportArb` (width 360 to 1920, height 640 to 1080, topBarHeight 0 up to the height), `artworkImagePathArb` (safe and unsafe path generator), `savedGameArb` (artwork ids plus matching `doorCode`, `solved` and `hintsUsed` subsets), and `uiSubsetArb` (random subset of the seven `ui` keys with string values)
  - Reuse the existing id, word, and text generators already present in the file
  - _Requirements: 2.8, 5.6, 11.13, 12.7, 12.14_

- [ ] 2. Implement the shared artwork image rules (`assets/js/image.js`)
  - [~] 2.1 Create `assets/js/image.js`
    - Export `ART_IMAGE_DIR`, `ALLOWED_IMAGE_EXT`, `isSafeArtworkImagePath(value)` and `resolveArtworkImage(artwork, { haunted })`
    - `isSafeArtworkImagePath` rejects a scheme, a leading `/` or `//`, a backslash, a `..` segment, a query, or a fragment, and requires the `assets/images/art/` prefix and a `.jpg`, `.jpeg`, `.png`, or `.webp` ending
    - `resolveArtworkImage` returns `{ src, alt, credit }` (haunted variant only when `haunted` is true and `hauntedImage` is present, otherwise the day image, otherwise `null`); `alt` defaults to the artwork `title`
    - Keep the module pure: no `document`, `window`, or storage access at import time
    - _Requirements: 2.3, 2.10, 2.11, 2.12, 2.13, 12.10, 12.14, 15.5_

  - [ ]* 2.2 Write property test for image resolution
    - **Property 3: Image resolution is consistent and safe**
    - **Validates: Requirements 2.3, 2.11, 2.12, 2.13**
    - File: `test/image.test.js`

  - [ ]* 2.3 Write property test for unsafe image paths
    - **Property 4: Unsafe artwork image paths are always rejected**
    - **Validates: Requirements 12.10, 12.14**
    - File: `test/image.test.js`

  - [ ]* 2.4 Write unit tests for `image.js` examples
    - Named examples: valid path, traversal, wrong extension, absolute URL, protocol-relative path, missing `alt` falls back to `title`
    - _Requirements: 2.10, 12.10_

- [ ] 3. Extend content loading, schema, and default exhibition
  - [~] 3.1 Extend `assets/js/content.js`
    - Add `UI_STRING_FIELDS` (escape CTA label, after-hours hint, solved marker, viewed marker, locked label, unlocked label, gallery progress template) and validate each present `ui` field as a string with error path `ui.<field>`
    - Extend artwork validation with optional `image`, `hauntedImage`, `alt`, `credit`: path fields use `isSafeArtworkImagePath`, `hauntedImage` requires `image`, `image` requires `credit`, `alt` and `credit` must be strings; `colors` stays required
    - Add `applyUiDefaults(exhibition, defaultExhibition)` that fills missing `ui` keys from the default exhibition
    - Add the pure helper `resolveModeParameter(search)` that returns `"afterhours"` only for that exact value and `null` otherwise
    - Every exhibition that was valid before this change must still validate
    - _Requirements: 4.13, 12.1, 12.2, 12.3, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12_

  - [~] 3.2 Update `content/exhibition.schema.json` and `content/default-exhibition.json`
    - Document the optional `ui` object and the artwork fields `image`, `hauntedImage`, `alt`, `credit` (including the path rule and the credit rule) in the schema, keeping `colors` required
    - Add every `ui` field to `default-exhibition.json`, including the escape CTA label "Enter After-Hours Escape →" and a hint text that covers both pointer and keyboard
    - Add no image fields to the default exhibition (no image files are added by this spec)
    - _Requirements: 4.1, 9.6, 12.4, 12.5, 12.13_

  - [ ]* 3.3 Write property test for `ui` default fallback
    - **Property 9: `ui` strings always fall back to the Default Exhibition**
    - **Validates: Requirements 12.2, 12.7**
    - File: `test/content.test.js`

  - [ ]* 3.4 Write property test for non-string `ui` fields
    - **Property 10: Non-string `ui` fields are always rejected with a named path**
    - **Validates: Requirements 12.3**
    - File: `test/content.test.js`

  - [ ]* 3.5 Write unit tests for new content rules
    - Examples for `hauntedImage` without `image`, `image` without `credit`, non-string `alt`, unsafe image path, unchanged acceptance of a gradient-only exhibition, and `resolveModeParameter` (`afterhours`, other value, absent)
    - Confirm the shipped `default-exhibition.json` validates and defines all seven `ui` fields
    - _Requirements: 4.13, 12.4, 12.8, 12.10, 12.11, 12.12_

- [ ] 4. Implement state restore and the session store
  - [~] 4.1 Add `createRestoredState` to `assets/js/state.js`
    - Build on `createState`, set `doorCode`, fill `solved` and `hints`, and set `phase` to `solved` when every artwork is solved, otherwise `escape`
    - Reject (throw or return `null`, matching the module's existing style) any input that would produce `gallery` or `escaped`
    - Keep `state.js` free of `document`, `window`, and storage access; add no new transition
    - _Requirements: 11.5, 15.1, 15.2, 15.3_

  - [~] 4.2 Create `assets/js/session.js`
    - Export `STORAGE_KEY` (`hexhibit.session.v1`), `SAVED_GAME_VERSION`, `serializeSavedGame`, `parseSavedGame(raw, artworkIds)`, `restoreGameState(savedGame, artworkIds)`, `writeSavedGame`, `readSavedGame`, `clearSavedGame`
    - Saved record: `{ v, artworkIds, doorCode, solved, hintsUsed }` and nothing else
    - `parseSavedGame` returns `null` (never throws) for invalid JSON, unknown version, differing artwork id list or order, a `doorCode` that is not a digit string of the artwork count, or `solved`/`hintsUsed` entries that are not artwork ids
    - `restoreGameState` delegates to `createRestoredState`
    - Storage functions take a `storage` argument (default `sessionStorage`), wrap every call in try/catch, and never log a console error
    - `readSavedGame` removes the key when the stored value is invalid
    - _Requirements: 11.1, 11.2, 11.5, 11.6, 11.11, 11.12, 11.13, 11.14, 11.15, 11.18, 15.3, 15.5_

  - [ ]* 4.3 Write property test for the Saved_Game round trip
    - **Property 5: Saved_Game round trip**
    - **Validates: Requirements 11.13**
    - File: `test/session.test.js`

  - [ ]* 4.4 Write property test for discarding invalid saved games
    - **Property 6: Invalid or mismatched Saved_Game is always discarded**
    - **Validates: Requirements 11.12**
    - File: `test/session.test.js`

  - [ ]* 4.5 Write property test for restored phase derivation
    - **Property 7: Restored phase is always derivable and never gallery/escaped**
    - **Validates: Requirements 11.5, 15.3**
    - File: `test/session.test.js`

  - [ ]* 4.6 Write unit tests for `session.js` and `createRestoredState`
    - Fake storage and throwing storage (read, write, and remove all throw, with no console error), storage key and version example, `solved` phase accepts the restored door code through `submitCode`
    - _Requirements: 11.4, 11.11, 11.12, 11.14_

- [ ] 5. Implement pure gallery helpers (`assets/js/gallery.js`)
  - [~] 5.1 Create `assets/js/gallery.js` with the pure helpers
    - Export `computeBaseSize(viewport, topBarHeight)` returning `{ width, height }` bounded by the viewport width and by the viewport height minus the top bar
    - Export `placeFrames(count)` returning one `{ index, side }` per artwork, with even indexes on `"left"` and odd indexes on `"right"`
    - Export `frameLabel(ui, artwork, index, count)` for the accessible name of a Frame
    - Name constants for the base-size ratios and limits; add no DOM access at import time
    - _Requirements: 2.1, 2.2, 5.1, 5.6, 5.7, 15.4, 15.5_

  - [ ]* 5.2 Write property test for frame placement
    - **Property 1: Frame count and order match the Exhibition**
    - **Validates: Requirements 2.1, 2.2, 2.8**
    - File: `test/gallery.test.js`

  - [ ]* 5.3 Write property test for base size bounds
    - **Property 2: Base size never exceeds the viewport**
    - **Validates: Requirements 5.6, 5.7**
    - File: `test/gallery.test.js`

- [~] 6. Checkpoint - Pure modules
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Add HTML structure and CSS for both views
  - [~] 7.1 Update `play.html`
    - Add `#daylight-gallery` (with a mount point for the Gallery_Scene, the progress text, and the Escape_CTA button) and wrap the existing `.viewport` and `#world` in `#stage`
    - Set `data-theme="light"` on `<html>` in the markup so the first paint is Daylight
    - Remove the top-bar `#theme` button and keep an accessible `role="status"` element for mode announcements
    - Keep `.vig` as a sibling above `#stage`; keep the logo and favicon files untouched
    - _Requirements: 1.1, 1.8, 4.1, 4.8, 7.1, 7.5, 13.4_

  - [~] 7.2 Add Daylight Gallery styles to `assets/css/style.css`
    - Style `#daylight-gallery`, `.gallery-scene` (`perspective: 47em`, `preserve-3d`), `.base` (`rotateX(90deg) rotateZ(-10deg)`), `.leftside`, `.rightside`, `.walllight`, `.ground`, `.frame`, the spotlight gradient, the viewed marker, and the flat-list fallback
    - Size everything from `--base-width` and `--base-height`; use only existing tokens, Antonio and Inter, no emoji, restrained corner radii, and no `backdrop-filter` on a full-scene element
    - Style the Escape_CTA as a filled primary button with at least a 44px by 44px hit area and a visible focus ring
    - Keep caption contrast at 4.5:1 inside the spotlight; disable flicker and transitions under `prefers-reduced-motion`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 3.7, 4.2, 4.3, 4.9, 5.1, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 13.2, 13.7_

  - [~] 7.3 Add Stage, flashlight, and responsive styles to `assets/css/style.css`
    - Style `#stage` visibility, make `.vig` read `--mx` and `--my` with a centered default of `50%`, keep `pointer-events: none`, and keep `.vig` below the modal layer so dialogs are not darkened
    - Add the SOLVED caption marker style and a focus ring of at least 3:1 contrast on the dark background
    - Add 390px, 768px, and 1440px layout rules for the gallery, stage, hint bar, and the two-row phone top bar; disable beam easing under `prefers-reduced-motion`
    - _Requirements: 7.1, 8.1, 8.4, 8.5, 8.6, 8.8, 8.10, 9.4, 9.5, 9.7, 13.2, 13.3, 14.1, 14.2, 14.3_

- [ ] 8. Implement the DOM modules
  - [~] 8.1 Add the DOM image-fill helper to `assets/js/image.js`
    - Add `applyArtworkFill(el, artwork, { haunted })` that uses `resolveArtworkImage`, appends an `<img>` with the resolved `alt`, and on `error` removes the image and applies `artGradient(artwork.colors)` without logging a console error
    - Import `artGradient` lazily or accept it as a parameter so `image.js` stays importable in Node without DOM access at import time
    - _Requirements: 2.3, 2.9, 2.11, 2.12, 2.13_

  - [~] 8.2 Implement `buildGallery` in `assets/js/gallery.js`
    - Export `buildGallery(exhibition, hooks, opts)` returning `{ setVisible, markViewed, destroy }`
    - Remove previous frames before rendering; render one `<button class="frame">` per artwork using `placeFrames`, `frameLabel`, `applyArtworkFill`, the title caption, and a spotlight element
    - Build the floor, both walls, at least one sconce per wall, and one ground reflection; set `--base-width` and `--base-height` from `computeBaseSize` on load and on resize
    - Wire click, Enter, and Space to `hooks.onArtwork(index)` and the Escape_CTA to `hooks.onEscape`; `markViewed(index)` adds a text marker from `ui.viewedMarker`; `setVisible(false)` sets `hidden` and `inert`
    - Detect missing `preserve-3d` support and render the flat keyboard-reachable list instead; take all text from `ui` and the exhibition, with no hard-coded artwork text
    - _Requirements: 1.2, 1.3, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.3, 3.7, 4.1, 4.9, 5.2, 6.6, 7.5, 12.6_

  - [~] 8.3 Create `assets/js/flashlight.js`
    - Export the pure `clampBeamPosition(x, y, bounds)` and `initFlashlight(vigEl, { reducedMotion })` returning `{ setActive, centerOn, destroy }`
    - Store the latest `pointermove` position and commit `--mx` and `--my` at most once per animation frame; under reduced motion or with no known pointer keep `50%` and `50%`
    - `centerOn(rect)` centers the beam on an element's bounding box; `setActive(false)` stops listening and resets to `50%`
    - Touch the CSS custom properties only, never `aria-*` or `hidden`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.9, 9.8, 13.2_

  - [~] 8.4 Extend `assets/js/corridor.js` with the entrance pose and image fallback
    - Export a pure `ENTRANCE_POSE` and `resetPose(pose)` that zeroes `d`, `td`, `yaw`, `ty`, `pit`, `tp`, `fy`, with no easing, and use it in a new `goToEntrance()` instance method; add `getPose()` for tests
    - Make each Haunted_Painting use `applyArtworkFill(el, artwork, { haunted: true })`, and add a text SOLVED marker (from `ui.solvedMarker`) and LOCKED/UNLOCKED labels (from `ui`) when a painting is solved or the door state changes
    - Call a new optional `hooks.onFocusElement(rect)` from the existing painting and door `focus` listeners so `main.js` can center the flashlight
    - Do not change `computeLayout`, puzzle handlers, or the corridor geometry
    - _Requirements: 2.11, 2.12, 7.2, 7.3, 7.4, 7.7, 7.8, 8.7, 9.2, 9.4, 9.5, 10.9_

  - [~] 8.5 Add the image fallback to `assets/js/modal.js`
    - Render the artwork image in the plaque modal through `applyArtworkFill` (day variant), with `alt` or the title as the accessible name, and show the `credit` text when the artwork has an image
    - Keep focus trap, Escape close, and `role="status"` feedback unchanged
    - _Requirements: 2.10, 2.12, 3.4, 3.6_

  - [ ]* 8.6 Write property test for the camera reset
    - **Property 8: Camera always resets to the Entrance Pose**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.7, 7.9, 7.10**
    - File: `test/corridor.test.js`; exercise the pure `resetPose` against generated pose mutations

  - [ ]* 8.7 Write unit tests for gallery and flashlight behavior
    - Gallery: frame DOM structure for 3 and 6 artworks with a minimal DOM stub, flat-list fallback, viewed marker text, no duplicate frames after a second build
    - Flashlight: at most one `--mx`/`--my` write per fake animation frame regardless of pointer event count, reduced-motion default center, `setActive(false)` reset
    - Image helper: `onerror` swaps to the gradient without a console error
    - _Requirements: 2.6, 2.9, 3.3, 6.6, 8.2, 8.4, 8.9_

- [ ] 9. Wire everything in `assets/js/main.js`
  - [~] 9.1 Render phase to view
    - Extend `render()` so the phase selects the theme, calls `gallery.setVisible`, toggles `#stage` `hidden` and `inert`, and calls `flashlight.setActive`
    - Build the gallery and the flashlight in `boot()` alongside the corridor; route Frame activation to `pick(i)` (which marks viewed and updates the progress text from `ui.galleryProgress`) and the Escape_CTA to the existing confirmation handler
    - Hide the Escape_CTA and any gallery control while the phase is not `gallery`; pass `hooks.onFocusElement` to the corridor so the flashlight centers on focused elements
    - _Requirements: 1.1, 3.1, 3.2, 3.3, 3.5, 4.4, 4.5, 4.6, 4.7, 4.8, 7.1, 7.5, 7.6, 8.5, 8.7, 11.9_

  - [ ] 9.2 Session restore and Direct_Entry at boot
    - After the exhibition loads, call `readSavedGame` with the loaded artwork ids; when valid, replace the state with `restoreGameState` and skip the confirmation dialog
    - When no valid saved game exists and `resolveModeParameter(location.search)` is `afterhours`, generate the door code, enter `escape`, and write the saved game; on failure stay in the gallery and show the lock-failed message in the existing banner
    - Call `corridor.goToEntrance()` after every restore or direct entry; then strip only the `mode` parameter with `history.replaceState` inside try/catch and never put the door code in the URL
    - Apply this against the exhibition the loader returned, including the default fallback for `?exhibition=`
    - _Requirements: 4.10, 4.12, 4.13, 4.14, 4.15, 4.16, 7.3, 7.10, 11.3, 11.16, 11.18_

  - [ ] 9.3 Session writes, synchronous clear, and `home()`
    - Call `writeSavedGame(S)` after a successful `enterEscape`, after `markSolved`, and after `revealHint`, before `render()`
    - In `check()`, call `clearSavedGame()` as the first statement of the `correct` branch, before `busy`, `render()`, and any `setTimeout`
    - In `home()`, call `clearSavedGame()` before `returnToGallery(S)` and call `corridor.goToEntrance()` for an instant entrance reset
    - Leave puzzle types and handlers unchanged
    - _Requirements: 4.5, 7.4, 10.2, 10.4, 10.8, 11.1, 11.2, 11.7, 11.8, 11.17_

  - [ ] 9.4 Announcements and UI strings
    - Announce the mode change in the `role="status"` element on every gallery to after-hours change (confirmation, direct entry, restore) and announce "Your escape room session was resumed." when a saved game is restored; read both strings from `ui` or the default exhibition fallback
    - Show `ui.afterHoursHint` in the hint bar when After-Hours starts, and replace any remaining hard-coded `#theme` label strings with `ui` values
    - Apply `applyUiDefaults` in `loadExhibitionOrDefault` so every exhibition has a complete `ui` object
    - _Requirements: 9.6, 12.2, 12.6, 13.4, 13.5_

  - [ ]* 9.5 Write wiring tests for `main.js` behavior
    - Direct_Entry with and without an existing saved game, unknown `mode` value ignored, synchronous clear (storage empty immediately after `check()` returns on a correct code, before any timer fires), `home()` clears storage, and no console error with throwing storage
    - Use injected fakes following the existing `fetchJson` and `byteSource` pattern; extract small pure helpers from `main.js` where a test would otherwise need a browser
    - _Requirements: 4.10, 4.12, 4.13, 11.7, 11.8, 11.11, 11.17_

- [ ] 10. Checkpoint - Wiring complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Update steering files and README
  - [ ] 11.1 Update `.kiro/steering/` files
    - `tech.md`: document the `sessionStorage` lock-in exception (door code, `solved`, `hintsUsed`, try/catch, cleared on game end and start over, works without storage, never in the URL or `localStorage`), that planned save-and-resume with `localStorage` is separate, the image-then-gradient rule with paths under `assets/images/art/` and unsafe-path rejection, and `?mode=afterhours` next to `?exhibition=`
    - `structure.md`: list `assets/js/gallery.js`, `assets/js/session.js`, `assets/js/flashlight.js`, `assets/js/image.js`; state that artwork images go under `assets/images/art/` with credits in the exhibition JSON and that the folder is created with the first image
    - `product.md`: replace the "generated gradients, not real images" line, describe the Daylight Gallery under "What is built now", and note the `?mode=afterhours` exception to the confirmation rule and the clear on correct code
    - `design.md`: describe the flashlight and the Daylight Gallery without changing the token table
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10_

  - [ ] 11.2 Update `README.md`
    - Describe the two visual architectures, the flashlight and its keyboard alternative, the session lock-in, the optional artwork image fields with the credit rule, and the judge demo link `play.html?mode=afterhours` (note that it skips the confirmation dialog)
    - Keep the "Built with Kiro" section current with this spec
    - _Requirements: 15.6_

- [ ] 12. Manual verification in a browser
  - [ ] 12.1 Verify both modes at 390px, 768px, and 1440px in both themes
    - Serve the app with a static server (for example `npx serve .`) and check there is no horizontal scroll, no console error, and a 44px minimum tap target for frames and the Escape_CTA
    - Daylight: every frame opens its plaque, viewed marker appears, Escape_CTA opens the confirmation dialog, flat-list fallback still lists frames
    - After-Hours: camera starts at the entrance, flashlight follows the pointer and the keyboard focus, dialogs are not darkened, Tab, Enter, Space, W, S, and arrow keys reach every painting and the door
    - Reload during `escape` and `solved` restores the game; reload after the correct code starts in Daylight; `?mode=afterhours` skips the dialog and strips the parameter; storage disabled still plays
    - Check `prefers-reduced-motion` and contrast of new text and focus rings
    - Record any defect found and fix it before marking the task done
    - _Requirements: 4.10, 5.3, 5.4, 5.5, 6.2, 7.2, 8.7, 8.8, 9.1, 9.3, 11.3, 11.17, 13.1, 13.2, 13.3, 14.1, 14.2, 14.3, 14.4_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests validate the universal properties in the design document; unit tests cover DOM wiring, storage failures, and timing
- Task 12.1 is a manual browser check required by the project steering ("verify in a browser at desktop and phone widths") and cannot be automated

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "4.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "4.2", "5.2"] },
    { "id": 3, "tasks": ["2.3", "3.2", "4.3", "5.3"] },
    { "id": 4, "tasks": ["2.4", "3.3", "4.4"] },
    { "id": 5, "tasks": ["3.4", "4.5"] },
    { "id": 6, "tasks": ["3.5", "4.6"] },
    { "id": 7, "tasks": ["6"] },
    { "id": 8, "tasks": ["7.1", "7.2"] },
    { "id": 9, "tasks": ["7.3"] },
    { "id": 10, "tasks": ["8.1", "8.3"] },
    { "id": 11, "tasks": ["8.2", "8.4", "8.5"] },
    { "id": 12, "tasks": ["8.6", "8.7"] },
    { "id": 13, "tasks": ["9.1"] },
    { "id": 14, "tasks": ["9.2"] },
    { "id": 15, "tasks": ["9.3"] },
    { "id": 16, "tasks": ["9.4"] },
    { "id": 17, "tasks": ["9.5"] },
    { "id": 18, "tasks": ["10"] },
    { "id": 19, "tasks": ["11.1", "11.2"] },
    { "id": 20, "tasks": ["12.1"] },
    { "id": 21, "tasks": ["13"] }
  ]
}
```
