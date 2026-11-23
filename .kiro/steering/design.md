# Design system (source of truth: `style.css`)

The existing `style.css` and `index.html` define the look. **Reuse the existing tokens and components. Do not invent new colors, fonts or component styles.** If something new is needed, extend the tokens first.

## Personality
Sleek, modern, theatrical. A contemporary metro gallery by day and a haunted archive by night. Minimal, high-contrast, a lot of negative space, and thin lines.

## Typography
- Display: **Antonio** (tall, condensed, uppercase, letter-spaced). Used for headings, captions, buttons, door text and slots. It echoes the Hexhibit wordmark.
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

- Dark mode adds a **blood-red glow** around the door and a slow candle flicker on the vignette. Red is used sparingly.
- Themes switch via `data-theme="light|dark"` on `<html>`. Always define both values for any new token.

## Shape and components
- **Square corners.** No rounded pills, no drop-shadow cards. Cards, inputs, buttons and the close button are rectangles with a **1px** `--line` border.
- Buttons: uppercase Antonio with 0.16em letter-spacing. Primary is filled with `--accent`; secondary is ghost with a `--line` border.
- Top navigation: translucent panel with blur and a bottom border. The favicon skull sits next to the wordmark image.
- **No emoji in the UI.** Use text labels (LOCKED / UNLOCKED, "Enter escape room →").

## Logo handling
- `hexhibit-logo.png` (light gray) is inverted by CSS in light mode; `favicon.png` (black skull) is inverted by CSS in dark mode. Never add duplicate recolored image files.

## Motion
- Slow, smooth easing (camera, door swing about 1.4s). Subtle flicker in dark mode only.
- Everything animated must have a `prefers-reduced-motion` fallback.

## Interaction
- Paintings glow when clickable. The camera turns to face the painting you stop at, with a "CLICK TO INSPECT" cue. Keep the generous invisible hit area around paintings.
- Feedback is calm: a short shake for wrong answers and an accent-colored confirmation for right ones. No flashing.

## Responsive
- Phone portrait: the top bar stacks into two rows, the hint text hides, and Back/Next carry navigation.
- Check every new screen at 390px, 768px and 1440px wide in both themes.

## Don't
- Don't add gradients, glassmorphism, neon colors, rounded corners, new fonts or stock UI kits.
- Don't use pure #000 or #fff for text.
- Don't put important information in color alone.
