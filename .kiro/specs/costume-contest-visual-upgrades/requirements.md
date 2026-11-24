# Requirements Document

## Introduction

This feature elevates Hexhibit's visuals for the Kiroween Costume Contest. It adds optional local artwork images to exhibitions, with a silent fallback to the existing colors gradient, and it polishes the stylesheet: ceiling geometry, 44px tap targets, glass placards, a door-code unlock glow, and a pointer-tracked lantern spotlight in After-Hours Mode. The work touches `corridor.js`, `main.js`, `modal.js`, `content.js`, `style.css`, the exhibition schema, the default exhibition, the README and the tests.

## Glossary

- **Hexhibit**: The static, browser-only haunted museum escape room application.
- **Content_Loader**: The module `assets/js/content.js` that loads and validates exhibition JSON.
- **Validator**: The validation logic inside the Content_Loader.
- **Exhibition**: A JSON document describing lessons, artworks, puzzles and the door code.
- **Artwork**: A painting entry in an Exhibition.
- **Image_Path**: The optional `image` string field of an Artwork, naming a file under `assets/images/`.
- **Valid_Image_Path**: An Image_Path that starts with `assets/images/` and contains no `http:` or `https:` scheme, no leading `//`, no `..` segment, no leading `/`, and no backslash.
- **Gradient_Fallback**: The existing CSS gradient built from an Artwork's `colors` field.
- **Corridor**: The CSS 3D corridor module `assets/js/corridor.js` and its rendered DOM.
- **Art_Frame**: The `.art` element that displays an Artwork in the Corridor.
- **Inspect_Dialog**: The artwork inspection dialog in `assets/js/modal.js`.
- **Stylesheet**: `assets/css/style.css`.
- **Vignette**: The `.vig` overlay element that provides the dark-theme vignette and lantern spotlight.
- **Pointer_Position**: The pointer coordinates exposed to the Stylesheet as CSS custom properties `--mx` and `--my`.
- **Slot**: A door code cell `.slot` in `#slots`; `.slot.on` marks a solved digit.
- **Glass_Card**: The `.card` surface used for placards and dialogs.
- **Tap_Target**: An interactive control: `.pill`, `.btn.ghost`, or a `button` inside `.card`.
- **After_Hours_Mode**: The dark theme, `data-theme="dark"`.
- **Reduced_Motion_Preference**: The user setting matched by `prefers-reduced-motion: reduce`.
- **Schema**: `content/exhibition.schema.json`.
- **Default_Exhibition**: `content/default-exhibition.json`.

## Requirements

### Requirement 1: Optional local artwork image field

**User Story:** As a teacher, I want to attach a local image to an artwork, so that my exhibition looks like a real gallery.

#### Acceptance Criteria

1. THE Schema SHALL define an optional `image` string property on each Artwork.
2. WHEN an Artwork omits the `image` field, THE Content_Loader SHALL accept the Artwork.
3. WHEN an Artwork contains an Image_Path that is a Valid_Image_Path, THE Validator SHALL accept the Artwork.
4. IF an Image_Path contains an `http://` or `https://` scheme, THEN THE Validator SHALL report a validation error naming the Artwork and the `image` field.
5. IF an Image_Path begins with `//`, THEN THE Validator SHALL report a validation error naming the Artwork and the `image` field.
6. IF an Image_Path contains a `..` path segment, THEN THE Validator SHALL report a validation error naming the Artwork and the `image` field.
7. IF an Image_Path begins with `/`, THEN THE Validator SHALL report a validation error naming the Artwork and the `image` field.
8. IF an Image_Path contains a backslash, THEN THE Validator SHALL report a validation error naming the Artwork and the `image` field.
9. IF an Image_Path does not begin with `assets/images/`, THEN THE Validator SHALL report a validation error naming the Artwork and the `image` field.
10. IF an Image_Path is not a string, THEN THE Validator SHALL report a validation error naming the Artwork and the `image` field.
11. IF an Exhibition fails validation because of an Image_Path, THEN THE Content_Loader SHALL show the existing friendly error and load the Default_Exhibition.

### Requirement 2: Image display in corridor and inspect dialog

**User Story:** As a student, I want artworks to show their picture in the corridor and in the inspect dialog, so that I can study what I am looking at.

#### Acceptance Criteria

1. WHEN an Artwork has a Valid_Image_Path, THE Corridor SHALL render an `img` element with that path as its source inside the Art_Frame.
2. WHEN an Artwork has a Valid_Image_Path, THE Inspect_Dialog SHALL render an `img` element with that path as its source.
3. THE Corridor SHALL set an empty `alt` attribute on decorative Art_Frame images and give the Art_Frame its accessible name from the Artwork title.
4. THE Inspect_Dialog SHALL set the `alt` attribute of the artwork image to the Artwork title.
5. THE Stylesheet SHALL include an `.art img` rule that fills the Art_Frame with `object-fit: cover` and displays the image without distorting its aspect ratio.
6. WHEN an Artwork has no Image_Path, THE Corridor SHALL render the Gradient_Fallback in the Art_Frame.

### Requirement 3: Silent image failure fallback

**User Story:** As a student on a slow or offline connection, I want a missing image to degrade quietly, so that the game never breaks.

#### Acceptance Criteria

1. IF an artwork `img` element fires an `error` event, THEN THE Corridor SHALL remove that `img` element and display the Gradient_Fallback in the Art_Frame.
2. IF an artwork `img` element fires an `error` event, THEN THE Inspect_Dialog SHALL remove that `img` element and display the Gradient_Fallback.
3. IF an artwork image fails to load, THEN THE Hexhibit SHALL continue play without showing an error message and without writing to the console error log.
4. WHILE an artwork image is loading, THE Art_Frame SHALL display the Gradient_Fallback behind the image.

### Requirement 4: Sample wiring and documentation

**User Story:** As a teacher, I want the sample exhibition and docs to show how images work, so that I can copy the pattern.

#### Acceptance Criteria

1. THE Default_Exhibition SHALL set a Valid_Image_Path on at least one Artwork that references an existing file under `assets/images/`.
2. THE Default_Exhibition SHALL pass validation by the Validator.
3. THE README SHALL document the optional `image` field, the `assets/images/` location requirement, the rejected path forms, and the Gradient_Fallback behavior.
4. THE README SHALL show an example Artwork entry that includes an `image` field.

### Requirement 5: Accessible tap targets

**User Story:** As a student on a phone, I want controls large enough to tap, so that I can play without mis-taps.

#### Acceptance Criteria

1. THE Stylesheet SHALL give each Tap_Target a `min-height` of 44px.
2. THE Stylesheet SHALL set no `margin-bottom` of 20px on `.pill`, `.btn.ghost`, or a `button` inside `.card`.
3. WHEN a Tap_Target is rendered at a viewport width of 390px, THE Hexhibit SHALL lay out the Tap_Target with no vertical offset caused by a bottom margin.

### Requirement 6: Ceiling geometry

**User Story:** As a visitor, I want the ceiling to look like part of the corridor, so that the 3D space feels convincing.

#### Acceptance Criteria

1. THE Stylesheet SHALL define `.ceiling` with a corrected `transform` and `height` so that the ceiling plane meets the left and right walls without a visible gap at 390px, 768px and 1440px viewport widths.
2. THE Stylesheet SHALL keep the existing perspective and `translateZ` structure of the Corridor.
3. THE Stylesheet SHALL document in a comment why the `.ceiling` transform and height values were chosen.

### Requirement 7: Glass placards

**User Story:** As a visitor, I want placards to look like etched glass, so that the corridor shows through the interface.

#### Acceptance Criteria

1. THE Stylesheet SHALL apply `backdrop-filter: blur(16px)` to the Glass_Card.
2. THE Stylesheet SHALL apply `-webkit-backdrop-filter: blur(16px)` to the Glass_Card.
3. THE Stylesheet SHALL give the Glass_Card a translucent background defined through theme tokens with values for both `data-theme="light"` and `data-theme="dark"`.
4. THE Stylesheet SHALL keep the Glass_Card text contrast at WCAG AA or higher in both themes.
5. THE Stylesheet SHALL keep the Glass_Card corner radius at 8px or less.
6. WHERE the browser lacks `backdrop-filter` support, THE Stylesheet SHALL provide a more opaque Glass_Card background so that text remains legible.

### Requirement 8: Door code unlock glow

**User Story:** As a student, I want a solved door code digit to light up, so that I feel the progress.

#### Acceptance Criteria

1. WHEN a Slot gains the `on` class, THE Stylesheet SHALL transition the Slot border, color and `box-shadow` glow using `--accent` and `--glow` over a duration between 300ms and 700ms.
2. WHILE a Slot lacks the `on` class, THE Stylesheet SHALL display the Slot with the muted locked appearance.
3. WHILE the Reduced_Motion_Preference is active, THE Stylesheet SHALL apply the `.slot.on` appearance without a transition.
4. THE Hexhibit SHALL convey the unlocked state of a Slot through the displayed digit and not through color alone.

### Requirement 9: Pointer-tracked lantern spotlight

**User Story:** As a visitor in After-Hours Mode, I want a lantern spotlight that follows my pointer, so that the dark room feels interactive.

#### Acceptance Criteria

1. WHILE After_Hours_Mode is active, WHEN the pointer moves over the page, THE Hexhibit SHALL update the Pointer_Position custom properties `--mx` and `--my` on the Vignette.
2. WHILE After_Hours_Mode is active, THE Stylesheet SHALL render the Vignette spotlight as a radial gradient centered at `--mx` and `--my`.
3. THE Stylesheet SHALL define default values for `--mx` and `--my` that center the spotlight when no pointer movement has occurred.
4. WHILE After_Hours_Mode is not active, THE Hexhibit SHALL stop updating `--mx` and `--my`.
5. THE Hexhibit SHALL throttle Pointer_Position updates to at most one update per animation frame.
6. WHILE the Reduced_Motion_Preference is active, THE Hexhibit SHALL keep the spotlight fixed at its default position and apply no pointer-driven updates.
7. THE Vignette SHALL ignore pointer events so that paintings and controls remain clickable.
8. WHEN a touch pointer is used, THE Hexhibit SHALL keep the spotlight at its default position.

### Requirement 10: Automated tests

**User Story:** As a maintainer, I want automated tests for the new behavior, so that regressions are caught.

#### Acceptance Criteria

1. THE test suite SHALL include tests that the Validator accepts a Valid_Image_Path and an Artwork without an `image` field.
2. THE test suite SHALL include tests that the Validator rejects each rejected path form: `http://`, `https://`, `//`, `..`, leading `/`, backslash, a path outside `assets/images/`, and a non-string value.
3. THE test suite SHALL include a test that the Default_Exhibition passes validation and that every Image_Path in it refers to an existing file.
4. THE test suite SHALL include a test that the Stylesheet contains `min-height: 44px` for each Tap_Target and no `margin-bottom: 20px` on those selectors.
5. THE test suite SHALL include a test that the Stylesheet contains `backdrop-filter` and `-webkit-backdrop-filter` with `blur(16px)` for the Glass_Card.
6. THE test suite SHALL include a test that the Stylesheet contains a `prefers-reduced-motion` block covering `.slot.on` and the Vignette.
7. THE test suite SHALL include a test that the Schema declares the `image` property.
