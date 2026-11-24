// Deterministic Random_Source stand-ins. Each returns one byte (0..255) per call.

/** Always returns b. The returned function has a `calls` counter. */
export function constantSource(b) {
  const fn = () => {
    fn.calls += 1;
    return b;
  };
  fn.calls = 0;
  return fn;
}

/** Cycles through bytes forever. Has a `calls` counter. */
export function cyclingSource(bytes) {
  let i = 0;
  const fn = () => {
    fn.calls += 1;
    return bytes[i++ % bytes.length];
  };
  fn.calls = 0;
  return fn;
}

/** Returns each byte once, then throws when exhausted. */
export function sequenceSource(bytes) {
  let i = 0;
  const fn = () => {
    fn.calls += 1;
    if (i >= bytes.length) throw new Error("sequenceSource exhausted");
    return bytes[i++];
  };
  fn.calls = 0;
  return fn;
}

/** Same behavior as sequenceSource; named for scripted retry scenarios. */
export function scriptedSource(bytes) {
  return sequenceSource(bytes);
}

/** Seeded mulberry32 PRNG returning bytes 0..255. */
export function prngSource(seed) {
  let a = seed >>> 0;
  const fn = () => {
    fn.calls += 1;
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) >>> 8) & 0xff;
  };
  fn.calls = 0;
  return fn;
}
