# Tech

## Stack
- Plain HTML, CSS and JavaScript (ES modules). **No framework, no bundler, no build step.**
- The 3D corridor is **CSS 3D transforms** (perspective + translateZ/rotateY). Do not introduce WebGL or three.js.
- Runs entirely in the browser and deploys as static files (GitHub Pages or any static host).
- Do not add dependencies without asking first. Prefer the platform: `URLSearchParams`, `structuredClone`, `localStorage`.
- Tests run with `node --test`. `fast-check` is a dev-only dependency and the browser app never loads it.

## Data and content
- All lessons, artworks, puzzles, hints and explanations live in an **exhibition JSON file**, never hard-coded in JS.
- Validate exhibition data against `content/exhibition.schema.json` on load. Show a friendly error for a bad exhibition and fall back to the built-in default.
- Puzzle logic is data-driven: each puzzle has a `type` and a small handler. Adding a puzzle type should not require touching the corridor code.
- `?exhibition=<relative path>` loads a same-site exhibition file for testing. It is not a sharing feature, and unsafe paths fall back to the default.
- `?mode=afterhours` (next to `?exhibition=`) starts the game directly in After-Hours Mode and skips the confirmation dialog, because the explicit URL is the player's consent. Any other `mode` value is ignored. It can be combined with `?exhibition=`. The `mode` parameter is removed from the address bar after entry. The door code is never placed in the URL.
- Artworks render with an image-then-gradient rule: the optional `image` (day) and `hauntedImage` (night, only allowed with `image`) are drawn when present and loaded, and the generated `colors` gradient is the fallback when an image is absent or fails to load. Haunted paintings use `hauntedImage`, then `image`, then the gradient. One shared function applies this rule everywhere.
- Image paths must be same-site relative paths under `assets/images/art/` ending in `.jpg`, `.jpeg`, `.png` or `.webp`. Unsafe paths (scheme or host, leading `/` or `//`, `..`, backslash, query, fragment) are rejected, and the exhibition falls back to the default. An `image` requires a `credit` in the exhibition JSON.
- Day images must be public-domain works, hosted under `assets/images/art/`, and credited in the exhibition JSON. Haunted night variants are original composites made by the author from those images. No commissioned art. Any AI-assisted editing must be disclosed in the credits.

## Persistence and privacy
- Exception: the in-progress After-Hours game (door code, `solved`, `hintsUsed`, plus a version and the artwork id list used to validate it) is stored in `sessionStorage` under `hexhibit.session.v1`, inside try/catch, so a reload keeps the player in After-Hours Mode. This is a deliberate exception to the "door code is never stored" rule.
- The saved game is cleared when the game ends (the moment the correct door code is accepted) and when the player starts over. An invalid or mismatched saved game is discarded. The app must work when storage is unavailable, with no console error. The door code is never placed in the URL, `localStorage`, cookies or the DOM.
- This `sessionStorage` lock-in is separate from the planned save-and-resume feature below. Game state logic in `state.js` stays free of storage access.
- Save-and-resume (planned) will deliberately store the in-progress game, including the door code, in `localStorage` inside try/catch. This supersedes the "never stored" rule for that feature only. The saved game is cleared when the game ends or the player starts over. The app must work when storage is unavailable.
- Never store personal data. No accounts, no backend, no analytics, no tracking.

## Quality bar
- Fully keyboard playable. Puzzle modals trap focus, close on Escape, and announce feedback via `role="status"`.
- Respect `prefers-reduced-motion` (disable flicker, door swing and camera easing).
- Contrast of at least WCAG AA in both themes.
- Works on a phone in portrait, a tablet and a 1440px desktop. Tap targets of at least 44px.
- No console errors. Keep first load small (inline nothing large; fonts only from Google Fonts).

## Conventions
- Small, named functions. Constants for magic numbers (stop distances, camera angles).
- One source of truth for game state (a single `state` object) with explicit transitions: `gallery → escape → solved → escaped`.
- Comment the *why* for anything involving 3D math or camera behavior.
- After each task, verify in a browser at desktop and phone widths before marking it done.
