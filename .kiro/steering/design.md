# Design system (visual direction & token architecture)

`assets/css/style.css` is our starting foundation—**evolve and elevate it** into a haunted, museum-grade UI worthy of the Kiroween Costume Contest[cite: 4, 5]. Keep the core `data-theme="light|dark"` token architecture, typography (`Antonio` + `Inter`), and responsive layout hooks intact, while freely upgrading surfaces, glassmorphism, lighting, depth, and transitions[cite: 4].

## Personality
Sleek, atmospheric, theatrical. A luminous, airy metro art gallery by day and a moody, candle-and-UV-lit haunted archive by night[cite: 4, 5]. High-contrast typography paired with layered depth, subtle translucency, and tactile surfaces.

## Typography
- Display: **Antonio** (tall, condensed, uppercase, letter-spaced)[cite: 4]. Used for headings, captions, buttons, door text, and slots[cite: 4]. It echoes the Hexhibit wordmark[cite: 4].
- Body: **Inter**[cite: 4]. Sentence case, comfortable line height (about 1.6)[cite: 4].
- Small labels: uppercase, 0.14–0.2em letter-spacing, muted color[cite: 4].

## Color tokens (CSS custom properties on `:root`)
| Token | Light (Daylight) | Dark (After-Hours) |
|---|---|---|
| `--bg` | #f4f3ef | #060607 |
| `--wallA` / `--wallB` | #fafaf8 / #e6e4de | #151416 / #1e1b1e |
| `--ink` | #0e0e10 | #ece8e0 |
| `--muted` | #6d6d74 | #8c8a92 |
| `--accent` | #0e0e10 | #ece8e0 |
| `--frame` | #0e0e10 | #2c2a2e |
| `--glow` | rgba(14,14,16,.28) | rgba(200,30,40,.5) |
| `--bad` | #c4222d | #ff5a5f |

- Dark mode adds a **blood-red glow** around the door and an atmospheric vignette/lantern spotlight on `.vig`[cite: 4]. Red (`--glow`, `--bad`) and UV/amber accents are used purposefully for tension, clues, and feedback[cite: 4].
- Themes switch via `data-theme="light|dark"` on `<html>`[cite: 4]. Always define both values for any new token[cite: 4].

## Surfaces, depth, and components
- **Glassmorphism & layered depth:** Translucent panels (`backdrop-filter: blur(...)`), subtle inner borders (`1px solid var(--line)`), and soft ambient elevation shadows are encouraged for HUD bars, museum placards, modals, and interactive puzzle lenses—allowing the 3D corridor to breathe behind the UI[cite: 4].
- **Intentional geometry:** Use crisp architectural lines and restrained corner radii (`0px` to `8px` max) so UI overlays feel like etched glass museum cases rather than bubbly mobile apps[cite: 4].
- **Buttons:** Uppercase Antonio with `0.16em` letter-spacing[cite: 4]. Primary is filled with `--accent`; secondary is ghost or frosted glass with a `--line` border[cite: 4].
- **Door code slots (`#slots`):** Etched glass or brass-framed cells; locked slots display `•` in `--muted`, and solved slots illuminate with `--accent` and `--glow`[cite: 4].
- **Top navigation:** Frosted translucent panel with blur and a bottom border[cite: 4]. The favicon skull sits next to the wordmark image[cite: 4].
- **No emoji in the UI.** Use crisp text labels (`LOCKED` / `UNLOCKED`, `"Enter escape room →"`, `"Inspect"`) or custom SVG/CSS icons[cite: 4].

## Logo handling
- `hexhibit-logo.png` (light gray) is inverted by CSS in light mode; `favicon.png` (black skull) is inverted by CSS in dark mode[cite: 4]. Never add duplicate recolored image files[cite: 4].

## Motion
- Smooth, theatrical easing (camera, door swing about 1.4s, modal transitions, slot unlocks)[cite: 4]. Subtle flicker and pointer-driven lantern/UV spotlight effects in dark mode[cite: 4].
- Everything animated must have a `prefers-reduced-motion` fallback (and keep `backdrop-filter` performant on school Chromebooks)[cite: 4, 5].

## Interaction
- Paintings glow when clickable[cite: 4]. The camera turns to face the painting you stop at, with a "CLICK TO INSPECT" cue[cite: 4]. Keep the generous invisible hit area around paintings[cite: 4].
- Tactile puzzles (UV reveal, drag-to-uncover) should feel physical and responsive across mouse and touch (`pointerdown`, `pointermove`, `pointerup`), with clear visual affordances and keyboard accessibility.
- Feedback is calm and atmospheric: a short shake for wrong answers and an accent-colored confirmation for right ones[cite: 4]. No harsh flashing[cite: 4].

## Responsive
- Phone portrait: the top bar stacks into two rows, the hint text hides, and Back/Next carry navigation[cite: 4].
- Check every new screen and puzzle type at 390px, 768px, and 1440px wide in both themes[cite: 4].

## Guardrails
- Keep typography restricted to **Antonio** and **Inter** (no extra font families)[cite: 4].
- Avoid pure `#000` or `#fff` for body text so contrast stays rich and comfortable[cite: 4].
- Never rely on color alone to convey puzzle clues or state changes[cite: 4].