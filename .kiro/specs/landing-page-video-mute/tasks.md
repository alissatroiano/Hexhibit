# Implementation Plan: Landing Page Video Mute

## Overview

Extract the intro logic from the inline scripts in `index.html` into a new ES module `assets/js/landing.js`, add a mute toggle, make playback reliable, remove dead code, fix markup and CSS defects, then update docs and tests. Language: JavaScript (ES modules), tests with `node --test`.

## Tasks

- [x] 1. Create the intro module `assets/js/landing.js`
  - [x] 1.1 Implement `prefersReducedMotion`, `toggleMute`, `createReveal` and `initLandingIntro`
    - Export the named functions as specified in the design
    - `toggleMute` flips `video.muted`, sets label "MUTE"/"UNMUTE" and `aria-pressed`, and never calls `play()`, `pause()` or touches `currentTime`
    - `createReveal` returns a closure with its own `done` flag; it pauses the video, then fades out and removes the wrapper (immediate removal under reduced motion)
    - `initLandingIntro` returns early if any required element is missing, sets the initial "UNMUTE" label and `aria-pressed="false"`, wires `ended`, `error` and Skip to reveal, and calls `video.play()` with a `.catch(reveal)`
    - Write no data to `localStorage`, `sessionStorage`, cookies or the URL
    - Guard the module-level `initLandingIntro()` call so the module can be imported in Node without `document` (for example, check `typeof document !== "undefined"`)
    - _Requirements: 1.3, 1.4, 1.5, 1.9, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 4.6_

  - [ ]* 1.2 Write property test for the mute toggle
    - **Property 1: Mute toggle is consistent and playback-preserving**
    - **Validates: Requirements 1.4, 1.5, 1.9**
    - Add to `test/landing.test.js` using fake video and button objects and `fast-check`

  - [ ]* 1.3 Write property test for reveal running once
    - **Property 2: Reveal runs its effects exactly once regardless of trigger count or order**
    - **Validates: Requirements 2.6, 2.7, 2.8**
    - Add to `test/landing.test.js` with fake wrapper, video and a stubbed timer; cover both reduced-motion states

  - [ ]* 1.4 Write unit tests for reveal and init behavior
    - Reveal sequence example: pause, `fade-out` class, then remove after the timeout
    - Reduced-motion example: immediate remove without `fade-out`
    - Initial label example: "UNMUTE" and `aria-pressed="false"` after `initLandingIntro`
    - Rejected `play()` and `error` event each trigger reveal
    - _Requirements: 1.3, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8_

- [x] 2. Update `index.html`
  - [x] 2.1 Fix markup and add the mute button
    - Remove the duplicate `<title>Landing Page</title>`, keep `<title>Hexhibit</title>`
    - Add `<link rel="icon" href="assets/images/favicon.png">`
    - Set the video source to `assets/videos/hexhibit.mp4` and add the `muted` attribute to `#introVideo`
    - Remove the `#videoClickLayer` element
    - Add `<button id="muteToggleBtn" class="mute-toggle-btn" type="button" aria-pressed="false">UNMUTE</button>` inside `#videoIntroWrapper`, text only
    - Add `rel="noopener"` to the CTA link that has `target="_blank"`
    - _Requirements: 1.1, 1.2, 1.6, 4.4, 5.1, 5.2, 5.3, 5.6_

  - [x] 2.2 Replace both inline scripts with the module
    - Delete both inline `<script>` blocks, including the scroll-expansion and magnetic-button code
    - Add `<script type="module" src="assets/js/landing.js"></script>`
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. Update `assets/css/landing.css`
  - [x] 3.1 Clean up rules and add the mute button styles
    - Delete the `.video-click-layer` rule
    - Merge the duplicated `@media (prefers-reduced-motion: reduce)` blocks into one with no duplicated declarations
    - Confirm no remaining rule exists only for the removed scroll-expansion or magnetic-button scripts; delete any that do
    - Add `.mute-toggle-btn` (Antonio, uppercase, `letter-spacing: 0.16em`, `min-width` and `min-height` of 44px, colors matching `.skip-intro-btn`, positioned beside it)
    - _Requirements: 1.7, 4.4, 4.5, 5.4, 5.7_

  - [x] 3.2 Add `:focus-visible` outlines
    - Cover `.mute-toggle-btn`, `.skip-intro-btn`, `.cta-btn` and the "How to Play" control (`.open-btn`) with an outline that meets WCAG AA contrast against its background
    - Ensure the mute button is operable with Tab, Enter and Space (native `<button>`, no `tabindex` override)
    - _Requirements: 1.8, 5.5_

- [x] 4. Checkpoint - Verify the landing page
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update docs
  - [x] 5.1 Update `.kiro/steering/structure.md`
    - List `index.html` as the landing page and add `play.html`, `assets/js/landing.js` and `assets/css/landing.css` to the layout block
    - _Requirements: 6.1_

  - [x] 5.2 Update `README.md`
    - Describe the landing page, `play.html` as the game entry point reached from "Enter Hexhibit", and the intro-video mute control
    - _Requirements: 6.2_

- [x] 6. Add landing tests and fix existing tests
  - [x] 6.1 Audit existing tests for `index.html` game references
    - Search `test/` (including `test/helpers/sources.js`, `smoke.test.js`, `hygiene.test.js`) for `index.html` used to check game behavior and switch those references to `play.html`
    - _Requirements: 6.3, 6.4_

  - [ ]* 6.2 Write markup and CSS tests in `test/landing.test.js`
    - `index.html`: exactly one `<title>Hexhibit</title>`, no inline `<script>`, one `type="module"` script for `assets/js/landing.js`, relative `assets/videos/hexhibit.mp4`, `muted` attribute, favicon link, `rel="noopener"` with `target="_blank"` on the CTA, no `videoClickLayer`, a `#muteToggleBtn` with text-only content
    - `landing.css`: no `.video-click-layer`, exactly one `prefers-reduced-motion` block, `.mute-toggle-btn` with uppercase, `0.16em` letter-spacing and a 44px minimum size, `:focus-visible` rules present
    - `landing.js` source contains no `localStorage`, `sessionStorage`, `document.cookie` or `location` writes
    - _Requirements: 1.2, 1.6, 1.7, 3.2, 4.1, 4.2, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.6_

  - [ ]* 6.3 Write a guard test against game assertions on `index.html`
    - Scan `test/**/*.test.js` sources and assert none combine `index.html` with game-only identifiers such as `doorCode`, `corridor` or `#slots`
    - _Requirements: 6.3, 6.4_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Run `node --test` and confirm the suite passes, ask the user if questions arise.
  - _Requirements: 6.5_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests validate Properties 1 and 2 from the design; unit tests cover examples and markup checks
- `play.html` and the game modules are out of scope

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1"] },
    { "id": 1, "tasks": ["2.1", "3.2"] },
    { "id": 2, "tasks": ["2.2", "1.2", "1.3", "1.4"] },
    { "id": 3, "tasks": ["4"] },
    { "id": 4, "tasks": ["5.1", "5.2", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3"] },
    { "id": 6, "tasks": ["7"] }
  ]
}
```
