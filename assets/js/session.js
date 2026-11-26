// Saved_Game persistence for the in-progress After-Hours game (sessionStorage).
// Pure serialize/parse/restore plus storage wrappers that never throw or log.

import { createRestoredState } from "./state.js";

export const STORAGE_KEY = "hexhibit.session.v1";
export const SAVED_GAME_VERSION = 1;

function defaultStorage() {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null; // accessing sessionStorage can itself throw when blocked
  }
}

// Only these fields are stored; ids are written in artwork order so output is deterministic.
export function serializeSavedGame(state) {
  const ids = [...state.artworkIds];
  return JSON.stringify({
    v: SAVED_GAME_VERSION,
    artworkIds: ids,
    doorCode: state.doorCode,
    solved: ids.filter((id) => state.solved.has(id)),
    hintsUsed: ids.filter((id) => state.hints.has(id)),
  });
}

function isIdList(list, ids) {
  return Array.isArray(list) && list.every((id) => typeof id === "string" && ids.includes(id));
}

// Returns a SavedGame or null. Never throws.
export function parseSavedGame(raw, artworkIds) {
  try {
    if (typeof raw !== "string") return null;
    const data = JSON.parse(raw);
    if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
    if (data.v !== SAVED_GAME_VERSION) return null;
    const ids = [...artworkIds];
    // Order matters: revealedDigit is index-based.
    if (!Array.isArray(data.artworkIds) || data.artworkIds.length !== ids.length) return null;
    if (!data.artworkIds.every((id, i) => id === ids[i])) return null;
    if (ids.length === 0) return null;
    if (typeof data.doorCode !== "string" || data.doorCode.length !== ids.length || !/^\d+$/.test(data.doorCode)) return null;
    if (!isIdList(data.solved, ids) || !isIdList(data.hintsUsed, ids)) return null;
    return {
      v: SAVED_GAME_VERSION,
      artworkIds: ids,
      doorCode: data.doorCode,
      solved: [...data.solved],
      hintsUsed: [...data.hintsUsed],
    };
  } catch {
    return null;
  }
}

// Returns a Game_State in escape or solved phase, or null if the record cannot be restored.
export function restoreGameState(savedGame, artworkIds) {
  try {
    if (!savedGame) return null;
    return createRestoredState(artworkIds, {
      doorCode: savedGame.doorCode,
      solved: savedGame.solved,
      hints: savedGame.hintsUsed,
    });
  } catch {
    return null;
  }
}

export function writeSavedGame(state, storage = defaultStorage()) {
  try {
    storage.setItem(STORAGE_KEY, serializeSavedGame(state));
    return true;
  } catch {
    return false;
  }
}

export function readSavedGame(artworkIds, storage = defaultStorage()) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) return null;
    const saved = parseSavedGame(raw, artworkIds);
    if (saved === null) clearSavedGame(storage);
    return saved;
  } catch {
    return null;
  }
}

export function clearSavedGame(storage = defaultStorage()) {
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
