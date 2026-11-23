# Hexhibit

Hexhibit turns a classroom lesson into a haunted 3D museum escape room. It was built for Kiroween 2026 (Costume Contest category).

By day (Daylight mode) the player walks a gallery corridor, inspects artworks and reads the plaques, which hold the lesson. After dark (After-Hours mode) the same room is sealed, and each painting opens a puzzle built from what the player just studied. Each solved puzzle reveals one digit of the door code. Enter the code to escape, then optionally return to the gallery.

Everything runs in the browser from static files. There are no accounts, no backend and no build step. The corridor uses CSS 3D transforms.

## Run it

Serve the repository folder with any static server and open the printed address:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/`. Any other static server works too (for example VS Code Live Server).

Opening `index.html` by double-click (`file://`) is not supported. The app loads its ES modules and the exhibition JSON with `fetch`, and browsers block both for `file://` pages.

## Tests

```bash
npm install
node --test
```

`npm test` runs the same command. The tests cover the pure logic modules (exhibition validation, riddle answer normalization, state transitions and door code) and run in Node without a browser.

`fast-check` is a dev-only dependency used by the property-based tests. The browser app never loads it, and `node_modules` is not needed to run the app.

## Repository layout

```text
index.html                    # page shell
assets/
  css/style.css               # design tokens and all styles
  js/script.js                # original prototype script
  images/hexhibit-logo.png    # wordmark
  images/favicon.png          # skull icon
  hexhibit.mp4                # demo video
advanced/landing.html         # separate landing page
js/
  main.js                     # boot and wiring
  state.js                    # game state and transitions
  corridor.js                 # 3D corridor, camera, stops
  modal.js                    # dialogs
  content.js                  # exhibition loading and validation
  puzzles/
    index.js                  # puzzle registry
    riddle.js                 # riddle puzzle
    choice.js                 # multiple choice puzzle
content/
  default-exhibition.json     # the built-in lesson
  exhibition.schema.json      # documented exhibition schema
test/
  smoke.test.js               # Node tests
package.json                  # test script and dev dependency
.kiro/                        # steering and specs
```

## Author an exhibition

All lesson text, artworks, puzzles, hints and messages live in a JSON file. Start from `content/default-exhibition.json`. The format is described in [`content/exhibition.schema.json`](content/exhibition.schema.json).

An exhibition needs a `title`, a `messages` object and 3 to 6 `artworks`. Each artwork has one `puzzle`, and each puzzle has a single-character `digit`. The door code is the digits in artwork order.

A `riddle` puzzle accepts a text answer and any listed variants:

```json
{
  "id": "the-quiet-staircase",
  "title": "The Quiet Staircase",
  "artist": "E. Vance",
  "year": "1907",
  "medium": "Charcoal on paper",
  "size": "60 x 45 cm",
  "curatorNote": "Each step is drawn a little darker than the last.",
  "lesson": "An echo is sound that bounces off a surface and returns to your ears.",
  "colors": ["#4a4540", "#0d0c0b"],
  "puzzle": {
    "type": "riddle",
    "prompt": "I speak without a mouth and answer only when you call. What am I?",
    "answers": ["echo", "an echo"],
    "hint": "Try calling out in an empty stairwell.",
    "nudge": "Think of a sound that comes back to you.",
    "explanation": "An echo is your own sound reflected back from a surface.",
    "digit": "5"
  }
}
```

A `choice` puzzle lists `options` and the zero-based `correctIndex`:

```json
{
  "type": "choice",
  "prompt": "What mainly causes the ocean tides?",
  "options": ["The Moon's gravity", "Strong winds", "Ocean currents", "The Sun's heat"],
  "correctIndex": 0,
  "hint": "It is the bright thing that watches the shore at night.",
  "nudge": "Look up at the night sky for your answer.",
  "explanation": "The Moon's gravity pulls on the ocean and raises the tides.",
  "digit": "3"
}
```

The `choice` object goes in an artwork's `puzzle` field, the same way as in the riddle example. If an exhibition fails validation, Hexhibit shows a friendly message and falls back to the built-in lesson.

### Testing a different exhibition: `?exhibition=`

To try your own file without editing the default, add `?exhibition=<relative path>` to the page address, for example `http://localhost:8080/?exhibition=content/my-lesson.json`.

This is a testing aid, not a share link. It only loads files from the same site, so it does not let you send a lesson to someone else. The path is rejected, and the built-in lesson loads instead, if it:

- is empty
- is an absolute URL or has a URL scheme (such as `https:`)
- is protocol-relative (starts with `//`)
- contains a backslash
- contains a `..` segment
- contains percent-encoding, whitespace or control characters
- resolves to a different origin

If the path is valid but the file does not exist, the app falls back to the built-in lesson, and the browser console and network panel show a failed request for that file. This is expected.

## Planned, not built yet

These ideas are not part of the current version:

- More puzzle types (chronological sorting, UV lantern reveal, dial alignment)
- Educator Studio for editing a lesson in the browser
- Shareable `#room=` links
- Audio puzzles and sound

## Built with Kiro

- Steering files in `.kiro/steering/` set the product goals, the tech rules (plain HTML, CSS and ES modules, no framework or build step), the repository structure and the design system. Every change followed them.
- Specs in `.kiro/specs/` hold the requirements, design and task list for the playable loop. Work proceeded task by task from the spec, and the tests check the pure logic against its acceptance criteria.

## License

Released under the [MIT License](LICENSE).
