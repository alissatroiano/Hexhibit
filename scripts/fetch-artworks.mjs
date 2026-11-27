#!/usr/bin/env node
// Fetch public-domain paintings from the Art Institute of Chicago Open Access API.
// Zero dependencies (Node 18+). Usage:
//   node scripts/fetch-artworks.mjs [term ...]
// Downloads 6 paintings into assets/images/art/ (the only folder the schema allows)
// and prints verified metadata as JSON, ready to merge into content/default-exhibition.json.
// Curator fields (curatorNote, lesson, puzzle) and gradient colors are placeholders
// for the museum-curator agent to finish.

import { mkdir, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const API = "https://api.artic.edu/api/v1/artworks";
const OUT_DIR = fileURLToPath(new URL("../assets/images/art/", import.meta.url));
const IMAGE_DIR = "assets/images/art";
const WANTED = 6;
const IMAGE_WIDTH = 843; // width the AIC IIIF server serves without extra limits
const SEARCH_LIMIT = 40;
const TIMEOUT_MS = 30000;
const MIN_IMAGE_BYTES = 10000;
const DEFAULT_TERMS = ["moonlight", "night", "candle", "storm", "fog", "shadow", "lantern", "twilight"];
const FIELDS = [
  "id", "title", "artist_title", "date_display", "medium_display", "dimensions",
  "credit_line", "image_id", "is_public_domain", "artwork_type_title", "thumbnail",
];
// AIC rejects generic user agents with 403 and asks for an AIC-User-Agent header.
const UA = "Hexhibit-art-fetch/1.0 (educational project)";
const HEADERS = { "AIC-User-Agent": UA, "User-Agent": UA, Accept: "application/json" };

const log = (...a) => console.error(...a); // keep stdout clean for the JSON

async function getJson(url) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

const searchUrl = (term) =>
  `${API}/search?q=${encodeURIComponent(term)}` +
  `&query[term][is_public_domain]=true` +
  `&fields=${FIELDS.join(",")}&limit=${SEARCH_LIMIT}`;

const slug = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const exists = (p) => access(p).then(() => true, () => false);

const isJpeg = (buf) => buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

/** A candidate must be a public-domain painting with an image, then re-verified from its own record. */
const looksUsable = (a) =>
  a && a.is_public_domain === true && a.image_id && /painting/i.test(a.artwork_type_title || "");

async function verify(candidate) {
  const { data } = await getJson(`${API}/${candidate.id}?fields=${FIELDS.join(",")}`);
  return looksUsable(data) ? data : null;
}

async function download(imageId, file) {
  const url = `https://www.artic.edu/iiif/2/${imageId}/full/${IMAGE_WIDTH},/0/default.jpg`;
  const res = await fetch(url, { headers: { "AIC-User-Agent": UA, "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${res.status} downloading ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!isJpeg(buf) || buf.length < MIN_IMAGE_BYTES) throw new Error(`Not a valid JPEG: ${url}`);
  await writeFile(file, buf);
  return buf.length;
}

function toEntry(a, fileName) {
  const artist = a.artist_title || "Unknown";
  const date = a.date_display || "Unknown date";
  return {
    id: slug(a.title),
    title: a.title,
    artist,
    year: date,
    medium: a.medium_display || "Unknown medium",
    size: (a.dimensions || "").split("\n")[0].trim() || "Dimensions not recorded",
    curatorNote: "TODO: curator note that plants the clue for this painting's puzzle.",
    lesson: "TODO: lesson.",
    colors: ["#2b2b2f", "#0b0b0d"],
    image: `${IMAGE_DIR}/${fileName}`,
    alt: a.thumbnail?.alt_text || a.title,
    credit: `${artist}, ${a.title}, ${date}. ${a.credit_line || "Art Institute of Chicago"}. Art Institute of Chicago, CC0 public domain. https://www.artic.edu/artworks/${a.id}`,
    puzzle: { type: "riddle", prompt: "TODO", answers: ["TODO"], hint: "TODO", nudge: "TODO", explanation: "TODO" },
  };
}

async function main() {
  const terms = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_TERMS;
  await mkdir(OUT_DIR, { recursive: true });
  const picked = new Map(); // artwork id -> entry
  const usedSlugs = new Set();

  for (const term of terms) {
    if (picked.size >= WANTED) break;
    log(`Searching "${term}"...`);
    let results;
    try {
      results = (await getJson(searchUrl(term))).data || [];
    } catch (e) {
      log(`  search failed: ${e.message}`);
      continue;
    }
    for (const c of results) {
      if (picked.has(c.id) || !looksUsable(c)) continue;
      const id = slug(c.title || "");
      if (!id || usedSlugs.has(id)) continue;
      try {
        const verified = await verify(c);
        if (!verified) continue;
        const fileName = `${id}.jpg`;
        const bytes = (await exists(OUT_DIR + fileName)) ? 0 : await download(verified.image_id, OUT_DIR + fileName);
        log(`  saved ${fileName} (${bytes ? `${bytes} bytes` : "already present"})`);
        usedSlugs.add(id);
        picked.set(c.id, toEntry(verified, fileName));
        break; // one painting per term keeps the mood varied
      } catch (e) {
        log(`  skipped "${c.title}": ${e.message}`);
      }
    }
  }

  if (picked.size < WANTED) {
    log(`Only found ${picked.size} of ${WANTED}. Pass more search terms as arguments.`);
    process.exitCode = 1;
  }
  console.log(JSON.stringify([...picked.values()], null, 2));
}

main().catch((e) => {
  log(e);
  process.exitCode = 1;
});
