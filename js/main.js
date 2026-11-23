// Hexhibit — 3D corridor: gallery mode (light) and one-way escape room (dark)
// Content comes from the exhibition JSON (content/*.json); nothing lesson-specific lives here.
import { initModal, openDialog, closeDialog, setStatus, isOpen } from "./modal.js";
import { registry, getHandler } from "./puzzles/index.js";
import { DEFAULT_EXHIBITION_PATH, resolveExhibitionPath, loadExhibition, fillTemplate, wallFor } from "./content.js";

const PRE = 190, DOOR = 2800, DOOR_SWING_DELAY = 1600, ESCAPE_DIALOG_DELAY = 4200, SOLVED_CLOSE_DELAY = 4000;
// Prototype geometry (until task 11.3 builds the corridor from N): stops every 450px, door at DOOR.
let EX = null, P = [], CODE = "", STOPS = [], ALL = [], arts = [];
// Click assist: a painting is clickable while you are within this window of its stop
const inRange = i => { const x = S.d - STOPS[i]; return x > -330 && x < 90 }; let pending = null, lastIn = 0;
const $ = id => document.getElementById(id), world = $("world"), door = $("door");
const viewed = new Set(); let escaped = false; const solved = new Set(); let unlocked = false, mode = null, cur = 0;
const S = { d: 0, td: 0, yaw: 0, ty: 0, pit: 0, tp: 0, fy: 0, k: {} };
const root = document.documentElement, dark = () => root.dataset.theme === "dark";

// ---- Boot: resolve and load the exhibition, fall back to the default, never log to console.error ----
const fetchJson = path => fetch(path);

function showBanner(errors) {
    const b = $("banner"); b.replaceChildren();
    const head = document.createElement("p"); head.className = "banner-text";
    head.textContent = "That exhibition could not be loaded, so the default exhibition is showing.";
    const list = errors.map(e => `${e.path}: ${e.message}`);
    const ul = document.createElement("ul"); ul.className = "banner-list";
    list.slice(0, 3).forEach(t => { const li = document.createElement("li"); li.textContent = t; ul.append(li) });
    const body = document.createElement("div"); body.className = "banner-body"; body.append(head, ul);
    if (list.length > 3) {
        const d = document.createElement("details"), s = document.createElement("summary"), rest = document.createElement("ul");
        s.textContent = `Show all (${list.length})`; rest.className = "banner-list";
        list.forEach(t => { const li = document.createElement("li"); li.textContent = t; rest.append(li) });
        d.append(s, rest); body.append(d);
    }
    const x = document.createElement("button"); x.type = "button"; x.className = "banner-x"; x.setAttribute("aria-label", "Dismiss message"); x.textContent = "×";
    x.onclick = () => { b.hidden = true; b.replaceChildren() };
    b.append(body, x); b.hidden = false;
}

function showFatal(errors) {
    const f = $("fatal"); f.replaceChildren();
    const h = document.createElement("h2"); h.textContent = "The gallery is closed";
    const p = document.createElement("p");
    p.textContent = "The exhibition could not be loaded. Serve this folder from a static web server (file:// does not work) and reload the page.";
    f.append(h, p);
    errors.slice(0, 3).forEach(e => { const q = document.createElement("p"); q.className = "meta"; q.textContent = `${e.path}: ${e.message}`; f.append(q) });
    f.hidden = false;
}

async function loadExhibitionOrDefault() {
    const r = resolveExhibitionPath(location.search, location.href);
    let bannerErrors = null;
    if (r.ok && r.path) {
        const res = await loadExhibition(r.path, fetchJson, registry);
        if (res.ok) return { res }; bannerErrors = res.errors
    } else if (!r.ok) bannerErrors = [{ path: "?exhibition", message: r.reason }];
    const def = await loadExhibition(DEFAULT_EXHIBITION_PATH, fetchJson, registry);
    return def.ok ? { res: def, bannerErrors } : { fatal: def.errors, bannerErrors }
}

async function boot() {
    try {
        const out = await loadExhibitionOrDefault();
        if (out.fatal) { showFatal(out.fatal); return }
        if (out.bannerErrors) showBanner(out.bannerErrors);
        EX = out.res.exhibition; CODE = out.res.doorCode; P = EX.artworks;
        STOPS = P.map((_, i) => 450 * (i + 1) - PRE); ALL = [...STOPS, DOOR];
        document.title = `Hexhibit — ${EX.title}`;
        buildPaintings(); slots();
        let saved = null; try { saved = localStorage.getItem("hx-theme") } catch (e) { }
        theme(saved === "dark" ? "dark" : "light");
        tick();
    } catch (err) {
        showFatal([{ path: "(boot)", message: String(err && err.message || err) }]);
    }
}

// Build paintings (prototype layout: alternate left/right, 450px apart)
function buildPaintings() {
    P.forEach((p, i) => {
        const side = i % 2 ? 1 : -1, f = document.createElement("figure"); f.className = "artwork"; f.tabIndex = 0;
        f.style.cssText = `--x:${side * 244}px;--z:${-450 * (i + 1)}px;--ry:${-side * 90}deg`;
        const art = document.createElement("div"); art.className = "art";
        art.style.background = `radial-gradient(circle at 50% 40%,${p.colors[0]},transparent 55%),linear-gradient(160deg,${p.colors[0]}55,${p.colors[1]})`;
        const cap = document.createElement("figcaption"); cap.textContent = p.title;
        f.append(art, cap);
        f.onclick = () => pick(i); f.onkeydown = e => { if (e.key === "Enter") pick(i) }; world.appendChild(f)
    });
    arts = [...document.querySelectorAll(".artwork")];
}
function slots() {
    const n = P.length, s = $("slots"); s.replaceChildren();
    P.forEach((p, i) => { const e = document.createElement("span"); e.className = "slot" + (solved.has(i) ? " on" : ""); e.textContent = solved.has(i) ? p.puzzle.digit : "•"; s.append(e) });
    const dk = dark(); s.style.display = dk ? "" : "none"; $("prog").textContent = dk ? `${solved.size}/${n} solved` : `${viewed.size}/${n} artworks viewed`
}
// Theme
function theme(t) {
    root.dataset.theme = t; const b = $("theme"), lock = t === "dark" && !escaped;
    b.textContent = t === "dark" ? (escaped ? "Back to gallery" : "Locked in") : "Enter escape room →"; b.disabled = lock; b.style.opacity = lock ? .6 : 1;
    slots(); try { localStorage.setItem("hx-theme", lock ? "dark" : "light") } catch (e) { }
}
// Modal (shell lives in js/modal.js)
initModal($("modal"), { onClose: () => { mode = null; getAns = null } });
let getAns = null;
// Answer field builder for the door dialog.
const inputBody = (placeholder, inputMode) => box => {
    const inp = document.createElement("input");
    inp.autocomplete = "off"; inp.placeholder = placeholder; inp.inputMode = inputMode; inp.setAttribute("aria-label", "Your answer");
    inp.onkeydown = e => { if (e.key === "Enter") check() };
    box.append(inp); getAns = () => inp.value; return { focus: () => inp.focus() }
};
function show(t, a, l, q, img, pl, actions, body) {
    openDialog({ title: t, meta: a, image: img != null ? { colors: P[img].colors } : null, lines: l ? [].concat(l) : [], callout: q, plaque: pl, body, actions })
}
const closeBtn = label => ({ label, onClick: closeDialog });
function maxD() { return dark() && unlocked ? 2950 : DOOR }
function pick(i) {
    if (!inRange(i)) { S.td = STOPS[i]; pending = i; return } pending = null;
    cur = i; const p = P[i], pz = p.puzzle;
    if (!dark()) {
        mode = "info"; viewed.add(i); arts[i].classList.add("done"); slots();
        show(p.title, `${p.artist}, ${p.year}`, p.lesson, "Curator’s note: " + p.curatorNote, i, [["Medium", p.medium], ["Size", p.size], ["On view", wallFor(i)]], [closeBtn("Continue")]); return
    }
    mode = "art";
    if (solved.has(i)) { show(p.title, `${p.artist}, ${p.year}`, null, `${pz.explanation} Digit: ${pz.digit}.`, null, null, [closeBtn("Continue")]); return }
    const handler = getHandler(pz.type), acts = [{ label: "Check", onClick: check }, { label: "Hint", ghost: true, onClick: hint }];
    show(p.title, `${p.artist}, ${p.year}`, null, null, null, null, acts, box => {
        const h = handler.render(box, pz, { idPrefix: `art${i}`, onSubmit: check }); getAns = h.getAnswer; return h
    })
}
door.onclick = () => {
    if (S.d < DOOR - 200) { S.td = DOOR; return }
    const m = EX.messages, n = P.length, found = fillTemplate(m.digitsFound, { found: solved.size, total: n });
    if (!dark()) { mode = "info"; show("The Archive", "Staff only", m.staffOnly, null, null, null, [closeBtn("Continue")]); return }
    if (unlocked) { door.classList.toggle("open"); return }
    mode = "door"; show("The Archive Door", `Sealed with a ${n}-digit lock`, [m.doorLocked, found], `Enter the ${n}-digit code.`, null, null, [{ label: "Check", onClick: check }], inputBody("•".repeat(n), "numeric"))
};
$("theme").onclick = () => {
    if (dark()) { if (escaped) home(); return }
    mode = "enter"; show("Enter the escape room?", "There’s no going back", EX.messages.enterEscape, "Are you sure?", null, null,
        [{ label: "Step inside", onClick: () => { closeDialog(); theme("dark") } }, { label: "Stay in the gallery", ghost: true, onClick: closeDialog }])
};
function home() { closeDialog(); solved.clear(); viewed.clear(); unlocked = false; escaped = false; $("lock").textContent = "LOCKED"; door.classList.remove("open"); arts.forEach(a => a.classList.remove("done")); S.td = 0; theme("light") }
function check() {
    const v = getAns ? getAns() : null, n = P.length, m = EX.messages;
    if (mode === "art") {
        const pz = P[cur].puzzle;
        if (solved.has(cur)) return closeDialog();
        if (getHandler(pz.type).evaluate(pz, v) === "correct") {
            solved.add(cur); arts[cur].classList.add("done"); slots(); setStatus(`${pz.explanation} Digit ${pz.digit} revealed.`, "ok"); setTimeout(closeDialog, SOLVED_CLOSE_DELAY); return
        }
        setStatus(pz.nudge, "bad"); return
    }
    if (typeof v === "string" && v.trim() === CODE) {
        if (solved.size < n) { setStatus(fillTemplate(m.digitsFound, { found: solved.size, total: n }), "bad"); return }
        unlocked = true; $("lock").textContent = "UNLOCKED"; closeDialog(); S.td = 2950; setTimeout(() => door.classList.add("open"), DOOR_SWING_DELAY);
        setTimeout(() => { escaped = true; theme("dark"); mode = "escaped"; show("You escaped!", "Hexhibit — Escape complete", m.escaped, "Return to the gallery, or stay a moment in the corridor.", null, null, [{ label: "Return to the gallery", onClick: home }, { label: "Stay a moment", ghost: true, onClick: closeDialog }]) }, ESCAPE_DIALOG_DELAY); return
    }
    setStatus(m.doorNudge, "bad")
}
function hint() { setStatus(P[cur].puzzle.hint, "hint") }
// Movement
addEventListener("keydown", e => { if (e.key === "Escape" || isOpen()) return; S.k[e.key.toLowerCase()] = 1 });
addEventListener("keyup", e => S.k[e.key.toLowerCase()] = 0);
addEventListener("mousemove", e => { if (isOpen()) return; if (e.target.closest && e.target.closest(".artwork")) return; S.ty = (e.clientX / innerWidth * 2 - 1) * 12; S.tp = -(e.clientY / innerHeight * 2 - 1) * 6 });
addEventListener("wheel", e => { if (!isOpen()) { S.td += e.deltaY * .9; pending = null; lastIn = performance.now() } }, { passive: true });
function step(dir) {
    pending = null; const n = ALL.findIndex(s => dir > 0 ? s > S.td + 20 : false);
    if (dir > 0) { S.td = n < 0 ? maxD() : ALL[n] } else { const p = [...ALL].reverse().find(s => s < S.td - 20); S.td = p === undefined ? 0 : p }
}
$("next").onclick = () => step(1); $("prev").onclick = () => step(-1);
function tick() {
    const open = isOpen();
    if (!open) { if (S.k.w || S.k.arrowup || S.k.s || S.k.arrowdown) { pending = null; lastIn = performance.now() } if (S.k.w || S.k.arrowup) S.td += 16; if (S.k.s || S.k.arrowdown) S.td -= 16 }
    S.td = Math.max(0, Math.min(maxD(), S.td));
    if (!open && performance.now() - lastIn > 400) { const k = ALL.findIndex(s => Math.abs(S.td - s) < 110); if (k >= 0) S.td = ALL[k] }
    S.d += (S.td - S.d) * .1; S.yaw += (S.ty - S.yaw) * .08; S.pit += (S.tp - S.pit) * .08;
    // Turn to face the painting you are stopped at
    let fw = 0, fs = 0; STOPS.forEach((s, i) => { const w = Math.max(0, 1 - Math.abs(S.d - s) / 150); if (w > fw) { fw = w; fs = i % 2 ? 1 : -1 } }); S.fy += (fs * 50 * fw - S.fy) * .1;
    if (pending !== null && !open && Math.abs(S.d - STOPS[pending]) < 12) { const i = pending; pending = null; pick(i) }
    const sc = innerWidth < innerHeight ? Math.max(.7, Math.min(1.1, innerHeight / 800)) : Math.max(.5, Math.min(1.25, Math.min(innerWidth / 900, innerHeight / 640)));
    world.style.transform = `scale(${sc}) translateZ(750px) rotateX(${S.pit.toFixed(2)}deg) rotateY(${(S.yaw + S.fy).toFixed(2)}deg) translateZ(${S.d.toFixed(2)}px)`;
    arts.forEach((a, i) => { a.classList.toggle("near", inRange(i)); a.classList.toggle("focus", Math.abs(S.d - STOPS[i]) < 60) });
    door.classList.toggle("near", (!dark() || !unlocked) && S.d > DOOR - 200);
    requestAnimationFrame(tick)
}
boot();
