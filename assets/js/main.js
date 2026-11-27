// Hexhibit — 3D corridor: gallery mode (light) and one-way escape room (dark)
// Content comes from the exhibition JSON (content/*.json); nothing lesson-specific lives here.
import { initModal, openDialog, closeDialog, setStatus, isOpen } from "./modal.js";
import { registry, getHandler } from "./puzzles/index.js";
import { buildCorridor } from "./corridor.js";
import { buildGallery } from "./gallery.js";
import { initFlashlight } from "./flashlight.js";
import { createState, themeFor, enterEscape, markSolved, submitCode, returnToGallery, markViewed, revealHint, revealedDigit } from "./state.js";
import { DEFAULT_EXHIBITION_PATH, resolveExhibitionPath, resolveModeParameter, loadExhibition, applyUiDefaults, fillTemplate, wallFor } from "./content.js";
import { readSavedGame, restoreGameState, writeSavedGame, clearSavedGame } from "./session.js";
import { initBackGuard } from "./back-guard.js";

// Door swing starts once the camera has walked to the exit stop; the escaped dialog follows the swing (~1.4s).
const DOOR_SWING_DELAY = 1600, ESCAPE_DIALOG_DELAY = 4200;
// Reduced motion: no walk or swing animation, so only a short pause before each step.
const DOOR_SWING_DELAY_REDUCED = 150, ESCAPE_DIALOG_DELAY_REDUCED = 400;
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Shown when the code is entered before every puzzle is solved (no matching key in the exhibition messages).
const SOLVE_FIRST_TEXT = "Solve every puzzle first.";
// Shown when the lock cannot be set (no crypto, or the generator threw).
const LOCK_FAILED_TEXT = "The lock would not set. Please try again.";
// Announced when Back is pressed during After-Hours (the gallery doors are sealed until the exit code is solved).
const BACK_SEALED_TEXT = "The gallery doors are sealed. Solve the exit code to leave.";
// Random_Source for the generator: one byte per call from the browser CSPRNG. No Math.random fallback:
// if crypto is missing, enterEscape throws and the player stays in the gallery.
const byteSource = () => { const b = new Uint8Array(1); window.crypto.getRandomValues(b); return b[0] };
// Corridor camera, paintings and door live in assets/js/corridor.js; main.js owns state and dialogs.
let EX = null, P = [], corridor = null, gallery = null, flashlight = null;
const $ = id => document.getElementById(id);
// S is the single source of truth for phase, viewed and solved. Only render() writes the DOM that mirrors it.
let S = null, busy = false, mode = null, cur = 0;
// lastPhase lets render() detect the gallery -> after-hours change; resumed marks a restored saved game.
let lastPhase = "gallery", resumed = false, galleryHint = null;
const root = document.documentElement, dark = () => themeFor(S.phase) === "dark";
const isSolved = i => S.solved.has(P[i].id);
// ---- Boot: resolve and load the exhibition, fall back to the default, never log to console.error ----
const fetchJson = path => fetch(path);

function showBanner(errors, headText = "That exhibition could not be loaded, so the default exhibition is showing.") {
    const b = $("banner"); b.replaceChildren();
    const head = document.createElement("p"); head.className = "banner-text";
    head.textContent = headText;
    const list = errors.map(e => `${e.path}: ${e.message}`);
    const ul = document.createElement("ul"); ul.className = "banner-list";
    list.slice(0, 3).forEach(t => { const li = document.createElement("li"); li.textContent = t; ul.append(li) });
    const body = document.createElement("div"); body.className = "banner-body"; body.append(head); if (list.length) body.append(ul);
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
    const def = await loadExhibition(DEFAULT_EXHIBITION_PATH, fetchJson, registry);
    // Every exhibition gets a complete ui object: missing keys come from the default exhibition.
    const complete = res => ({ ok: true, exhibition: applyUiDefaults(res.exhibition, def.ok ? def.exhibition : null) });
    if (r.ok && r.path) {
        const res = await loadExhibition(r.path, fetchJson, registry);
        if (res.ok) return { res: complete(res) }; bannerErrors = res.errors
    } else if (!r.ok) bannerErrors = [{ path: "?exhibition", message: r.reason }];
    return def.ok ? { res: complete(def), bannerErrors } : { fatal: def.errors, bannerErrors }
}

async function boot() {
    try {
        const out = await loadExhibitionOrDefault();
        if (out.fatal) { showFatal(out.fatal); return }
        if (out.bannerErrors) showBanner(out.bannerErrors);
        EX = out.res.exhibition; P = EX.artworks;
        document.title = `Hexhibit — ${EX.title}`;
        S = createState(P.map(a => a.id));
        const entered = applySavedOrDirectEntry();
        flashlight = initFlashlight(document.querySelector(".vig"), { reducedMotion: prefersReducedMotion });
        corridor = buildCorridor(EX, { onArtwork: pick, onDoor: openDoorDialog, onFocusElement: rect => flashlight.centerOn(rect) }, { isBlocked: isOpen });
        makeGallery();
        render();
        // A restored game brings its solved set; show those SOLVED markers on the corridor paintings.
        if (entered) { P.forEach((p, i) => { if (isSolved(i)) corridor.markDone(i) }); corridor.goToEntrance(); stripModeParam() }
    } catch (err) {
        showFatal([{ path: "(boot)", message: String(err && err.message || err) }]);
    }
}

// Restore a saved in-progress game, else honour ?mode=afterhours (Direct_Entry). Returns true when the phase left gallery.
// Runs against the exhibition the loader returned, so a default fallback for a bad ?exhibition= is covered too.
function applySavedOrDirectEntry() {
    const ids = P.map(a => a.id), saved = readSavedGame(ids), restored = saved ? restoreGameState(saved, ids) : null;
    if (restored) { S = restored; resumed = true; return true }
    if (resolveModeParameter(location.search) !== "afterhours") return false;
    try { enterEscape(S, byteSource) } catch { showBanner([], LOCK_FAILED_TEXT); return false }
    writeSavedGame(S); return true
}
// Remove only the mode parameter; the door code is never placed in the URL.
function stripModeParam() {
    try {
        const u = new URL(location.href); u.searchParams.delete("mode");
        history.replaceState(null, "", u.pathname + u.search + u.hash)
    } catch { /* URL cleanup is cosmetic */ }
}

// Daylight Gallery: Frame activation opens the plaque, the Escape_CTA opens the confirmation dialog.
function makeGallery() {
    if (gallery) gallery.destroy();
    gallery = buildGallery(EX, { onArtwork: pick, onEscape: confirmEscape }, { viewed: [...S.viewed].map(id => P.findIndex(a => a.id === id)).filter(i => i >= 0) });
}
// Hint bar: ui.afterHoursHint while After-Hours runs, the original (HTML) hint in the gallery.
function syncHint(inGallery) {
    const h = document.querySelector(".bar .hint"); if (!h) return;
    if (galleryHint === null) galleryHint = h.textContent;
    h.textContent = inGallery ? galleryHint : (EX.ui.afterHoursHint || galleryHint)
}
// Announce on every gallery -> after-hours change (confirmation, direct entry, restore); a restore also says it was resumed.
function announceModeChange(inGallery) {
    const was = lastPhase; lastPhase = S.phase;
    if (was !== "gallery" || inGallery) return;
    const parts = [EX.ui.modeAnnouncement]; if (resumed) parts.push(EX.ui.sessionResumed);
    resumed = false; $("mode-status").replaceChildren(parts.filter(Boolean).join(" "));
}
// The one place that writes state-derived DOM: theme, view visibility, flashlight, progress, door-code slots, lock label.
function render() {
    const n = P.length, ph = S.phase, dk = themeFor(ph) === "dark", s = $("slots");
    root.dataset.theme = themeFor(ph);
    const inGallery = ph === "gallery", stage = $("stage");
    gallery.setVisible(inGallery);
    stage.hidden = inGallery; stage.inert = inGallery;
    flashlight.setActive(dk);
    syncHint(inGallery); announceModeChange(inGallery); backGuard.arm();
    // Hiding the gallery drops keyboard focus to <body>; hand it to Next so keyboard users keep their place.
    if (!inGallery && $("daylight-gallery").contains(document.activeElement)) $("next").focus();
    s.replaceChildren();
    P.forEach((p, i) => { const d = revealedDigit(S, i), e = document.createElement("span"); e.className = "slot" + (d !== null ? " on" : ""); e.textContent = d ?? "•"; s.append(e) });
    s.style.display = dk ? "" : "none";
    $("prog").textContent = dk ? `${S.solved.size}/${n} solved` : `${S.viewed.size}/${n} artworks viewed`;
    const open = ph === "escaped"; corridor.setLockLabel(open ? EX.ui.unlockedLabel : EX.ui.lockedLabel); corridor.setDoorOpenable(open)
}
// ---- Back-button guard and bfcache restore: After-Hours is one-way until the player escapes ----
const inAfterHours = () => !!S && (S.phase === "escape" || S.phase === "solved");
// Clear then set on the next tick so screen readers announce a repeated message on every Back press.
function announceSealed() { const st = $("mode-status"); st.replaceChildren(); setTimeout(() => st.replaceChildren(BACK_SEALED_TEXT), 50) }
const backGuard = initBackGuard({ isActive: inAfterHours, onBlocked: announceSealed });
// Mobile browsers restore play.html from the bfcache without re-running boot(), so the live state can be stale
// (for example a gallery page from before the escape began). Re-check the Session_Store and restore in place.
window.addEventListener("pageshow", e => {
    if (!e.persisted || !S || !corridor) return;
    const ids = P.map(a => a.id), saved = readSavedGame(ids), restored = saved ? restoreGameState(saved, ids) : null;
    backGuard.reset();
    if (!restored) { backGuard.arm(); return }
    if (isOpen()) closeDialog();
    const wasGallery = S.phase === "gallery";
    S = restored; resumed = wasGallery; busy = false;
    corridor.reset(); P.forEach((p, i) => { if (isSolved(i)) corridor.markDone(i) }); corridor.goToEntrance();
    render();
});
// Modal (shell lives in assets/js/modal.js)
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
    openDialog({ returnFocusTo, title: t, meta: a, image: img != null ? { colors: P[img].colors, artwork: P[img] } : null, lines: l ? [].concat(l) : [], callout: q, plaque: pl, body, actions })
}
const closeBtn = label => ({ label, onClick: closeDialog });
function pick(i) {
    cur = i; const p = P[i], pz = p.puzzle;
    // Return focus to the painting even when the dialog opened after a camera walk (focus may be elsewhere then).
    const art = document.querySelectorAll(dark() ? ".artwork" : "#daylight-gallery .frame")[i];
    if (!dark()) {
        // Viewing is a gallery-only mark; corridor.markDone means SOLVED and is set only by puzzles.
        mode = "info"; markViewed(S, p.id); gallery.markViewed(i); render();
        show(p.title, `${p.artist}, ${p.year}`, p.lesson, "Curator’s note: " + p.curatorNote, i, [["Medium", p.medium], ["Size", p.size], ["On view", wallFor(i)]], [closeBtn("Continue")], null, art); return
    }
    mode = "art";
    if (isSolved(i)) { show(p.title, `${p.artist}, ${p.year}`, null, null, null, null, [closeBtn("Continue")], null, art); setStatus(`${pz.explanation} Digit ${revealedDigit(S, i)}.`, "ok"); return }
    const handler = getHandler(pz.type), acts = [{ label: "Check", onClick: check }, { label: "Hint", ghost: true, onClick: hint }];
    show(p.title, `${p.artist}, ${p.year}`, null, null, null, null, acts, box => {
        const h = handler.render(box, pz, { idPrefix: `art${i}`, onSubmit: check }); getAns = h.getAnswer; return h
    }, art)
}
function openDoorDialog() {
    const m = EX.messages, n = P.length, found = fillTemplate(m.digitsFound, { found: S.solved.size, total: n });
    if (busy) return;
    if (!dark()) { mode = "info"; show("The Exit", "", m.exitClosed, null, null, null, [closeBtn("Continue")]); return }
    if (S.phase === "escaped") { showEscaped(m.doorUnlocked); return }
    mode = "door"; show("The Exit Door", `Sealed with a ${n}-digit lock`, [m.doorLocked, found], `Enter the ${n}-digit code.`, null, null, [{ label: "Check", onClick: check }], inputBody("•".repeat(n), "numeric"))
}
// Escape_CTA handler (gallery phase only; the gallery is hidden and inert otherwise).
function confirmEscape() {
    if (dark()) return;
    mode = "enter"; show("Enter the escape room?", "There’s no going back", EX.messages.enterEscape, "Are you sure?", null, null,
        [{ label: "Step inside", onClick: () => { try { enterEscape(S, byteSource) } catch { setStatus(LOCK_FAILED_TEXT, "info"); return } writeSavedGame(S); closeDialog(); render() } }, { label: "Stay in the gallery", ghost: true, onClick: closeDialog }])
}
// Instant walk back: the world is re-rendered in the light theme, so easing across the corridor would show a lit, empty hall mid-flight.
function home() { closeDialog(); clearSavedGame(); returnToGallery(S); makeGallery(); corridor.reset(); corridor.goToEntrance(); render() }
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
            markSolved(S, P[cur].id); writeSavedGame(S); corridor.markDone(cur); render();
            // Rebuild the dialog without the answer area, Check and Hint; the player dismisses it with Continue.
            const p = P[cur]; getAns = null;
            show(p.title, `${p.artist}, ${p.year}`, null, null, null, null, [closeBtn("Continue")]);
            setStatus(`${pz.explanation} Digit ${revealedDigit(S, cur)} revealed.`, "ok"); return
        }
        setStatus(pz.nudge, "bad"); return
    }
    const res = submitCode(S, typeof v === "string" ? v : "");
    if (res === "unsolved") { setStatus(`${SOLVE_FIRST_TEXT} ${fillTemplate(m.digitsFound, { found: S.solved.size, total: n })}`, "bad"); return }
    if (res === "correct") {
        clearSavedGame(); // synchronous and first: a reload during the door swing must not restore the finished game
        const reduced = prefersReducedMotion();
        busy = true; render(); closeDialog(); corridor.walkTo(Infinity); setTimeout(() => corridor.openDoor(), reduced ? DOOR_SWING_DELAY_REDUCED : DOOR_SWING_DELAY);
        setTimeout(() => { busy = false; render(); showEscaped(m.escaped) }, reduced ? ESCAPE_DIALOG_DELAY_REDUCED : ESCAPE_DIALOG_DELAY); return
    }
    setStatus(m.doorNudge, "bad")
}
// One hint per puzzle: revealHint is idempotent (a Set), so pressing again re-shows the text with no state change.
function hint() { const p = P[cur]; revealHint(S, p.id); writeSavedGame(S); setStatus(p.puzzle.hint, "hint") }
boot();
