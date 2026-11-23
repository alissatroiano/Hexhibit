# Product: Hexhibit

Hexhibit turns any classroom lesson into a haunted 3D museum escape room. Anyone can play from a shared link. There are no accounts, no setup and no backend.

**Hackathon context:** Kiroween, "Costume Contest" category. The interface must be haunting, polished and unforgettable, and the spooky design must *enhance the function* rather than decorate it.

## Audience
- Students (grades 6–12 by default) on school Chromebooks, tablets and phones.
- Teachers who want to drop a link into Google Classroom or Canvas.
- Hackathon judges who will spend about 2 minutes with the demo.

## The two modes (the core idea)
1. **Daylight Mode (light theme, "metro art gallery").** Study. The player walks the corridor at their own pace, inspects artworks, and reads plaques (artist, medium, curator notes, and the lesson). No timer, no pressure.
2. **After-Hours Mode (dark theme, "spooky escape room").** Apply. The same room becomes a low-stakes formative assessment. Each painting opens a puzzle built from what the student just studied. Solving puzzles reveals the digits of the door code.
- Switching to After-Hours is **one-way** and requires confirmation. The player can only return to the gallery after escaping.

## Learning principles
- Active recall over passive viewing: puzzles ask students to *apply* what they studied.
- Teach, don't punish: wrong answers get a short nudge or explanation, never just "no".
- Hints cost points but never block progress.
- Every correct answer shows a one-line "why it works".
- The end screen shows a "what you learned" recap of every concept.
- Support different learners: visual, logic and reading puzzles; a no-timer "take your time" option.

## Tone
Spooky but friendly. Theatrical museum voice ("The corridor remembers…"). Never frightening for young learners: no gore, no jump scares.

## Scope tiers (build in this order)
1. **Must:** a complete playthrough driven by a JSON exhibition file (gallery → escape → code door → results).
2. **Should:** a shareable `#room=` link that loads an exhibition from the URL.
3. **Stretch (only if ahead of schedule):** a minimal Educator Studio (5 rows, "Generate link", "Test it").
- Not in scope: accounts, backend, multiplayer, leaderboards.

## Puzzle types for v1
Chronological sorting, riddle plaque (text answer with accepted variants), multiple choice, and the UV lantern reveal. Dial alignment and audio sequences are later ideas. Audio never autoplays.
