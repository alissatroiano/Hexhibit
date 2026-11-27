// Back-button guard for After-Hours: the escape room is one-way, so Back must not leave play.html.
// It pushes one sentinel history entry with the current URL unchanged; Back then pops that entry
// instead of leaving the page, and the guard re-pushes it. The URL never changes and no game data
// (in particular the door code) is placed in history state.
const GUARD_STATE = { hexhibitGuard: true };

// isActive(): true while the player must stay (escape or solved phase). onBlocked(): Back was absorbed.
export function initBackGuard({ isActive, onBlocked }) {
  let armed = false;
  const push = () => {
    try { history.pushState(GUARD_STATE, "", location.href); return true } catch { return false }
  };
  window.addEventListener("popstate", () => {
    // The sentinel was just popped. Outside After-Hours, let history behave normally from here on.
    if (!isActive()) { armed = false; return }
    armed = push();
    onBlocked();
  });
  return {
    // Idempotent: arms once per document while After-Hours is active.
    arm() { if (!armed && isActive()) armed = push() },
    // After a bfcache restore the history position may have moved; re-arm on the next arm().
    reset() { armed = false },
  };
}
