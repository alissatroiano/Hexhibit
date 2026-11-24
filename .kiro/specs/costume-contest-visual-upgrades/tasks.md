# Implementation Plan: Costume Contest Visual Upgrades

## Overview

Plain JavaScript (ES modules) and CSS, no new dependencies. Image logic is split into pure, DOM-free helpers in `content.js` (`isValidImagePath`, `resolveArtImage`) that are property-tested with fast-check. DOM wiring (`buildArtVisual`, spotlight listener) stays thin and is covered by static source checks and a manual browser verification task. The spotlight gating predicate and frame coalescer live in a small DOM-free module, `assets/js/spotlight.js`, so they can be tested in Node.

## Tasks

- [ ] 1. Pure image-path helpers and validator in `content.js`
  - [ ] 1.1 Add `isValidImagePath`, `resolveArtImage` and `validateImagePath`
    - In `assets/js/content.js`, export `isValidImagePath(value)` returning `null` when valid, or a reason string for each rejected form (non-string, `http(s):`, leading `//`, backslash, `..` segment, leading `/`, missing `assets/images/` prefix)
    - Export `resolveArtImage(image, title, decorative)` returning `{ src, alt }` (`alt` is `""` when decorative, else the title) or `null` when `image` is absent or invalid
    - Add `validateImagePath(art, path, errors)` built on `isValidImagePath`, pushing `{ path: \`${path}.image\`, message }`, and call it from `validateArtwork`
    - No DOM access and no `console.*` in this code
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 2.3, 2.4, 2.6_

  - [ ]* 1.2 Write property test: missing image is always accepted
    - New file `test/image-path.test.js`, using the `validExhibition` arbitrary from `test/helpers/arbitraries.js`
    - **Property 1: Missing image is always accepted**
    - **Validates: Requirements 1.2**

  - [ ]* 1.3 Write property test: valid image paths are always accepted
    - **Property 2: Valid image paths are always accepted**
    - **Validates: Requirements 1.3**

  - [ ]* 1.4 Write property test: rejected path forms yield a field-specific error
    - Add arbitraries per rejected family (`http://`, `https://`, `//`, `..`, leading `/`, backslash, outside `assets/images/`)
    - Assert an error with `path === \`artworks[${i}].image\``
    - **Property 3: Each rejected path form is always rejected with a field-specific error**
    - **Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.8, 1.9**

  - [ ]* 1.5 Write property test: non-string image values are rejected
    - **Property 4: Non-string image values are always rejected**
    - **Validates: Requirements 1.10**

  - [ ]* 1.6 Write property test for `resolveArtImage` (corridor/decorative use)
    - New file `test/art-image.test.js`; with `decorative = true`, a valid path yields `{ src: path, alt: "" }` and absence yields `null`
    - **Property 5: Corridor renders an image when given a valid path, and falls back otherwise**
    - **Validates: Requirements 2.1, 2.3, 2.6, 3.4**

  - [ ]* 1.7 Write property test for `resolveArtImage` (inspect dialog use)
    - With `decorative = false`, a valid path yields `{ src: path, alt: title }` and absence yields `null`
    - **Property 6: Inspect Dialog renders an image titled by the artwork, and falls back otherwise**
    - **Validates: Requirements 2.2, 2.4, 3.4**

- [ ] 2. Schema and default exhibition
  - [ ] 2.1 Add `image` to the schema and the default exhibition
    - Add the optional `image` string property (with description) to `$defs/artwork/properties` in `content/exhibition.schema.json`; do not add it to `required`
    - Set `"image": "assets/images/hexhibit-logo.png"` on the `the-patient-watcher` artwork in `content/default-exhibition.json`
    - _Requirements: 1.1, 4.1, 4.2_

  - [ ]* 2.2 Write example tests for schema and default exhibition
    - In `test/content.test.js`: schema declares `image` as `string` and not required; default exhibition passes `validateExhibition`; every `image` path in it exists on disk (`fs.existsSync`)
    - _Requirements: 1.1, 4.1, 4.2, 10.3, 10.7_

- [ ] 3. Art rendering in corridor and inspect dialog
  - [ ] 3.1 Add `buildArtVisual` to `corridor.js` and use it for paintings
    - Export `buildArtVisual(colors, imagePath, altText)`: set the gradient background synchronously, then use `resolveArtImage` to create an `img` (`src`, `alt`) appended to the `.art` element
    - Attach `img.addEventListener("error", () => img.remove(), { once: true })`; no `console.*`, no state changes
    - Replace the manual `.art` construction in the painting loop with `buildArtVisual(p.colors, p.image, "")`, keeping the figure's `aria-label` as the accessible name
    - _Requirements: 2.1, 2.3, 2.6, 3.1, 3.3, 3.4_

  - [ ] 3.2 Use `buildArtVisual` in `modal.js` and pass image data from `main.js`
    - In `main.js` `show()`, extend `spec.image` to `{ colors, path, title }`
    - In `modal.js` `openDialog`, import `buildArtVisual` from `corridor.js` and append `buildArtVisual(spec.image.colors, spec.image.path, spec.image.title)`
    - _Requirements: 2.2, 2.4, 3.2, 3.3, 3.4_

  - [ ]* 3.3 Write static source checks for art-image wiring
    - New file `test/art-source.test.js` using `readFileSync`: `buildArtVisual` is exported from `corridor.js`; `corridor.js` and `modal.js` both call it; the `error` handler calls only `img.remove()`; no `console.` in `corridor.js` or `modal.js`
    - Covers the DOM-only parts of Property 7 without a DOM dependency; the runtime behavior is checked in task 8
    - **Property 7: An image error always reverts to the gradient and touches nothing else (static check)**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 4. Stylesheet polish
  - [ ] 4.1 Fix tap targets and ceiling geometry
    - In `assets/css/style.css`, remove `margin-bottom: 20px` from the `.btn, .tog, .x, .banner-x, .card button, ...` rule and add `min-height: 44px` for `.pill`, `.btn`, `.btn.ghost` and `.card button`
    - Change `.ceiling` to `translate3d(0, -180px, var(--zc))` so it meets the wall top edge, keep the perspective and `translateZ` structure, and add a comment explaining why (3D math)
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

  - [ ] 4.2 Add `.art img` rule and glass placards
    - Add `.art img` filling the frame with `width: 100%; height: 100%; object-fit: cover; display: block`
    - Add a translucent card background token for both `data-theme="light"` and `data-theme="dark"`, apply it to `.card` with `backdrop-filter: blur(16px)` and `-webkit-backdrop-filter: blur(16px)`, keep radius at 8px or less, and add an `@supports not (backdrop-filter: blur(1px))` block with a more opaque background
    - Check AA contrast of card text in both themes
    - _Requirements: 2.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ] 4.3 Add door-code unlock glow and reduced-motion entries
    - Add a `transition` (about 500ms) on `.slot` for `border-color`, `color`, `background` and `box-shadow`; `.slot.on` uses `--accent` and `--glow`; `.slot` without `on` keeps the `--muted` locked look
    - Add `.slot, .slot.on` to the existing `prefers-reduced-motion` block with `transition: none`
    - Confirm `[data-theme=dark] .vig` keeps its `var(--mx, 50%) var(--my, 50%)` gradient and `.vig` keeps `pointer-events: none`
    - _Requirements: 8.1, 8.2, 8.3, 9.2, 9.3, 9.7_

  - [ ]* 4.4 Write static stylesheet tests
    - New file `test/css.test.js` using `readFileSync` and `assert.match`: tap-target selectors have `min-height: 44px` and none set `margin-bottom: 20px`; `.card` has both `backdrop-filter` and `-webkit-backdrop-filter` with `blur(16px)`; card background token defined for both themes; `@supports not (backdrop-filter` block present; `.ceiling` and `.floor` share the same Y magnitude and a comment is present; `.art img` has `object-fit: cover`; `.slot` transition duration is between 300ms and 700ms; reduced-motion block lists `.slot` and `.vig`; `.vig` has `pointer-events: none`
    - _Requirements: 2.5, 5.1, 5.2, 6.1, 6.3, 7.1, 7.2, 7.3, 7.6, 8.1, 8.3, 9.2, 9.3, 9.7, 10.4, 10.5, 10.6_

- [ ] 5. Pointer-tracked lantern spotlight
  - [ ] 5.1 Create the DOM-free `spotlight.js` module
    - New `assets/js/spotlight.js` exporting `shouldTrackPointer({ isDark, reducedMotion, pointerType })` (true only when dark, not reduced motion, and `pointerType !== "touch"`)
    - Export `createSpotlightScheduler({ raf, write })`, with `raf` injectable, that stores the latest pointer position and schedules at most one frame at a time; the frame callback calls `write(x, y)` with the latest values and resets the guard
    - Comment why the frame guard exists (at most one write per animation frame)
    - _Requirements: 9.1, 9.4, 9.5, 9.6, 9.8_

  - [ ] 5.2 Wire the spotlight listener in `main.js`
    - Add a `pointermove` listener that returns early unless `shouldTrackPointer` is true, then feeds the scheduler
    - The `write` callback sets `--mx` and `--my` (as percentages of the viewport) on `.vig`; read `matchMedia("(prefers-reduced-motion: reduce)")` at event time
    - Do not touch `S` or call `corridor.walkTo`
    - _Requirements: 9.1, 9.4, 9.5, 9.6, 9.8_

  - [ ]* 5.3 Write property test for `shouldTrackPointer`
    - New file `test/spotlight.test.js` over `fc.boolean()`, `fc.boolean()`, `fc.constantFrom("mouse", "pen", "touch")`
    - **Property 9: Pointer tracking is gated identically regardless of event history**
    - **Validates: Requirements 9.4, 9.6, 9.8**

  - [ ]* 5.4 Write property test for frame coalescing
    - Inject a fake `raf` that queues callbacks; feed an arbitrary sequence of positions, flush, and assert the number of `write` calls equals the number of flushed frames and the written values are the latest positions
    - **Property 10: At most one spotlight write per animation frame**
    - **Validates: Requirements 9.1, 9.5**

- [ ] 6. Door code slot text
  - [ ]* 6.1 Write property test for slot text
    - In `test/hygiene.test.js`, next to the existing `revealedDigit` test, assert for n in 3 to 6 and every solved mask that the slot text is the digit string for solved indices and `"•"` for unsolved ones
    - **Property 8: Slot text always reflects solved state, never color alone**
    - **Validates: Requirements 8.4**

- [ ] 7. README documentation
  - [ ] 7.1 Document the `image` field
    - In `README.md`, document the optional `image` field, the `assets/images/` location requirement, the rejected path forms, the gradient fallback, and show an example artwork entry containing `"image": "assets/images/..."`
    - _Requirements: 4.3, 4.4_

  - [ ]* 7.2 Write a README content check
    - New file `test/docs.test.js`: README contains `"image":` in a fenced example and mentions `assets/images/` and the fallback
    - _Requirements: 4.3, 4.4_

- [ ] 8. Manual browser verification
  - [ ]* 8.1 Verify in a browser at 390px, 768px and 1440px in both themes
    - Serve with a static server and check: no ceiling seam at the walls; tap targets measure at least 44px with no extra gap below; glass placards are legible with the corridor showing through; solved door slots glow and show their digit; the image shows in the corridor and the inspect dialog; a deliberately broken image path falls back to the gradient with no visible error and no console error; the lantern follows the mouse in dark mode and stays centered with reduced motion or touch
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 5.3, 6.1, 7.4, 8.1, 9.1, 9.6, 9.8_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- No DOM dev-dependency is added; DOM behavior is covered by pure helpers, static source checks and the manual verification task
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties; static tests validate CSS and wiring

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "4.1", "5.1", "7.1"] },
    { "id": 1, "tasks": ["1.2", "1.6", "3.1", "4.2", "5.2", "5.3", "7.2"] },
    { "id": 2, "tasks": ["1.3", "1.7", "2.2", "3.2", "4.3", "5.4", "6.1"] },
    { "id": 3, "tasks": ["1.4", "3.3", "4.4"] },
    { "id": 4, "tasks": ["1.5"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["9"] }
  ]
}
```
