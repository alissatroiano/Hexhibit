# Implementation Plan: per-game-door-code

## Overview

The plan makes the door code random for every game. The order is fixed so the app stays playable after every task:

1. The pure generator `assets/js/random.js` and its tests, which nothing imports yet.
2. One atomic change to `state.js`, `main.js` and the removal of `CODE`, because the new `enterEscape(state, source)` and `submitCode(state, input)` signatures break the game if callers change in a separate step.
3. `content.js`, the schema and the default exhibition. The `digit` fields are removed only after `main.js` no longer reads `puzzle.digit` or `doorCode`. The default exhibition grows to 6 artworks here.
4. README and a check of the three spec 1 banners.
5. The hygiene tests, the remaining spec 1 property tests (riddle), and a static check that no test or doc still treats `digit` as required.
6. `verification.md`, a fill-in browser checklist the user completes (about 30 minutes), then a final checkpoint.

Implementation language: JavaScript (ES modules, no build step). Tests use `node --test` with `fast-check`. No new dependency.

Ground rules for every task:

- `node --test` stays green and the app stays playable after each task.
- Serve the repo with a static server (for example `npx serve .` or `python -m http.server 8080`) because ES modules and `fetch` do not work from `file://`. The browser checks below assume `http://localhost:8080/`.
- Do not change `assets/css/style.css`, `assets/js/corridor.js` or `assets/js/modal.js`. `modal.js` already supports `setStatus(text, "info")` with an empty prefix, so no change is needed there.
- Each property test is one `fc.assert(fc.property(...), { numRuns: 100 })` (or more) with a tag comment `// Feature: per-game-door-code, Property N: <title>`. Test files live in `test/` and are named as in the design's Test files section.
- Tests required by Requirement 8 are not optional, so no sub-task here is marked with `*`.

## Tasks

- [ ] 1. Add the door code generator (`assets/js/random.js`) and its tests
  - [ ] 1.1 Create `assets/js/random.js`
    - Export `MIN_CODE_LENGTH` (3), `MAX_CODE_LENGTH` (6), `BYTE_MAX` (255), `REJECT_FROM` (250), `MAX_DRAWS_PER_DIGIT` (100), `MAX_ALL_SAME_RETRIES` (10), `drawDigit(source)` and `generateDoorCode(source, n)`, as in design section "assets/js/random.js".
    - `drawDigit` throws `TypeError` for a non-function source or a value that is not an integer from 0 to 255, maps bytes 0 to 249 to `byte % 10`, discards 250 to 255, and throws `Error` after 100 consecutive discards.
    - `generateDoorCode` throws `RangeError` for `n` not an integer from 3 to 6 before calling the source, makes up to 11 attempts, returns the first code that is not all identical, and otherwise applies the Fix_Up (last digit becomes `(d + 1) % 10`). It returns a string.
    - The file imports nothing and does not mention `Math.random`, `crypto`, `window` or `document`.
    - Do not import it from any other file yet.
    - Browser check (proves nothing broke): 1. Serve the repo and open `http://localhost:8080/`. 2. Confirm the gallery loads and the console is empty. 3. In the console run `(await import('/assets/js/random.js')).generateDoorCode(() => 7, 3)` and confirm it prints `"778"`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9, 1.12_

  - [ ] 1.2 Create test helpers
    - Create `test/helpers/sources.js` with `constantSource(b)` (counts calls), `cyclingSource(bytes)`, `sequenceSource(bytes)` (throws when exhausted), `scriptedSource(bytes)` and `prngSource(seed)` (mulberry32, returns bytes 0 to 255).
    - Create `test/helpers/arbitraries.js` with `n` (`fc.integer({min:3,max:6})`) and `byteSeq` (up to 80 arbitrary bytes followed by one byte from 0 to 249, so a cycling source never sees 100 consecutive discards).
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload `http://localhost:8080/` and confirm the gallery loads with an empty console. 3. Press Next once and confirm the camera moves.
    - _Requirements: 8.1, 8.12_

  - [ ] 1.3 Write property test for never all-identical
    - In `test/random.test.js`, test constant-like and arbitrary sources for every N.
    - **Property 1: A generated code is never all-identical**
    - **Validates: Requirements 1.12, 1.13**
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload the page and confirm the console is empty. 3. Click one painting and confirm the dialog opens.

  - [ ] 1.4 Write property test for code length
    - Add to `test/random.test.js`.
    - **Property 2: Code length equals the artwork count**
    - **Validates: Requirements 1.1, 1.14**
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload the page. 3. Confirm the gallery shows the corridor and the console is empty.

  - [ ] 1.5 Write property test for digit characters
    - Add to `test/random.test.js`. Assert the result is a `string` and every character is `0` to `9`.
    - **Property 3: Every code character is a digit**
    - **Validates: Requirements 1.1, 1.15, 2.9**
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload the page. 3. Confirm the console is empty.

  - [ ] 1.6 Write property test for determinism
    - Add to `test/random.test.js`. Two fresh sources with the same byte sequence give identical codes.
    - **Property 4: Equal byte sequences give equal codes**
    - **Validates: Requirements 1.3, 1.16**
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload the page. 3. Confirm the console is empty.

  - [ ] 1.7 Write property test for variation
    - Add to `test/random.test.js`. Use at least 50 distinct seeds through `prngSource` and assert the codes are not all identical. Do not assert that two consecutive codes differ.
    - **Property 5: Different sources are not all the same**
    - **Validates: Requirements 1.17**
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload the page. 3. Confirm the console is empty.

  - [ ] 1.8 Write property test for the reference model
    - Add `groupedStream` to `test/helpers/arbitraries.js` (0 to 5 discarded bytes from 250 to 255, then one accepted byte from 0 to 249, repeated). Implement the model in the test: accepted bytes mod 10, chunk by N, first non-identical chunk, otherwise the 11th chunk with the Fix_Up.
    - **Property 6: Mapping matches the reference model**
    - **Validates: Requirements 1.5, 1.12**
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload the page. 3. Confirm the console is empty.

  - [ ] 1.9 Write example tests for the generator
    - In `test/random.test.js`: Fix_Up for every N from 3 to 6 and several bytes with a constant source (not all identical, last digit `(b % 10 + 1) % 10`, exactly `11 * N` source calls, terminates); retry-success with `scriptedSource` (first N bytes all `3`, then varied bytes, `2 * N` calls, no Fix_Up) and a variant that succeeds on the 11th attempt; `RangeError` for N of 2, 7, 3.5 and `NaN`; throws for source values `-1`, `256`, `1.5`, `NaN`, `"7"`, `undefined`; `constantSource(255)` throws after exactly 100 calls; a `webcrypto.getRandomValues` based source (imported from `node:crypto`) gives the right length and characters for N 3 to 6; bytes 0 to 249 once each give each digit exactly 25 times through `drawDigit`, and bytes 250 to 255 then 7 return 7 after 7 calls.
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload the page and confirm the console is empty. 3. In the console run `(await import('/assets/js/random.js')).generateDoorCode(() => 3, 6)` and confirm it prints `"333334"`.
    - _Requirements: 8.5, 8.6, 8.8, 8.10, 1.7, 1.8, 1.9_

- [ ] 2. Move the door code into the game state (single atomic change)
  - [ ] 2.1 Change `state.js`, its callers in `main.js`, and remove `CODE` in one pass
    - Do all of the following in this one task, because the signature changes break the game if done separately.
    - In `assets/js/state.js`: import `generateDoorCode` from `./random.js`; add `doorCode: null` to `createState`; change `enterEscape(state, source)` so it returns `false` without calling the source when the phase is not `gallery`, otherwise generates first and only then sets `doorCode` and `phase`; change `submitCode(state, input)` to compare `String(input).trim()` with `state.doorCode` and drop the third parameter; make `returnToGallery` set `doorCode` to `null`; export `revealedDigit(state, index)` (the character only when the artwork at `index` is solved, otherwise `null`).
    - In `assets/js/main.js`: delete `CODE` from the `let` line and delete `CODE = out.res.doorCode`; add `byteSource` (one byte from `window.crypto.getRandomValues(new Uint8Array(1))`, no fallback) and `LOCK_FAILED_TEXT = "The lock would not set. Please try again."`; render slots with `revealedDigit(S, i)` (`"•"` when `null`); replace both `pz.digit` uses with `revealedDigit(S, i)` and `revealedDigit(S, cur)` (the second after `markSolved`); call `submitCode(S, input)`; change the "Step inside" handler to `try { enterEscape(S, byteSource) } catch { setStatus(LOCK_FAILED_TEXT, "info"); return } closeDialog(); render()` with a parameterless `catch` that logs nothing.
    - `main.js` must contain no `.digit`, no `doorCode`, no `CODE` and no `console.`. `content.js` and the default exhibition stay untouched in this task (they still carry `digit`, which is now unused).
    - Browser check: 1. Serve the repo, open `http://localhost:8080/`, click the theme button and "Step inside". 2. Solve the three puzzles and read the three slot digits (they are random, not the old fixed digits). 3. Open the door, type the three digits and confirm the door opens. 4. Reload, step inside again and confirm the console stays empty.
    - _Requirements: 1.6, 1.10, 1.11, 2.1, 2.2, 2.3, 2.4, 2.10, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 2.2 Write property test for state invariants
    - Add `opSequence(ids)` to `test/helpers/arbitraries.js` (mixes valid and unknown ids and right and wrong codes; a `submitCode` step reads the current `state.doorCode`). In `test/state.test.js`, check after every operation the invariants listed in Property 8, using `prngSource` or `cyclingSource` as the source.
    - **Property 8: State invariants hold under any operation sequence**
    - **Validates: Requirements 1.10, 1.11, 2.2, 2.3, 2.4, 2.5, 3.1, 3.4, 8.3**
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload the page and step inside. 3. Solve one puzzle and confirm exactly one slot shows a digit and the rest show a bullet.

  - [ ] 2.3 Write property test for door submission
    - Add to `test/state.test.js`.
    - **Property 9: Door submission succeeds only in `solved` with the session code**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload and step inside. 3. Open the door before solving anything, type any digits and confirm the "Solve every puzzle first." message shows.

  - [ ] 2.4 Write example tests for state and `enterEscape` failure
    - In `test/state.test.js`: `createState` has `doorCode: null`; `enterEscape` stores a code of length N; a wrong-phase `enterEscape` leaves a counting source at 0 calls; `returnToGallery` clears the code; a second game with a different source gets a different stored code; `submitCode` uses the stored code and never a third argument; `enterEscape` with a throwing source, an invalid-value source, and 2 and 7 artwork ids each throws and leaves `phase`, `doorCode` and `solved` unchanged.
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload and step inside. 3. Solve all three puzzles, escape, click "Return to the gallery" and confirm the gallery shows with the console empty.
    - _Requirements: 8.7, 8.9, 2.2, 2.3, 2.4, 2.10, 4.5_

- [ ] 3. Remove digits from the loader, schema and default exhibition, and expand to 6 artworks
  - [ ] 3.1 Remove digit handling from `assets/js/content.js`
    - Delete `const DIGIT`, the `puzzle.digit` check in `validatePuzzle`, the `computeDoorCode` function and its export, and the `doorCode` field of the success result. `validateExhibition` returns `{ ok: true, exhibition: data }` with the same object. All other rules stay unchanged.
    - Before starting, confirm `main.js` no longer reads `puzzle.digit` or `doorCode` (done in task 2.1).
    - Browser check: 1. Reload `http://localhost:8080/` and confirm the gallery loads and the console is empty. 2. Step inside and solve one puzzle. 3. Confirm one slot shows a digit and the status shows "Digit N revealed."
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.8_

  - [ ] 3.2 Update `content/exhibition.schema.json`
    - Replace the root `description` sentence about puzzle digits with: "The door code is generated by the game each time the player steps inside; exhibitions do not contain it."
    - Remove `"digit"` from the puzzle `required` list; on `properties.digit` remove `type` and `pattern`, add `"deprecated": true` and a description saying it is deprecated, ignored, and that any value is accepted. Keep `additionalProperties: true`.
    - Browser check: 1. Confirm the file still parses (`node -e "JSON.parse(require('fs').readFileSync('content/exhibition.schema.json','utf8'))"`). 2. Reload the page. 3. Confirm the gallery loads and the console is empty.
    - _Requirements: 5.1, 5.2, 7.4_

  - [ ] 3.3 Remove `digit` from the default exhibition and add three artworks
    - In `content/default-exhibition.json`, delete every `digit` line (and the comma on the preceding line) from the three existing artworks, keeping all other fields.
    - Append the three artworks from the design's Default exhibition table (`the-cartographers-window` choice with `correctIndex: 2`, `the-clock-without-hands` riddle accepting `clock` and `a clock`, `the-last-candle` choice with `correctIndex: 1`), each with the full field set, placeholder lesson text in the museum voice, no emoji, no gore and no `digit`. Leave `messages` unchanged.
    - Verify with `node -e` that the file parses, has 6 unique ids, at least 2 riddle and 2 choice puzzles, and no `digit` key.
    - Browser check: 1. Reload the page and walk the corridor with Next to confirm six paintings and the console empty. 2. Click "Step inside" and confirm six slots. 3. Solve all six, read the six digits, enter them at the door and confirm the door opens.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 5.3_

  - [ ] 3.4 Write property test for the exhibition round trip
    - Add `validExhibition` to `test/helpers/arbitraries.js` (3 to 6 artworks, unique ids, mixed riddle and choice, `x_` unknown fields, and an optional `digit` set from `fc.jsonValue()` normalized with one `JSON.parse(JSON.stringify(v))`). In `test/content.test.js`, load `JSON.parse(JSON.stringify(ex))` through `validateExhibition` with the real registry and assert deep equality and no `doorCode` field.
    - **Property 7: Exhibition round trip, with or without `digit`**
    - **Validates: Requirements 5.3, 5.4, 5.5, 5.7, 8.2**
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload the page. 3. Confirm six paintings load and the console is empty.

  - [ ] 3.5 Write example tests for content, schema and the default file
    - In `test/content.test.js`: validation accepts no `digit`, and `digit` values `"x"`, `12`, `null` and `{}`; `computeDoorCode` is not exported; the default file has 6 artworks, unique ids, the three original ids, at least 2 riddle and 2 choice, no `digit` key anywhere, seven message keys, and passes `validateExhibition` with the real registry; the schema has no `digit` in puzzle `required`, `properties.digit.deprecated === true`, no `type` on `digit`, `additionalProperties` true, and a root description containing "generated" and not "puzzle digits in artwork order"; `MIN_CODE_LENGTH` and `MAX_CODE_LENGTH` equal `MIN_ARTWORKS` and `MAX_ARTWORKS`.
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload the page. 3. Step inside, open the door and confirm the dialog says "Sealed with a 6-digit lock".
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 6.1, 6.2, 6.3, 6.4, 6.6, 7.4, 8.7_

- [ ] 4. Update the README and verify the spec 1 banners
  - [ ] 4.1 Update `README.md`
    - Remove the `"digit"` lines (and the trailing comma on the preceding `explanation` line) from the riddle and choice JSON examples.
    - Replace the authoring sentence about single-character `digit` with: the game generates a new door code for each game; `digit` is optional and ignored if present; the default exhibition has 6 artworks and an exhibition may have 3 to 6.
    - Add one sentence to the intro that the door code is new for every game. Update the Tests description to include the door code generator, and add `random.js` and the new test files to the repository layout.
    - Browser check: 1. Open `README.md` in the editor preview and confirm both JSON examples are valid JSON. 2. Reload `http://localhost:8080/`. 3. Confirm the gallery loads and the console is empty.
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 4.2 Verify the spec 1 banners
    - Check that each of `.kiro/specs/mvp-playable-loop/requirements.md`, `design.md` and `tasks.md` has, directly under its title, the single blockquote `> Digits and the door code are superseded by per-game-door-code; see its Superseded criteria table.` Add it only if one is missing or differs, with no other change to those files.
    - Browser check: 1. Reload `http://localhost:8080/`. 2. Confirm the gallery loads and the console is empty. 3. Run `node --test` and confirm it is green.
    - _Requirements: 7.5, 7.6_

- [ ] 5. Add the hygiene tests and the static check
  - [ ] 5.1 Write `test/hygiene.test.js` for source text and leak rules
    - Read sources with a crude comment stripper. Assert: `random.js` has no `Math.random`, `crypto`, `window` or `document`; `random.js` and `state.js` import in Node; `main.js` has no `.digit`, no `doorCode`, no `CODE`, no `console.`, no `localStorage`, no `sessionStorage`, no `location.hash`, no `% 10`, and contains one `getRandomValues` call only inside `byteSource`; `main.js` has no `setAttribute` or `dataset` call and no `title=` or `aria-label` assignment fed by `revealedDigit` or `S.`; `content.js` has no `computeDoorCode` and no `DIGIT`; the default exhibition and the loader result contain no `doorCode`; `modal.js` keeps `info: ""` in `STATUS_PREFIX`, and `main.js` calls `setStatus(LOCK_FAILED_TEXT, "info")` and never `"bad"` for that text.
    - Add a Node check that for every solved subset of N artworks, only solved indices have a non-null `revealedDigit`, so the unsolved digit never reaches a DOM-writing call site (the slot and dialog code receive only that return value).
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload and step inside. 3. In the console run `Object.keys(window).filter(k => /code|state/i.test(k))` and confirm no `S` or door code appears.
    - _Requirements: 1.2, 1.4, 1.6, 2.8, 3.4, 3.5, 5.6, 8.13_

  - [ ] 5.2 Write property and example tests for the riddle handler
    - In `test/riddle.test.js`, implement the ASCII-only property with per-character casing and surrounding whitespace, and the empty-normalization case. Add an example recording the Unicode limit (`ß`).
    - **Property 10: Riddle answers ignore case and surrounding whitespace**
    - **Validates: Requirements 8.4**
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload and step inside. 3. On the first riddle type the answer in capitals with extra spaces and confirm it is accepted.

  - [ ] 5.3 Add the static check that no test or doc still treats `digit` as required
    - In `test/hygiene.test.js`, scan `README.md`, `content/exhibition.schema.json`, `content/default-exhibition.json` and `test/**/*.js`. Assert the README has no `"digit":` JSON line and every README line that mentions `digit` also says it is optional or ignored; the schema `required` lists have no `digit`; the default exhibition has no `digit`; no test file outside `test/content.test.js`, `test/hygiene.test.js` and `test/helpers/arbitraries.js` contains the word `digit` in a context that requires it. Exclude `.kiro/specs/**` from the scan.
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload the page. 3. Walk to the door in the light theme and confirm the "Staff only" dialog still opens.
    - _Requirements: 3.5, 5.1, 5.6, 7.1, 7.2, 8.11_

- [ ] 6. Write the verification checklist and finish
  - [ ] 6.1 Create `.kiro/specs/per-game-door-code/verification.md`
    - The task writes the file; the user fills it in afterwards (about 30 minutes total). Start it with the setup (serve the repo, Chrome DevTools, window sizes 390x844, 768x1024 and 1440x900, themes: light is the gallery and dark is after "Step inside"), the answer key read from `content/default-exhibition.json` (the riddles and which option is correct for each choice), a time estimate per check, and a legend: each cell holds PASS, FAIL, or a short finding, and an `n/a` cell is pre-filled where the combination does not apply.
    - Include one table with rows V1 to V9 and columns `390 light`, `390 dark`, `768 light`, `768 dark`, `1440 light`, `1440 dark`, plus a "Finding" column. Under the table, give the exact numbered steps for each row. Required rows and steps:
      - V1 Full playthrough with a new code each game (dark columns; run at 1440 and 390, 768 optional): 1. Click the theme button, then "Step inside". 2. Open each painting, answer it with the answer key and read "Digit N revealed." 3. Write down the six digits in order. 4. Open the door, type the six digits and confirm the escaped dialog. 5. Click "Return to the gallery". 6. Step inside again, solve all six and write down the second code. 7. Record both codes (they are not guaranteed to differ; do not fail the row if they match, note it).
      - V2 Wrong code (dark): 1. Solve all six. 2. Open the door and type six digits that differ from the real code. 3. Confirm the status starts with "Not quite." and the dialog shakes unless reduced motion. 4. Confirm the door stays locked.
      - V3 Unsolved-first message (dark): 1. Step inside. 2. Solve only one puzzle. 3. Open the door and type any digits. 4. Confirm the status reads "Not quite. Solve every puzzle first." followed by the digits-found text. 5. Type the true first digit repeated and confirm the same message.
      - V4 Step-inside failure path (light columns): 1. Reload in the gallery. 2. In the DevTools console run `delete window.crypto` and then `window.crypto`; if it is not `undefined`, run `Object.defineProperty(window, "crypto", { value: undefined, configurable: true })`. 3. Click the theme button and "Step inside". 4. Confirm the dialog stays open, the status reads "The lock would not set. Please try again." with no "Not quite." prefix, and the page stays in the light theme. 5. Confirm the console shows no new error. 6. Click "Stay in the gallery", reload, and confirm "Step inside" works again.
      - V5 Slots and status digits (dark): 1. Step inside and confirm six bullets. 2. Solve puzzle 1 and confirm slot 1 shows the digit that the status gave and slots 2 to 6 show bullets. 3. Reopen painting 1 and confirm the status shows the same digit. 4. In Elements, select `#slots` and confirm unsolved spans have text `•` only. 5. Repeat after solving puzzle 4 to check the slot index matches the artwork index.
      - V6 Return then step inside again (dark, 1440 and 390): 1. Escape. 2. Click "Return to the gallery". 3. Confirm the light theme, slots hidden and the progress counter at 0 viewed. 4. Step inside again and confirm six bullets and `0/6 solved`. 5. Type the previous game's code at the door after solving all six; record whether it is rejected (a match is possible by chance, only note it).
      - V7 No code leaks (1440 dark, once): 1. Solve all six and note the code. 2. Check the address bar: no code in the hash or query. 3. Application tab: Local Storage and Session Storage have no entry containing the code. 4. Console tab: no output during the whole game. 5. Elements tab, Ctrl+F the code string: no match in any attribute. 6. In the console run `JSON.stringify([...document.querySelectorAll("*")].flatMap(e => [...e.attributes].map(a => a.value)).filter(v => v.includes("<code>")))` with the real code and confirm `[]`.
      - V8 Six paintings and six slots fit (all six combinations): 1. Set the window size. 2. Walk with Next and confirm six paintings are reachable. 3. In dark, confirm six slots visible. 4. Run `document.documentElement.scrollWidth <= innerWidth` and confirm `true`. 5. Confirm no clipped control (nav, theme button, Back, Next, slots, dialog buttons, 44px targets).
      - V9 Corridor surfaces reach the back wall (all six combinations, two position lines, each cell lists F, C, L, R as PASS or FAIL): 1. Set size and theme. 2. Press Next once to reach the first stop; look at floor (F), ceiling (C), left wall (L) and right wall (R). 3. In DevTools set a temporary background on each of `.floor`, `.ceiling`, `.wall-left`, `.wall-right` and the back wall to see gaps (do not save). 4. Press Next until the door stop and repeat. 5. For any FAIL, run `getComputedStyle(document.querySelector(".ceiling")).transform` (and `height`, `top`) and write the cause and the combination in the Finding column. Findings are recorded and not fixed under this spec.
    - Add a "Findings summary" section with an empty list the user fills in, a "Sign-off" line, and a note that any FAIL goes to the user for a decision.
    - Verify the file exists and the table has rows V1 to V9 and six size/theme columns.
    - Browser check: 1. Open `.kiro/specs/per-game-door-code/verification.md` in the editor preview and confirm the table renders. 2. Reload `http://localhost:8080/`. 3. Confirm the gallery loads and the console is empty.
    - _Requirements: 6.7, 6.8, 2.7, 2.8, 3.4, 8.14_

  - [ ] 6.2 Final checkpoint - Ensure all tests pass and the loop works
    - Run `node --test` and ensure all tests pass, ask the user if questions arise. Confirm no application file other than the ones named in tasks 1 to 4 changed (`git status`).
    - Browser check: 1. Serve the repo and run one full playthrough at 1440px (six puzzles, six-digit code, escape, return). 2. Repeat the first two steps at 390px. 3. Confirm the console is empty. 4. Open `verification.md` and fill in the table; report every FAIL to the user.
    - _Requirements: 8.12, 8.13, 8.14_

## Notes

- Tasks 1.9 and 2.4 also cover the example tests required by Requirements 8.5 to 8.10. Requirement 8.11 is met by editing no existing test file.
- Task 2.1 is intentionally large: it is the only way to change the `enterEscape` and `submitCode` signatures without breaking the game between tasks.
- The ceiling and wall check in `verification.md` records findings only. Any fix to `style.css` or `corridor.js` needs a separate decision from the user.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] },
    { "id": 4, "tasks": ["1.5"] },
    { "id": 5, "tasks": ["1.6"] },
    { "id": 6, "tasks": ["1.7"] },
    { "id": 7, "tasks": ["1.8"] },
    { "id": 8, "tasks": ["1.9"] },
    { "id": 9, "tasks": ["2.1"] },
    { "id": 10, "tasks": ["2.2"] },
    { "id": 11, "tasks": ["2.3"] },
    { "id": 12, "tasks": ["2.4"] },
    { "id": 13, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 14, "tasks": ["3.4"] },
    { "id": 15, "tasks": ["3.5"] },
    { "id": 16, "tasks": ["4.1", "4.2"] },
    { "id": 17, "tasks": ["5.1", "5.2"] },
    { "id": 18, "tasks": ["5.3"] },
    { "id": 19, "tasks": ["6.1"] },
    { "id": 20, "tasks": ["6.2"] }
  ]
}
```
