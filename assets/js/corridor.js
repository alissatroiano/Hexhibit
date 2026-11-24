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

// ---------------------------------------------------------------------------------------------
// DOM + camera. Nothing below runs at import time. This module knows nothing about puzzle types or
// game phases: it reports activations through hooks and is told what to show through its API.
// ---------------------------------------------------------------------------------------------

// A pending walk counts as "arrived" within this distance of its stop (px of camera distance).
const ARRIVE_RADIUS = 12;
// After a wheel or key walk, stops are not snapped to for this long (ms), so the player can pass over them.
const SNAP_DELAY_MS = 400;
// Key-walk and wheel multipliers/limits.
const WHEEL_FACTOR = 0.9;
const NEAR_STEP_MARGIN = 20; // Back/Next ignore stops this close to the current target (avoids a no-op press).
// Mouse look range in degrees: yaw left/right and pitch up/down at the screen edges.
const LOOK_YAW_DEG = 12;
const LOOK_PITCH_DEG = 6;
// Fixed eye distance. Must equal the CSS `perspective` on .viewport: the world is pushed toward the viewer
// by this much so that world z = 0 sits exactly at the eye, and walking is just a further translateZ(d).
const PERSPECTIVE_PX = 750;
const DEFAULT_LOCK_LABEL_FALLBACK = "LOCKED";

let activeCorridor = null;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Scale so the 500px-wide corridor fits the viewport (same formulas as the prototype). */
function viewScale() {
  if (innerWidth < innerHeight) return clamp(innerHeight / 800, 0.7, 1.1);
  return clamp(Math.min(innerWidth / 900, innerHeight / 640), 0.5, 1.25);
}

/**
 * Build the corridor for an exhibition.
 *
 * 3D model (all numbers are CSS px):
 *  - `.viewport` has `perspective: 750px`. `.world` is a zero-size preserve-3d box at the screen centre.
 *  - The camera never moves. Instead the whole world is translated toward the viewer by `d`
 *    (`translateZ(d)`), so walking forward by d px looks the same as the camera moving to z = -d.
 *    One transform per frame, no per-element math.
 *  - World z = 0 is the eye (hence the extra `translateZ(750px)` before the rotations: it moves the pivot
 *    of the look rotations to the eye so yaw/pitch turn the head instead of orbiting the origin).
 *  - Floor, walls and back wall are sized from `--len` and positioned from `--zc` / `--door-z`, set below.
 *    A plane is centred on its own origin, so a plane of length L centred at z = zc spans zc +/- L/2.
 *    We want it to span from LENGTH_MARGIN behind the eye (z = +400) to the back wall (z = doorZ):
 *    L = |doorZ| + LENGTH_MARGIN and zc = -(|doorZ| - LENGTH_MARGIN) / 2.
 *    For N = 6 (doorZ = -3200) that is L = 3600 and zc = -1400, i.e. the prototype's 3600px planes moved so
 *    they reach the back wall (the prototype planes were centred on 0 and stopped at z = -1800).
 *
 * @param {{artworks:Array<{id:string,title:string,artist?:string,colors:string[]}>}} exhibition
 * @param {{onArtwork?:(i:number)=>void,onDoor?:()=>void}} hooks activation callbacks
 * @param {{world?:HTMLElement,door?:HTMLElement,lock?:HTMLElement,prev?:HTMLElement,next?:HTMLElement,
 *          isBlocked?:()=>boolean}} [opts] elements default to #world, #door, #lock, #prev, #next;
 *          isBlocked() returns true while a dialog is open (input and snapping pause).
 */
export function buildCorridor(exhibition, hooks = {}, opts = {}) {
  if (activeCorridor) activeCorridor.destroy();
  const byId = id => document.getElementById(id);
  const world = opts.world || byId("world");
  const doorEl = opts.door || byId("door");
  const lockEl = opts.lock || byId("lock");
  const prevBtn = opts.prev || byId("prev");
  const nextBtn = opts.next || byId("next");
  const isBlocked = opts.isBlocked || (() => false);
  const onArtwork = hooks.onArtwork || (() => {});
  const onDoor = hooks.onDoor || (() => {});

  const artworks = exhibition.artworks;
  const n = artworks.length;
  const layout = computeLayout(n);
  const { stops, doorStop, exitStop, doorZ, length } = layout;
  const allStops = [...stops, doorStop];
  const defaultLock = lockEl ? lockEl.textContent || DEFAULT_LOCK_LABEL_FALLBACK : DEFAULT_LOCK_LABEL_FALLBACK;

  // Plane sizing and placement (see the comment above).
  world.style.setProperty("--len", `${length}px`);
  world.style.setProperty("--zc", `${-(Math.abs(doorZ) - LENGTH_MARGIN) / 2}px`);
  world.style.setProperty("--door-z", `${doorZ}px`);

  // Remove paintings from any earlier build so a fallback load cannot duplicate them.
  world.querySelectorAll(".artwork").forEach(el => el.remove());

  // Camera state. d = current distance walked, td = target distance. yaw/pit follow the mouse;
  // fy is the extra yaw that turns the view toward the painting we are standing at.
  const S = { d: 0, td: 0, yaw: 0, ty: 0, pit: 0, tp: 0, fy: 0, k: {} };
  let doorOpenable = false;
  let pending = null; // {kind:"art"|"door", i} walk-then-open request
  let lastMove = 0;
  let raf = 0;
  let destroyed = false;
  const cleanups = [];
  // Live query: a change in the OS setting applies on the next frame because tick reads reduced.matches.
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const listen = (target, type, fn, o) => { target.addEventListener(type, fn, o); cleanups.push(() => target.removeEventListener(type, fn, o)); };

  const maxD = () => (doorOpenable ? exitStop : doorStop);
  // Click assist: a painting is "near" (clickable without walking) from ASSIST_BEHIND before its stop
  // to ASSIST_AHEAD after it. Wider behind, because you see paintings as you approach them.
  const inRange = i => { const x = S.d - stops[i]; return x > -ASSIST_BEHIND && x < ASSIST_AHEAD; };
  const doorNear = () => S.d > doorStop - DOOR_NEAR;

  // Paintings alternate left (even i) then right (odd i). Wall at x = +/-WALL_X; rotateY(-side*90deg)
  // turns the canvas to face the walking line. z = -STOP_SPACING*(i+1) matches stops[i] + STOP_OFFSET.
  const arts = artworks.map((p, i) => {
    const side = i % 2 ? 1 : -1;
    const f = document.createElement("figure");
    f.className = "artwork";
    f.tabIndex = 0;
    f.setAttribute("role", "button");
    f.setAttribute("aria-label", `Inspect painting ${i + 1} of ${n}: ${p.title}`);
    f.style.cssText = `--x:${side * WALL_X}px;--z:${-STOP_SPACING * (i + 1)}px;--ry:${-side * 90}deg`;
    const art = document.createElement("div");
    art.className = "art";
    art.style.background = artGradient(p.colors);
    const cap = document.createElement("figcaption");
    cap.textContent = p.title;
    f.append(art, cap);
    f.addEventListener("click", () => activateArtwork(i));
    f.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); activateArtwork(i); } });
    f.addEventListener("focus", () => revealForKeyboard(f, stops[i]));
    world.appendChild(f);
    return f;
  });

  doorEl.tabIndex = 0;
  doorEl.setAttribute("role", "button");
  doorEl.setAttribute("aria-label", "Exit door");
  listen(doorEl, "focus", () => revealForKeyboard(doorEl, doorStop));
  listen(doorEl, "click", () => activateDoor());
  listen(doorEl, "keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activateDoor(); } });

  // Keyboard Tab onto an off-screen painting or the door: walk the camera to it so the focus ring is
  // visible, and undo any scroll the browser applied to the overflow:hidden viewport to reveal the
  // focused element (it would otherwise shift the 3D scene sideways). Mouse focus is left alone so
  // click assist keeps its current behavior.
  function revealForKeyboard(el, stop) {
    if (!el.matches(":focus-visible")) return;
    if (stop <= maxD()) { S.td = stop; pending = null; }
    const vp = world.parentElement;
    if (vp) { vp.scrollLeft = 0; vp.scrollTop = 0; }
  }

  // Open now if close enough, otherwise walk to the stop and open on arrival (see tick).
  function activateArtwork(i) {
    if (!inRange(i)) { S.td = stops[i]; pending = { kind: "art", i }; return; }
    pending = null;
    onArtwork(i);
  }
  function activateDoor() {
    if (!doorNear()) { S.td = doorStop; pending = { kind: "door" }; return; }
    pending = null;
    onDoor();
  }

  // Back/Next jump between stops (paintings, then the door, then the exit once openable).
  function step(dir) {
    pending = null;
    if (dir > 0) {
      const next = allStops.find(s => s > S.td + NEAR_STEP_MARGIN);
      S.td = next === undefined ? maxD() : next;
    } else {
      const prev = [...allStops].reverse().find(s => s < S.td - NEAR_STEP_MARGIN);
      S.td = prev === undefined ? 0 : prev;
    }
  }
  if (nextBtn) listen(nextBtn, "click", () => step(1));
  if (prevBtn) listen(prevBtn, "click", () => step(-1));

  listen(window, "keydown", e => { if (e.key === "Escape" || isBlocked()) return; S.k[e.key.toLowerCase()] = 1; });
  listen(window, "keyup", e => { S.k[e.key.toLowerCase()] = 0; });
  listen(window, "mousemove", e => {
    if (isBlocked()) return;
    if (e.target.closest && e.target.closest(".artwork")) return; // do not swing the view while aiming at a painting
    S.ty = (e.clientX / innerWidth * 2 - 1) * LOOK_YAW_DEG;
    S.tp = -(e.clientY / innerHeight * 2 - 1) * LOOK_PITCH_DEG;
  });
  listen(window, "wheel", e => {
    if (isBlocked()) return;
    S.td += e.deltaY * WHEEL_FACTOR; pending = null; lastMove = performance.now();
  }, { passive: true });

  function tick() {
    if (destroyed) return;
    const blocked = isBlocked();
    if (!blocked) {
      const fwd = S.k.w || S.k.arrowup, back = S.k.s || S.k.arrowdown;
      if (fwd || back) { pending = null; lastMove = performance.now(); }
      if (fwd) S.td += WALK_SPEED;
      if (back) S.td -= WALK_SPEED;
    }
    S.td = clamp(S.td, 0, maxD());
    // Snap to a stop when the player stops near it, so paintings end up centred.
    if (!blocked && performance.now() - lastMove > SNAP_DELAY_MS) {
      const k = allStops.findIndex(s => Math.abs(S.td - s) < SNAP_RADIUS);
      if (k >= 0) S.td = allStops[k];
    }
    if (reduced.matches) {
      // Reduced motion: no camera easing. Jump straight to the targets.
      S.d = S.td; S.yaw = S.ty; S.pit = S.tp;
    } else {
      S.d += (S.td - S.d) * EASE_POS;
      S.yaw += (S.ty - S.yaw) * EASE_LOOK;
      S.pit += (S.tp - S.pit) * EASE_LOOK;
    }

    // Turn to face the painting we are stopped at. Weight is 1 at the stop and fades to 0 over TURN_FALLOFF,
    // so the head turns continuously instead of jumping. Left paintings (even i) turn -TURN_DEG, right +TURN_DEG.
    let weight = 0, sign = 0;
    stops.forEach((s, i) => {
      const w = Math.max(0, 1 - Math.abs(S.d - s) / TURN_FALLOFF);
      if (w > weight) { weight = w; sign = i % 2 ? 1 : -1; }
    });
    const turnTarget = sign * TURN_DEG * weight;
    S.fy = reduced.matches ? turnTarget : S.fy + (turnTarget - S.fy) * EASE_TURN;

    if (pending && !blocked) {
      const target = pending.kind === "art" ? stops[pending.i] : doorStop;
      if (Math.abs(S.d - target) < ARRIVE_RADIUS) {
        const p = pending; pending = null;
        if (p.kind === "art") onArtwork(p.i); else onDoor();
      }
    }

    // Order matters: scale, push pivot to the eye, rotate (pitch then yaw), then walk (translateZ(d)).
    world.style.transform =
      `scale(${viewScale()}) translateZ(${PERSPECTIVE_PX}px) rotateX(${S.pit.toFixed(2)}deg) ` +
      `rotateY(${(S.yaw + S.fy).toFixed(2)}deg) translateZ(${S.d.toFixed(2)}px)`;

    // "near" gives the glow (click assist); "focus" shows the CLICK TO INSPECT cue via CSS ::after.
    arts.forEach((a, i) => {
      a.classList.toggle("near", inRange(i));
      a.classList.toggle("focus", Math.abs(S.d - stops[i]) < FOCUS_RADIUS);
    });
    doorEl.classList.toggle("near", !doorOpenable && doorNear());
    raf = requestAnimationFrame(tick);
  }

  const corridor = {
    /** Mark painting i as done (shows the tick on its caption). */
    markDone(i) { if (arts[i]) arts[i].classList.add("done"); },
    /** Clear marks, close the door, restore the lock label and block the exit. Does not move the camera. */
    reset() {
      arts.forEach(a => a.classList.remove("done"));
      doorOpenable = false; pending = null;
      doorEl.classList.remove("open");
      if (lockEl) lockEl.textContent = defaultLock;
    },
    /** Allow (or forbid) walking on to the exit stop and stop the door glow. */
    setDoorOpenable(v) { doorOpenable = !!v; },
    setLockLabel(text) { if (lockEl) lockEl.textContent = text; },
    /** Walk (or jump, with {instant:true}) to a camera distance. Clears any pending open. */
    walkTo(distance, { instant = false } = {}) {
      pending = null;
      S.td = clamp(distance, 0, maxD());
      if (instant) S.d = S.td;
    },
    /** Swing the door open (or closed with false). */
    openDoor(open = true) { doorEl.classList.toggle("open", !!open); },
    goHome() { corridor.walkTo(0); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf);
      cleanups.forEach(fn => fn());
      arts.forEach(a => a.remove());
      if (activeCorridor === corridor) activeCorridor = null;
    },
  };
  activeCorridor = corridor;
  tick();
  return corridor;
}
