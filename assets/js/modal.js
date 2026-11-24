// Hexhibit dialog shell. One #modal, one .card; content is rebuilt per openDialog call.
// All text is written with textContent so exhibition data can never inject markup.

const INERT_SELECTOR = ".top, .viewport, .bar";
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const FALLBACK_FOCUS_ID = "next";
const HEADING_ID = "mt";
// Plain-text labels so feedback is never conveyed by color alone.
const STATUS_PREFIX = { bad: "Not quite. ", ok: "Correct. ", hint: "Hint: ", info: "" };

let rootEl = null, cardEl = null, dynEl = null, fbEl = null, closeBtn = null;
let opener = null, onCloseCb = null, open = false;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
}

// Same gradient construction as the prototype. Colors are validated #rrggbb upstream.
function gradientFor(colors) {
    return `radial-gradient(circle at 50% 40%,${colors[0]},transparent 55%),linear-gradient(160deg,${colors[0]}55,${colors[1]})`;
}

function setInert(on) {
    document.querySelectorAll(INERT_SELECTOR).forEach(n => { if (on) n.setAttribute("inert", ""); else n.removeAttribute("inert"); });
}

function focusables() {
    return [...cardEl.querySelectorAll(FOCUSABLE)].filter(n => !n.hidden && n.offsetParent !== null);
}

function onKeydown(e) {
    if (!open) return;
    if (e.key === "Escape") { e.preventDefault(); closeDialog(); return; }
    if (e.key !== "Tab") return;
    // Fallback for engines without `inert`: keep Tab inside the card.
    const list = focusables();
    if (!list.length) { e.preventDefault(); return; }
    const first = list[0], last = list[list.length - 1], active = document.activeElement;
    if (!cardEl.contains(active)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
}

export function initModal(modalEl, { onClose } = {}) {
    rootEl = modalEl;
    cardEl = modalEl.querySelector(".card");
    dynEl = modalEl.querySelector("#mdyn");
    fbEl = modalEl.querySelector("#fb");
    closeBtn = modalEl.querySelector("#close");
    onCloseCb = onClose || null;
    closeBtn.addEventListener("click", closeDialog);
    modalEl.addEventListener("click", e => { if (e.target === modalEl) closeDialog(); });
    document.addEventListener("keydown", onKeydown);
}

export function isOpen() { return open; }

/**
 * spec: { title, meta?, image?:{colors}, lines?:string[], callout?:string, plaque?:[label,value][],
 *         body?:(container)=>{focus?():void}, actions:[{label, ghost?, onClick}],
 *         statusText?, returnFocusTo?:HTMLElement }
 */
export function openDialog(spec) {
    if (!open) opener = spec.returnFocusTo || document.activeElement;
    dynEl.replaceChildren();
    if (spec.image) {
        const img = el("div", "art");
        img.style.background = gradientFor(spec.image.colors);
        dynEl.append(img);
    }
    const h = el("h2", null, spec.title); h.id = HEADING_ID;
    dynEl.append(h);
    cardEl.setAttribute("aria-labelledby", HEADING_ID);
    if (spec.meta) dynEl.append(el("p", "meta", spec.meta));
    (spec.lines || []).forEach(t => dynEl.append(el("p", "lore", t)));
    if (spec.plaque && spec.plaque.length) {
        const dl = el("dl", "plaque");
        spec.plaque.forEach(([k, v]) => { dl.append(el("dt", null, k), el("dd", null, v)); });
        dynEl.append(dl);
    }
    if (spec.callout) dynEl.append(el("div", "q", spec.callout));
    let handle = null;
    if (spec.body) { const box = el("div", "mbody"); dynEl.append(box); handle = spec.body(box) || null; }
    const row = el("div", "row");
    (spec.actions || []).forEach(a => {
        const b = el("button", a.ghost ? "btn ghost" : "btn", a.label);
        b.type = "button"; b.addEventListener("click", a.onClick); row.append(b);
    });
    dynEl.append(fbEl, row);
    fbEl.className = "fb"; fbEl.textContent = spec.statusText || "";

    open = true;
    rootEl.classList.add("open"); rootEl.setAttribute("aria-hidden", "false");
    setInert(true);
    // Delay one tick so the modal is displayed before focusing.
    setTimeout(() => {
        if (!open) return;
        if (handle && handle.focus) { handle.focus(); return; }
        const first = dynEl.querySelector(FOCUSABLE);
        (first || closeBtn).focus();
    }, 0);
}

export function closeDialog() {
    if (!open) return;
    open = false;
    rootEl.classList.remove("open"); rootEl.setAttribute("aria-hidden", "true");
    setInert(false);
    const target = opener && opener.isConnected ? opener : null;
    opener = null;
    if (target) target.focus();
    if (!target || document.activeElement !== target) { const f = document.getElementById(FALLBACK_FOCUS_ID); if (f) f.focus(); }
    if (onCloseCb) onCloseCb();
}

export function setStatus(text, kind = "info") {
    const k = kind in STATUS_PREFIX ? kind : "info";
    fbEl.className = "fb " + k;
    fbEl.textContent = STATUS_PREFIX[k] + text;
    if (k === "bad" && !reducedMotion()) {
        cardEl.classList.remove("shake"); void cardEl.offsetWidth; cardEl.classList.add("shake");
    }
}
