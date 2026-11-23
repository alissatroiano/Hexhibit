# Requirements Document

## Introduction

This spec defines the minimum playable version of Hexhibit: one complete playthrough that runs end to end. The player studies the gallery in Daylight Mode, switches one-way to After-Hours Mode, solves every puzzle, enters the door code, and escapes.

The existing prototype (`index.html`, `assets/css/style.css`, `assets/js/script.js`) is the visual and behavioral reference. Visuals and behavior stay the same unless a requirement below says otherwise. The prototype hard-codes six artworks, six puzzles, a six-digit code, and the corridor length in JavaScript. This spec moves that content into a JSON exhibition file, drives the corridor, plaques, puzzles, and door code from the file, and introduces a single state object and a puzzle registry. An exhibition holds 3 to 6 artworks in this spec, and the corridor length, door-code length, solved counter, and wall layout follow from the artwork count. The placeholder exhibition has three artworks and three puzzles.

### Prototype review findings

These findings come from reading the prototype and the steering files, and they motivate the requirements.

**Layout discrepancies against the target layout in structure steering**

- The prototype stylesheet currently lives at `assets/css/style.css`. The target is `style.css` at the repo root, so this spec moves the file there explicitly, keeps `index.html` linking to it, and leaves the visuals unchanged.
- The script lives at `assets/js/script.js` as one classic script, and the target is ES modules under `js/` (`main.js`, `state.js`, `corridor.js`, `puzzles/`, `modal.js`, `content.js`). Only the JavaScript moves into `js/`, and it moves only as individual tasks need it, with no big-bang refactor.
- `content/default-exhibition.json` and `content/exhibition.schema.json` do not exist.
- `assets/hexhibit-logo.png` and `assets/favicon.png` are already at the required paths.
- `README.md` describes a different structure (`data/gallery-config.json`, `engine3d.js`, `audio.js`, `editor.js`, `storage.js`), five puzzle types, an educator studio, and share links. None of these exist or are in this spec, and the README does not match the structure steering.
- The ignore file is named `.gitginore` (typo), so Git does not apply it. This is outside this spec and is noted for the user.

**Prototype behavior that conflicts with steering or hard-codes content**

- Artworks, puzzles, answers, hints, plaque details, and the count `6` live in `script.js`. `index.html` also hard-codes `0/6 solved`.
- Dialog copy for the door, the enter-escape-room confirmation, the staff-only message, and the escaped message lives in `script.js`.
- The prototype stores the theme in `localStorage` (`hx-theme`) and restores After-Hours Mode on reload while discarding progress, which leaves the player locked in with zero solved puzzles. This spec removes the restore.
- The correct-answer dialog auto-closes after 1100 ms, which leaves no time to read a one-line explanation. This spec replaces the auto-close with a Continue button.
- The wrong-answer color is hard-coded as `#e5484d` instead of the `--bad` token.
- The artwork image in the dialog uses an inline `border-radius:8px`, which breaks the square-corner rule.
- The dialog has no focus trap, does not return focus on close, and the close button is 34px (the minimum is 44px).
- `prefers-reduced-motion` covers the door, shake, and vignette but not camera easing.
- The README lists UV, dial, audio, and sort puzzles, but the prototype code contains only text-answer puzzles.

### Assumptions

- A. (Decided) The app is served by a static server. ES modules and `fetch` of a JSON file do not work from a `file://` double-click in Chrome, so the "openable by double-clicking" goal in structure steering cannot hold for the JSON loader. The README gets a short note on how to run locally with a static server.
- B. (Decided) The app loads `content/default-exhibition.json` on boot. An optional `?exhibition=<relative path>` query parameter loads a different exhibition so that the validation and fallback path can be checked in a browser. The parameter accepts same-site relative paths only and rejects absolute URLs, protocol-relative values, backslashes, and `..` segments (Requirement 3.11). It is a testing aid, documented in the README and in this spec, and it is not a share link.
- C. Each artwork owns exactly one puzzle, and each puzzle yields exactly one door-code digit. The door code is the digits in artwork order.
- D. (Decided) An exhibition contains 3 to 6 artworks in this spec. The default has 3. The corridor length is calculated from the artwork count, and the door-code length, the solved counter, and the left/right wall layout follow from the count.
- E. The "wall" shown on the plaque is derived from the side of the corridor (left is North Wall, right is South Wall), as in the prototype, and is not stored in the data.
- F. Hints are free in this spec. Scoring is out of scope, so a hint has no point cost.
- G. (Decided) The page always starts in Gallery_Mode on load. The prototype's `hx-theme` restore is removed, and no progress is saved. Progress restore is a later spec.
- I. (Decided, final) The prototype stylesheet is currently at `assets/css/style.css`. It moves to the root `style.css` in this spec, and `assets/css/style.css` is removed after the move. JavaScript moves into `js/` ES modules incrementally, only as tasks need it.
- J. (Decided) Pure logic (exhibition validation, riddle normalization, state transitions, door-code computation) is tested in Node with `node --test`. `fast-check` is the only added package, as a dev-only dependency in `package.json` that the browser never loads. The app keeps no build step.
- H. Generic button labels such as "Check", "Hint", and "Continue" stay in the markup. Exhibition-specific copy lives in the JSON.

## Glossary

- **Hexhibit**: The browser application described by this spec.
- **Exhibition**: A JSON document that holds the title, messages, artworks, puzzles, hints, explanations, and door-code digits for one playthrough.
- **Default_Exhibition**: The file `content/default-exhibition.json`, which contains the placeholder content.
- **Exhibition_Schema**: The documented description of the Exhibition format in `content/exhibition.schema.json`.
- **Exhibition_Loader**: The module `js/content.js` that fetches, validates, and returns an Exhibition.
- **Artwork**: One framed painting entry in the Exhibition, with plaque details, a lesson, and one Puzzle.
- **Plaque**: The Gallery_Mode dialog for an Artwork, showing title, artist, year, medium, size, wall, curator note, and lesson.
- **Puzzle**: A question attached to an Artwork, with a `type`, a prompt, a hint, a nudge, an explanation, and a door-code digit.
- **Puzzle_Registry**: The module `js/puzzles/index.js` that maps a Puzzle `type` string to a Puzzle_Handler.
- **Puzzle_Handler**: A module under `js/puzzles/` that renders one Puzzle type and evaluates answers for that type.
- **Riddle_Puzzle**: The Puzzle type `riddle`, which accepts a typed text answer.
- **Choice_Puzzle**: The Puzzle type `choice`, which accepts one selected option from a list.
- **Nudge**: The short helpful message shown after a wrong answer.
- **Explanation**: The one-line statement of why the correct answer works, shown after a right answer.
- **Hint**: The single piece of extra help attached to a Puzzle.
- **Door_Code**: The string formed by concatenating the digits of all Puzzles in Artwork order.
- **Game_State**: The single `state` object in `js/state.js` that holds the phase and all play progress.
- **Phase**: One of `gallery`, `escape`, `solved`, or `escaped`.
- **Gallery_Mode**: The Daylight (light theme) mode in which the player studies Artworks. This is the `gallery` Phase.
- **After_Hours_Mode**: The dark theme mode in which the player solves Puzzles. This covers the `escape` and `solved` Phases and the `escaped` Phase until the player returns.
- **Corridor**: The CSS 3D world that holds the floor, ceiling, walls, framed Artworks, and the door.
- **Stop**: A camera position in the Corridor beside one Artwork or at the door.
- **Dialog**: The modal that shows Plaques, Puzzles, the door keypad, confirmations, and the escaped message.
- **Pure_Logic_Module**: A module under `js/` that holds logic with no DOM or `localStorage` access at import time: exhibition validation, riddle normalization, state transitions, and Door_Code computation.
- **Status_Region**: The element in the Dialog with `role="status"` that announces feedback.

## Requirements

### Requirement 1: Project layout and prototype parity

**User Story:** As a developer, I want the code laid out as the structure steering describes, so that later specs can add features without restructuring.

#### Acceptance Criteria

1. THE Hexhibit SHALL provide `index.html` and `style.css` at the repository root, with the stylesheet moved from `assets/css/style.css` to `style.css`, the old file removed, and `index.html` linking to the new location, and SHALL provide the ES modules `js/main.js`, `js/state.js`, `js/corridor.js`, `js/modal.js`, `js/content.js`, and `js/puzzles/index.js`.
2. THE Hexhibit SHALL load `js/main.js` from `index.html` with `<script type="module">` and SHALL use no framework, bundler, build step, or runtime dependency. The only permitted added package is the dev-only test dependency in Requirement 15.
3. THE Hexhibit SHALL keep `assets/hexhibit-logo.png` and `assets/favicon.png` at their current paths with their current file names.
4. THE Hexhibit SHALL reuse the existing CSS custom properties, fonts, and component styles from the prototype stylesheet without new colors, fonts, or component styles.
5. WHEN a new CSS token is needed, THE Hexhibit SHALL define the token for both `light` and `dark` themes in `style.css`.
6. THE Hexhibit SHALL keep the following prototype behaviors: Corridor perspective and camera easing, W/S/arrow/wheel/Back/Next walking, mouse look, turning to face the Artwork at a Stop, the "CLICK TO INSPECT" cue, click assist near an Artwork, door glow, door swing, and the theme toggle button.
7. WHEN the Exhibition_Loader returns an Exhibition, THE Hexhibit SHALL render the Corridor, Plaques, Puzzles, progress text, and Door_Code slots from that Exhibition, with no Artwork, puzzle, or answer text defined in any `.js` file.
8. THE Hexhibit SHALL start in Gallery_Mode on every page load and SHALL NOT restore After_Hours_Mode from `localStorage`.
9. THE Hexhibit SHALL function when `localStorage` is unavailable, and every `localStorage` access in the code SHALL sit inside a try/catch block.
10. WHEN the stylesheet is moved to `style.css`, THE Hexhibit SHALL render every screen with the same visuals as the prototype in both themes.
11. THE Hexhibit SHALL move JavaScript from `assets/js/script.js` into `js/` ES modules incrementally, one task at a time, and SHALL remain playable after each task.

### Requirement 2: Exhibition data file

**User Story:** As a content author, I want all lesson content in one JSON file, so that I can change the lesson without editing code.

#### Acceptance Criteria

1. THE Default_Exhibition SHALL define an Exhibition `title`, a `messages` object, and an `artworks` array.
2. THE `messages` object SHALL hold the text for the enter-escape-room confirmation (`enterEscape`), the locked-door dialog (`doorLocked`), the unlocked-door prompt (`doorUnlocked`), the gallery staff-only dialog (`staffOnly`), the escaped dialog (`escaped`), the wrong-code door nudge (`doorNudge`), and the digits-found text (`digitsFound`), where `digitsFound` contains the placeholders `{found}` and `{total}`.
3. THE Exhibition_Schema SHALL document each Artwork field: `id`, `title`, `artist`, `year`, `medium`, `size`, `curatorNote`, `lesson`, `colors` (two CSS hex colors for the generated gradient image), and `puzzle`.
4. THE Exhibition_Schema SHALL document the common Puzzle fields: `type`, `prompt`, `hint`, `nudge`, `explanation`, and `digit` (a single character `0` to `9`).
5. THE Exhibition_Schema SHALL document the Riddle_Puzzle field `answers` (a non-empty array of accepted answer strings) and the Choice_Puzzle fields `options` (an array of 2 to 6 strings) and `correctIndex` (an integer index into `options`).
6. THE Exhibition_Schema SHALL list all seven `messages` keys from criterion 2 as required strings, and THE Default_Exhibition SHALL define every one of them.
7. THE Default_Exhibition SHALL contain exactly 3 Artworks, each with one Puzzle and short placeholder lesson text, where at least one Puzzle has `type` `riddle` and at least one has `type` `choice`.
8. THE Hexhibit SHALL reference Artwork images only as generated gradients derived from `colors` and SHALL NOT embed image data in the Exhibition.
9. THE Hexhibit SHALL keep the Exhibition format extensible so that an unknown optional Artwork or Puzzle field does not cause validation to fail.

### Requirement 3: Exhibition validation and fallback

**User Story:** As a player, I want a broken exhibition to fall back to the built-in lesson with a clear message, so that the app never shows a blank screen.

#### Acceptance Criteria

1. WHEN the Exhibition_Loader receives an Exhibition, THE Exhibition_Loader SHALL validate it against the Exhibition_Schema rules before any rendering.
2. IF an Exhibition lacks a required field (including any `messages` key), has a field of the wrong type, has fewer than 3 or more than 6 Artworks, has duplicate Artwork `id` values, has a `digit` that is not a single character `0` to `9`, or has a Puzzle `type` that is not registered in the Puzzle_Registry, THEN THE Exhibition_Loader SHALL reject the Exhibition and report each problem with the field path.
3. IF a Choice_Puzzle `correctIndex` is outside the range of `options`, THEN THE Exhibition_Loader SHALL reject the Exhibition.
4. IF an Exhibition passed through the `?exhibition=` parameter is rejected or cannot be fetched, THEN THE Hexhibit SHALL show a friendly error message in a visible banner and SHALL load the Default_Exhibition instead.
5. IF the Default_Exhibition is rejected or cannot be fetched, THEN THE Hexhibit SHALL show a friendly error screen that names the problem and SHALL NOT throw an uncaught exception.
6. WHEN the Exhibition_Loader accepts an Exhibition, THE Exhibition_Loader SHALL return the Exhibition with the Door_Code computed from the Puzzle digits in Artwork order.
7. FOR ALL valid Exhibitions, serializing the Exhibition with `JSON.stringify` and loading the result through the Exhibition_Loader SHALL produce an Exhibition equal to the original (round-trip property).
8. FOR ALL valid Exhibitions with N Artworks, THE Door_Code SHALL have length N and character i SHALL equal the digit of the Puzzle on Artwork i (invariant).
9. THE Hexhibit SHALL log no console errors during a rejected-Exhibition fallback.
10. WHERE the page URL contains an `exhibition` query parameter, THE Exhibition_Loader SHALL fetch the Exhibition from the relative path given by the parameter instead of the Default_Exhibition.
11. IF the `exhibition` query parameter value is an absolute URL with any scheme, is protocol-relative (begins with `//`), contains a backslash, or contains the segment `..`, THEN THE Exhibition_Loader SHALL reject the value without fetching it, SHALL show the friendly error banner, and SHALL load the Default_Exhibition.
12. THE Hexhibit SHALL treat the `exhibition` query parameter as a testing aid, and THE README and the Exhibition_Schema documentation SHALL state that the parameter is not a share link.

### Requirement 4: Corridor generation

**User Story:** As a player, I want the corridor to match the number of artworks in the lesson, so that the gallery feels right for any exhibition.

#### Acceptance Criteria

1. WHEN an Exhibition with N Artworks is loaded, THE Corridor SHALL create N framed Artworks alternating between the left and right walls, starting on the left, at the same spacing as the prototype.
2. WHEN an Exhibition with N Artworks is loaded, THE Corridor SHALL create N Stops, one door Stop, and a corridor length calculated from N and the stop-spacing constants that places the door a constant distance beyond the last Artwork Stop, with no hard-coded corridor length.
3. WHEN an Exhibition with N Artworks is loaded, THE Hexhibit SHALL show N Door_Code slots and SHALL show the viewed counter and the solved counter with N as the total.
4. THE Corridor SHALL draw each Artwork image as the gradient generated from the two `colors` of the Artwork, using the same gradient construction as the prototype.
5. THE Corridor SHALL define stop spacing, stop offset, click-assist window, and door distance as named constants.
6. WHILE the camera is within the click-assist window of an Artwork, THE Corridor SHALL mark that Artwork as clickable with the existing glow.
7. WHEN the player activates an Artwork with the pointer or the Enter key, THE Corridor SHALL open that Artwork's Dialog if the camera is within the click-assist window, and SHALL otherwise walk the camera to that Artwork's Stop and then open the Dialog.
8. WHEN an Artwork Puzzle is solved, THE Corridor SHALL mark the Artwork as done with the existing check glyph.
9. THE Corridor SHALL contain comments that explain the reason for each 3D transform and camera behavior.

### Requirement 5: Gallery mode plaques

**User Story:** As a student, I want each artwork to show a plaque with its details and lesson, so that I can study before the puzzles.

#### Acceptance Criteria

1. WHILE the Phase is `gallery`, WHEN the player activates an Artwork, THE Dialog SHALL show the Artwork title, artist and year, the generated image, the medium, the size, the wall, the curator note, and the lesson.
2. WHILE the Phase is `gallery`, WHEN a Plaque is opened, THE Game_State SHALL add the Artwork `id` to the set of viewed Artworks.
3. WHILE the Phase is `gallery`, THE Hexhibit SHALL show the progress text as `<viewed>/<total> artworks viewed`, where `<total>` is the number of Artworks in the Exhibition.
4. WHILE the Phase is `gallery`, THE Hexhibit SHALL show no timer and no score.
5. WHILE the Phase is `gallery`, WHEN the player activates the door, THE Dialog SHALL show the staff-only text from `messages`.
6. THE Dialog SHALL render the Artwork image with square corners.

### Requirement 6: Game state machine

**User Story:** As a developer, I want one state object with explicit transitions, so that the game flow is predictable and testable.

#### Acceptance Criteria

1. THE Game_State SHALL be a single `state` object that holds the Phase, the set of viewed Artwork ids, the set of solved Artwork ids, the set of Puzzle ids with a revealed Hint, and the current Artwork index.
2. THE Game_State SHALL expose named transition functions for `gallery → escape`, `escape → solved`, `solved → escaped`, and `escaped → gallery`.
3. WHEN the page loads, THE Game_State SHALL start in the `gallery` Phase with empty viewed and solved sets.
4. WHEN the player confirms the enter-escape-room Dialog, THE Game_State SHALL transition from `gallery` to `escape`.
5. WHEN the last unsolved Puzzle is solved while the Phase is `escape`, THE Game_State SHALL transition to `solved`.
6. WHEN the correct Door_Code is entered while the Phase is `solved`, THE Game_State SHALL transition to `escaped`.
7. WHEN the player chooses to return to the gallery while the Phase is `escaped`, THE Game_State SHALL transition to `gallery` and SHALL clear the viewed, solved, and Hint sets.
8. IF a transition is requested from a Phase that does not allow it, THEN THE Game_State SHALL leave the state unchanged.
9. THE Game_State SHALL set the `data-theme` attribute to `light` in the `gallery` Phase and to `dark` in the `escape`, `solved`, and `escaped` Phases.
10. FOR ALL sequences of transition requests, THE Phase SHALL always be one of `gallery`, `escape`, `solved`, or `escaped`, and the solved set SHALL always be a subset of the Artwork ids in the Exhibition (invariant).

### Requirement 7: One-way switch to After-Hours Mode

**User Story:** As a student, I want a clear confirmation before the escape room starts, so that I do not lose my study time by accident.

#### Acceptance Criteria

1. WHILE the Phase is `gallery`, THE theme toggle button SHALL read "Enter escape room →" and SHALL be enabled.
2. WHEN the player activates the theme toggle button in the `gallery` Phase, THE Dialog SHALL show the enter-escape-room text from `messages` with a "Step inside" button and a "Stay in the gallery" button.
3. WHEN the player chooses "Stay in the gallery", THE Dialog SHALL close and THE Game_State SHALL remain in the `gallery` Phase.
4. WHILE the Phase is `escape` or `solved`, THE theme toggle button SHALL read "Locked in" and SHALL be disabled.
5. WHILE the Phase is `escaped`, THE theme toggle button SHALL read "Back to gallery" and SHALL be enabled.
6. WHILE the Phase is `escape`, `solved`, or `escaped`, THE Hexhibit SHALL show the door-code slots and the progress text as `<solved>/<total> solved`.

### Requirement 8: Puzzle registry

**User Story:** As a developer, I want puzzle types registered by name, so that I can add a new type without editing corridor code.

#### Acceptance Criteria

1. THE Puzzle_Registry SHALL map a Puzzle `type` string to a Puzzle_Handler.
2. THE Puzzle_Registry SHALL register the types `riddle` and `choice`.
3. THE Puzzle_Handler contract SHALL define a render function that builds the answer area for a Puzzle and an evaluate function that returns a result of `correct` or `incorrect` for the player's input.
4. WHEN a Puzzle Dialog is opened, THE Dialog SHALL obtain the Puzzle_Handler through the Puzzle_Registry using the Puzzle `type` and SHALL NOT branch on a specific type name.
5. WHEN a new Puzzle_Handler file is added under `js/puzzles/` and registered in the Puzzle_Registry, THE Hexhibit SHALL support Puzzles of that type with no change to `js/corridor.js`.
6. THE Puzzle_Registry SHALL expose a function that reports whether a type is registered, for use by the Exhibition_Loader.

### Requirement 9: Riddle puzzle

**User Story:** As a student, I want to type an answer to a riddle, so that I recall what I studied.

#### Acceptance Criteria

1. THE Riddle_Puzzle handler SHALL render the prompt and a labeled text input.
2. WHEN the player submits a text answer, THE Riddle_Puzzle handler SHALL compare the answer to each accepted answer after trimming leading and trailing whitespace, collapsing internal whitespace to a single space, and converting both strings to lower case.
3. WHEN the normalized answer equals any normalized entry in `answers`, THE Riddle_Puzzle handler SHALL return `correct`.
4. WHEN the normalized answer equals no entry in `answers`, THE Riddle_Puzzle handler SHALL return `incorrect`.
5. WHEN the player presses the Enter key in the text input, THE Riddle_Puzzle handler SHALL submit the answer.
6. IF the player submits an empty answer, THEN THE Riddle_Puzzle handler SHALL return `incorrect` and THE Dialog SHALL show the Nudge.
7. FOR ALL accepted answers, evaluating the answer in any letter case with any surrounding whitespace SHALL return `correct` (metamorphic property).

### Requirement 10: Multiple choice puzzle

**User Story:** As a student, I want to pick from options, so that I can answer without typing.

#### Acceptance Criteria

1. THE Choice_Puzzle handler SHALL render the prompt and one selectable option control per entry in `options`, in the order given.
2. THE Choice_Puzzle handler SHALL render the options as a keyboard-operable radio group with a visible label.
3. WHEN the player submits the selected option, THE Choice_Puzzle handler SHALL return `correct` if the selected index equals `correctIndex` and `incorrect` otherwise.
4. IF the player submits with no option selected, THEN THE Choice_Puzzle handler SHALL return `incorrect` and THE Dialog SHALL show the Nudge.
5. THE Choice_Puzzle handler SHALL render each option control with a tap target of at least 44px in height.
6. THE Choice_Puzzle handler SHALL use the existing square-corner, 1px `--line` border input styling, with the selected option indicated by more than color alone.

### Requirement 11: Feedback and hints

**User Story:** As a student, I want a helpful nudge when I am wrong and a reason when I am right, so that every answer teaches me something.

#### Acceptance Criteria

1. WHEN the Puzzle_Handler returns `incorrect`, THE Dialog SHALL show the Puzzle `nudge` text in the Status_Region using the `--bad` color token and an accompanying text label, and SHALL play a short shake animation.
2. WHEN the Puzzle_Handler returns `correct`, THE Dialog SHALL show the Puzzle `explanation` text and the revealed door-code digit in the Status_Region using the `--accent` color token.
3. WHEN the Puzzle_Handler returns `correct`, THE Game_State SHALL add the Artwork `id` to the solved set and THE Hexhibit SHALL fill the matching door-code slot with the Puzzle digit.
4. WHEN the Puzzle_Handler returns `correct`, THE Dialog SHALL remain open and SHALL show a "Continue" button that closes the Dialog.
5. WHEN the player activates the Hint button, THE Dialog SHALL show the Puzzle `hint` text in the Status_Region and SHALL add the Puzzle id to the revealed-Hint set.
6. WHEN the player activates the Hint button again for the same Puzzle, THE Dialog SHALL show the same `hint` text and SHALL NOT change the revealed-Hint set.
7. THE Hexhibit SHALL offer exactly one Hint per Puzzle.
8. WHEN an Artwork whose Puzzle is already solved is opened, THE Dialog SHALL show the Explanation and the digit, SHALL hide the answer area and the Hint button, and SHALL show a "Continue" button.
9. THE Hexhibit SHALL NOT block progress on any Hint use and SHALL NOT limit the number of answer attempts.
10. THE Status_Region SHALL have `role="status"` and SHALL announce each Nudge, Explanation, and Hint.
11. WHERE `prefers-reduced-motion: reduce` is set, THE Hexhibit SHALL show wrong-answer feedback without the shake animation.

### Requirement 12: Door code and escape

**User Story:** As a student, I want to enter the code I earned at the locked door, so that I can escape.

#### Acceptance Criteria

1. WHILE the Phase is `escape` or `solved`, WHEN the player activates the door, THE Dialog SHALL show the locked-door text from `messages`, the `digitsFound` text from `messages` with `{found}` replaced by the number of solved Puzzles and `{total}` replaced by the number of Artworks, and a numeric keypad input with a "Check" button.
2. WHILE the Phase is `escape` and fewer than all Puzzles are solved, WHEN the player submits the Door_Code, THE Dialog SHALL show a message that tells the player to solve every Puzzle first, even when the submitted value equals the Door_Code.
3. WHILE the Phase is `solved`, WHEN the player submits a value equal to the Door_Code, THE Hexhibit SHALL change the lock label from "LOCKED" to "UNLOCKED", walk the camera to the door, swing the door open, and then show the escaped Dialog from `messages`.
4. IF the player submits a value that does not equal the Door_Code, THEN THE Dialog SHALL show the `doorNudge` text from `messages` and SHALL play the shake animation unless reduced motion is requested.
5. WHILE the Phase is `escaped`, THE escaped Dialog SHALL offer a "Return to the gallery" button and a "Stay a moment" button.
6. WHEN the player chooses "Return to the gallery", THE Hexhibit SHALL reset the Corridor, the door, the Artwork done marks, and the slots, move the camera to the start, and switch to Gallery_Mode.
7. WHEN the player chooses "Stay a moment", THE Dialog SHALL close and THE Game_State SHALL remain in the `escaped` Phase.
8. WHEN the Phase becomes `escaped`, THE Hexhibit SHALL show only the escaped Dialog from `messages` as the end-of-game display, with no results screen, score, or recap.

### Requirement 13: Accessibility, motion, and responsive behavior

**User Story:** As a student on a Chromebook, tablet, or phone, I want the whole loop to work by keyboard and touch, so that I can play on any device.

#### Acceptance Criteria

1. THE Hexhibit SHALL allow a complete playthrough using only the keyboard, including walking, opening Artworks, answering Puzzles, using the Hint, entering the code, and closing every Dialog.
2. WHILE a Dialog is open, THE Dialog SHALL keep keyboard focus inside the Dialog and SHALL set `aria-modal="true"` and an accessible name from the Dialog heading.
3. WHEN a Dialog opens, THE Dialog SHALL move focus to the first interactive control in the Dialog.
4. WHEN a Dialog closes, THE Dialog SHALL return focus to the element that opened the Dialog.
5. WHEN the player presses the Escape key while a Dialog is open, THE Dialog SHALL close.
6. THE Hexhibit SHALL give every Dialog button, input, and option control a tap target of at least 44px in height and width, including the close button.
7. WHERE `prefers-reduced-motion: reduce` is set, THE Hexhibit SHALL disable the vignette flicker, the door swing animation, and camera easing, and SHALL move the camera directly to the target position.
8. THE Hexhibit SHALL meet WCAG AA contrast of at least 4.5:1 for body text and Status_Region text in both themes.
9. THE Hexhibit SHALL render without horizontal scrolling and without clipped controls at viewport widths of 390px, 768px, and 1440px in both themes.
10. THE Hexhibit SHALL show no information in color alone, and SHALL pair each correct and incorrect feedback state with text.
11. THE Hexhibit SHALL emit no console errors during a complete playthrough from `gallery` through `escaped` and back to `gallery`.
12. THE Hexhibit SHALL use no emoji in the interface, and SHALL use text labels such as LOCKED and UNLOCKED.

### Requirement 14: Documentation

**User Story:** As a content author, I want the README to explain how to run the app and edit the lesson, so that I can use Hexhibit without reading the code.

#### Acceptance Criteria

1. THE README SHALL describe how to run the app with a static server, including the command and the reason that a `file://` double-click is not supported.
2. THE README SHALL describe how to author an Exhibition, with a minimal example of one `riddle` Puzzle and one `choice` Puzzle and a link to the Exhibition_Schema.
3. THE README SHALL list the actual repository layout and SHALL remove or mark as planned any feature that is not built (additional puzzle types, educator studio, share links, audio).
4. THE README SHALL document the `?exhibition=<relative path>` query parameter as a testing aid that accepts same-site relative paths only, rejects absolute URLs, protocol-relative paths, values containing a backslash, and paths containing `..`, and is not a share link.
5. THE README SHALL include a short "Built with Kiro" section that describes the use of steering and specs.
6. THE README SHALL document how to run the tests with `npm install` and `node --test`, and SHALL state that `fast-check` is a dev-only dependency that the browser app never loads.

### Requirement 15: Testability of pure logic

**User Story:** As a developer, I want the core logic tested without a browser, so that I can change it with confidence.

#### Acceptance Criteria

1. THE Hexhibit SHALL place exhibition validation, riddle answer normalization and evaluation, Game_State transitions, and Door_Code computation in Pure_Logic_Modules that import and run in Node without a browser.
2. THE Pure_Logic_Modules SHALL NOT access `document`, `window`, or `localStorage` at import time, and SHALL receive any storage or DOM dependency as a function argument.
3. THE Hexhibit SHALL run the test suite with the command `node --test` and no other build or transpile step.
4. THE Hexhibit SHALL provide a `package.json` with `"type": "module"` and a `devDependencies` entry for `fast-check`, and the browser app SHALL NOT load `package.json`, `node_modules`, or any test file.
5. THE test suite SHALL include one property-based test for each of Requirements 3.7 (round trip), 3.8 (Door_Code invariant), 6.10 (Phase and solved-set invariant), and 9.7 (riddle normalization), using `fast-check`.
6. THE test suite SHALL include example-based tests for each rejection case in Requirement 3.2, 3.3, and 3.11.
7. WHEN `node --test` runs on a clean checkout after `npm install`, THE test suite SHALL pass with no browser installed.

## Out of scope

More puzzle types (UV lantern, chronological sort, dial, audio), scoring and hint cost, results screen and recap, saved progress, shareable `#room=` links, and the educator authoring tool. The data format (`type` plus per-type fields, unknown optional fields allowed) and the Puzzle_Registry are the extension points for these.
