// Pure game state and transitions. No document/window/localStorage access.
// Flow: gallery -> escape -> solved -> escaped -> (return) gallery.

import { generateDoorCode } from "./random.js";

export const PHASES = ["gallery", "escape", "solved", "escaped"];

export function createState(artworkIds) {
  return {
    phase: "gallery",
    artworkIds: [...artworkIds],
    viewed: new Set(),
    solved: new Set(),
    hints: new Set(),
    currentIndex: 0,
    doorCode: null,
  };
}

// Only the gallery is Daylight; every other phase is After-Hours.
export function themeFor(phase) {
  return phase === "gallery" ? "light" : "dark";
}

function hasId(state, id) {
  return state.artworkIds.includes(id);
}

// Generate first: if the source or length is bad this throws before any field changes.
export function enterEscape(state, source) {
  if (state.phase !== "gallery") return false;
  const code = generateDoorCode(source, state.artworkIds.length);
  state.doorCode = code;
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

export function submitCode(state, input) {
  if (state.phase === "escape") return "unsolved";
  if (state.phase !== "solved") return "wrong";
  if (String(input).trim() !== state.doorCode) return "wrong";
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
  state.doorCode = null;
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

// Rebuild an in-progress game (escape or solved). Never yields gallery or escaped.
// Throws on input that cannot describe an in-progress game, like generateDoorCode does.
export function createRestoredState(artworkIds, { doorCode, solved = [], hints = [] } = {}) {
  const ids = [...artworkIds];
  if (ids.length === 0) throw new RangeError("createRestoredState needs at least one artwork");
  if (typeof doorCode !== "string" || doorCode.length !== ids.length || !/^\d+$/.test(doorCode)) {
    throw new TypeError("doorCode must be a digit string with one digit per artwork");
  }
  const solvedIds = [...solved];
  const hintIds = [...hints];
  if (![...solvedIds, ...hintIds].every((id) => ids.includes(id))) {
    throw new RangeError("solved and hints must contain only artwork ids");
  }
  const s = createState(ids);
  s.doorCode = doorCode;
  for (const id of solvedIds) s.solved.add(id);
  for (const id of hintIds) s.hints.add(id);
  s.phase = ids.every((id) => s.solved.has(id)) ? "solved" : "escape";
  return s;
}

// The only read path for a code digit: null until that artwork is solved.
export function revealedDigit(state, index) {
  if (state.doorCode === null || !Number.isInteger(index) || index < 0 || index >= state.artworkIds.length) return null;
  if (!state.solved.has(state.artworkIds[index])) return null;
  return state.doorCode[index];
}
