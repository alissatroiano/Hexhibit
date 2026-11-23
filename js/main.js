// Hexhibit — 3D corridor: gallery mode (light) and one-way escape room (dark)
// Content comes from the exhibition JSON (content/*.json); nothing lesson-specific lives here.
import { initModal, openDialog, closeDialog, setStatus, isOpen } from "./modal.js";
import { registry, getHandler } from "./puzzles/index.js";
import { buildCorridor } from "./corridor.js";
import { createState, themeFor, enterEscape, markSolved, submitCode, returnToGallery, markViewed, revealHint } from "./state.js";
import { DEFAULT_EXHIBITION_PATH, resolveExhibitionPath, loadExhibition, fillTemplate, wallFor } from "./content.js";

// Door swing starts once the camera has walked to the exit stop; the escaped dialog follows the swing (~1.4s).
const DOOR_SWING_DELAY = 1600, ESCAPE_DIALOG_DELAY = 4200;
// Reduced motion: no walk or swing animation, so only a short pause before each step.
const DOOR_SWING_DELAY_REDUCED = 150, ESCAPE_DIALOG_DELAY_REDUCED = 400;
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Shown when the code is entered before every puzzle is solved (no matching key in the exhibition messages).
const SOLVE_FIRST_TEXT = "Solve every puzzle first.";
// Corridor camera, paintings and door live in js/corridor.js; main.js owns state and dialogs.
let EX = null, P = [], CODE = "", corridor = null;
const $ = id => document.getElementById(id);
// S is the single source of truth for phase, viewed and solved. Only render() writes the DOM that mirrors it.
let S = null, busy = false, mode = null, cur = 0;
const root = document.documentElement, dark = () => themeFor(S.phase) === "dark";
const isSolved = i => S.solved.has(P[i].id);
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
        document.title = `Hexhibit — ${EX.title}`;
        S = createState(P.map(a => a.id));
        corridor = buildCorridor(EX, { onArtwork: pick, onDoor: openDoorDialog }, { isBlocked: isOpen });
        render();
    } catch (err) {
        showFatal([{ path: "(boot)", message: String(err && err.message || err) }]);
    }
}

// The one place that writes state-derived DOM: theme, theme button, progress, door-code slots, lock label.
function render() {
    const n = P.length, ph = S.phase, dk = themeFor(ph) === "dark", s = $("slots");
    root.dataset.theme = themeFor(ph);
    const b = $("theme"), locked = ph === "escape" || ph === "solved" || busy;
    b.textContent = ph === "gallery" ? "Enter escape room →" : ph === "escaped" ? "Back to gallery" : "Locked in";
    b.disabled = locked; b.style.opacity = locked ? .6 : 1;
    // A disabled button drops keyboard focus to <body>; hand it to Next so keyboard users keep their place.
    if (locked && document.activeElement === b) $("next").focus();
    s.replaceChildren();
    P.forEach((p, i) => { const e = document.createElement("span"); e.className = "slot" + (isSolved(i) ? " on" : ""); e.textContent = isSolved(i) ? p.puzzle.digit : "•"; s.append(e) });
    s.style.display = dk ? "" : "none";
    $("prog").textContent = dk ? `${S.solved.size}/${n} solved` : `${S.viewed.size}/${n} artworks viewed`;
    const open = ph === "escaped"; corridor.setLockLabel(open ? "UNLOCKED" : "LOCKED"); corridor.setDoorOpenable(open)
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
function show(t, a, l, q, img, pl, actions, body, returnFocusTo) {
    openDialog({ returnFocusTo, title: t, meta: a, image: img != null ? { colors: P[img].colors } : null, lines: l ? [].concat(l) : [], callout: q, plaque: pl, body, actions })
}
const closeBtn = label => ({ label, onClick: closeDialog });
function pick(i) {
    cur = i; const p = P[i], pz = p.puzzle;
    // Return focus to the painting even when the dialog opened after a camera walk (focus may be elsewhere then).
    const art = document.querySelectorAll(".artwork")[i];
    if (!dark()) {
        mode = "info"; markViewed(S, p.id); corridor.markDone(i); render();
        show(p.title, `${p.artist}, ${p.year}`, p.lesson, "Curator’s note: " + p.curatorNote, i, [["Medium", p.medium], ["Size", p.size], ["On view", wallFor(i)]], [closeBtn("Continue")], null, art); return
    }
    mode = "art";
    if (isSolved(i)) { show(p.title, `${p.artist}, ${p.year}`, null, null, null, null, [closeBtn("Continue")], null, art); setStatus(`${pz.explanation} Digit ${pz.digit}.`, "ok"); return }
    const handler = getHandler(pz.type), acts = [{ label: "Check", onClick: check }, { label: "Hint", ghost: true, onClick: hint }];
    show(p.title, `${p.artist}, ${p.year}`, null, null, null, null, acts, box => {
        const h = handler.render(box, pz, { idPrefix: `art${i}`, onSubmit: check }); getAns = h.getAnswer; return h
    }, art)
}
function openDoorDialog() {
    const m = EX.messages, n = P.length, found = fillTemplate(m.digitsFound, { found: S.solved.size, total: n });
    if (busy) return;
    if (!dark()) { mode = "info"; show("The Archive", "Staff only", m.staffOnly, null, null, null, [closeBtn("Continue")]); return }
    if (S.phase === "escaped") { showEscaped(m.doorUnlocked); return }
    mode = "door"; show("The Archive Door", `Sealed with a ${n}-digit lock`, [m.doorLocked, found], `Enter the ${n}-digit code.`, null, null, [{ label: "Check", onClick: check }], inputBody("•".repeat(n), "numeric"))
}
$("theme").onclick = () => {
    if (dark()) { if (S.phase === "escaped" && !busy) home(); return }
    mode = "enter"; show("Enter the escape room?", "There’s no going back", EX.messages.enterEscape, "Are you sure?", null, null,
        [{ label: "Step inside", onClick: () => { closeDialog(); enterEscape(S); render() } }, { label: "Stay in the gallery", ghost: true, onClick: closeDialog }])
};
// Instant walk back: the world is re-rendered in the light theme, so easing across the corridor would show a lit, empty hall mid-flight.
function home() { closeDialog(); returnToGallery(S); corridor.reset(); corridor.walkTo(0, { instant: true }); render() }
// Escaped dialog, shared by the escape sequence and the unlocked door. "Stay a moment" leaves the phase escaped.
function showEscaped(text) {
    mode = "escaped"; show("You escaped!", "Hexhibit — Escape complete", text, "Return to the gallery, or stay a moment in the corridor.", null, null, [{ label: "Return to the gallery", onClick: home }, { label: "Stay a moment", ghost: true, onClick: closeDialog }])
}
function check() {
    const v = getAns ? getAns() : null, n = P.length, m = EX.messages;
    if (mode === "art") {
        const pz = P[cur].puzzle;
        if (isSolved(cur)) return closeDialog();
        if (getHandler(pz.type).evaluate(pz, v) === "correct") {
            markSolved(S, P[cur].id); corridor.markDone(cur); render();
            // Rebuild the dialog without the answer area, Check and Hint; the player dismisses it with Continue.
            const p = P[cur]; getAns = null;
            show(p.title, `${p.artist}, ${p.year}`, null, null, null, null, [closeBtn("Continue")]);
            setStatus(`${pz.explanation} Digit ${pz.digit} revealed.`, "ok"); return
        }
        setStatus(pz.nudge, "bad"); return
    }
    const res = submitCode(S, typeof v === "string" ? v : "", CODE);
    if (res === "unsolved") { setStatus(`${SOLVE_FIRST_TEXT} ${fillTemplate(m.digitsFound, { found: S.solved.size, total: n })}`, "bad"); return }
    if (res === "correct") {
        const reduced = prefersReducedMotion();
        busy = true; render(); closeDialog(); corridor.walkTo(Infinity); setTimeout(() => corridor.openDoor(), reduced ? DOOR_SWING_DELAY_REDUCED : DOOR_SWING_DELAY);
        setTimeout(() => { busy = false; render(); showEscaped(m.escaped) }, reduced ? ESCAPE_DIALOG_DELAY_REDUCED : ESCAPE_DIALOG_DELAY); return
    }
    setStatus(m.doorNudge, "bad")
}
// One hint per puzzle: revealHint is idempotent (a Set), so pressing again re-shows the text with no state change.
function hint() { const p = P[cur]; revealHint(S, p.id); setStatus(p.puzzle.hint, "hint") }
boot();
