// Pure game state and transitions. No document/window/localStorage access.
// Flow: gallery -> escape -> solved -> escaped -> (return) gallery.

export const PHASES = ["gallery", "escape", "solved", "escaped"];

export function createState(artworkIds) {
  return {
    phase: "gallery",
    artworkIds: [...artworkIds],
    viewed: new Set(),
    solved: new Set(),
    hints: new Set(),
    currentIndex: 0,
  };
}

// Only the gallery is Daylight; every other phase is After-Hours.
export function themeFor(phase) {
  return phase === "gallery" ? "light" : "dark";
}

function hasId(state, id) {
  return state.artworkIds.includes(id);
}

export function enterEscape(state) {
  if (state.phase !== "gallery") return false;
  state.phase = "escape";
  return true;
}

export function markSolved(state, id) {
  if (state.phase !== "escape" || !hasId(state, id)) return false;
  if (state.solved.has(id)) return false;
  state.solved.add(id);
  if (state.artworkIds.every((a) => state.solved.has(a))) state.phase = "solved";
  return true;
}

export function submitCode(state, input, doorCode) {
  if (state.phase === "escape") return "unsolved";
  if (state.phase !== "solved") return "wrong";
  if (String(input).trim() !== doorCode) return "wrong";
  state.phase = "escaped";
  return "correct";
}

export function returnToGallery(state) {
  if (state.phase !== "escaped") return false;
  state.phase = "gallery";
  state.viewed.clear();
  state.solved.clear();
  state.hints.clear();
  state.currentIndex = 0;
  return true;
}

export function markViewed(state, id) {
  if (state.phase !== "gallery" || !hasId(state, id)) return false;
  state.viewed.add(id);
  return true;
}

export function revealHint(state, id) {
  if ((state.phase !== "escape" && state.phase !== "solved") || !hasId(state, id)) return false;
  state.hints.add(id);
  return true;
}
