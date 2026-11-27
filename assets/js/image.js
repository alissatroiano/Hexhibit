// Shared artwork image rules. Pure: no document, window or storage access at
// import, so gallery, modal and corridor (and Node tests) can all use it.

export const ART_IMAGE_DIR = "assets/images/art/";
export const ALLOWED_IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

// True only for a same-site relative path under ART_IMAGE_DIR with an allowed
// extension. Rejects schemes, absolute/protocol-relative paths, backslashes,
// ".." segments, queries and fragments.
export function isSafeArtworkImagePath(value) {
  if (typeof value !== "string" || value === "") return false;
  if (SCHEME_RE.test(value)) return false;
  if (value.startsWith("/")) return false;
  if (value.includes("\\")) return false;
  if (value.includes("?") || value.includes("#")) return false;
  if (value.split("/").includes("..")) return false;
  if (!value.startsWith(ART_IMAGE_DIR)) return false;
  const lower = value.toLowerCase();
  return ALLOWED_IMAGE_EXT.some((ext) => lower.endsWith(ext));
}

// Picks the night variant only when haunted and present, else the day image.
// Returns null when the chosen path is missing or unsafe; callers then fall
// back to the generated gradient.
export function resolveArtworkImage(artwork, { haunted = false } = {}) {
  if (!artwork || typeof artwork !== "object") return null;
  const path = haunted && artwork.hauntedImage != null ? artwork.hauntedImage : artwork.image;
  if (!isSafeArtworkImagePath(path)) return null;
  const alt = typeof artwork.alt === "string" && artwork.alt !== "" ? artwork.alt : artwork.title;
  return {
    src: path,
    alt: typeof alt === "string" ? alt : "",
    credit: typeof artwork.credit === "string" ? artwork.credit : "",
  };
}

// DOM helper. Stable signature, used by gallery.js, corridor.js and modal.js:
//
//   applyArtworkFill(el, artwork, { haunted }, gradientFn)
//
//   el          container element to fill (its previous fill is cleared first)
//   artwork     exhibition artwork ({ image, hauntedImage, alt, title, colors })
//   haunted     true to prefer the night variant
//   gradientFn  (colors) => CSS background string, normally corridor.js
//               artGradient. Passed in so this module has no import-time
//               dependency on the DOM or the corridor.
//
// If an image resolves, an <img> with the resolved alt is appended. On load
// error the <img> is removed and the gradient is applied instead, with no
// console output. If nothing resolves, the gradient is applied directly.
// Returns the appended <img>, or null when the gradient is used.
export function applyArtworkFill(el, artwork, { haunted = false } = {}, gradientFn) {
  if (!el) return null;
  const applyGradient = () => {
    el.style.background = typeof gradientFn === "function" ? gradientFn(artwork && artwork.colors) : "";
  };

  el.querySelectorAll(":scope > img.art-img").forEach((old) => old.remove());
  el.style.background = "";

  const resolved = resolveArtworkImage(artwork, { haunted });
  if (!resolved) {
    applyGradient();
    return null;
  }

  const img = el.ownerDocument.createElement("img");
  img.className = "art-img";
  img.alt = resolved.alt;
  img.decoding = "async";
  img.draggable = false;
  img.addEventListener(
    "error",
    () => {
      img.remove();
      applyGradient();
    },
    { once: true }
  );
  img.src = resolved.src;
  el.appendChild(img);
  return img;
}
