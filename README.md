# Hexhibit
Hexhibit is a haunted art-history mystery that builds visual literacy. It was built for Kiroween 2026 (Costume Contest category). It is made for art-history learners (AP Art History, intro college) and curious museum visitors.
People give a masterpiece about 20 seconds. Smith & Smith (2001) measured a mean of 27.2 seconds and a median of 17 seconds at the Met. Smith, Smith & Tinio (2017) measured a median of 21 seconds at the Art Institute of Chicago.
Hexhibit slows that down. By day (Daylight mode) the player walks a 3D gallery corridor, inspects artworks and reads the plaques at their own pace. After dark (After-Hours mode) the same room is sealed, and each painting opens a puzzle built from the details on its plaque. Each solved puzzle reveals one digit of the door code, and the code is new for every game. Enter the code to escape, then optionally return to the gallery. In Daylight mode the exit door stays closed, and its message (the `exitClosed` key under `messages`) tells the player to study the paintings first.
Reloading the page starts a fresh gallery, because there is no saved progress yet. Everything runs in the browser from static files. There are no accounts, no backend, no tracking and no build step. The corridor uses CSS 3D transforms.

## Run it

Serve the repository folder with any static server and open the printed address:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/` for the landing page, or go straight to the game at `http://localhost:8080/play.html`. Any other static server works too (for example VS Code Live Server).

Opening `index.html` or `play.html` by double-click (`file://`) is not supported. The app loads its ES modules and the exhibition JSON with `fetch`, and browsers block both for `file://` pages.

## Landing page and game

- **Landing page (`index.html`).** The first page visitors see. An intro video plays over the page, then fades away to reveal the landing content. Its styles are in `assets/css/landing.css` and its intro logic is in `assets/js/landing.js`.
- **Game (`play.html`).** The playable gallery and escape room. The "Enter Hexhibit" button on the landing page opens it in a new tab. `play.html` is the game entry point, so `index.html` is not the game.
- **Intro-video mute control.** The video starts muted so it can autoplay. The MUTE / UNMUTE button in the corner of the intro turns the sound on and off without restarting the video. The button reads UNMUTE while the video is muted and MUTE while sound is on. The Skip Intro button ends the intro right away and shows the landing content.

## Tests

```bash
npm install
node --test
```

`npm test` runs the same command. The tests cover the pure logic modules (exhibition validation, riddle answer normalization, state transitions and the door code generator) and run in Node without a browser.

`fast-check` is a dev-only dependency used by the property-based tests. The browser app never loads it, and `node_modules` is not needed to run the app.

## Repository layout

```text
index.html                    # landing page (intro video, "Enter Hexhibit")
play.html                     # the game page
assets/
  css/style.css               # game design tokens and styles
  css/landing.css             # landing page styles
  images/hexhibit-logo.png    # wordmark
  images/favicon.png          # skull icon
  videos/hexhibit.mp4         # intro video
  js/
    landing.js                # landing page intro video, mute and skip
    main.js                   # game boot and wiring
    state.js                  # game state and transitions
    random.js                 # door code generator
    corridor.js               # 3D corridor, camera, stops
    modal.js                  # dialogs
    content.js                # exhibition loading and validation
    puzzles/
      index.js                # puzzle registry
      riddle.js               # riddle puzzle
      choice.js               # multiple choice puzzle
advanced/landing.html         # separate advanced landing page
content/
  default-exhibition.json     # the built-in lesson
  exhibition.schema.json      # documented exhibition schema
test/
  smoke.test.js               # smoke tests
  random.test.js              # door code generator tests
  state.test.js               # game state tests
  helpers/                    # shared test sources and generators
package.json                  # test script and dev dependency
.kiro/                        # steering and specs
```

## Author an exhibition

All lesson text, artworks, puzzles, hints and messages live in a JSON file. Start from `content/default-exhibition.json`. The format is described in [`content/exhibition.schema.json`](content/exhibition.schema.json).

An exhibition needs a `title`, a `messages` object and 3 to 6 `artworks`. Each artwork has one `puzzle`. The default exhibition has 6 artworks, and an exhibition may have 3 to 6.

You do not author the door code. The game generates a new one each time the player steps inside, with one random digit per artwork (never all the same). The code is kept in memory only. It is not stored and it is not in the URL. A legacy `digit` field on a puzzle is optional, ignored if present, and never needs to be written.

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
    "explanation": "An echo is your own sound reflected back from a surface."
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
  "explanation": "The Moon's gravity pulls on the ocean and raises the tides."
}
```

The `choice` object goes in an artwork's `puzzle` field, the same way as in the riddle example. If an exhibition fails validation, Hexhibit shows a friendly message and falls back to the built-in lesson.

### Testing a different exhibition: `?exhibition=`

To try your own file without editing the default, add `?exhibition=<relative path>` to the game page address, for example `http://localhost:8080/play.html?exhibition=content/my-lesson.json`.

This is a testing aid, not a share link. It only loads files from the same site, so it does not let you send a lesson to someone else. The path is rejected, and the built-in lesson loads instead, if it:

- is empty
- is an absolute URL or has a URL scheme (such as `https:`)
- is protocol-relative (starts with `//`)
- contains a backslash
- contains a `..` segment
- contains percent-encoding, whitespace or control characters
- resolves to a different origin

If the path is valid but the file does not exist, the app falls back to the built-in lesson, and the browser console and network panel show a failed request for that file. This is expected.

## Planned
These ideas are not part of the current version:
- Real public-domain artwork images with credits (artworks are generated gradients today). Only public-domain art will be used, with no AI-generated or commissioned art.
- Hotspot and UV-lantern puzzles
- Chronological ordering puzzles
- Save-and-resume
## Roadmap
Ideas from earlier plans that are not current scope: classroom use (for example Google Classroom or Canvas links), shareable `#room=` links, an Educator Studio for editing a lesson in the browser, scoring with a results recap, and audio puzzles.
## Built with Kiro

- Steering files in `.kiro/steering/` set the product goals, the tech rules (plain HTML, CSS and ES modules, no framework or build step), the repository structure and the design system. Every change followed them.
- Specs in `.kiro/specs/` hold the requirements, design and task list for the playable loop. Work proceeded task by task from the spec, and the tests check the pure logic against its acceptance criteria.

## License

Released under the [GNU License](LICENSE).
