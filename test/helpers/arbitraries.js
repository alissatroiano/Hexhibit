import fc from "fast-check";

// Code length: the number of artworks.
export const n = fc.integer({ min: 3, max: 6 });

// Up to 80 arbitrary bytes followed by one accepted byte (0..249), so a cycling
// source never sees 100 consecutive discarded bytes.
export const byteSeq = fc
  .tuple(
    fc.array(fc.integer({ min: 0, max: 255 }), { maxLength: 80 }),
    fc.integer({ min: 0, max: 249 })
  )
  .map(([a, b]) => [...a, b]);

// Groups of (0..5 discarded bytes 250..255, then one accepted byte 0..249).
export const groupedStream = fc.array(
  fc.tuple(
    fc.array(fc.integer({ min: 250, max: 255 }), { maxLength: 5 }),
    fc.integer({ min: 0, max: 249 })
  ),
  { minLength: 1, maxLength: 80 }
);
