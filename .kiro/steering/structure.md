# Structure

The app is split into ES modules. Everything lives under `assets/js/` (scripts), `assets/css/` (styles) and `assets/images/` (images). Add modules **only when a task needs it**, and serve the app with any static server (`file://` does not work because it loads modules and JSON with `fetch`).

## Layout (share.js and the results dialog are not built yet)
```
index.html
assets/
  css/style.css            # tokens + all styles (split later only if needed)
  images/hexhibit-logo.png
  images/favicon.png
  js/
    main.js                 # boot, wiring, render loop
    state.js                # game state machine + persistence
    corridor.js             # 3D world, camera, stops, painting focus
    puzzles/                # one file per puzzle type + registry
    modal.js                # inspect / puzzle / door dialogs (results: not built yet)
    share.js                # NOT BUILT YET: #room= encode/decode
    content.js              # load + validate exhibitions
content/
  default-exhibition.json # shipped lesson
  exhibition.schema.json
.kiro/
  steering/               # these files
  specs/                  # requirements, design, tasks
```

## Rules
- UI strings and lesson text live in content files, not in logic code.
- New puzzle types are added under `assets/js/puzzles/` and registered, never special-cased in the corridor.
- Do not rename or move `assets/images/hexhibit-logo.png` or `assets/images/favicon.png`; the nav and tab icon depend on them. Images live under `assets/images/`.
- Keep `README.md` current: what it is, how to run it, how to author an exhibition, and a short "Built with Kiro" section describing how specs and steering were used.
