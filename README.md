# Hexhibit
Hexhibit is a haunted art-history mystery that builds visual literacy. It was built for Kiroween 2026 (Costume Contest category). It is made for art-history learners (AP Art History, intro college) and curious museum visitors.
People give a masterpiece about 20 seconds. Smith & Smith (2001) measured a mean of 27.2 seconds and a median of 17 seconds at the Met. Smith, Smith & Tinio (2017) measured a median of 21 seconds at the Art Institute of Chicago.
Hexhibit slows that down. By day (Daylight mode) the player walks a 3D gallery corridor, inspects artworks and reads the plaques at their own pace. After dark (After-Hours mode) the same room is sealed, and each painting opens a puzzle built from the details on its plaque. Each solved puzzle reveals one digit of the door code, and the code is new for every game. Enter the code to escape, then optionally return to the gallery. In Daylight mode the exit door stays closed, and its message (the `exitClosed` key under `messages`) tells the player to study the paintings first.
Everything runs in the browser from static files. There are no accounts, no backend, no tracking and no build step. The corridor uses CSS 3D transforms.

## Two visual architectures

The two modes are two different views, not one view with a color swap.

- **Daylight mode** (`data-theme="light"`) is a bright isometric corner gallery (`#daylight-gallery`) with a floor, two walls, wall sconces, spotlights and one framed painting per artwork. Select a frame to read its plaque and study it.
- **After-Hours mode** (`data-theme="dark"`) is the first-person 3D corridor (`#stage`). The camera always starts at the entrance, and the paintings are the haunted versions of the same artworks.

Switching to After-Hours is one-way. The "Enter After-Hours Escape →" button asks for confirmation first. The player can return to the gallery only after escaping.

### Flashlight

In After-Hours mode the corridor is dark, and a flashlight beam follows the pointer to light what is under it. The beam is a visual aid only. Every painting and the door stay in the page and reachable by keyboard and screen reader, whether or not the beam is over them.

Keyboard alternative: press Tab to move focus to a painting or the door. The camera walks to it and the beam centers on the focused element, so keyboard players see it lit. With `prefers-reduced-motion` the beam's easing is removed, but focus still lights the element.

### Session lock-in

While a player is in After-Hours mode, the in-progress game (door code, solved puzzles and hints used) is kept in `sessionStorage`. Reloading the tab keeps the player in After-Hours instead of releasing them to the gallery. The saved game is used only if its artwork ids match the loaded exhibition. It is removed as soon as the player escapes, and it goes away when the tab closes. It is never put in the URL, and the app works when storage is unavailable.

### Judge demo link

`play.html?mode=afterhours` starts straight in After-Hours mode. This link skips the confirmation dialog, because opening the explicit URL counts as the player's consent. The "Enter Hexhibit" link on the landing page still opens the game in Daylight mode. Locally: `http://localhost:8080/play.html?mode=afterhours`.

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
scripts/fetch-artworks.mjs    # downloads public-domain paintings and prints their metadata
.kiro/
  steering/                   # product, tech, structure and design rules
  specs/                      # requirements, design and tasks
  agents/museum-curator.json  # custom Kiro CLI agent that writes exhibitions
  hooks/validate-exhibition.kiro.hook  # runs the tests when content/*.json is saved
  settings/mcp.json           # fetch MCP server used by the agent
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

The `choice` object goes in an artwork's `puzzle` field, the same way as in the riddle example.

### Artwork images (optional)

An artwork can carry these optional fields. `colors` stays required, so existing exhibitions remain valid, and the generated gradient is used whenever an image is missing or fails to load.

- `image`: a same-site relative path to the day image under `assets/images/art/`. Use public-domain works only.
- `hauntedImage`: the night variant for After-Hours mode, with the same path rules. It is allowed only when `image` is also set.
- `alt`: a text alternative describing the artwork.
- `credit`: the source and rights line shown on the plaque. **Required whenever `image` is set.** An exhibition with an `image` and no `credit` fails validation. Disclose any AI-assisted editing in the credit.

```json
{
  "image": "assets/images/art/the-quiet-staircase.jpg",
  "hauntedImage": "assets/images/art/the-quiet-staircase-haunted.jpg",
  "alt": "A charcoal drawing of a staircase that darkens with each step.",
  "credit": "E. Vance, 1907. Public domain. Source: Example Museum Open Access."
}
```

If an exhibition fails validation, Hexhibit shows a friendly message and falls back to the built-in lesson.

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

## Curate with the museum-curator agent

`museum-curator` is a custom Kiro agent that acts as Hexhibit's Head Curator. It writes atmospheric Daylight plaques that plant the clues its After-Hours puzzles later ask about, so a player who read closely can solve them.

### How it was made

- **Agent definition.** `.kiro/agents/museum-curator.json` holds the name, description and system prompt. The prompt sets the theatrical, spooky-but-friendly voice and the hard rules: obey `content/exhibition.schema.json`, use local `assets/images/art/` paths only, never write door digits (the game generates the code), and use no emoji.
- **Context.** The agent loads `.kiro/steering/product.md`, `structure.md`, `tech.md`, `content/exhibition.schema.json` and `content/default-exhibition.json` as resources, so it starts every chat knowing the product rules and the data format.
- **Tools.** It can read files, write files (limited to `content/**` and `assets/images/art/**`) and run shell commands such as `node --test`.
- **Validation hook.** `.kiro/hooks/validate-exhibition.kiro.hook` runs `node --test` whenever a `content/*.json` file is saved. `test/exhibition-files.test.js` checks each exhibition for schema compliance, local image files that exist and carry credits, puzzle solvability, no `digit` or `doorCode` fields and no emoji.
- **Art sourcing.** `scripts/fetch-artworks.mjs` is a zero-dependency Node script. It searches the [Art Institute of Chicago API](https://api.artic.edu/docs/) for public-domain paintings, downloads six into `assets/images/art/`, re-checks each record, and prints metadata (title, artist, year, medium, size, credit) as JSON. Curator fields, puzzles and gradient colors are left as `TODO` placeholders for the curator to fill in.
- **Web access.** `.kiro/settings/mcp.json` configures the `fetch` MCP server (`uvx mcp-server-fetch`) so the agent can check facts on the web.

### Use it (other developers)

The agent, hook and MCP config are committed to the repository, so cloning it is enough. There is nothing to publish.

1. Install [Kiro CLI](https://kiro.dev/docs/cli/). On Windows, run `irm 'https://cli.kiro.dev/install.ps1' | iex` in PowerShell.
2. Install [`uv`](https://docs.astral.sh/uv/getting-started/installation/) so `uvx` can start the fetch server.
3. Install the test dependencies with `npm install`.
4. From the repository root, start the agent:

   ```bash
   kiro-cli chat --agent museum-curator
   ```

   Inside an existing chat, `/agent swap museum-curator` switches to it.
5. Sign in when the browser prompt opens on first run.

Example request: "Rewrite `content/default-exhibition.json` using the images in `assets/images/art/`, write new plaques and puzzles, then run `node --test`."

To fetch different paintings, run `node scripts/fetch-artworks.mjs lantern fog` with your own search terms (needs Node 18 or later and network access). Paste the printed JSON into the chat for the curator to build from. Do not save it as a file under `content/`, because the validation hook and tests treat every `content/*.json` as an exhibition.

The Kiro IDE may not list custom agents from `.kiro/agents/`. If it doesn't, use the CLI.

## Planned
These ideas are not part of the current version:
- Haunted night variants of the default artworks (the default exhibition now ships real public-domain day images, so After-Hours currently shows those). No AI-generated or commissioned art.
- A "what changed?" puzzle comparing day and haunted images
- Hotspot and UV-lantern puzzles
- Chronological ordering puzzles
- Save-and-resume across browser sessions (today only the per-tab `sessionStorage` lock-in exists)
## Roadmap
Ideas from earlier plans that are not current scope: classroom use (for example Google Classroom or Canvas links), shareable `#room=` links, an Educator Studio for editing a lesson in the browser, scoring with a results recap, and audio puzzles.
## Built with Kiro

- The `museum-curator` custom agent, the exhibition validation hook and the fetch MCP server turn exhibition writing into a checked workflow. See [Curate with the museum-curator agent](#curate-with-the-museum-curator-agent).
- Steering files in `.kiro/steering/` set the product goals, the tech rules (plain HTML, CSS and ES modules, no framework or build step), the repository structure and the design system. Every change followed them.
- Specs in `.kiro/specs/` hold the requirements, design and task list for the playable loop. Work proceeded task by task from the spec, and the tests check the pure logic against its acceptance criteria.
- The `dual-mode-visual-architecture` spec (`.kiro/specs/dual-mode-visual-architecture/`) drove the split into the Daylight gallery and the After-Hours corridor, the flashlight and its keyboard alternative, the `sessionStorage` lock-in, the optional artwork image fields with the credit rule, and the `?mode=afterhours` judge link. Its requirements, design and tasks were implemented task by task, with property-based tests for the pure logic.

## License

Released under the [GNU License](LICENSE).
