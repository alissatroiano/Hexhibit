// Flashlight: maps pointer and focus positions to --mx/--my on the .vig element.
// Only CSS custom properties are written here. This module never touches aria-* or hidden,
// so every painting and the door stay reachable whatever the beam position is (Req 9.1, 9.8).
// No DOM access at import time, so the pure helper below runs under node --test.

export const CENTER = "50%";

/**
 * Clamp a point to the viewport so the beam center never leaves the screen.
 * bounds: { width, height, left = 0, top = 0 }. Non-finite input falls back to the bounds center.
 * Returns { x, y } in CSS pixels.
 */
export function clampBeamPosition(x, y, bounds) {
  const left = Number.isFinite(bounds?.left) ? bounds.left : 0;
  const top = Number.isFinite(bounds?.top) ? bounds.top : 0;
  const width = Math.max(0, Number.isFinite(bounds?.width) ? bounds.width : 0);
  const height = Math.max(0, Number.isFinite(bounds?.height) ? bounds.height : 0);
  const clamp = (v, lo, hi, mid) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : mid);
  return {
    x: clamp(x, left, left + width, left + width / 2),
    y: clamp(y, top, top + height, top + height / 2),
  };
}

/**
 * Wire pointer tracking to a .vig element.
 * options:
 *   reducedMotion: boolean or () => boolean. When true the beam stays at 50% / 50%.
 *   requestAnimationFrame / cancelAnimationFrame: injectable for tests.
 *   target: object receiving pointermove listeners (default window).
 *   getBounds: () => { width, height } (default window.innerWidth/innerHeight).
 * Returns { setActive, centerOn, destroy }.
 */
export function initFlashlight(vigEl, options = {}) {
  const g = globalThis;
  const raf = options.requestAnimationFrame || g.requestAnimationFrame?.bind(g);
  const caf = options.cancelAnimationFrame || g.cancelAnimationFrame?.bind(g) || (() => {});
  const target = options.target || g.window || g;
  const getBounds = options.getBounds || (() => ({ width: g.innerWidth || 0, height: g.innerHeight || 0 }));
  const isReduced = () =>
    typeof options.reducedMotion === "function" ? !!options.reducedMotion() : !!options.reducedMotion;

  let active = false;
  let pending = null; // latest { x, y } in px waiting for the next frame
  let frameId = null;

  const write = (x, y) => {
    vigEl.style.setProperty("--mx", x);
    vigEl.style.setProperty("--my", y);
  };

  const reset = () => write(CENTER, CENTER);

  // The frame callback is the only place --mx/--my are committed from input,
  // so there is at most one write per animation frame however many events arrive (Req 8.9).
  const commit = () => {
    frameId = null;
    if (!active || !pending || isReduced()) {
      pending = null;
      return;
    }
    const { x, y } = pending;
    pending = null;
    write(`${x}px`, `${y}px`);
  };

  const schedule = (x, y) => {
    pending = clampBeamPosition(x, y, getBounds());
    if (frameId === null && raf) frameId = raf(commit);
  };

  const onPointerMove = (e) => {
    if (!active || isReduced()) return; // gallery phase or reduced motion: no updates (Req 8.4, 8.5)
    schedule(e.clientX, e.clientY);
  };

  const cancelPending = () => {
    pending = null;
    if (frameId !== null) {
      caf(frameId);
      frameId = null;
    }
  };

  const attach = () => target.addEventListener?.("pointermove", onPointerMove, { passive: true });
  const detach = () => target.removeEventListener?.("pointermove", onPointerMove);

  function setActive(on) {
    const next = !!on;
    if (next === active) return;
    active = next;
    if (active) {
      attach();
    } else {
      detach();
      cancelPending();
      reset();
    }
  }

  // Center the beam on an element's bounding box so a keyboard player sees the focused element lit (Req 8.7).
  function centerOn(rect) {
    // Reduced motion only removes easing; keyboard focus must still light the element (Req 8.7).
    if (!active || !rect) return;
    const { left = 0, top = 0, width = 0, height = 0 } = rect;
    cancelPending();
    const { x, y } = clampBeamPosition(left + width / 2, top + height / 2, getBounds());
    write(`${x}px`, `${y}px`);
  }

  function destroy() {
    detach();
    cancelPending();
    active = false;
    reset();
  }

  reset();
  setActive(true);
  return { setActive, centerOn, destroy };
}
