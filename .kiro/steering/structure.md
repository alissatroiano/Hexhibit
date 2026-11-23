# Structure

The repo starts flat (the prototype): `index.html`, `style.css`, `script.js`, `assets/`. Refactor into modules **only when a task needs it**, and keep the app openable by double-clicking `index.html` or via any static server.

## Target layout
```
index.html
style.css                 # tokens + all styles (split later only if needed)
js/
  main.js                 # boot, wiring, render loop
  state.js                # game state machine + persistence
  corridor.js             # 3D world, camera, stops, painting focus
  puzzles/                # one file per puzzle type + registry
  modal.js                # inspect / puzzle / door / results dialogs
  share.js                # #room= encode/decode
  content.js              # load + validate exhibitions
content/
  default-exhibition.json # shipped lesson
  exhibition.schema.json
assets/
  hexhibit-logo.png
  favicon.png
.kiro/
  steering/               # these files
  specs/                  # requirements, design, tasks
```

## Rules
- UI strings and lesson text live in content files, not in logic code.
- New puzzle types are added under `js/puzzles/` and registered, never special-cased in the corridor.
- Do not rename or move `assets/hexhibit-logo.png` or `assets/favicon.png`; the nav and tab icon depend on them.
- Keep `README.md` current: what it is, how to run it, how to author an exhibition, and a short "Built with Kiro" section describing how specs and steering were used.
