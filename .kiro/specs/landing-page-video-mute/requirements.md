# Requirements Document

## Introduction

The Hexhibit landing page (`index.html`) plays an intro video over the page, then reveals the landing content with a call-to-action that opens the game (`play.html`). This feature adds a mute/unmute control to the intro video, fixes defects in the intro logic, removes dead scripts, moves the intro logic into an ES module, and brings the page markup, styles and documentation in line with the project steering. The video autoplays muted. The intro always plays on every visit and nothing is stored.

## Glossary

- **Landing_Page**: The page served by `index.html`.
- **Intro_Video**: The `<video>` element `#introVideo` inside `#videoIntroWrapper`.
- **Intro_Overlay**: The wrapper `#videoIntroWrapper` that covers the Landing_Page while the Intro_Video plays.
- **Intro_Module**: The ES module `assets/js/landing.js` that holds the intro-video logic.
- **Mute_Button**: A text-only button in the Intro_Overlay that toggles the audio of the Intro_Video.
- **Skip_Button**: The existing `#skipIntroBtn` button.
- **Reveal**: Fading out and removing the Intro_Overlay so the Landing_Page content is visible.
- **CTA_Link**: The "Enter Hexhibit" link in `.cta-btn` that points to `play.html`.
- **Structure_Doc**: The steering file `.kiro/steering/structure.md`.
- **README**: The file `README.md`.
- **Test_Suite**: The tests under `test/` run with `node --test`.

## Requirements

### Requirement 1: Mute control

**User Story:** As a visitor, I want to turn the intro audio on and off, so that I can hear the intro when I choose to and keep it quiet otherwise.

#### Acceptance Criteria

1. THE Landing_Page SHALL render the Mute_Button inside the Intro_Overlay.
2. THE Intro_Video SHALL carry the `muted` attribute in `index.html` so that the video starts without sound.
3. WHEN the Landing_Page loads, THE Intro_Module SHALL set the Mute_Button label to the text "UNMUTE" and its `aria-pressed` attribute to `false`.
4. WHEN the visitor activates the Mute_Button while the Intro_Video is muted, THE Intro_Module SHALL unmute the Intro_Video, set the label to "MUTE" and set `aria-pressed` to `true`.
5. WHEN the visitor activates the Mute_Button while the Intro_Video is unmuted, THE Intro_Module SHALL mute the Intro_Video, set the label to "UNMUTE" and set `aria-pressed` to `false`.
6. THE Mute_Button SHALL display text only, with no emoji and no icon.
7. THE Mute_Button SHALL provide a tap target of at least 44px by 44px.
8. THE Mute_Button SHALL be reachable and operable with the keyboard keys Tab, Enter and Space.
9. WHEN the visitor activates the Mute_Button, THE Intro_Module SHALL keep the Intro_Video playing from its current position.

### Requirement 2: Reliable intro playback

**User Story:** As a visitor, I want the intro to always start and always end, so that I never get stuck on a black screen.

#### Acceptance Criteria

1. WHEN the Landing_Page loads, THE Intro_Module SHALL call `play()` on the Intro_Video.
2. IF the `play()` call on the Intro_Video is rejected, THEN THE Intro_Module SHALL perform the Reveal.
3. IF the Intro_Video raises an `error` event, THEN THE Intro_Module SHALL perform the Reveal.
4. WHEN the Intro_Video raises an `ended` event, THE Intro_Module SHALL perform the Reveal.
5. WHEN the visitor activates the Skip_Button, THE Intro_Module SHALL perform the Reveal.
6. WHEN the Reveal has already started, THE Intro_Module SHALL ignore further Reveal requests.
7. WHEN the Reveal starts, THE Intro_Module SHALL pause the Intro_Video, fade out the Intro_Overlay and remove the Intro_Overlay from the document after the fade completes.
8. WHERE the visitor has enabled `prefers-reduced-motion: reduce`, THE Landing_Page SHALL perform the Reveal without a fade animation.

### Requirement 3: Intro always plays

**User Story:** As a visitor, I want the intro to play every time I open the page, so that I always see the full experience.

#### Acceptance Criteria

1. WHEN the Landing_Page loads, THE Intro_Module SHALL start the intro regardless of any earlier visit.
2. THE Intro_Module SHALL store no data in `localStorage`, `sessionStorage`, cookies or the URL.

### Requirement 4: Module and dead code removal

**User Story:** As a maintainer, I want the intro logic in a module and the dead code removed, so that the page is small and easy to maintain.

#### Acceptance Criteria

1. THE Landing_Page SHALL load the Intro_Module with `<script type="module" src="assets/js/landing.js">`.
2. THE Landing_Page SHALL contain no inline `<script>` elements.
3. THE Landing_Page SHALL contain no scroll-driven image expansion script and no magnetic-button script.
4. THE Landing_Page SHALL contain no `#videoClickLayer` element and THE Landing_Page stylesheet SHALL contain no `.video-click-layer` rule.
5. THE Landing_Page stylesheet SHALL contain no rules that only serve the removed scroll-expansion and magnetic-button scripts.
6. THE Intro_Module SHALL expose its Reveal and mute-toggle behavior through named functions.

### Requirement 5: Markup and style correctness

**User Story:** As a maintainer, I want the markup and styles to be correct and consistent, so that the page works when deployed under any path and meets the quality bar.

#### Acceptance Criteria

1. THE Intro_Video source SHALL use the relative path `assets/videos/hexhibit.mp4`.
2. THE Landing_Page SHALL contain exactly one `<title>` element with the text "Hexhibit".
3. THE Landing_Page SHALL link `assets/images/favicon.png` as its favicon with `<link rel="icon">`.
4. THE Landing_Page stylesheet SHALL contain a single `prefers-reduced-motion` block per scope, with no duplicated declarations.
5. WHEN the Mute_Button, the Skip_Button, the CTA_Link or the "How to Play" control receives keyboard focus, THE Landing_Page SHALL show a visible `:focus-visible` outline with at least WCAG AA contrast against its background.
6. THE CTA_Link SHALL carry `rel="noopener"` together with `target="_blank"`.
7. THE Mute_Button SHALL use the Antonio display font, uppercase text and 0.16em letter-spacing, and SHALL use existing color tokens.

### Requirement 6: Docs and tests

**User Story:** As a contributor, I want the documentation and tests to match the landing page, so that the project description stays accurate.

#### Acceptance Criteria

1. THE Structure_Doc SHALL list `index.html` as the landing page, `play.html` as the game page, and `assets/js/landing.js` and `assets/css/landing.css` in its layout.
2. THE README SHALL describe the landing page, the `play.html` game entry point and the intro-video mute control.
3. WHEN the feature is complete, THE Test_Suite SHALL contain no test that fails because it expects the game markup in `index.html` rather than `play.html`.
4. IF a test in the Test_Suite references `index.html` for game behavior, THEN THE Test_Suite SHALL be updated to reference `play.html`.
5. WHEN the feature is complete, THE Test_Suite SHALL pass with `node --test`.
6. THE Test_Suite SHALL include a check that `index.html` contains one `<title>`, no inline `<script>` and a relative video path.
