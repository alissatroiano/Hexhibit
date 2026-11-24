# Requirements Document

## Introduction

This spec makes the door code different in every game, so that replays and classmates cannot share answers. Today the door code is fixed by the `digit` field of each puzzle in the exhibition file, so every player of the same exhibition gets the same code. After this spec, the Game_State generates one random Door_Code when the player steps inside (`gallery → escape`) and discards it when the game ends. Each solved puzzle reveals the Session_Digit at its artwork's index, and the door check compares against the Door_Code of the current game.

This spec is authoritative over `.kiro/specs/mvp-playable-loop/requirements.md` (spec 1) for everything about digits and the door code. Spec 1 rules about digits are removed or rewritten here and listed in the Superseded criteria table. Nothing in this spec contradicts spec 1 outside that table.

Behavior removed by this spec:

- The Exhibition_Loader no longer computes or returns a `doorCode`. `computeDoorCode` is removed.
- The Exhibition_Loader no longer requires or validates `digit`.
- The `digit` field no longer decides anything at runtime. It is optional and ignored.

This spec also expands the Default_Exhibition from 3 to 6 artworks (data only). The corridor already supports 3 to 6 artworks, so no corridor change is planned. No visual change is intended. Requirement 6.7 adds a browser check that can surface existing corridor findings (see Assumption J).

This spec also implements three spec 1 property-based tests that were never written (3.7, 6.10, and 9.7), see Requirement 8.

### Assumptions

- A. (Decided) One Door_Code per game, with one digit per artwork. The digit at index i belongs to the artwork at index i of the Exhibition. N equals the artwork count (3 to 6).
- B. (Decided) A game starts when the player confirms "Step inside" and ends when the Phase becomes `escaped`. The Door_Code lives from the first moment to the return to the gallery, so that the escaped dialog and any reopened artwork stay consistent until the player leaves.
- C. (Decided) The Door_Code is held only in the Game_State object in memory. It is never written to the URL, `localStorage`, the DOM (including attributes), the console, or the Exhibition.
- D. (Decided) Digits are independent and uniform, but a Door_Code whose digits are all identical is never generated. The Code_Generator retries up to `MAX_ALL_SAME_RETRIES` (10) times, then fixes up the last digit, so it always terminates (Requirement 1.12). Repeated digits that are not all identical remain valid. Retrying slightly changes the distribution over codes (all-same codes are excluded), which is intended.
- E. (Decided) The Random_Source is a caller-supplied function that returns one random byte (an integer from 0 to 255) per call. The Code_Generator maps bytes to digits by rejection sampling (bytes 250 to 255 are discarded and redrawn), which avoids modulo bias. The exact function signatures are left to design.
- F. (Decided, final) Spec 1 is not rewritten in place and gets no per-criterion notes. Each of its three files (`requirements.md`, `design.md`, `tasks.md`) gets one blockquote banner directly under the title, which has been added. This spec's `requirements.md` stays the authority.
- G. Spec 1's optional test tasks were never implemented, and only `test/smoke.test.js` exists. The tests defined here replace the spec 1 test requirements that mention digits (3.8 and the Door_Code part of 15.1 and 15.5), add new tests, and implement spec 1's 3.7, 6.10, and 9.7. No existing test file needs editing for this spec.
- H. (Decided) Tests run with `node --test` and `fast-check` as in spec 1. No new dependency is added.
- I. (Decided) The three new artworks use short placeholder topics and lesson text chosen by the agent, in the same museum voice as the existing artworks.
- J. Corridor state checked while writing this spec. The floor, `.wall-left`, and `.wall-right` are sized from `--len` and positioned from `--zc` by `assets/js/corridor.js`, so they are built to reach the back wall at `--door-z`. The `.ceiling` rule in `assets/css/style.css` is different: it has a fixed `height: 3600px` and `top: -1800px`, it does not use `--len` or `--zc`, and its `transform` line is commented out. The ceiling element exists in `index.html`. Whether it renders as a ceiling at all, and whether it reaches the back wall, is therefore unverified and likely not true today. Requirement 6.7 requires the check, and a failure is reported as a finding to the user. A finding is not silently skipped and is not fixed under this spec without the user's decision.
- K. (Decided) The Code_Generator and the byte-to-digit mapping live in a new pure sibling module `assets/js/random.js`, and `assets/js/state.js` imports it and receives the Random_Source as an argument of `enterEscape`. Reason: the generator and its sampling logic can then be tested in Node without loading the state machine, `state.js` stays a state machine, and both modules stay import-safe in Node.

## Glossary

- **Hexhibit**: The browser application.
- **Exhibition**: The JSON document that holds the title, messages, artworks, and puzzles for one lesson. As in spec 1, except that it holds no door-code digits.
- **Default_Exhibition**: The file `content/default-exhibition.json`.
- **Exhibition_Schema**: The documented format in `content/exhibition.schema.json`.
- **Exhibition_Loader**: The module `assets/js/content.js`, which fetches and validates an Exhibition.
- **Artwork**: One framed painting entry in the Exhibition, with one Puzzle.
- **Puzzle**: A question attached to an Artwork, with a `type`, a prompt, a hint, a nudge, and an explanation. A Puzzle has no digit of its own. Its Session_Digit comes from the Door_Code.
- **Game**: One run from the confirmed `gallery → escape` transition until the `escaped` Phase ends with `escaped → gallery`.
- **Door_Code**: The string of N decimal digit characters (`0` to `9`) generated for the current Game, where N is the Artwork count. It is a string so that leading zeros are preserved. It never has all N digits identical. It exists only while a Game is in progress.
- **Session_Digit**: The character of the Door_Code at the index of an Artwork. It is revealed when that Artwork's Puzzle is solved.
- **Random_Source**: A function supplied by the caller that takes no argument and returns one random byte, an integer from 0 to 255, and that the Code_Generator uses as its only source of randomness.
- **Code_Generator**: The pure function in `assets/js/random.js` that takes a Random_Source and an Artwork count and returns a Door_Code.
- **MAX_ALL_SAME_RETRIES**: The named constant `10`, the number of times the Code_Generator regenerates a code whose digits are all identical before it applies the fix-up.
- **MAX_DRAWS_PER_DIGIT**: The named constant `100`, the number of consecutive rejected bytes the Code_Generator tolerates for one digit before it throws.
- **Fix_Up**: Replacing the last digit of an all-identical code with `(digit + 1) mod 10`.
- **Game_State**: The single `state` object in `assets/js/state.js`.
- **Phase**: One of `gallery`, `escape`, `solved`, or `escaped`.
- **Slot**: One door-code placeholder in the top bar. It shows a bullet until its Puzzle is solved, then shows the Session_Digit.
- **Status_Region**: The element in the Dialog with `role="status"`.
- **Pure_Logic_Module**: A module under `assets/js/` that has no DOM, `window`, `crypto`, or `localStorage` access at import time or when called.

## Requirements

### Requirement 1: Door code generation

**User Story:** As a teacher, I want every game to have its own random door code, so that students cannot pass answers to classmates or memorize the code on a replay.

#### Acceptance Criteria

1. THE Code_Generator SHALL return a Door_Code string of exactly N characters when called for N Artworks, and every character SHALL be one of `0` to `9`.
2. THE Code_Generator SHALL obtain all randomness from the Random_Source it receives and SHALL NOT call `Math.random`.
3. THE Code_Generator SHALL return the same Door_Code every time it is called with Random_Sources that yield the same sequence of values and the same N.
4. THE Code_Generator SHALL be an export of `assets/js/random.js`, and `assets/js/random.js` and `assets/js/state.js` SHALL each be a Pure_Logic_Module that imports without error in Node.
5. THE Code_Generator SHALL map each byte from 0 to 249 to the digit `byte mod 10` and SHALL discard each byte from 250 to 255 and draw again, so that the digits are uniformly distributed over `0` to `9` without modulo bias.
6. THE `assets/js/main.js` module SHALL contain no code-generation logic and SHALL only pass a Random_Source built on `window.crypto.getRandomValues` into the Game_State.
7. IF N is not an integer from 3 to 6, THEN THE Code_Generator SHALL throw a `RangeError`.
8. IF the Random_Source returns a value that is not an integer from 0 to 255, THEN THE Code_Generator SHALL throw an error and SHALL NOT return a Door_Code.
9. IF the Random_Source returns `MAX_DRAWS_PER_DIGIT` consecutive discarded bytes for one digit, THEN THE Code_Generator SHALL throw an error, so that a stand-in source that always returns 255 cannot cause an endless loop.
10. WHEN the Game_State transitions from `gallery` to `escape`, THE Game_State SHALL generate one Door_Code for N equal to the number of Artworks and SHALL store it in the Game_State object.
11. WHILE the Phase is `escape`, `solved`, or `escaped`, THE Game_State SHALL keep the same Door_Code without change.
12. IF a generated Door_Code has all identical digits, THEN THE Code_Generator SHALL generate a new code, up to `MAX_ALL_SAME_RETRIES` (10) times, and IF the code is still all identical after the last retry, THEN THE Code_Generator SHALL apply the Fix_Up, so that the function always terminates and never returns an all-identical code.
13. FOR ALL Random_Sources and N from 3 to 6, THE Door_Code SHALL NOT have all digits identical (invariant).
14. FOR ALL Artwork counts N from 3 to 6, THE Door_Code length SHALL equal N (invariant).
15. FOR ALL Random_Sources, every character of the Door_Code SHALL be in `0` to `9` (invariant).
16. FOR ALL Random_Sources, calling the Code_Generator twice with Random_Sources that yield identical value sequences SHALL return identical codes (determinism).
17. FOR ALL sets of many different Random_Sources, THE returned Door_Codes SHALL NOT all be identical (variation property). The test SHALL NOT assert that two consecutive codes differ.

### Requirement 2: Game lifecycle and storage of the code

**User Story:** As a player, I want a new code each time I step inside, so that a replay is a fresh puzzle.

#### Acceptance Criteria

1. WHEN the page loads, THE Game_State SHALL start in the `gallery` Phase with no Door_Code.
2. WHEN `enterEscape` is called while the Phase is `gallery`, THE Game_State SHALL generate a new Door_Code first and, only after generation succeeds, SHALL change the Phase to `escape` and store the Door_Code.
3. IF `enterEscape` is called while the Phase is not `gallery`, THEN THE Game_State SHALL leave the Phase and the Door_Code unchanged and SHALL NOT call the Random_Source.
4. WHEN `returnToGallery` succeeds while the Phase is `escaped`, THE Game_State SHALL clear the Door_Code and SHALL return to the `gallery` Phase.
5. IF `returnToGallery` is called while the Phase is not `escaped`, THEN THE Game_State SHALL leave the Phase and the Door_Code unchanged.
6. WHEN the player returns to the gallery and confirms "Step inside" again, THE Game_State SHALL generate a new Door_Code for the new Game.
7. WHEN the page is reloaded, THE Hexhibit SHALL start a new gallery with no Door_Code.
8. THE Hexhibit SHALL keep the Door_Code only in the Game_State object and SHALL NOT write it to the URL hash, the URL query, `localStorage`, `sessionStorage`, the console, any DOM attribute, or the Exhibition.
9. THE Hexhibit SHALL keep the Door_Code as a string so that leading zeros are preserved.
10. IF the Random_Source throws or returns an invalid value, or the Artwork count is not an integer from 3 to 6, while `enterEscape` runs, THEN THE Game_State SHALL propagate the error and SHALL leave the Phase, the Door_Code, and the solved set unchanged.

### Requirement 3: Digit reveal

**User Story:** As a student, I want each solved puzzle to reveal its digit of my own code, so that I can build the code to open the door.

#### Acceptance Criteria

1. WHEN a Puzzle is solved, THE Hexhibit SHALL fill the Slot at that Artwork's index with the Door_Code character at the same index.
2. WHEN a Puzzle is solved, THE Dialog SHALL show the Explanation and the Session_Digit in the Status_Region, in the form "Digit `<digit>` revealed."
3. WHEN an Artwork whose Puzzle is already solved is opened, THE Dialog SHALL show the Explanation and its Session_Digit in the Status_Region.
4. WHILE a Puzzle is unsolved, THE Slot for that Puzzle SHALL show the bullet placeholder and THE Hexhibit SHALL NOT place that Session_Digit anywhere in the DOM.
5. THE Hexhibit SHALL NOT read the `digit` field of any Puzzle at runtime.
6. THE Status_Region SHALL keep `role="status"` and the existing text pairing for correct and incorrect feedback.

### Requirement 4: Door check

**User Story:** As a student, I want to enter the code I assembled at the door, so that I can escape.

#### Acceptance Criteria

1. WHILE the Phase is `escape`, WHEN `submitCode` is called with any input, THE Game_State SHALL return `unsolved`, including when the input equals the Door_Code.
2. WHILE the Phase is `solved`, WHEN `submitCode` is called with an input that equals the Door_Code after trimming leading and trailing whitespace, THE Game_State SHALL change the Phase to `escaped` and SHALL return `correct`.
3. WHILE the Phase is `solved`, WHEN `submitCode` is called with an input that does not equal the Door_Code after trimming, THE Game_State SHALL leave the Phase unchanged and SHALL return `wrong`.
4. IF `submitCode` is called while the Phase is `gallery` or `escaped`, THEN THE Game_State SHALL leave the Phase unchanged and SHALL return `wrong`.
5. THE `submitCode` function SHALL compare against the Door_Code stored in the Game_State and SHALL NOT take the Door_Code as an argument.
6. THE Door dialog, the lock label, the door swing, the escaped dialog, and the "Return to the gallery" and "Stay a moment" behavior SHALL stay as defined in spec 1 Requirement 12.

### Requirement 5: Exhibition format and validation

**User Story:** As a content author, I want to write lessons without door-code digits, so that I only author content and the game handles the code.

#### Acceptance Criteria

1. THE Exhibition_Schema SHALL list `digit` as an optional Puzzle field that is deprecated and ignored, and SHALL remove `digit` from the required Puzzle fields.
2. THE Exhibition_Schema SHALL keep unknown optional fields allowed.
3. WHEN an Exhibition has no `digit` on a Puzzle, THE Exhibition_Loader SHALL accept the Exhibition.
4. WHEN an Exhibition has a `digit` on a Puzzle, THE Exhibition_Loader SHALL accept the Exhibition and SHALL ignore the value, whatever its type or content, including `"x"`, `12`, `null`, and `{}`.
5. WHEN the Exhibition_Loader accepts an Exhibition, THE Exhibition_Loader SHALL return the Exhibition untouched, with no `doorCode` and no other computed code.
6. THE Exhibition_Loader SHALL NOT export `computeDoorCode`, and THE `DIGIT` pattern and the `digit` checks in `validatePuzzle` SHALL be removed.
7. FOR ALL valid Exhibitions, including Exhibitions whose Puzzles carry an optional, ignored `digit` field of any JSON value, serializing the Exhibition with `JSON.stringify` and loading the result through the Exhibition_Loader SHALL produce an Exhibition equal to the original (round-trip property from spec 1 criterion 3.7).
8. THE Exhibition_Loader SHALL keep all other validation rules from spec 1 Requirement 3 unchanged.

### Requirement 6: Default exhibition with six artworks

**User Story:** As a student, I want a fuller default lesson, so that the demo shows the full corridor and a six-digit code.

#### Acceptance Criteria

1. THE Default_Exhibition SHALL contain exactly 6 Artworks with unique `id` values and one Puzzle each.
2. THE Default_Exhibition SHALL keep the three existing Artworks (`the-patient-watcher`, `lantern-at-low-tide`, `the-quiet-staircase`) and SHALL add three new Artworks with short placeholder lesson text in the same museum voice.
3. THE Default_Exhibition SHALL contain at least 2 Puzzles of `type` `riddle` and at least 2 Puzzles of `type` `choice`.
4. THE Default_Exhibition SHALL define all seven `messages` keys and SHALL contain no `digit` field.
5. THE Default_Exhibition SHALL contain no gore and no emoji.
6. WHEN the Default_Exhibition passes through the Exhibition_Loader, THE Exhibition_Loader SHALL accept it.
7. WHEN the Default_Exhibition with 6 Artworks is viewed in a browser at 390px, 768px, and 1440px in both the light and dark themes, THE Hexhibit SHALL render six Slots and six paintings without horizontal scrolling or clipped controls, AND the floor, the ceiling, the left wall, and the right wall SHALL each be visible and SHALL each extend from the start of the corridor to the back wall that holds the door, with no gap between the end of any of them and the back wall, at the first stop and at the door stop.
8. IF the ceiling is not visible as a ceiling, or does not extend to the back wall, in any of the six size and theme combinations of criterion 6.7, THEN THE verification report SHALL record it as a finding that names the combination and the cause, and SHALL NOT skip or omit the check.

### Requirement 7: Documentation and superseded criteria

**User Story:** As a content author and maintainer, I want the README and the old spec to match the new behavior, so that nothing tells me to author digits.

#### Acceptance Criteria

1. THE README SHALL remove `digit` from its authoring examples and SHALL state that the door code is generated for each game.
2. THE README SHALL state that `digit` is optional and ignored if present, and SHALL state that the default exhibition has 6 Artworks and that an exhibition may have 3 to 6.
3. THE README SHALL update its description of the tests to include the Code_Generator.
4. THE Exhibition_Schema description SHALL replace "The door code is the puzzle digits in artwork order" with a statement that the game generates the door code.
5. THE Superseded criteria table in this document SHALL name every spec 1 criterion that this spec replaces and SHALL state what replaces it.
6. THE spec 1 `requirements.md`, `design.md`, and `tasks.md` SHALL each carry, directly under the title, the single blockquote "Digits and the door code are superseded by per-game-door-code; see its Superseded criteria table." and SHALL have no other change.

### Requirement 8: Testing and non-functional rules

**User Story:** As a developer, I want the new logic tested without a browser, so that I can change it with confidence.

#### Acceptance Criteria

1. THE test suite SHALL include a property-based test using `fast-check` for each of: never all-identical (1.13), code length equals the artwork count (1.14), every character is `0` to `9` (1.15), the same Random_Source gives the same code (1.16), and many different Random_Sources do not all give the same code (1.17).
2. THE test suite SHALL include a property-based test using `fast-check` for spec 1 criterion 3.7, the Exhibition round trip, whose generator produces Exhibitions with and without an optional `digit` field on Puzzles, including values of any JSON type.
3. THE test suite SHALL include a property-based test using `fast-check` for spec 1 criterion 6.10, that the Phase and the solved set stay consistent over random sequences of Game_State transitions, using a stand-in Random_Source.
4. THE test suite SHALL include a property-based test using `fast-check` for spec 1 criterion 9.7, the metamorphic property of riddle answer normalization.
5. THE test suite SHALL include a test for the Fix_Up path that uses a constant stand-in Random_Source, which always yields identical digits, and SHALL assert that the code is not all-identical for each N from 3 to 6, that its last digit equals `(digit + 1) mod 10` of the repeated digit, and that the call terminates.
6. THE test suite SHALL include a test for the retry-success path that uses a stand-in Random_Source that yields identical digits for the first attempt or attempts and varied digits afterwards, and SHALL assert that the returned code is the first varied attempt and that no Fix_Up was applied.
7. THE test suite SHALL include example-based tests for: validation accepts an Exhibition without `digit`, validation accepts an Exhibition with `digit` including invalid values such as `"x"` and `12`, `enterEscape` stores a code, `enterEscape` from a wrong Phase does not call the Random_Source, `returnToGallery` clears the code, and `submitCode` compares against the Door_Code in the Game_State.
8. THE test suite SHALL include example-based tests that the Code_Generator throws a `RangeError` for N of 2, 7, 3.5, and `NaN`, throws for Random_Source values `-1`, `256`, `1.5`, `NaN`, `"7"`, and `undefined`, and throws instead of looping when the Random_Source always returns 255.
9. THE test suite SHALL include an example test that `enterEscape` leaves the Phase and the Door_Code unchanged and propagates the error when the Random_Source throws, when it returns invalid values, and when the Artwork count is invalid.
10. THE test suite SHALL include an example test that a Random_Source built on `crypto.getRandomValues` yields a code of the right length and characters, and an example test that a deterministic stand-in source returning each byte from 0 to 249 once produces each digit exactly 25 times while bytes 250 to 255 are discarded, which shows no modulo bias.
11. THE test suite SHALL replace the spec 1 test requirement for criterion 3.8 and SHALL NOT claim that an existing test file needs editing.
12. WHEN `node --test` runs on a clean checkout after `npm install`, THE test suite SHALL pass with no browser installed.
13. THE Hexhibit SHALL add no new dependency and SHALL emit no console output of the Door_Code.
14. THE Hexhibit SHALL show no visual change to any screen except the content of the new Artworks, and SHALL meet the spec 1 accessibility rules (Requirement 13) unchanged.

## Superseded criteria

The spec 1 files stay as written, with one banner under each title (Assumption F, Requirement 7.6). Where the two documents differ, this document wins.

| Spec 1 criterion | What spec 1 said | Replaced by |
|---|---|---|
| Introduction and Assumption C | Each puzzle yields one digit. The code is the digits in artwork order. | Assumptions A and B and Requirements 1 and 3 here. The game generates one digit per artwork. |
| Glossary: Puzzle | Includes a door-code digit. | Glossary: Puzzle here has no digit. |
| Glossary: Door_Code | Digits of all Puzzles in order. | Glossary: Door_Code and Session_Digit here. |
| 2.4 | `digit` is a common Puzzle field. | Requirement 5.1. `digit` is optional, deprecated, and ignored. |
| 2.7 | The default has exactly 3 Artworks. | Requirement 6.1 to 6.3. The default has exactly 6 Artworks. |
| 3.2 (digit case only) | A `digit` that is not `0` to `9` is rejected. | Requirement 5.3 and 5.4. No digit error is ever raised. |
| 3.6 | The loader returns the Exhibition with a computed Door_Code. | Requirement 5.5. The loader returns the Exhibition only. |
| 3.7 | Round-trip property. | Still holds. Restated as Requirement 5.7 and implemented here as Requirement 8.2, with generated `digit` fields. |
| 3.8 | Door_Code[i] equals the digit of Puzzle i. | Requirements 1.13 to 1.17 and 3.1. The test requirement is replaced by Requirement 8.1. |
| 6.1 | Game_State holds phase and progress sets. | Extended by Requirement 2. The Game_State also holds the Door_Code. |
| 6.4 and 6.7 | Transitions `gallery → escape` and `escaped → gallery`. | Extended by Requirements 2.2 to 2.6. The first generates the code and the second clears it. |
| 6.10 | Property: Phase and solved set stay consistent. Never implemented. | Still holds. Implemented here as Requirement 8.3. |
| 9.7 | Property: riddle normalization is metamorphic. Never implemented. | Still holds. Implemented here as Requirement 8.4. |
| 11.2 | Shows the Puzzle's door-code digit. | Requirement 3.2. Shows the Session_Digit. |
| 11.3 | Fills the slot with the Puzzle digit. | Requirement 3.1. Fills the slot with the Session_Digit. |
| 11.8 | The reopened solved view shows the digit. | Requirement 3.3. Shows the Session_Digit. |
| 12.1 to 12.4 | The Door_Code comes from the loader. | Requirement 4. The Door_Code comes from the Game_State. Behavior of `unsolved`, `correct`, `wrong` is otherwise unchanged. |
| 15.1 (Door_Code computation) | `computeDoorCode` sits in a pure module. | Requirement 1.4. The Code_Generator sits in `assets/js/random.js`. |
| 15.5 (property list) | Property tests for 3.7, 3.8, 6.10, and 9.7. | 3.8 is replaced by the new properties in Requirement 8.1. 3.7, 6.10, and 9.7 are implemented here in Requirements 8.2 to 8.4. |

## Out of scope

Letter or cipher codes, new puzzle types, real artwork images, saved codes or progress, shareable links that carry the code, scoring, any visual redesign, and fixing any corridor finding raised by Requirement 6.8 without a separate decision from the user.

## Open questions

None. All earlier questions are answered and recorded as decisions in Assumptions D, F, I, and K.
