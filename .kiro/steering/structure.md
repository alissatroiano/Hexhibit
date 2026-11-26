# Structure

The app is split into ES modules. Scripts live under `assets/js/`, styles under `assets/css/`, images under `assets/images/`, and exhibition data under `content/`. Add modules **only when a task needs it**. Serve the app with any static server (`file://` does not work because the app loads modules and JSON with `fetch`).

## Layout (what exists now)
```
index.html                 # landing page (hero video, mute toggle, link to the game)
play.html                  # game page
assets/
  css/style.css            # tokens + all game styles (split later only if needed)
  css/landing.css          # landing page styles
  images/hexhibit-logo.png
  images/favicon.png
  images/art/              # created with the first image: day and haunted files, named by artwork id
  videos/hexhibit.mp4      # demo video
  js/
    landing.js             # landing page behavior (video mute toggle)
    main.js                # game boot, wiring (play.html)
    state.js               # game state machine
    random.js              # door code generator
    corridor.js            # 3D world, camera, stops, painting focus
    gallery.js             # Daylight Gallery: isometric corner gallery, frame placement, scene sizing
    session.js             # sessionStorage lock-in (save, read, validate, clear)
    flashlight.js          # After-Hours pointer-tracked flashlight beam
    image.js               # shared artwork image-then-gradient rule and image path validation
    modal.js               # inspect / puzzle / door dialogs
    content.js             # load + validate exhibitions
    puzzles/
      index.js             # puzzle registry
      riddle.js            # riddle plaque
      choice.js            # multiple choice
content/
  default-exhibition.json  # shipped lesson
  exhibition.schema.json   # documented schema
test/                      # node --test suites and helpers
.kiro/
  steering/                # these files
  specs/                   # requirements, design, tasks
```

## Rules
- UI strings and lesson text live in content files, not in logic code.
- New puzzle types are added under `assets/js/puzzles/` and registered, never special-cased in the corridor.
- Do not rename or move `assets/images/hexhibit-logo.png` or `assets/images/favicon.png`; the nav and tab icon depend on them.
- Artwork images go under `assets/images/art/`, as a day file and a haunted file named by artwork id. Credits live in the exhibition JSON. The `assets/images/art/` folder does not exist yet and is created when the first image is added.
- Keep `README.md` current: what it is, how to run it, how to author an exhibition, the roadmap, and a short "Built with Kiro" section describing how specs and steering were used.
