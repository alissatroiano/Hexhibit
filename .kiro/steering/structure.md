# Structure

The app is split into ES modules. Scripts live under `assets/js/`, styles under `assets/css/`, images under `assets/images/`, and exhibition data under `content/`. Add modules **only when a task needs it**. Serve the app with any static server (`file://` does not work because the app loads modules and JSON with `fetch`).

## Layout (what exists now)
```
index.html
assets/
  css/style.css            # tokens + all styles (split later only if needed)
  images/hexhibit-logo.png
  images/favicon.png
  videos/hexhibit.mp4      # demo video
  js/
    main.js                # boot, wiring
    state.js               # game state machine
    random.js              # door code generator
    corridor.js            # 3D world, camera, stops, painting focus
    modal.js               # inspect / puzzle / door dialogs
    content.js             # load + validate exhibitions
    puzzles/
      index.js             # puzzle registry
      riddle.js            # riddle plaque
      choice.js            # multiple choice
content/
  default-exhibition.json  # shipped lesson
  exhibition.schema.json   # documented schema
advanced/landing.html      # separate landing page
test/                      # node --test suites and helpers
.kiro/
  steering/                # these files
  specs/                   # requirements, design, tasks
```

## Rules
- UI strings and lesson text live in content files, not in logic code.
- New puzzle types are added under `assets/js/puzzles/` and registered, never special-cased in the corridor.
- Do not rename or move `assets/images/hexhibit-logo.png` or `assets/images/favicon.png`; the nav and tab icon depend on them.
- Artwork images, when added, go under `assets/images/` and must be public-domain with a credit in the exhibition JSON.
- Keep `README.md` current: what it is, how to run it, how to author an exhibition, the roadmap, and a short "Built with Kiro" section describing how specs and steering were used.
