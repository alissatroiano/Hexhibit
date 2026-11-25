# Product: Hexhibit

Hexhibit is a haunted art-history mystery that builds visual literacy. Players study real artworks and their plaques in a 3D museum corridor, then use those same details to escape. There are no accounts, no backend and no tracking.

**Hackathon context:** Kiroween, "Costume Contest" category. The interface must be haunting, polished and unforgettable, and the spooky design must *enhance the function* rather than decorate it.

## Problem
People give a masterpiece very little time. Smith & Smith (2001, Metropolitan Museum of Art) measured a mean of 27.2 seconds and a median of 17 seconds. Smith, Smith & Tinio (2017, Art Institute of Chicago) measured a median of 21 seconds. About 20 seconds is not enough to notice the details that carry an artwork's meaning.

## Solution
- **Daylight Mode:** players study artworks and plaques at their own pace.
- **After-Hours Mode:** the same details become escape-room puzzles, so players must have looked closely to get out.

## Audience
- Primary: art-history learners (AP Art History, intro college courses).
- Also: curious museum visitors.
- Hackathon judges, who will spend about 2 minutes with the demo.
- Devices: school and personal Chromebooks, laptops, tablets and phones.

## The two modes (the core idea)
1. **Daylight Mode (light theme, "metro art gallery").** Study. The player walks the corridor at their own pace, inspects artworks, and reads plaques (artist, year, medium, curator notes, and the lesson). No timer, no pressure.
2. **After-Hours Mode (dark theme, "spooky escape room").** Apply. The same room becomes a low-stakes check of what the player just studied. Each painting opens a puzzle built from its plaque. Solving puzzles reveals the digits of the door code.
- Switching to After-Hours is **one-way** and requires confirmation. The player can return to the gallery only after escaping.

## Learning principles
- Active recall over passive viewing: puzzles ask players to *apply* what they studied.
- Teach, don't punish: wrong answers get a short nudge or explanation, never just "no".
- Hints never block progress.
- Every correct answer shows a one-line "why it works".
- Support different learners with different puzzle styles and a no-timer pace.

## Tone
Spooky but friendly. Theatrical museum voice ("The corridor remembers…"). No gore and no jump scares.

## Art sourcing
Day images are **public-domain works**, with credits. Haunted night variants are original composites made by the author from those images. No commissioned art. Any AI-assisted editing must be disclosed in the credits.

## What is built now
- A complete playthrough driven by a JSON exhibition file: gallery, escape, code door, exit.
- Puzzle types: riddle plaque (text answer with accepted variants) and multiple choice.
- A new random door code for every game, kept in memory only.
- Artworks are currently shown as generated gradients, not real images.

## Planned (not built yet)
- Real public-domain artwork images with credits.
- Haunted night variants of each artwork, and a "what changed?" puzzle.
- Hotspot and UV-lantern puzzles.
- Chronological ordering puzzles.
- Save-and-resume.

## Out of scope
Accounts, backend, multiplayer, leaderboards, analytics.
