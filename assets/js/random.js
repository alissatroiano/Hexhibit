// Pure door code generator. Imports nothing and touches no browser API, so it
// loads in Node. All randomness comes from the byte source the caller passes in.

export const MIN_CODE_LENGTH = 3;
export const MAX_CODE_LENGTH = 6;
export const BYTE_MAX = 255;
// Bytes 0..249 map evenly onto digits (25 bytes each). 250..255 would favor
// digits 0..5, so they are discarded and redrawn to avoid modulo bias.
export const REJECT_FROM = 250;
export const MAX_DRAWS_PER_DIGIT = 100;
export const MAX_ALL_SAME_RETRIES = 10;

/**
 * Draw one digit 0..9 by rejection sampling.
 * @param {() => number} source returns an integer 0..255 per call
 * @returns {number}
 */
export function drawDigit(source) {
  if (typeof source !== "function") {
    throw new TypeError("random source must be a function");
  }
  let rejected = 0;
  for (;;) {
    const b = source();
    if (!Number.isInteger(b) || b < 0 || b > BYTE_MAX) {
      throw new TypeError("random source must return an integer from 0 to 255");
    }
    if (b < REJECT_FROM) return b % 10;
    rejected += 1;
    if (rejected >= MAX_DRAWS_PER_DIGIT) {
      throw new Error("random source returned only discarded bytes");
    }
  }
}

function buildDigits(source, n) {
  const digits = [];
  for (let i = 0; i < n; i += 1) digits.push(drawDigit(source));
  return digits;
}

/**
 * Generate a door code of n digits that is never all identical.
 * @param {() => number} source
 * @param {number} n integer 3..6
 * @returns {string}
 */
export function generateDoorCode(source, n) {
  if (!Number.isInteger(n) || n < MIN_CODE_LENGTH || n > MAX_CODE_LENGTH) {
    throw new RangeError(`code length must be an integer from ${MIN_CODE_LENGTH} to ${MAX_CODE_LENGTH}`);
  }
  let digits = [];
  for (let attempt = 0; attempt <= MAX_ALL_SAME_RETRIES; attempt += 1) {
    digits = buildDigits(source, n);
    if (!digits.every((d) => d === digits[0])) return digits.join("");
  }
  // Fix-up: every attempt was all identical, so bump the last digit. This
  // guarantees termination and a code that is never all the same.
  digits[n - 1] = (digits[n - 1] + 1) % 10;
  return digits.join("");
}
