# Requirements Document

## Introduction

This spec gives Daylight Mode and After-Hours Mode separate visual architectures and keeps the player in After-Hours Mode across a page reload.

Today both modes share one 3D corridor in `play.html` (`.viewport` > `#world`), re-themed by `data-theme`. After this spec:

- **Daylight Mode** (`data-theme="light"`, phase `gallery`) is a dedicated `#daylight-gallery` view: an isometric corner gallery with a floor, two walls, wall sconces, spotlights, and framed paintings built from the Exhibition.
- **After-Hours Mode** (`data-theme="dark"`, phases `escape`, `solved`, `escaped`) shows the first-person 3D corridor in a `#stage` element, lit by a pointer-tracked flashlight beam. The camera always starts at the entrance.
- **Session Lock-In** stores the in-progress After-Hours game in `sessionStorage` so a reload does not release the player from After-Hours Mode.
- **Artwork images** are introduced here: an Artwork can carry an optional public-domain image, shown in the gallery, the plaque, and the corridor, with the generated gradient as the fallback.
- **Direct After-Hours entry** lets a judge open `play.html?mode=afterhours` and start in After-Hours Mode without the confirmation dialog.

### Findings from the existing code

- `.vig` already has a dark-theme radial gradient that reads `--mx` and `--my`, but no JavaScript sets them, so the beam is always centered today.
- `assets/js/state.js` is pure (no `document`, `window`, or storage access) and holds `phase`, `viewed`, `solved`, `hints`, `currentIndex`, and `doorCode`. The Game_State field `hints` is the "hintsUsed" set in this spec.
- The Door_Code is never stored today (`.kiro/specs/per-game-door-code`, Assumption C, and `.kiro/steering/tech.md`). Requirement 11 deliberately overrides that rule for `sessionStorage` only.
- The corridor is built by `buildCorridor` in `assets/js/corridor.js`. Its camera distance starts at 0 and is not reset when the phase changes. Its yaw starts at 0 but follows the mouse.
- The Daylight Mode currently reuses the corridor. The "Enter escape room →" control is the `#theme` button in the top bar, and it already opens a one-way confirmation dialog.
- Image support does not exist yet. `assets/js/content.js`, `content/exhibition.schema.json`, and `content/default-exhibition.json` have no image field, and `artGradient` in `assets/js/corridor.js` is the only artwork renderer. This spec introduces the image fields and the image-then-gradient fallback (Requirements 2 and 12).
- In `assets/js/main.js`, `check()` calls `submitCode` and, on a `correct` result, sets `busy`, walks to the door, and schedules `showEscaped` after about 4.2 seconds (`ESCAPE_DIALOG_DELAY`). Clearing the Saved_Game when the dialog appears would leave a window of several seconds in which a reload restores the finished game. The clear must therefore run immediately after the `correct` result, before the door-swing delay (Requirements 11.7 and 11.17).
- `play.html` reads only the `exhibition` query parameter today. There is no way to start in After-Hours Mode without the Confirmation_Dialog, which slows the demo for judges (Requirements 4.10 to 4.15).
- UI strings are partly hard-coded in `main.js` (for example the `#theme` button labels). New UI strings in this spec go in the Exhibition JSON (Requirement 12).

### Assumptions

- A. (Decided) The Game_State module stays pure. A new module `assets/js/session.js` owns all `sessionStorage` access, and `main.js` calls it on state transitions.
- B. (Decided) Only the fields named by the user are persisted (`doorCode`, `solved`, `hintsUsed`), plus the minimum needed to validate them: a format version, the `phase`, and the ordered list of artwork ids. `phase` is needed to tell `escape` from `solved`. It can be derived from `solved` and the artwork ids, so the design may drop it.
- C. (Decided) A saved game is restored only if its artwork id list equals the loaded Exhibition's artwork id list and every field passes validation. Otherwise the saved game is discarded and the player starts in the gallery.
- D. (Decided) "Game ends" means the phase becomes `escaped` (the door code was accepted). "Restart" means `returnToGallery`. Both clear the saved game.
- E. (Decided) The geometry in the user request (`perspective: 47em`, base floor `rotateX(90deg) rotateZ(-10deg)`) is taken as the starting design for the isometric view. The design phase may adjust angles to make paintings readable, but must keep a floor plane, a left wall, and a right wall in one `preserve-3d` scene.
- F. (Decided) The Daylight Gallery uses one frame per Artwork, so 3 to 6 frames. Frame placement is computed from the Artwork count and split between `.leftside` and `.rightside` (even index left, odd index right, as in the corridor).
- G. (Decided) New UI strings go in an optional `ui` object of the Exhibition (Requirement 12). The loader falls back to the Default_Exhibition strings for missing keys, so existing exhibition files stay valid.
- H. (Decided) The flashlight beam is a visual aid only. All content stays in the DOM and reachable by keyboard and screen reader, whether or not the beam is over it (Requirement 8).
- I. The roadmap in `product.md` lists "Save-and-resume" with `localStorage` as planned. This spec does not implement that feature. It adds a narrower `sessionStorage` lock-in. `product.md` and `tech.md` need a short note so both are consistent (Requirement 16).
- J. (Decided) Artwork images are introduced by this spec. Each Artwork gets optional `image` (day image path under `assets/images/art/`), optional `hauntedImage` (night variant, same path rules, allowed only when `image` is present), optional `alt` (text alternative), and `credit` (required whenever an image is present). `colors` stays required, so every existing Exhibition stays valid. This spec adds no image files, so the Default_Exhibition keeps rendering gradients until images are supplied.
- K. (Decided) `lesson` remains the field key in `content/exhibition.schema.json` and `content/default-exhibition.json`. The UI shows it as the plaque's explanatory text. Prose in this spec says "exhibition" or "plaque text" and uses `lesson` only for the field key.
- L. (Decided) `?mode=afterhours` is the only way to enter After_Hours_Mode without the Confirmation_Dialog, because the explicit URL is the player's consent. The "Enter Hexhibit" link on `index.html` keeps pointing to `play.html` (Daylight_Mode). The link `play.html?mode=afterhours` is a demo link for judges and is documented in `README.md` (Requirement 15.6).
- M. (Decided) The Saved_Game is removed in the same synchronous step that sets the Phase to `escaped`, not when the escaped dialog appears. A reload after that step starts in Daylight_Mode, so the Phase `escaped` is never restorable.

## Glossary

- **Hexhibit**: The browser application served from `play.html`.
- **Exhibition**: The JSON document that holds the title, messages, artworks, and puzzles for one exhibition. `content/default-exhibition.json` is the Default_Exhibition.
- **Exhibition_Loader**: The module `assets/js/content.js`, which fetches and validates an Exhibition.
- **Artwork**: One entry in the Exhibition's `artworks` array, with an id, plaque fields, `colors`, one Puzzle, and (introduced by this spec) the optional fields `image`, `hauntedImage`, `alt`, and `credit`.
- **Game_State**: The single `state` object created by `createState` in `assets/js/state.js`.
- **Phase**: The Game_State `phase`: `gallery`, `escape`, `solved`, or `escaped`.
- **Daylight_Mode**: The mode shown while the Phase is `gallery`, with `data-theme="light"` on `<html>`.
- **After_Hours_Mode**: The mode shown while the Phase is `escape`, `solved`, or `escaped`, with `data-theme="dark"` on `<html>`.
- **Daylight_Gallery**: The element `#daylight-gallery`, the isometric corner gallery view of Daylight_Mode.
- **Gallery_Scene**: The `preserve-3d` container inside the Daylight_Gallery that holds the floor, walls, and frames.
- **Base_Floor**: The `.base` floor plane of the Gallery_Scene, rotated with `rotateX(90deg) rotateZ(-10deg)`.
- **Left_Wall**: The `.leftside` wall of the Gallery_Scene.
- **Right_Wall**: The `.rightside` wall of the Gallery_Scene.
- **Sconce**: A `.walllight` wall lamp element in the Gallery_Scene.
- **Spotlight**: A radial gradient of light around one framed painting in the Daylight_Gallery.
- **Ground_Reflection**: A `.ground` element that shows a faint reflection of the lit area on the Base_Floor.
- **Frame**: The framed painting element in the Daylight_Gallery for one Artwork. It is a button.
- **Plaque_Modal**: The inspection dialog opened by `pick(i)` in Daylight_Mode. It shows the Artwork image (or gradient), title, artist, year, medium, size, wall, the plaque's explanatory text, the curator note, and the credit. The explanatory text comes from the `lesson` field, which remains the field key in `exhibition.schema.json` and `default-exhibition.json`.
- **Artwork_Image**: The day image of an Artwork, from its `image` field, a same-site relative path under `assets/images/art/`.
- **Haunted_Image**: The optional night variant of an Artwork_Image, from the `hauntedImage` field.
- **Image_Fallback**: The rule that an image is drawn when it is present and loads, and otherwise the Artwork's `colors` are drawn through `artGradient`.
- **Mode_Parameter**: The `mode` query parameter of `play.html`. The value `afterhours` requests Direct_Entry.
- **Direct_Entry**: Starting in After_Hours_Mode from `play.html?mode=afterhours` without the Confirmation_Dialog.
- **Viewed_Set**: The Game_State `viewed` set of Artwork ids that the player has inspected.
- **Escape_CTA**: The control in the Daylight_Gallery with the label "Enter After-Hours Escape →" that starts the transition to After_Hours_Mode.
- **Confirmation_Dialog**: The existing one-way dialog titled "Enter the escape room?" with the buttons "Step inside" and "Stay in the gallery".
- **Stage**: The element `#stage`, the container of the first-person 3D corridor (`.viewport` and `#world`) in After_Hours_Mode.
- **Corridor**: The 3D corridor built by `buildCorridor` in `assets/js/corridor.js`.
- **Camera**: The Corridor's camera, described by walked distance `z` (0 at the entrance) and yaw (0 facing straight down the hall).
- **Entrance_Pose**: The Camera pose `z = 0` and `yaw = 0` (and pitch 0), with no pending walk and no painting turn applied.
- **Flashlight**: The pointer-tracked radial beam drawn by the `.vig` element in After_Hours_Mode.
- **Beam_Position**: The pair of CSS custom properties `--mx` and `--my` on the `.vig` element, in CSS pixels or percent, that place the Flashlight center.
- **Haunted_Painting**: An Artwork frame in the Corridor during After_Hours_Mode.
- **Exit_Door**: The locked door (`#door`) on the back wall at the end of the Corridor.
- **Door_Code**: The per-game random digit string held in the Game_State.
- **Session_Store**: The new module `assets/js/session.js` that reads and writes the saved game in `sessionStorage`.
- **Saved_Game**: The JSON record written by the Session_Store, holding `doorCode`, `solved`, `hintsUsed`, and the validation fields in Assumption B.
- **Storage_Key**: The single `sessionStorage` key used for the Saved_Game, `hexhibit.session.v1`.
- **Reduced_Motion**: The state where `(prefers-reduced-motion: reduce)` matches.
- **Base_Width** and **Base_Height**: The CSS custom properties `--base-width` and `--base-height` that size the Gallery_Scene.
- **UI_Strings**: The user-facing text defined in the Exhibition `messages` and `ui` objects.

## Requirements

### Requirement 1: Daylight Gallery view structure

**User Story:** As a visitor, I want Daylight Mode to look like a bright corner gallery, so that studying the artworks feels like visiting a museum.

#### Acceptance Criteria

1. WHILE the Phase is `gallery`, THE Hexhibit SHALL show the Daylight_Gallery and hide the Stage.
2. THE Daylight_Gallery SHALL contain one Gallery_Scene with a `perspective` of `47em`.
3. THE Gallery_Scene SHALL contain the Base_Floor, the Left_Wall, and the Right_Wall in one `preserve-3d` context.
4. THE Base_Floor SHALL use the transform `rotateX(90deg) rotateZ(-10deg)`.
5. THE Gallery_Scene SHALL contain at least one Sconce on each of the Left_Wall and the Right_Wall.
6. THE Gallery_Scene SHALL contain one Ground_Reflection on the Base_Floor.
7. THE Daylight_Gallery SHALL build the Gallery_Scene using CSS 3D transforms only, without WebGL, canvas, or a third-party library.
8. WHERE the page is loaded in Daylight_Mode, THE Hexhibit SHALL set `data-theme="light"` on `<html>` before the first paint of the Daylight_Gallery.

### Requirement 2: Dynamic artwork rendering in the gallery

**User Story:** As a visitor, I want every artwork of the exhibition to hang in the gallery, so that I can study the full exhibition.

#### Acceptance Criteria

1. WHEN the Exhibition is loaded, THE Daylight_Gallery SHALL render exactly one Frame for each Artwork, in Exhibition order.
2. THE Daylight_Gallery SHALL place the Frame of each even-indexed Artwork on the Left_Wall and the Frame of each odd-indexed Artwork on the Right_Wall.
3. THE Daylight_Gallery SHALL render each Frame's image when present, falling back to the Artwork's colors via `artGradient` when the image is absent or fails to load.
4. THE Daylight_Gallery SHALL show the Artwork `title` as the caption of each Frame.
5. THE Daylight_Gallery SHALL draw one Spotlight around each Frame.
6. WHEN a different Exhibition replaces the loaded one (the `?exhibition=` fallback path), THE Daylight_Gallery SHALL remove the previous Frames before rendering the new Frames, so that no Frame is duplicated.
7. THE Daylight_Gallery SHALL derive Frame content from the Exhibition data and SHALL NOT hard-code any Artwork title, artist, or plaque text in HTML, CSS, or JavaScript.
8. FOR ALL Exhibitions that pass validation (3 to 6 Artworks), THE number of Frames in the Daylight_Gallery SHALL equal the number of Artworks in the Exhibition.
9. WHEN an Artwork_Image fails to load, THE Hexhibit SHALL replace the broken image with the `artGradient` fill of that Artwork's `colors` through the image `onerror` handler and SHALL NOT log a console error.
10. THE Plaque_Modal SHALL render the Artwork_Image with the Image_Fallback, using the `alt` text of the Artwork (or the Artwork `title` when `alt` is absent) as the accessible name, and SHALL show the `credit` text when the Artwork has an image.
11. WHILE the Phase is `escape`, `solved`, or `escaped`, THE Hexhibit SHALL render each Haunted_Painting with the Image_Fallback, using the Haunted_Image when present, otherwise the Artwork_Image, otherwise the `artGradient` fill, and SHALL fall back through the same chain when an image fails to load, without a console error.
12. THE Hexhibit SHALL use the same image-then-gradient fallback function for the Daylight_Gallery, the Plaque_Modal, and the Haunted_Paintings, so that the three views cannot disagree about which fill an Artwork has.
13. WHERE an Artwork has no `image`, THE Hexhibit SHALL render that Artwork exactly as it does today, from `colors` alone.

### Requirement 3: Inspecting a painting in Daylight Mode

**User Story:** As a visitor, I want to click a painting to read its plaque, so that I learn the details I will need later.

#### Acceptance Criteria

1. WHEN the player activates a Frame by click, tap, Enter, or Space, THE Hexhibit SHALL open the Plaque_Modal for that Artwork.
2. WHEN the Plaque_Modal opens for an Artwork in Daylight_Mode, THE Game_State SHALL add that Artwork's id to the Viewed_Set.
3. WHEN the Viewed_Set changes, THE Hexhibit SHALL update the progress text to `{viewed}/{total} artworks viewed` and SHALL mark that Frame as viewed with a text or icon cue.
4. WHEN the Plaque_Modal closes, THE Hexhibit SHALL return keyboard focus to the Frame that opened it.
5. WHEN the player activates a Frame that is already in the Viewed_Set, THE Hexhibit SHALL open the Plaque_Modal and leave the Viewed_Set unchanged.
6. THE Plaque_Modal SHALL trap focus, close on Escape, and announce feedback through an element with `role="status"`, as it does today.
7. THE Hexhibit SHALL mark a viewed Frame with a text label or shape, in addition to any color change.

### Requirement 4: Escape CTA and one-way confirmation

**User Story:** As a player, I want a clear way to start the escape room, so that I know when I am ready to be tested.

#### Acceptance Criteria

1. WHILE the Phase is `gallery`, THE Daylight_Gallery SHALL show the Escape_CTA with the label "Enter After-Hours Escape →", taken from the Exhibition `ui` strings.
2. THE Escape_CTA SHALL be visually the most prominent control in the Daylight_Gallery, rendered as a filled primary button.
3. THE Escape_CTA SHALL have a hit area of at least 44px by 44px.
4. WHEN the player activates the Escape_CTA, THE Hexhibit SHALL open the Confirmation_Dialog and SHALL NOT change the Phase.
5. WHEN the player chooses "Step inside" in the Confirmation_Dialog, THE Game_State SHALL generate the Door_Code and change the Phase from `gallery` to `escape`.
6. WHEN the player chooses "Stay in the gallery" or presses Escape in the Confirmation_Dialog, THE Hexhibit SHALL close the dialog and keep the Phase `gallery`.
7. IF the Door_Code cannot be generated, THEN THE Hexhibit SHALL keep the Phase `gallery` and SHALL show the lock-failed message in the dialog status area.
8. WHILE the Phase is `escape`, `solved`, or `escaped`, THE Hexhibit SHALL NOT offer a control that returns the player to Daylight_Mode, except the "Return to the gallery" action available when the Phase is `escaped`. A reload after the correct Door_Code is accepted starts in Daylight_Mode (Requirement 11.17), so no "Return to the gallery" action exists after such a reload because no `escaped` Phase exists to return from.
9. THE Escape_CTA SHALL be reachable by keyboard, with a visible focus indicator.
10. WHEN `play.html` loads with the Mode_Parameter `?mode=afterhours` and no valid Saved_Game exists for the loaded Exhibition, THE Hexhibit SHALL generate the Door_Code, set the Phase to `escape`, enter After_Hours_Mode at the Entrance_Pose, and write the Saved_Game, without showing the Confirmation_Dialog.
11. THE Hexhibit SHALL treat Direct_Entry as the only exception to the confirmation rule of Criterion 4.4, because the explicit URL is the player's consent.
12. WHEN `play.html` loads with `?mode=afterhours` and a valid Saved_Game exists for the loaded Exhibition, THE Hexhibit SHALL restore the Saved_Game (Requirement 11.3) and SHALL NOT generate a new Door_Code.
13. IF the Mode_Parameter has a value other than `afterhours`, THEN THE Hexhibit SHALL ignore the parameter and start in Daylight_Mode.
14. WHERE `?mode=afterhours` is combined with `?exhibition=<path>`, THE Hexhibit SHALL apply Direct_Entry to the Exhibition that the loader returns for that path, including the Default_Exhibition when the path is unsafe or the Exhibition is invalid.
15. WHEN Direct_Entry or a Saved_Game restore has entered After_Hours_Mode, THE Hexhibit SHALL remove the `mode` parameter from the address bar with `history.replaceState` inside try/catch, keeping the other query parameters, so that a reload after the escape starts in Daylight_Mode, and SHALL NOT place the Door_Code in the URL.
16. IF Direct_Entry cannot generate the Door_Code, THEN THE Hexhibit SHALL start in Daylight_Mode and SHALL show the lock-failed message.
17. THE `index.html` "Enter Hexhibit" link SHALL continue to point to `play.html`, which opens in Daylight_Mode.

### Requirement 5: Responsive scaling of the gallery

**User Story:** As a player on a phone, tablet, or Chromebook, I want the gallery to fit my screen, so that I can see and tap every painting.

#### Acceptance Criteria

1. THE Gallery_Scene SHALL size itself from Base_Width and Base_Height, and every Frame, wall, and floor dimension SHALL be derived from those two properties.
2. WHEN the viewport width or height changes, THE Hexhibit SHALL recompute Base_Width and Base_Height so that the whole Gallery_Scene stays inside the viewport without horizontal scrolling.
3. WHILE the viewport is 390px wide in portrait, THE Daylight_Gallery SHALL show all Frames and the Escape_CTA without horizontal scrolling and with a Frame tap target of at least 44px by 44px.
4. WHILE the viewport is 768px wide, THE Daylight_Gallery SHALL show all Frames and the Escape_CTA without horizontal scrolling.
5. WHILE the viewport is 1440px wide, THE Daylight_Gallery SHALL show all Frames and the Escape_CTA without horizontal scrolling.
6. FOR ALL viewport sizes from 360px by 640px to 1920px by 1080px, THE computed Base_Width SHALL be at most the viewport width and THE computed Base_Height SHALL be at most the viewport height minus the height of the top bar.
7. THE Hexhibit SHALL compute Base_Width and Base_Height in a pure function that takes the viewport size and the top bar height and returns both values, so that a Node test can verify requirement 5.6.

### Requirement 6: Daylight lighting and surface quality

**User Story:** As a judge or visitor, I want the gallery to look polished and stay readable, so that the first impression is strong and the content is legible.

#### Acceptance Criteria

1. THE Daylight_Gallery SHALL use only the existing design tokens and the fonts Antonio and Inter, and SHALL NOT use emoji.
2. THE text on the Daylight_Gallery (captions, progress text, the Escape_CTA label) SHALL have a contrast ratio of at least 4.5:1 against its background, including the area lit by a Spotlight.
3. THE Spotlight SHALL NOT reduce the contrast of any Frame caption below 4.5:1.
4. WHILE Reduced_Motion is active, THE Daylight_Gallery SHALL show no animated light flicker or transition.
5. THE Daylight_Gallery SHALL render the Sconces, Spotlights, and Ground_Reflection with CSS only (gradients, shadows, and opacity) and without `backdrop-filter` on any element that covers the full Gallery_Scene.
6. IF the browser lacks support for the 3D transforms used by the Gallery_Scene, THEN THE Daylight_Gallery SHALL show the Frames in a flat, keyboard-reachable list so that every Artwork can still be inspected.

### Requirement 7: After-Hours Stage and camera reset

**User Story:** As a player, I want the escape room to start at the entrance of the hall every time, so that the experience is predictable.

#### Acceptance Criteria

1. WHILE the Phase is `escape`, `solved`, or `escaped`, THE Hexhibit SHALL show the Stage and hide the Daylight_Gallery.
2. WHEN the Hexhibit enters After_Hours_Mode, THE Corridor SHALL set the Camera to the Entrance_Pose before the first After_Hours_Mode frame is painted.
3. WHEN the Hexhibit restores a Saved_Game on page load, THE Corridor SHALL set the Camera to the Entrance_Pose.
4. WHEN the Phase changes from `escaped` to `gallery`, THE Corridor SHALL set the Camera to the Entrance_Pose instantly and without easing.
5. THE Hexhibit SHALL hide the Daylight_Gallery from assistive technology (using `hidden` or `inert`) while the Phase is not `gallery`, and SHALL hide the Stage from assistive technology while the Phase is `gallery`.
6. WHILE the Phase is `gallery`, THE Hexhibit SHALL NOT make any Haunted_Painting or the Exit_Door focusable.
7. WHILE Reduced_Motion is active, THE Corridor SHALL set the Camera to the Entrance_Pose with no camera easing.
8. WHEN the Hexhibit enters After_Hours_Mode, THE Hexhibit SHALL show the Haunted_Paintings in Exhibition order, one per Artwork, with the first Haunted_Painting nearest the Entrance_Pose.
9. FOR ALL sequences of Camera movements followed by a request to enter or restore After_Hours_Mode, THE Camera after entry SHALL equal the Entrance_Pose.
10. WHEN the Hexhibit enters After_Hours_Mode through Direct_Entry (Requirement 4.10), THE Corridor SHALL set the Camera to the Entrance_Pose, as for every other entry into After_Hours_Mode.

### Requirement 8: Pointer-tracked flashlight

**User Story:** As a player, I want to sweep a flashlight along the dark walls, so that finding paintings and the exit feels tense and physical.

#### Acceptance Criteria

1. WHILE the Phase is `escape`, `solved`, or `escaped`, THE `.vig` element SHALL draw the Flashlight as a radial gradient centered on Beam_Position, with the area outside the beam darkened.
2. WHEN the pointer moves over the page (mouse, pen, or touch via `pointermove`), THE Hexhibit SHALL set Beam_Position to the pointer's client position within one animation frame.
3. WHEN the pointer is pressed or dragged on a touch screen, THE Flashlight SHALL follow the touch point.
4. WHILE no pointer position is known, or Reduced_Motion is active, THE Flashlight SHALL stay centered at `--mx: 50%` and `--my: 50%`.
5. WHILE the Phase is `gallery`, THE Hexhibit SHALL NOT darken the page and SHALL NOT update Beam_Position.
6. THE `.vig` element SHALL NOT intercept pointer events, so that Haunted_Paintings, the Exit_Door, and dialogs stay clickable.
7. WHEN a Haunted_Painting or the Exit_Door receives keyboard focus, THE Flashlight SHALL center on that element's bounding box, so that a keyboard-only player sees the focused element lit.
8. WHILE a dialog is open, THE Hexhibit SHALL NOT darken the dialog, so that dialog text keeps a contrast ratio of at least 4.5:1.
9. THE Hexhibit SHALL update Beam_Position at most once per animation frame, so that pointer tracking stays smooth on a school Chromebook.
10. THE Flashlight SHALL leave the outer region dark enough that unlit walls read as dark, while every Haunted_Painting caption keeps a text alternative in the DOM (see Requirement 9).

### Requirement 9: Flashlight is not the only way to reach content

**User Story:** As a player who uses a keyboard, a screen reader, or cannot see the dim light well, I want to reach every painting and the exit without the flashlight, so that I can finish the game.

#### Acceptance Criteria

1. THE Hexhibit SHALL make every Haunted_Painting and the Exit_Door operable by keyboard (Tab, Enter, and Space) in After_Hours_Mode, without any pointer input.
2. THE Hexhibit SHALL expose an accessible name for every Haunted_Painting (painting number, count, and title) and for the Exit_Door (including its locked or unlocked state as text), independent of the Flashlight position.
3. WHEN the player presses the existing Back or Next controls, or W, S, ArrowUp, or ArrowDown, THE Camera SHALL move between stops without needing the Flashlight.
4. THE Hexhibit SHALL show, on every Haunted_Painting that is solved, a text or shape marker (for example "SOLVED") in addition to any glow.
5. THE Hexhibit SHALL show the Exit_Door state with the text labels "LOCKED" and "UNLOCKED" in addition to any glow or color.
6. WHEN After_Hours_Mode starts, THE Hexhibit SHALL show a short hint in the hint bar that describes both the pointer and the keyboard ways to find paintings, taken from the Exhibition `ui` strings.
7. THE Hexhibit SHALL keep a visible focus ring, with a contrast ratio of at least 3:1 against the dark background, on every focusable element in After_Hours_Mode.
8. FOR ALL Beam_Position values, THE set of focusable elements and their accessible names SHALL be the same.
9. THE Hexhibit SHALL NOT use the Flashlight, light, or color alone to indicate a clue, puzzle state, or door state.

### Requirement 10: Puzzles and the locked exit door in the dark

**User Story:** As a player, I want to solve each painting's puzzle and find the exit at the end of the hall, so that I can escape.

#### Acceptance Criteria

1. WHEN the player activates a Haunted_Painting in After_Hours_Mode, THE Hexhibit SHALL open that Artwork's puzzle dialog through the registered puzzle handler for its `type`.
2. WHEN a puzzle is solved, THE Game_State SHALL add the Artwork id to the `solved` set and THE Hexhibit SHALL reveal that Artwork's door-code digit in the door code slots.
3. WHEN a puzzle answer is wrong, THE Hexhibit SHALL show the Artwork's `nudge` text in the `role="status"` area.
4. WHEN the player presses Hint, THE Game_State SHALL add the Artwork id to the `hints` set and THE Hexhibit SHALL show the Artwork's `hint` text.
5. THE Exit_Door SHALL be placed at the far end of the Corridor, beyond the last Haunted_Painting.
6. WHILE the Phase is `escape`, THE Exit_Door SHALL show the label "LOCKED" and the Hexhibit SHALL answer an exit-door activation with the "solve every puzzle first" message.
7. WHEN every Artwork is solved, THE Game_State SHALL change the Phase to `solved`.
8. WHEN the player submits the correct Door_Code while the Phase is `solved`, THE Game_State SHALL change the Phase to `escaped` and THE Hexhibit SHALL open the Exit_Door and show the escaped dialog.
9. THE Hexhibit SHALL NOT change the puzzle types, puzzle handlers, or the Corridor geometry computed by `computeLayout` as part of this spec.

### Requirement 11: Session Lock-In

**User Story:** As a player, I want a page reload to keep me in the escape room, so that I cannot lose the game by accident and cannot reset the escape by refreshing.

#### Acceptance Criteria

1. WHEN the Phase changes from `gallery` to `escape`, THE Session_Store SHALL write the Saved_Game, with `doorCode`, `solved`, and `hintsUsed`, to `sessionStorage` under the Storage_Key.
2. WHEN a puzzle is solved or a hint is revealed, THE Session_Store SHALL update the Saved_Game before the next user action is handled.
3. WHEN the page loads and a valid Saved_Game exists for the loaded Exhibition, THE Hexhibit SHALL restore the Game_State from it (Phase, `doorCode`, `solved`, and `hints`) and SHALL start in After_Hours_Mode with the restored door-code slots and progress text, whether or not the Mode_Parameter is present (Requirement 4.12).
4. WHEN a Saved_Game restores a Phase of `solved`, THE Game_State SHALL accept the restored Door_Code at the Exit_Door.
5. THE Hexhibit SHALL derive the restored Phase from `solved` and the artwork ids (`solved` when every Artwork is solved, otherwise `escape`), so that a restored game cannot start in `gallery` or `escaped`. The Phase `escaped` is not restorable, because the Saved_Game is already removed when that Phase is set (Criterion 11.7).
6. THE Hexhibit SHALL store the Saved_Game in `sessionStorage` and SHALL NOT use `localStorage`, cookies, the URL, or the DOM (including attributes) for the Door_Code.
7. WHEN `submitCode` returns `correct` and the Phase changes to `escaped`, THE Hexhibit SHALL remove the Saved_Game through the Session_Store synchronously, in the same handler step that sets the Phase and before the door-swing delay, the busy state, and the opening of the escaped dialog begin.
8. WHEN `returnToGallery` runs (the player starts over), THE Session_Store SHALL remove the Saved_Game.
9. WHILE a valid Saved_Game exists, THE Hexhibit SHALL keep the player in After_Hours_Mode and SHALL NOT show the Escape_CTA or a control that opens the Daylight_Gallery. Because the Saved_Game is removed when the correct code is accepted (Criterion 11.7), this criterion does not apply to the `escaped` Phase, where "Return to the gallery" stays available (Requirement 4.8).
10. WHEN the player closes the tab or window, THE Saved_Game SHALL end with the `sessionStorage` session, so that the next visit starts in Daylight_Mode.
11. IF `sessionStorage` is unavailable (access throws, or a write throws, including when the quota is exceeded), THEN THE Session_Store SHALL catch the error, THE Hexhibit SHALL continue the game in memory, and THE Hexhibit SHALL NOT log a console error.
12. IF the Saved_Game is missing, is not valid JSON, has an unknown version, has an artwork id list that differs from the loaded Exhibition, has a `doorCode` that is not a digit string of the Artwork count, or has `solved` or `hintsUsed` entries that are not Artwork ids, THEN THE Session_Store SHALL discard the Saved_Game, remove the Storage_Key, and THE Hexhibit SHALL start in Daylight_Mode.
13. THE Session_Store SHALL provide a serializer and a parser for the Saved_Game, and FOR ALL valid Game_State values in the phases `escape` and `solved`, parsing the serialized Saved_Game SHALL produce a Game_State with equal `doorCode`, `solved`, and `hints`.
14. THE Session_Store SHALL accept a storage object as an argument (defaulting to `sessionStorage`), so that Node tests can use a fake storage and a throwing storage.
15. THE Saved_Game SHALL NOT contain personal data, and Hexhibit SHALL NOT add accounts, a backend, analytics, or tracking.
16. WHERE the Exhibition is loaded through `?exhibition=<path>`, THE Hexhibit SHALL apply Criteria 11.3 and 11.12 against that Exhibition's artwork id list.
17. WHEN a reload happens at any moment after the correct Door_Code is accepted, including during the door swing and while the escaped dialog is open before "Return to the gallery" is chosen, THE Hexhibit SHALL start in Daylight_Mode with no Saved_Game in `sessionStorage`.
18. WHEN Direct_Entry writes the Saved_Game (Requirement 4.10), THE Session_Store SHALL write it with the same fields, version, and Storage_Key as a Saved_Game written after the Confirmation_Dialog.

### Requirement 12: UI strings and exhibition schema

**User Story:** As an exhibition author, I want all interface text and artwork images in the exhibition file, so that I can adapt the exhibition without editing code.

#### Acceptance Criteria

1. THE Exhibition SHALL accept an optional `ui` object with string fields for: the Escape_CTA label, the After-Hours hint text (pointer and keyboard), the "solved" marker, the "viewed" marker, the locked and unlocked labels, and the gallery progress template.
2. WHEN a `ui` field is missing from an Exhibition, THE Exhibition_Loader SHALL use the value from the Default_Exhibition for that field.
3. IF a `ui` field is present and is not a string, THEN THE Exhibition_Loader SHALL reject the Exhibition with an error that names the field path, so that the existing fallback to the Default_Exhibition runs.
4. THE `content/default-exhibition.json` file SHALL define every `ui` field.
5. THE `content/exhibition.schema.json` file SHALL document the `ui` object and its fields.
6. THE Hexhibit SHALL read each UI string that this spec adds from the Exhibition `ui` object, and the new modules SHALL NOT contain a hard-coded UI string except a fallback used when the Default_Exhibition cannot be loaded.
7. FOR ALL Exhibitions that pass validation and have no `ui` object, THE Exhibition_Loader SHALL return an Exhibition whose `ui` equals the Default_Exhibition `ui`.
8. THE Exhibition_Loader SHALL continue to accept every Exhibition that was valid before this spec, including Exhibitions whose Artworks have only `colors` and no image fields.
9. THE Exhibition_Loader SHALL accept on each Artwork the optional string fields `image`, `hauntedImage`, `alt`, and `credit`, and THE Artwork field `colors` SHALL remain required.
10. IF an `image` or `hauntedImage` value is not a same-site relative path under `assets/images/art/` (for example it has a scheme or host, starts with `/` or `//`, contains `..`, a backslash, a query, or a fragment, or does not end in `.jpg`, `.jpeg`, `.png`, or `.webp`), THEN THE Exhibition_Loader SHALL reject the Exhibition with an error that names the field path, using the same unsafe-path rules as the `?exhibition=` parameter, so that the fallback to the Default_Exhibition runs.
11. IF an Artwork has `hauntedImage` but no `image`, THEN THE Exhibition_Loader SHALL reject the Exhibition with an error that names the field path.
12. IF an Artwork has `image` and has no `credit`, or `alt` or `credit` is present and is not a string, THEN THE Exhibition_Loader SHALL reject the Exhibition with an error that names the field path.
13. THE `content/exhibition.schema.json` file SHALL document `image`, `hauntedImage`, `alt`, and `credit`, including the path rule, and SHALL keep `colors` required.
14. FOR ALL Artworks with an `image` that passes validation, THE `image` path SHALL start with `assets/images/art/` and SHALL contain no `..` segment.

### Requirement 13: Accessibility and motion

**User Story:** As a player with accessibility needs, I want both modes to respect my settings, so that I can play comfortably.

#### Acceptance Criteria

1. THE Hexhibit SHALL be fully playable with the keyboard in both Daylight_Mode and After_Hours_Mode, from the Frames to the Exit_Door.
2. WHILE Reduced_Motion is active, THE Hexhibit SHALL disable light flicker, door swing animation, camera easing, and Flashlight pointer easing.
3. THE Hexhibit SHALL meet WCAG AA contrast (4.5:1 for text and 3:1 for focus rings and large text) in both themes for every element added by this spec.
4. WHEN the Phase changes between `gallery` and any After_Hours_Mode phase, THE Hexhibit SHALL announce the mode change in a `role="status"` element.
5. WHEN the page restores a Saved_Game, THE Hexhibit SHALL announce in a `role="status"` element that the escape room was resumed.
6. THE Hexhibit SHALL avoid harsh flashing: no element SHALL change luminance more than 3 times per second.
7. THE Hexhibit SHALL use no emoji in the UI of this spec, and SHALL use text labels or CSS and SVG icons.

### Requirement 14: Responsive behavior and performance

**User Story:** As a player on any device, I want both modes to work at my screen size, so that I can play on a phone, tablet, or laptop.

#### Acceptance Criteria

1. THE Hexhibit SHALL lay out the Daylight_Gallery, the Stage, the Flashlight, and the hint bar correctly at widths of 390px, 768px, and 1440px in both themes, without horizontal scrolling.
2. WHILE the viewport is in phone portrait, THE Hexhibit SHALL stack the top bar into two rows and hide the long hint text, as the design steering requires.
3. THE Hexhibit SHALL give every tap target added by this spec a size of at least 44px by 44px.
4. THE Hexhibit SHALL load with no console errors in both modes, including when `sessionStorage` is unavailable.
5. THE Hexhibit SHALL run with plain HTML, CSS, and ES modules, with no framework, no bundler, no build step, and no new runtime dependency.

### Requirement 15: Game state machine and module boundaries

**User Story:** As a maintainer, I want the new code to fit the existing state machine and module layout, so that the project stays easy to test and change.

#### Acceptance Criteria

1. THE Game_State SHALL keep the transitions `gallery → escape → solved → escaped → gallery`, and no other transition SHALL be added.
2. THE Game_State module (`assets/js/state.js`) SHALL remain free of `document`, `window`, and storage access, and SHALL stay importable in Node.
3. THE Hexhibit SHALL provide a pure function that restores a Game_State from a validated Saved_Game, and that function SHALL reject any input that would put the Game_State in the `gallery` or `escaped` Phase.
4. THE Hexhibit SHALL keep Daylight_Gallery code in its own module (for example `assets/js/gallery.js`), and SHALL keep Corridor code in `assets/js/corridor.js`, so that adding a puzzle type does not require editing either module.
5. THE Hexhibit SHALL keep the pure parts (Saved_Game serializer and parser, Base_Width and Base_Height calculation, Frame placement) importable in Node without touching the DOM at import time.
6. THE Hexhibit SHALL update `README.md` to describe the two visual architectures, the flashlight and its keyboard alternative, the session lock-in, the optional artwork image fields with their credit rule, and the judge demo link `play.html?mode=afterhours` (Direct_Entry, with the note that the link skips the confirmation dialog).

### Requirement 16: Steering file update

**User Story:** As a maintainer, I want the steering files to match the new storage behavior, so that future work follows the current rules.

#### Acceptance Criteria

1. WHEN this spec is implemented, THE `.kiro/steering/tech.md` file SHALL state that the Door_Code, `solved`, and `hintsUsed` of an in-progress After-Hours game are stored in `sessionStorage` inside try/catch, as a deliberate exception to the "never stored" rule.
2. THE `.kiro/steering/tech.md` file SHALL state that the Saved_Game is cleared when the game ends or the player starts over, that the app works when storage is unavailable, and that the Door_Code is still never placed in the URL or `localStorage`.
3. THE `.kiro/steering/tech.md` file SHALL state that the planned save-and-resume feature (`localStorage`) is separate from this `sessionStorage` lock-in.
4. THE `.kiro/steering/structure.md` file SHALL list the new modules `assets/js/gallery.js` and `assets/js/session.js`.
5. THE `.kiro/steering/product.md` file SHALL replace the line "Artworks are currently shown as generated gradients, not real images." with a statement that artworks render as images when the Exhibition provides them and as generated gradients otherwise, and SHALL describe the Daylight_Gallery under "What is built now".
6. THE `.kiro/steering/design.md` file SHALL describe the Flashlight and the Daylight_Gallery under "Interaction" or "Surfaces", without changing the token table.
7. THE `.kiro/steering/tech.md` file SHALL replace the line "Artworks are currently generated gradients." with the image-then-gradient rule, SHALL state that the optional `image` and `hauntedImage` paths live under `assets/images/art/` and are credited in the Exhibition JSON, and SHALL state that unsafe image paths are rejected.
8. THE `.kiro/steering/structure.md` file SHALL state that artwork images go under `assets/images/art/` with credits in the Exhibition JSON, and that `assets/images/art/` is created when the first image is added.
9. THE `.kiro/steering/product.md` file SHALL state that the one-way switch to After-Hours Mode requires confirmation, except for the explicit `?mode=afterhours` demo URL (Direct_Entry), and that the saved game is cleared the moment the correct door code is accepted.
10. THE `.kiro/steering/tech.md` file SHALL list `?mode=afterhours` next to `?exhibition=` as a supported query parameter and SHALL state that the Door_Code is never placed in the URL.
