// Corridor geometry and helpers. Import-safe in Node: nothing here touches the DOM at import time.
// Values are taken from the prototype in main.js so the N=6 render stays identical.

// z distance between neighbouring paintings along the walking line.
export const STOP_SPACING = 450;
// The camera stops this far in front of a painting's plane so the whole canvas fits the view.
export const STOP_OFFSET = 190;
// Last art stop -> door stop. Gives the door breathing room after the final painting.
export const DOOR_GAP = 290;
// Door stop -> back wall. Keeps the door at the prototype's apparent size under perspective.
export const DOOR_VIEW_DIST = 400;
// Extra walk past the door stop once it is unlocked, so the player steps through the opening.
export const EXIT_OVERSHOOT = 150;
// Click assist window: a painting counts as "near" (clickable without walking) while
// -ASSIST_BEHIND < d - stop < ASSIST_AHEAD. Wider behind, because paintings are seen as you approach.
export const ASSIST_BEHIND = 330;
export const ASSIST_AHEAD = 90;
// Within this distance of a stop the painting shows its focus glow and "click to inspect" cue.
export const FOCUS_RADIUS = 60;
// After scrolling or walking ends, a target within this distance snaps to the nearest stop.
export const SNAP_RADIUS = 110;
// Within this distance of the door stop the door is considered reachable (door "near").
export const DOOR_NEAR = 200;
// Distance over which the camera's turn toward a painting fades out as you leave its stop.
// Gives a continuous turn instead of a jump.
export const TURN_FALLOFF = 150;
// Walking speed per frame while a movement key is held, in px.
export const WALK_SPEED = 16;
// Per-frame easing factors (fraction of remaining distance). Small values feel slow and smooth.
export const EASE_POS = 0.1;   // camera distance
export const EASE_LOOK = 0.08; // mouse-driven yaw and pitch
export const EASE_TURN = 0.1;  // turn toward the painting
// Paintings hang on walls at x = +/- WALL_X from the walking line.
export const WALL_X = 244;
// Maximum yaw (degrees) toward the painting the camera is stopped at.
export const TURN_DEG = 50;
// Floor, ceiling and walls extend this far beyond the back wall so no gap shows behind the door.
// 400 + doorZ 3200 = 3600, the prototype's hard-coded plane length.
export const LENGTH_MARGIN = 400;

/**
 * Pure layout for n artworks.
 * Camera distance d grows as the player walks forward; a stop at distance s puts the camera
 * STOP_OFFSET in front of the painting at z = -STOP_SPACING*(i+1).
 * @param {number} n number of artworks
 * @returns {{stops:number[], doorStop:number, exitStop:number, doorZ:number, length:number}}
 */
export function computeLayout(n) {
  const count = Math.max(0, Math.floor(n) || 0);
  const stops = Array.from({ length: count }, (_, i) => STOP_SPACING * (i + 1) - STOP_OFFSET);
  const lastStop = count ? stops[count - 1] : 0;
  const doorStop = lastStop + DOOR_GAP;
  const exitStop = doorStop + EXIT_OVERSHOOT;
  // The door sits on the back wall, DOOR_VIEW_DIST beyond the door stop (negative z = away from camera).
  const doorZ = -(doorStop + DOOR_VIEW_DIST);
  return { stops, doorStop, exitStop, doorZ, length: Math.abs(doorZ) + LENGTH_MARGIN };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
// Neutral fallback (the --muted light token) when a colour is not a 6-digit hex.
const FALLBACK_COLOR = "#6d6d74";

/**
 * Same gradient construction as the prototype: a soft radial highlight over a diagonal wash.
 * The "55" suffix is an 8-digit-hex alpha, so only 6-digit hex is accepted.
 * @param {string[]} colors two hex colours
 * @returns {string} CSS background value
 */
export function artGradient(colors) {
  const [a, b] = [0, 1].map(i => (colors && HEX.test(colors[i]) ? colors[i] : FALLBACK_COLOR));
  return `radial-gradient(circle at 50% 40%,${a},transparent 55%),linear-gradient(160deg,${a}55,${b})`;
}
