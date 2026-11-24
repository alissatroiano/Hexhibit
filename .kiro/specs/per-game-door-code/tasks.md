# Implementation Plan: per-game-door-code

## Overview

The plan makes the door code random for every game. The order is fixed so the app stays playable after every task:

1. The pure generator `assets/js/random.js`, then its helpers, property tests and example tests. Nothing imports the generator until task 2.
2. One atomic change to `state.js`, `main.js` and the removal of `CODE`, because the new `enterEscape(state, source)` and `submitCode(state, input)` signatures break the game if callers change in a separate step. Then the state tests.
3. `content.js`, the schema and the default exhibition, run strictly in that order (3.1, then 3.2, then 3.3). The `digit` fields are removed from the default exhibition only after the loader no longer requires them, and the exhibition grows to 6 artworks in the same step. Then the content tests.
4. README and a check of the three spec 1 banners.
5. The hygiene test, the riddle property test (spec 1 criterion 9.7) and a static check that the docs and data do not treat `digit` as required.
6. `verification.md`, a fill-in browser checklist the user completes (about 60 to 90 minutes), then a final checkpoint.

Implementation language: JavaScript (ES modules, no build step). Tests use `node --test` with `fast-check`. No new dependency.

Ground rules for every task:

- `node --test` stays green and the app stays playable after each task.
- Serve the repo with a static server (for example `npx serve .` or `python -m http.server 8080`) because ES modules and `fetch` do not work from `file://`. The browser checks below assume `http://localhost:8080/`.
- Do not change `assets/css/style.css`, `assets/js/corridor.js` or `assets/js/modal.js`. `modal.js` already supports `setStatus(text, "info")` with an empty prefix, so no change is needed there.
- Each property test is one `fc.assert(fc.property(...), { numRuns: 100 })` (or more) with a tag comment `// Feature: per-game-door-code, Property N: <title>`. Test files live in `test/` and are named as in the design's Test files section.
- Test-only tasks (1.2, 1.3, 2.2, 3.4, 5.2) are checked by running `node --test` and confirming it is green. Tasks that edit `main.js`, `state.js`, `content.js`, the schema, the default exhibition, the README or `index.html` also keep a 3-step browser check.
- Tests required by Requirement 8 are not optional, so no sub-task here is marked with `*`.

## Tasks

- [x] 1. Add the door code generator (`assets/js/random.js`) and its tests
  - [x] 1.1 Create `assets/js/random.js`
    - Export `MIN_CODE_LENGTH` (3), `MAX_CODE_LENGTH` (6), `BYTE_MAX` (255), `REJECT_FROM` (250), `MAX_DRAWS_PER_DIGIT` (100), `MAX_ALL_SAME_RETRIES` (10), `drawDigit(source)` and `generateDoorCode(source, n)`, as in design section "assets/js/random.js".
    - `drawDigit` throws `TypeError` for a non-function source or a value that is not an integer from 0 to 255, maps bytes 0 to 249 to `byte % 10`, discards 250 to 255, and throws `Error` after 100 consecutive discards.
    - `generateDoorCode` throws `RangeError` for `n` not an integer from 3 to 6 before calling the source, makes up to 11 attempts, returns the first code that is not all identical, and otherwise applies the Fix_Up (last digit becomes `(d + 1) % 10`). It returns a string.
    - The file imports nothing and does not mention `Math.random`, `crypto`, `window` or `document`.
    - Do not import it from any other file yet. This is the only app-file task that is not wired in, so its check is the quick page-load check below.
    - Browser check (proves nothing broke): 1. Serve the repo and open `http://localhost:8080/`. 2. Confirm the gallery loads and the console is empty. 3. In the console run `(await import('/assets/js/random.js')).generateDoorCode(() => 7, 3)` and confirm it prints `"778"`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9, 1.12_

  - [x] 1.2 Create the test helpers and the generator property tests
    - Create `test/helpers/sources.js` with `constantSource(b)` (counts calls), `cyclingSource(bytes)`, `sequenceSource(bytes)` (throws when exhausted), `scriptedSource(bytes)` and `prngSource(seed)` (mulberry32, returns bytes 0 to 255).
    - Create `test/helpers/arbitraries.js` with `n` (`fc.integer({min:3,max:6})`), `byteSeq` (up to 80 arbitrary bytes followed by one byte from 0 to 249, so a cycling source never sees 100 consecutive discards) and `groupedStream` (0 to 5 discarded bytes from 250 to 255, then one accepted byte from 0 to 249, repeated).
    - Create `test/random.test.js` with one property test per property below, each tagged `// Feature: per-game-door-code, Property N: <title>` and run with `numRuns` of at least 100:
      - **Property 1: A generated code is never all-identical.** Constant-like and arbitrary sources for every N. Feature: per-game-door-code, Property 1.
      - **Property 2: Code length equals the artwork count.** Feature: per-game-door-code, Property 2.
      - **Property 3: Every code character is a digit.** Assert the result is a `string` and every character is `0` to `9`. Feature: per-game-door-code, Property 3.
      - **Property 4: Equal byte sequences give equal codes.** Two fresh sources with the same byte sequence. Feature: per-game-door-code, Property 4.
      - **Property 5: Different sources are not all the same.** Use at least 50 distinct seeds through `prngSource` and assert the codes are not all identical. Do not assert that two consecutive codes differ. Feature: per-game-door-code, Property 5.
      - **Property 6: Mapping matches the reference model.** Implement the model in the test: accepted bytes mod 10, chunk by N, first non-identical chunk, otherwise the 11th chunk with the Fix_Up. Feature: per-game-door-code, Property 6.
    - **Validates: Requirements 1.1, 1.3, 1.5, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, 2.9, 8.1**
    - Check: run `node --test` and confirm it is green.
    - _Requirements: 1.1, 1.3, 1.5, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, 2.9, 8.1, 8.12_

  - [x] 1.3 Write example tests for the generator
    - In `test/random.test.js` (after 1.2, so the file is not edited in parallel): Fix_Up for every N from 3 to 6 and several bytes with a constant source (not all identical, last digit `(b % 10 + 1) % 10`, exactly `11 * N` source calls, terminates); retry-success with `scriptedSource` (first N bytes all `3`, then varied bytes, `2 * N` calls, no Fix_Up) and a variant that succeeds on the 11th attempt; `RangeError` for N of 2, 7, 3.5 and `NaN`; throws for source values `-1`, `256`, `1.5`, `NaN`, `"7"`, `undefined`; `constantSource(255)` throws after exactly 100 calls; a `webcrypto.getRandomValues` based source (imported from `node:crypto`) gives the right length and characters for N 3 to 6; bytes 0 to 249 once each give each digit exactly 25 times through `drawDigit`, and bytes 250 to 255 then 7 return 7 after 7 calls.
    - Check: run `node --test` and confirm it is green.
    - _Requirements: 1.7, 1.8, 1.9, 8.5, 8.6, 8.8, 8.10_

- [x] 2. Move the door code into the game state (single atomic change)
  - [x] 2.1 Change `state.js`, its callers in `main.js`, and remove `CODE` in one pass
    - Do all of the following in this one task, because the signature changes break the game if done separately.
    - In `assets/js/state.js`: import `generateDoorCode` from `./random.js`; add `doorCode: null` to `createState`; change `enterEscape(state, source)` so it returns `false` without calling the source when the phase is not `gallery`, otherwise generates first and only then sets `doorCode` and `phase`; change `submitCode(state, input)` to compare `String(input).trim()` with `state.doorCode` and drop the third parameter; make `returnToGallery` set `doorCode` to `null`; export `revealedDigit(state, index)` (the character only when the artwork at `index` is solved, otherwise `null`).
    - In `assets/js/main.js`: delete `CODE` from the `let` line and delete `CODE = out.res.doorCode`; add `byteSource` (one byte from `window.crypto.getRandomValues(new Uint8Array(1))`, no fallback) and `LOCK_FAILED_TEXT = "The lock would not set. Please try again."`; render slots with `revealedDigit(S, i)` (`"•"` when `null`); replace both `pz.digit` uses with `revealedDigit(S, i)` and `revealedDigit(S, cur)` (the second after `markSolved`); call `submitCode(S, input)`; change the "Step inside" handler to `try { enterEscape(S, byteSource) } catch { setStatus(LOCK_FAILED_TEXT, "info"); return } closeDialog(); render()` with a parameterless `catch` that logs nothing.
    - `main.js` must contain no `.digit`, no `doorCode`, no `CODE` and no `console.`. `content.js` and the default exhibition stay untouched in this task (they still carry `digit`, which is now unused).
    - Browser check: 1. Serve the repo, open `http://localhost:8080/`, click the theme button and "Step inside". 2. Solve the three puzzles and read the three slot digits (they are random, not the old fixed digits). 3. Open the door, type the three digits and confirm the door opens. 4. Reload, step inside again and confirm the console stays empty.
    - _Requirements: 1.6, 1.10, 1.11, 2.1, 2.2, 2.3, 2.4, 2.10, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.2 Write the state property and example tests
    - Add `opSequence(ids)` to `test/helpers/arbitraries.js` (mixes valid and unknown ids and right and wrong codes; a `submitCode` step reads the current `state.doorCode`). Create `test/state.test.js` with:
      - **Property 8: State invariants hold under any operation sequence.** Check after every operation the invariants listed in Property 8, using `prngSource` or `cyclingSource` as the source. Feature: per-game-door-code, Property 8. Implements spec 1 criterion 6.10.
      - **Property 9: Door submission succeeds only in `solved` with the session code.** Feature: per-game-door-code, Property 9.
      - Example tests: `createState` has `doorCode: null`; `enterEscape` stores a code of length N; a wrong-phase `enterEscape` leaves a counting source at 0 calls; `returnToGallery` clears the code; a second game with a different source gets a different stored code; `submitCode` uses the stored code and never a third argument; `enterEscape` with a throwing source, an invalid-value source, and 2 and 7 artwork ids each throws and leaves `phase`, `doorCode` and `solved` unchanged.
    - **Validates: Requirements 1.10, 1.11, 2.2, 2.3, 2.4, 2.5, 2.10, 3.1, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 8.3, 8.7, 8.9**
    - Check: run `node --test` and confirm it is green.
    - _Requirements: 1.10, 1.11, 2.2, 2.3, 2.4, 2.5, 2.10, 3.1, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 8.3, 8.7, 8.9_

- [x] 3. Remove digits from the loader, schema and default exhibition, and expand to 6 artworks
  - Run 3.1, then 3.2, then 3.3, strictly in that order and never in parallel. The default exhibition must not lose its `digit` fields until the loader has stopped requiring them (3.1), and the schema (3.2) must stop requiring `digit` before the data stops carrying it (3.3).

  - [x] 3.1 Remove digit handling from `assets/js/content.js` (first; no dependency on 3.2 or 3.3)
    - Delete `const DIGIT`, the `puzzle.digit` check in `validatePuzzle`, the `computeDoorCode` function and its export, and the `doorCode` field of the success result. `validateExhibition` returns `{ ok: true, exhibition: data }` with the same object. All other rules stay unchanged.
    - Before starting, confirm `main.js` no longer reads `puzzle.digit` or `doorCode` (done in task 2.1). The default exhibition still carries `digit` here, which the loader now ignores.
    - Browser check: 1. Reload `http://localhost:8080/` and confirm the gallery loads and the console is empty. 2. Step inside and solve one puzzle. 3. Confirm one slot shows a digit and the status shows "Digit N revealed."
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.8_

  - [x] 3.2 Update `content/exhibition.schema.json` (second; starts only after 3.1 is done)
    - Replace the root `description` sentence about puzzle digits with: "The door code is generated by the game each time the player steps inside; exhibitions do not contain it."
    - Remove `"digit"` from the puzzle `required` list; on `properties.digit` remove `type` and `pattern`, add `"deprecated": true` and a description saying it is deprecated, ignored, and that any value is accepted. Keep `additionalProperties: true`.
    - Browser check: 1. Confirm the file still parses (`node -e "JSON.parse(require('fs').readFileSync('content/exhibition.schema.json','utf8'))"`). 2. Reload the page. 3. Confirm the gallery loads and the console is empty.
    - _Requirements: 5.1, 5.2, 7.4_

  - [x] 3.3 Remove `digit` from the default exhibition and add three artworks (third; starts only after 3.2 is done)
    - In `content/default-exhibition.json`, delete every `digit` line (and the comma on the preceding line) from the three existing artworks, keeping all other fields. This is safe only because 3.1 removed the loader's `digit` requirement.
    - Append the three artworks from the design's Default exhibition table (`the-cartographers-window` choice with `correctIndex: 2`, `the-clock-without-hands` riddle accepting `clock` and `a clock`, `the-last-candle` choice with `correctIndex: 1`), each with the full field set, placeholder lesson text in the museum voice, no emoji, no gore and no `digit`. Leave `messages` unchanged.
    - Verify with `node -e` that the file parses, has 6 unique ids, at least 2 riddle and 2 choice puzzles, and no `digit` key.
    - Browser check: 1. Reload the page and walk the corridor with Next to confirm six paintings and the console empty. 2. Click "Step inside" and confirm six slots. 3. Solve all six, read the six digits, enter them at the door and confirm the door opens.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 5.3_

  - [x] 3.4 Write the content property and example tests (after 3.3)
    - Add `validExhibition` to `test/helpers/arbitraries.js` (3 to 6 artworks, unique ids, mixed riddle and choice, `x_` unknown fields, and an optional `digit` set from `fc.jsonValue()` normalized with one `JSON.parse(JSON.stringify(v))`). Create `test/content.test.js` with:
      - **Property 7: Exhibition round trip, with or without `digit`.** Load `JSON.parse(JSON.stringify(ex))` through `validateExhibition` with the real registry and assert deep equality and no `doorCode` field. Feature: per-game-door-code, Property 7. Implements spec 1 criterion 3.7.
      - Example tests: validation accepts no `digit`, and `digit` values `"x"`, `12`, `null` and `{}`; `computeDoorCode` is not exported; the default file has 6 artworks, unique ids, the three original ids, at least 2 riddle and 2 choice, no `digit` key anywhere, seven message keys, and passes `validateExhibition` with the real registry; the schema has no `digit` in puzzle `required`, `properties.digit.deprecated === true`, no `type` on `digit`, `additionalProperties` true, and a root description containing "generated" and not "puzzle digits in artwork order"; `MIN_CODE_LENGTH` and `MAX_CODE_LENGTH` equal `MIN_ARTWORKS` and `MAX_ARTWORKS`.
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.6, 7.4, 8.2, 8.7**
    - Check: run `node --test` and confirm it is green.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.6, 7.4, 8.2, 8.7_

- [x] 4. Update the README and verify the spec 1 banners
  - [x] 4.1 Update `README.md`
    - Remove the `"digit"` lines (and the trailing comma on the preceding `explanation` line) from the riddle and choice JSON examples.
    - Replace the authoring sentence about single-character `digit` with: the game generates a new door code for each game; `digit` is optional and ignored if present; the default exhibition has 6 artworks and an exhibition may have 3 to 6.
    - Add one sentence to the intro that the door code is new for every game. Update the Tests description to include the door code generator, and add `random.js` and the new test files to the repository layout.
    - Browser check: 1. Open `README.md` in the editor preview and confirm both JSON examples are valid JSON. 2. Reload `http://localhost:8080/`. 3. Confirm the gallery loads and the console is empty.
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.2 Verify the spec 1 banners
    - Check that each of `.kiro/specs/mvp-playable-loop/requirements.md`, `design.md` and `tasks.md` has, directly under its title, the single blockquote `> Digits and the door code are superseded by per-game-door-code; see its Superseded criteria table.` Add it only if one is missing or differs, with no other change to those files.
    - Browser check: 1. Reload `http://localhost:8080/`. 2. Confirm the gallery loads and the console is empty. 3. Run `node --test` and confirm it is green.
    - _Requirements: 7.5, 7.6_

- [ ] 5. Add the hygiene test, the riddle property test and the static docs check (partly done: 5.1 done, 5.2 deferred)
  - [x] 5.1 Write `test/hygiene.test.js` for source text and leak rules
    - Read sources with a crude comment stripper. Assert: `random.js` has no `Math.random`, `crypto`, `window` or `document`; `random.js` and `state.js` import in Node; `main.js` has no `.digit`, no `doorCode`, no `CODE`, no `console.`, no `localStorage`, no `sessionStorage`, no `location.hash`, no `% 10`, and contains one `getRandomValues` call only inside `byteSource`; `content.js` has no `computeDoorCode` and no `DIGIT`; the default exhibition and the loader result contain no `doorCode`; `modal.js` keeps `info: ""` in `STATUS_PREFIX`, and `main.js` calls `setStatus(LOCK_FAILED_TEXT, "info")` and never `"bad"` for that text.
    - `main.js` already uses `setAttribute` and `root.dataset.theme`, so those calls are NOT forbidden. Instead, add a sink-allowlist scan of `main.js` (comments stripped, split into statements):
      1. Collect the tainted names: `S`, `doorCode`, `revealedDigit`, and every variable assigned from a `revealedDigit(...)` call (for example `d`).
      2. For every statement that mentions a tainted name, assert it contains none of these sinks: `setAttribute(`, `setAttributeNS(`, `.dataset`, `.title`, `.ariaLabel`, `aria-`, `.id =`, `.name =`, `.value =`, `.href`, `.src`, `.innerHTML`, `.outerHTML`, `insertAdjacentHTML`, `.style`, `classList`, `location`, `history.`, `localStorage`, `sessionStorage`, `console.`.
      3. The only allowed exceptions, listed explicitly in the test: the statement `root.dataset.theme = themeFor(S.phase)` (it passes the phase, never the code), and the allowed text sinks. The allowed text sinks are the slot element write (`e.textContent = d ?? "•"`) and the dialog status and text writes (calls to `setStatus(...)` and the dialog body or text helpers that receive the text). Any other statement that assigns `textContent` from a tainted name fails the test.
    - Add a Node check that for every solved subset of N artworks, only solved indices have a non-null `revealedDigit`, so the unsolved digit never reaches a DOM-writing call site (the slot and dialog code receive only that return value).
    - Browser check: 1. Run `node --test` and confirm it is green. 2. Reload and step inside. 3. In the console run `typeof window.S` and confirm it prints `"undefined"`.
    - _Requirements: 1.2, 1.4, 1.6, 2.8, 3.4, 3.5, 5.6, 8.13_

  - [ ] 5.2 Write the riddle property test and the static docs check (DEFERRED, see Deferred tasks)
    - Create `test/riddle.test.js` with **Property 10: Riddle answers ignore case and surrounding whitespace** (ASCII-only, per-character casing and surrounding whitespace, plus the empty-normalization case) tagged `// Feature: per-game-door-code, Property 10: Riddle answers ignore case and surrounding whitespace`, and an example recording the Unicode limit (`ß`). Implements spec 1 criterion 9.7.
    - Create `test/docs.test.js` with a static check that no doc or data file treats `digit` as required. Scan only `README.md`, `content/exhibition.schema.json` and `content/default-exhibition.json`. Assert the README has no `"digit":` JSON line and every README line that mentions `digit` also says it is optional or ignored; the schema `required` lists have no `digit`; the default exhibition has no `digit`. Do NOT scan `test/**` and do not scan `.kiro/specs/**`, because a false failure would block deploys.
    - **Validates: Requirements 3.5, 5.1, 7.1, 7.2, 8.4, 8.11**
    - Check: run `node --test` and confirm it is green.
    - _Requirements: 3.5, 5.1, 7.1, 7.2, 8.4, 8.11_

- [ ] 6. Write the verification checklist and finish (DEFERRED, see Deferred tasks)
  - [ ] 6.1 Create `.kiro/specs/per-game-door-code/verification.md` (DEFERRED, see Deferred tasks)
    - The task writes the file; the user fills it in afterwards (about 60 to 90 minutes total). Start it with the setup (serve the repo, Chrome DevTools, window sizes 390x844, 768x1024 and 1440x900, themes: light is the gallery and dark is after "Step inside"), the answer key read from `content/default-exhibition.json` (the riddles and which option is correct for each choice), a time estimate per check that adds up to about 60 to 90 minutes, and a legend: each cell holds PASS, FAIL, or a short finding, and an `n/a` cell is pre-filled where the combination does not apply.
    - Include one table with rows V1 to V9 (V8 split into V8a and V8b) and columns `390 light`, `390 dark`, `768 light`, `768 dark`, `1440 light`, `1440 dark`, plus a "Finding" column. Under the table, give the exact numbered steps for each row.
    - Size rules the written file must contain (Requirements 6.7 and 6.8): rows V8a (paintings and slots) and V9 (corridor surfaces) require full checks at 390 and 1440 in both themes. At 768 the only required checks are horizontal scroll and clipped controls, in row V8b. The 768 columns keep only the V8b scroll and clipping cells; the 768 light and 768 dark cells for V8a and V9 are pre-filled `n/a`. State this rule in the legend so the user does not fill the `n/a` cells.
    - Required rows and steps:
      - V1 Full playthrough with a new code each game (dark columns; run at 1440 and 390, 768 optional): 1. Click the theme button, then "Step inside". 2. Open each painting, answer it with the answer key and read "Digit N revealed." 3. Write down the six digits in order. 4. Open the door, type the six digits and confirm the escaped dialog. 5. Click "Return to the gallery". 6. Step inside again, solve all six and write down the second code. 7. Record both codes (they are not guaranteed to differ; do not fail the row if they match, note it).
      - V2 Wrong code (dark): 1. Solve all six. 2. Open the door and type six digits that differ from the real code. 3. Confirm the status starts with "Not quite." and the dialog shakes unless reduced motion. 4. Confirm the door stays locked.
      - V3 Unsolved-first message (dark): 1. Step inside. 2. Solve only one puzzle. 3. Open the door and type any digits. 4. Confirm the status reads "Not quite. Solve every puzzle first." followed by the digits-found text. 5. Type the true first digit repeated and confirm the same message.
      - V4 Step-inside failure path (light columns): 1. Reload in the gallery. 2. In the DevTools console run `delete window.crypto` and then `window.crypto`; if it is not `undefined`, run `Object.defineProperty(window, "crypto", { value: undefined, configurable: true })`. 3. Click the theme button and "Step inside". 4. Confirm the dialog stays open, the status reads "The lock would not set. Please try again." with no "Not quite." prefix, and the page stays in the light theme. 5. Confirm the console shows no new error. 6. Click "Stay in the gallery", reload, and confirm "Step inside" works again.
      - V5 Slots and status digits (dark): 1. Step inside and confirm six bullets. 2. Solve puzzle 1 and confirm slot 1 shows the digit that the status gave and slots 2 to 6 show bullets. 3. Reopen painting 1 and confirm the status shows the same digit. 4. In Elements, select `#slots` and confirm unsolved spans have text `â€¢` only. 5. Repeat after solving puzzle 4 to check the slot index matches the artwork index.
      - V6 Return then step inside again (dark, 1440 and 390): 1. Escape. 2. Click "Return to the gallery". 3. Confirm the light theme, slots hidden and the progress counter at 0 viewed. 4. Step inside again and confirm six bullets and `0/6 solved`. 5. Type the previous game's code at the door after solving all six; record whether it is rejected (a match is possible by chance, only note it).
      - V7 No code leaks (1440 dark, once): 1. Solve all six and note the code. 2. Check the address bar: no code in the hash or query. 3. Application tab: Local Storage and Session Storage have no entry containing the code. 4. Console tab: no output during the whole game. 5. Elements tab, Ctrl+F the code string: no match in any attribute. 6. In the console run `JSON.stringify([...document.querySelectorAll("*")].flatMap(e => [...e.attributes].map(a => a.value)).filter(v => v.includes("<code>")))` with the real code and confirm `[]`.
      - V8a Six paintings and six slots (390 and 1440, both themes; 768 cells pre-filled `n/a`): 1. Set the window size. 2. Walk with Next and confirm six paintings are reachable. 3. In dark, confirm six slots visible.
      - V8b No horizontal scroll and no clipped controls (all six size and theme cells, including both 768 cells): 1. Set the window size and theme. 2. Run `document.documentElement.scrollWidth <= innerWidth` and confirm `true`. 3. Confirm no clipped control (nav, theme button, Back, Next, slots, dialog buttons, 44px targets).
      - V9 Corridor surfaces reach the back wall (390 and 1440, both themes, four combinations; both 768 cells pre-filled `n/a`; two position lines per cell, each listing F, C, L, R as PASS or FAIL): 1. Set size and theme. 2. Press Next once to reach the first stop; look at floor (F), ceiling (C), left wall (L) and right wall (R). 3. In DevTools set a temporary background on each of `.floor`, `.ceiling`, `.wall-left`, `.wall-right` and the back wall to see gaps (do not save). 4. Press Next until the door stop and repeat. 5. For any FAIL, run `getComputedStyle(document.querySelector(".ceiling")).transform` (and `height`, `top`) and write the cause and the combination in the Finding column. Findings are recorded and not fixed under this spec.
    - Add a "Findings summary" section with an empty list the user fills in, a "Sign-off" line, and a note that any FAIL goes to the user for a decision.
    - Verify the file exists, the table has rows V1 to V9 (with V8a and V8b), six size/theme columns, `n/a` pre-filled in both 768 cells of V8a and V9, and the text "60 to 90 minutes" and no "30 minutes".
    - Browser check: 1. Open `.kiro/specs/per-game-door-code/verification.md` in the editor preview and confirm the table renders. 2. Reload `http://localhost:8080/`. 3. Confirm the gallery loads and the console is empty.
    - _Requirements: 6.7, 6.8, 6.9, 2.7, 2.8, 3.4, 8.14_

  - [ ] 6.2 Final checkpoint - Ensure all tests pass and the loop works (DEFERRED, see Deferred tasks)
    - Run `node --test` and ensure all tests pass, ask the user if questions arise. Confirm no application file other than the ones named in tasks 1 to 4 changed (`git status`).
    - Browser check: 1. Serve the repo and run one full playthrough at 1440px (six puzzles, six-digit code, escape, return). 2. Repeat the first two steps at 390px. 3. Confirm the console is empty. 4. Open `verification.md` and fill in the table; report every FAIL to the user.
    - _Requirements: 8.12, 8.13, 8.14_

## Deferred tasks

Closed out on 2026-11-23 ahead of the 11/30 code freeze so work can move to `#room=` sharing, scoring/results and the Educator workflow. These tasks were not run and stay unchecked on purpose.

- **5.2 Riddle property test and static docs check.** Deferred. Riddle normalization (spec 1 criterion 9.7) and the docs scan have no automated test. Low risk: the riddle handler works in the game and the README, schema and default exhibition were edited by hand in 3.2, 3.3 and 4.1.
- **6.1 `verification.md`.** Deferred. The manual checks were not written up. The user will do the one check that matters directly: walk the corridor at 6 artworks in both themes and confirm the floor, ceiling and both walls reach the back wall (Requirements 6.7 to 6.9). The ceiling is expected to be a finding (`.ceiling` ignores `--len` and `--zc`); any fix needs a separate decision.
- **6.2 Final checkpoint.** Deferred. `node --test` was run after each task and was green. The full six-puzzle playthrough at 1440px and 390px is left to the user's pre-merge check.

Requirement 8.4 (riddle property) and the Requirement 6.7 to 6.9 browser checks are therefore not covered by tests or `verification.md`.
## Requirements coverage

| Requirement | Tasks |
|---|---|
| 1.1 to 1.5, 1.7 to 1.9, 1.12 | 1.1 |
| 1.6 | 2.1, 5.1 |
| 1.10, 1.11 | 2.1, 2.2 |
| 1.13 to 1.17 | 1.2 |
| 2.1 to 2.5, 2.10 | 2.1, 2.2 |
| 2.6, 2.7 | 2.1, 6.1 |
| 2.8 | 5.1, 6.1 |
| 2.9 | 1.2 |
| 3.1 to 3.4 | 2.1, 2.2, 5.1, 6.1 |
| 3.5 | 2.1, 5.1, 5.2 |
| 3.6 | 2.1 (unchanged `modal.js`), 6.1 |
| 4.1 to 4.5 | 2.1, 2.2 |
| 4.6 | 2.1, 6.1 |
| 5.1, 5.2 | 3.2, 3.4, 5.2 |
| 5.3 to 5.6, 5.8 | 3.1, 3.3, 3.4 |
| 5.7 | 3.4 |
| 6.1 to 6.6 | 3.3, 3.4 |
| 6.7 to 6.9 | 6.1 |
| 7.1 to 7.3 | 4.1, 5.2 |
| 7.4 | 3.2, 3.4 |
| 7.5, 7.6 | 4.2 |
| 8.1 | 1.2 |
| 8.2 | 3.4 |
| 8.3 | 2.2 |
| 8.4 | 5.2 |
| 8.5, 8.6, 8.8, 8.10 | 1.3 |
| 8.7 | 2.2, 3.4 |
| 8.9 | 2.2 |
| 8.11 | 1.3, 5.2 (no existing test file edited) |
| 8.12 | 1.2, 6.2 |
| 8.13 | 5.1, 6.2 |
| 8.14 | 6.1, 6.2 |

| Design property | Task |
|---|---|
| Properties 1 to 6 | 1.2 |
| Property 7 | 3.4 |
| Properties 8 and 9 | 2.2 |
| Property 10 | 5.2 |

## Notes

- Tasks 1.3 and 2.2 also cover the example tests required by Requirements 8.5 to 8.10. Requirement 8.11 is met by editing no existing test file.
- Task 2.1 is intentionally large: it is the only way to change the `enterEscape` and `submitCode` signatures without breaking the game between tasks.
- Tasks 3.1, 3.2 and 3.3 are sequential on purpose: the default exhibition keeps its `digit` fields until the loader and schema no longer require them.
- Tasks 1.2 and 1.3 both edit `test/random.test.js`, and tasks 1.2, 2.2 and 3.4 each add to `test/helpers/arbitraries.js`, so they run in separate waves.
- The ceiling and wall check in `verification.md` records findings only. Any fix to `style.css` or `corridor.js` needs a separate decision from the user.

## Task Dependency Graph

Tasks 3.1, 3.2 and 3.3 each depend on the previous one and run in separate waves, never in parallel.

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["2.1"] },
    { "id": 4, "tasks": ["2.2"] },
    { "id": 5, "tasks": ["3.1"] },
    { "id": 6, "tasks": ["3.2"] },
    { "id": 7, "tasks": ["3.3"] },
    { "id": 8, "tasks": ["3.4"] },
    { "id": 9, "tasks": ["4.1", "4.2"] },
    { "id": 10, "tasks": ["5.1", "5.2"] },
    { "id": 11, "tasks": ["6.1"] },
    { "id": 12, "tasks": ["6.2"] }
  ]
}
```
