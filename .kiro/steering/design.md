# Design system (visual direction & token architecture)

`assets/css/style.css` is our starting foundation—**evolve and elevate it** into a haunted, museum-grade UI worthy of the Kiroween Costume Contest. Keep the core `data-theme="light|dark"` token architecture, typography (`Antonio` + `Inter`), and responsive layout hooks intact. Evolve within the token architecture; do not add new fonts. Surfaces, glassmorphism, lighting, depth, and transitions may be upgraded.

## Personality
Sleek, atmospheric, theatrical. A luminous, airy metro art gallery by day and a moody, candle-and-UV-lit haunted archive by night. High-contrast typography paired with layered depth, subtle translucency, and tactile surfaces.

## Typography
- Display: **Antonio** (tall, condensed, uppercase, letter-spaced). Used for headings, captions, buttons, door text, and slots. It echoes the Hexhibit wordmark.
- Body: **Inter**. Sentence case, comfortable line height (about 1.6).
- Small labels: uppercase, 0.14–0.2em letter-spacing, muted color.

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

- Dark mode adds a **blood-red glow** around the door and an atmospheric vignette/lantern spotlight on `.vig`. Red (`--glow`, `--bad`) and UV/amber accents are used purposefully for tension, clues, and feedback.
- Themes switch via `data-theme="light|dark"` on `<html>`. Always define both values for any new token. Any new color token (for example a UV or amber accent) must be defined in `:root` for both light and dark, and its contrast must be checked (WCAG AA) before it is used.

## Surfaces, depth, and components
- **Glassmorphism & layered depth:** Translucent panels (`backdrop-filter: blur(...)`), subtle inner borders (`1px solid var(--line)`), and soft ambient elevation shadows are encouraged for HUD bars, museum placards, modals, and interactive puzzle lenses—allowing the 3D corridor to breathe behind the UI.
- **Intentional geometry:** Use crisp architectural lines and restrained corner radii (`0px` to `2px` max) so UI overlays feel like etched glass museum cases rather than bubbly mobile apps.
- **Buttons:** Uppercase Antonio with `0.16em` letter-spacing. Primary is filled with `--accent`; secondary is ghost or frosted glass with a `--line` border.
- **Door code slots (`#slots`):** Etched glass cells; locked slots display `•` in `--muted`, and solved slots illuminate with `--accent` and `--glow`.
- **Top navigation:** Frosted translucent panel with blur and a bottom border. The favicon skull sits next to the wordmark image.
- **Daylight Gallery (`#daylight-gallery`):** An isometric corner gallery built with CSS 3D transforms only: one `preserve-3d` scene with a floor, a left wall and a right wall, wall sconces, a spotlight around each framed painting, and a faint ground reflection. It uses the existing tokens and fonts, sizes itself from `--base-width` and `--base-height`, and has a flat keyboard-reachable list fallback. Spotlights never drop caption contrast below 4.5:1. Viewed frames carry a text or shape cue, not color alone.
- **No emoji in the UI.** Use crisp text labels (`LOCKED` / `UNLOCKED`, `"Enter escape room →"`, `"Inspect"`) or custom SVG/CSS icons.

## Logo handling
- `hexhibit-logo.png` (light gray) is inverted by CSS in light mode; `favicon.png` (black skull) is inverted by CSS in dark mode. Never add duplicate recolored image files.

## Motion
- Smooth, theatrical easing (camera, door swing about 1.4s, modal transitions, slot unlocks). Subtle flicker and pointer-driven lantern/UV spotlight effects in dark mode.
- Everything animated must have a `prefers-reduced-motion` fallback (and keep `backdrop-filter` performant on school Chromebooks).

## Interaction
- Paintings glow when clickable. The camera turns to face the painting you stop at, with a "CLICK TO INSPECT" cue. Keep the generous invisible hit area around paintings.
- **Flashlight (After-Hours):** `.vig` draws a radial beam centered on `--mx` and `--my`, set from the pointer at most once per animation frame, with the outside darkened. It never intercepts pointer events and never darkens dialogs. With no pointer, or under reduced motion, it stays centered at 50% 50%. Focusing a painting or the door centers the beam on it. It is a visual aid only: every painting and the door stay reachable and named for keyboard and screen readers.
- Tactile puzzles (UV reveal, drag-to-uncover) should feel physical and responsive across mouse and touch (`pointerdown`, `pointermove`, `pointerup`), with clear visual affordances and keyboard accessibility.
- Feedback is calm and atmospheric: a short shake for wrong answers and an accent-colored confirmation for right ones. No harsh flashing.

## Responsive
- Phone portrait: the top bar stacks into two rows, the hint text hides, and Back/Next carry navigation.
- Check every new screen and puzzle type at 390px, 768px, and 1440px wide in both themes.

## Guardrails
- Keep typography restricted to **Antonio** and **Inter** (no extra font families).
- Avoid pure `#000` or `#fff` for body text so contrast stays rich and comfortable.
- Never rely on color alone to convey puzzle clues or state changes.