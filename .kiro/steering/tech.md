# Tech

## Stack
- Plain HTML, CSS and JavaScript (ES modules). **No framework, no bundler, no build step.**
- The 3D corridor is **CSS 3D transforms** (perspective + translateZ/rotateY). Do not introduce WebGL or three.js.
- Runs entirely in the browser and deploys as static files (GitHub Pages or any static host).
- Do not add dependencies without asking first. Prefer the platform: `CompressionStream`, `URLSearchParams`, `localStorage`, `structuredClone`.

## Data and content
- All lessons, artworks, puzzles, hints and explanations live in an **exhibition JSON file**, never hard-coded in JS.
- Validate exhibition data against a documented schema on load. Show a friendly error for a bad exhibition and fall back to the built-in default.
- Puzzle logic is data-driven: each puzzle has a `type` and a small handler. Adding a puzzle type should not require touching the corridor code.
- Share links use the URL **hash**: `#room=<base64url of compressed JSON>`. No server. Keep links reasonably short; images are referenced by URL or generated gradient, never embedded.

## Persistence
- `localStorage` for progress and best results (not built yet), always inside try/catch, and the app must work when storage is unavailable.
- Never store personal data. No accounts, no analytics, no tracking.

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
