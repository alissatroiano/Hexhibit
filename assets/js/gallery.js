// Daylight Gallery: pure helpers (importable in Node, no DOM access at import time).

/** Base (floor) size as a fraction of the available area, and hard limits in px. */
export const BASE_WIDTH_RATIO = 0.9;
export const BASE_HEIGHT_RATIO = 0.8;
export const BASE_MAX_WIDTH = 1100;
export const BASE_MAX_HEIGHT = 700;
export const BASE_MIN_SIZE = 0;

const finite = (n) => (Number.isFinite(n) ? n : 0);

/**
 * Pixel size for --base-width / --base-height. Never exceeds the viewport width,
 * nor the viewport height minus the top bar, so the scene never scrolls the page.
 */
export function computeBaseSize(viewport, topBarHeight) {
  const vw = Math.max(BASE_MIN_SIZE, finite(viewport?.width));
  const vh = Math.max(BASE_MIN_SIZE, finite(viewport?.height));
  const availableHeight = Math.max(BASE_MIN_SIZE, vh - Math.max(0, finite(topBarHeight)));
  return {
    width: Math.min(vw, Math.floor(vw * BASE_WIDTH_RATIO), BASE_MAX_WIDTH),
    height: Math.min(availableHeight, Math.floor(availableHeight * BASE_HEIGHT_RATIO), BASE_MAX_HEIGHT),
  };
}

/** One entry per artwork in Exhibition order; even indexes left, odd right (same rule as the corridor). */
export function placeFrames(count) {
  const n = Math.max(0, Math.floor(finite(count)));
  return Array.from({ length: n }, (_, index) => ({ index, side: index % 2 === 0 ? "left" : "right" }));
}

/** Accessible name for a Frame. `ui.frameLabel` may supply a {n}/{total}/{title} template. */
export function frameLabel(ui, artwork, index, count) {
  const template = ui?.frameLabel || "Inspect painting {n} of {total}: {title}";
  return template
    .replace("{n}", String(index + 1))
    .replace("{total}", String(count))
    .replace("{title}", artwork?.title ?? "");
}

// ---------------------------------------------------------------------------
// DOM builder. Everything below runs only when buildGallery() is called.
// ---------------------------------------------------------------------------
import { applyArtworkFill } from "./image.js";
import { artGradient } from "./corridor.js";

/** Sconces per wall; each sits at a fixed spot defined by the CSS. */
export const SCONCES_PER_WALL = 1;
const RESIZE_EVENT = "resize";

let activeGallery = null;

function el(doc, tag, className, attrs) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** True when the browser can keep child planes in 3D space. Without it the walls collapse flat. */
export function supports3d(win = window) {
  try {
    return !!(win.CSS && win.CSS.supports && win.CSS.supports("transform-style", "preserve-3d"));
  } catch {
    return false;
  }
}

/**
 * Builds the Daylight Gallery into #gallery-scene-mount.
 * @param exhibition validated exhibition ({ artworks, ui })
 * @param hooks      { onArtwork(index), onEscape() }
 * @param opts       { viewed?: Iterable<number>, supports3d?: boolean }
 * @returns {{setVisible(visible:boolean):void, markViewed(index:number):void, destroy():void}}
 */
export function buildGallery(exhibition, hooks = {}, opts = {}) {
  if (activeGallery) activeGallery.destroy();

  const doc = document;
  const root = doc.getElementById("daylight-gallery");
  const mount = doc.getElementById("gallery-scene-mount");
  const cta = doc.getElementById("escape-cta");
  const ui = exhibition?.ui ?? {};
  const artworks = Array.isArray(exhibition?.artworks) ? exhibition.artworks : [];
  const count = artworks.length;
  const viewed = new Set(opts.viewed ? [...opts.viewed] : []);
  const listeners = [];
  const listen = (target, type, fn) => {
    target.addEventListener(type, fn);
    listeners.push(() => target.removeEventListener(type, fn));
  };

  // Remove frames from any previous build before rendering.
  mount.replaceChildren();

  const flat = !(opts.supports3d ?? supports3d());
  const placements = placeFrames(count);
  const frames = [];

  function makeFrame(artwork, place) {
    const btn = el(doc, "button", "frame", { type: "button", "data-side": place.side });
    btn.style.setProperty("--slot", String(Math.floor(place.index / 2)));
    btn.setAttribute("aria-label", frameLabel(ui, artwork, place.index, count));
    btn.append(el(doc, "span", "spotlight", { "aria-hidden": "true" }));
    btn.append(el(doc, "span", "picture-light", { "aria-hidden": "true" }));
    const art = el(doc, "span", "frame-art");
    applyArtworkFill(art, artwork, { haunted: false }, artGradient);
    btn.append(art);
    const caption = el(doc, "span", "frame-caption");
    caption.textContent = artwork.title ?? "";
    btn.append(caption);
    // Native button activation covers Enter and Space; click is the single entry point.
    listen(btn, "click", () => hooks.onArtwork?.(place.index));
    frames[place.index] = btn;
    return btn;
  }

  if (flat) {
    const list = el(doc, "ul", "gallery-flat");
    placements.forEach((place) => {
      const li = el(doc, "li");
      li.append(makeFrame(artworks[place.index], place));
      list.append(li);
    });
    mount.append(list);
  } else {
    const scene = el(doc, "div", "gallery-scene");
    // Architecture first (back to front): ceiling, floor and its reflections, the dark alcove, then the two walls.
    for (const cls of ["ceiling", "base", "ground", "alcove"]) scene.append(el(doc, "div", cls, { "aria-hidden": "true" }));
    scene.append(el(doc, "div", "leftside", { "aria-hidden": "true" }), el(doc, "div", "rightside", { "aria-hidden": "true" }));
    for (const side of ["left", "right"]) {
      for (let i = 0; i < SCONCES_PER_WALL; i++) {
        scene.append(el(doc, "div", "walllight", { "data-side": side, "aria-hidden": "true" }));
      }
    }
    placements.forEach((place) => scene.append(makeFrame(artworks[place.index], place)));
    mount.append(scene);
  }

  function applyViewed(index) {
    const btn = frames[index];
    if (!btn || btn.querySelector(".viewed-marker")) return;
    btn.classList.add("viewed");
    const marker = el(doc, "span", "viewed-marker");
    marker.textContent = ui.viewedMarker ?? "";
    btn.append(marker);
  }

  function markViewed(index) {
    if (!Number.isInteger(index) || index < 0 || index >= count) return;
    viewed.add(index);
    applyViewed(index);
  }

  function updateSize() {
    const top = doc.querySelector("header.top");
    const size = computeBaseSize(
      { width: window.innerWidth, height: window.innerHeight },
      top ? top.offsetHeight : 0
    );
    root.style.setProperty("--base-width", `${size.width}px`);
    root.style.setProperty("--base-height", `${size.height}px`);
  }

  viewed.forEach(applyViewed);
  updateSize();
  listen(window, RESIZE_EVENT, updateSize);

  if (cta) {
    if (ui.escapeCta) cta.textContent = ui.escapeCta;
    listen(cta, "click", () => hooks.onEscape?.());
  }

  function setVisible(visible) {
    root.hidden = !visible;
    root.inert = !visible;
  }

  function destroy() {
    listeners.forEach((off) => off());
    listeners.length = 0;
    mount.replaceChildren();
    if (activeGallery === api) activeGallery = null;
  }

  const api = { setVisible, markViewed, destroy };
  activeGallery = api;
  return api;
}
