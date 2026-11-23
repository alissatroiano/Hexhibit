// Puzzle registry: maps a puzzle `type` string to its handler module.
//
// Handler contract. Each file under js/puzzles/ exports:
//   type                        string, the value used in exhibition JSON
//   validate(puzzle, path)      returns an array of error message strings
//                               (empty when valid); no DOM access
//   evaluate(puzzle, answer)    returns "correct" or "incorrect"; no DOM access
//   render(root, puzzle, ctx)   builds the answer UI inside `root` and returns
//                               { getAnswer, focus }
// A handler touches `document` only inside render, so validate and evaluate
// run in Node. To add a puzzle type, create the file and add it to HANDLERS;
// the corridor and loader never branch on type names.

import * as riddle from "./riddle.js";
import * as choice from "./choice.js";

const HANDLERS = { riddle, choice };

// Object.hasOwn keeps "constructor" and "__proto__" from matching inherited keys.
export function hasType(type) {
  return typeof type === "string" && Object.hasOwn(HANDLERS, type);
}

export function getHandler(type) {
  return hasType(type) ? HANDLERS[type] : null;
}

export const registry = {
  has: hasType,
  validate(type, puzzle, path) {
    const handler = getHandler(type);
    return handler ? handler.validate(puzzle, path) : [];
  },
};
