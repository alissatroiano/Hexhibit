// Intro-video playback, mute toggle, and reveal for the Hexhibit landing page (index.html).
// No persistence: nothing here reads or writes localStorage, sessionStorage, cookies, or the URL.

const MUTE_LABEL = "MUTE";
const UNMUTE_LABEL = "UNMUTE";
const FADE_OUT_MS = 850; // matches the .fade-out transition duration in landing.css

/** True when the visitor has asked for reduced motion. Read on each call so it tracks live changes. */
export function prefersReducedMotion() {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Flips the video's muted state and syncs the button label and aria-pressed.
 * Never calls play() or pause() and never touches currentTime, so playback continues untouched.
 * Returns the new muted value.
 */
export function toggleMute(video, button) {
  video.muted = !video.muted;
  button.textContent = video.muted ? UNMUTE_LABEL : MUTE_LABEL;
  button.setAttribute("aria-pressed", String(!video.muted));
  return video.muted;
}

/**
 * Returns a reveal() function that fades out and removes the intro overlay.
 * It has its own done flag, so repeated or racing triggers (ended, error, rejected play, Skip)
 * have an effect only the first time.
 */
export function createReveal(wrapper, video) {
  let done = false;
  return function reveal() {
    if (done) return;
    done = true;
    video.pause();
    if (prefersReducedMotion()) {
      wrapper.remove();
      return;
    }
    wrapper.classList.add("fade-out");
    setTimeout(() => wrapper.remove(), FADE_OUT_MS);
  };
}

/** Wires the intro overlay. Returns early if any required element is missing. */
export function initLandingIntro(doc = document) {
  const wrapper = doc.getElementById("videoIntroWrapper");
  const video = doc.getElementById("introVideo");
  const skipBtn = doc.getElementById("skipIntroBtn");
  const muteBtn = doc.getElementById("muteToggleBtn");
  if (!wrapper || !video || !skipBtn || !muteBtn) return;

  const reveal = createReveal(wrapper, video);

  // The video starts muted so autoplay is allowed; the button offers to unmute.
  muteBtn.textContent = UNMUTE_LABEL;
  muteBtn.setAttribute("aria-pressed", "false");
  muteBtn.addEventListener("click", () => toggleMute(video, muteBtn));

  video.addEventListener("ended", reveal);
  video.addEventListener("error", reveal);
  skipBtn.addEventListener("click", reveal);

  const playResult = video.play();
  if (playResult && typeof playResult.catch === "function") {
    playResult.catch(reveal);
  }
}

if (typeof document !== "undefined") {
  initLandingIntro();
}
