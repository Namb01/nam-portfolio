// Music previews for the menu, like the song previews on DDR's wheel: the
// selected row's track fades in and loops, and moving to another row fades it
// out. Only one track plays at a time.
//
// Nothing plays until enableSound() is called, when the coin goes in on the
// start screen (or straight away when the start screen is skipped), so the
// music never starts behind the start screen. Browsers also only allow sound
// once the visitor has clicked, tapped or pressed a key; a track asked for
// before that waits for the first one and starts then.

const VOLUME = 0.10;
const FADE_IN_MS = 400;
const FADE_OUT_MS = 250;
const MUTE_KEY = "sound-muted";
// one-off sound effects (the coin) sit a little above the music
const EFFECT_VOLUME = 0.3;

const players = new Map<string, HTMLAudioElement>();
const fades = new WeakMap<HTMLAudioElement, ReturnType<typeof setInterval>>();

// the track the menu wants, and the one actually playing
let wanted: string | null = null;
let current: string | null = null;
let muted = readMuted();
let enabled = false;
let waiting = false;

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    // no storage (or not in a browser): sound starts on
    return false;
  }
}

function player(url: string) {
  let audio = players.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0;
    players.set(url, audio);
  }
  return audio;
}

// Ramp the volume over `ms`, replacing any fade already running on it. A
// timer rather than animation frames, so a fade still finishes if the tab is
// in the background.
function fade(audio: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  clearInterval(fades.get(audio));
  const from = audio.volume;
  const start = performance.now();
  const id = setInterval(() => {
    const t = Math.min((performance.now() - start) / ms, 1);
    audio.volume = from + (to - from) * t;
    if (t < 1) return;
    clearInterval(id);
    done?.();
  }, 16);
  fades.set(audio, id);
}

function stopCurrent() {
  if (!current) return;
  const audio = player(current);
  current = null;
  fade(audio, 0, FADE_OUT_MS, () => audio.pause());
}

function start(url: string) {
  const audio = player(url);
  current = url;
  audio
    .play()
    .then(() => {
      if (current === url) fade(audio, VOLUME, FADE_IN_MS);
    })
    .catch(() => {
      // Not allowed yet (no click or key so far): try again on the first one.
      // A play cut short by moving on also lands here; that one's fine.
      if (current !== url) return;
      current = null;
      waitForGesture();
    });
}

function sync() {
  const target = enabled && !muted ? wanted : null;
  if (target === current) return;
  stopCurrent();
  if (target) start(target);
}

function waitForGesture() {
  if (waiting) return;
  waiting = true;
  // capture, so a handler that stops the event (the start screen's) can't hide it
  const retry = () => {
    waiting = false;
    window.removeEventListener("keydown", retry, true);
    window.removeEventListener("pointerdown", retry, true);
    sync();
  };
  window.addEventListener("keydown", retry, true);
  window.addEventListener("pointerdown", retry, true);
}

// Let music play from now on, or after `delayMs` (so the first track can wait
// for the menu to slide in). Only the first call counts.
let enabling = false;
export function enableSound(delayMs = 0) {
  if (enabling) return;
  enabling = true;
  setTimeout(() => {
    enabled = true;
    sync();
  }, delayMs);
}

// Play a short sound once (a URL under public/), unless sound is muted.
// Called inside a click or key press, so the browser allows it.
// Each effect keeps one player, so a quickly repeated effect (the wheel's
// swoosh while a key is held) restarts instead of piling up.
const effects = new Map<string, HTMLAudioElement>();

function effectPlayer(url: string) {
  let audio = effects.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.preload = "auto";
    effects.set(url, audio);
  }
  return audio;
}

// Start downloading an effect now, so its first play isn't late.
export function preloadEffect(url: string) {
  effectPlayer(url);
}

export function playEffect(url: string, volume = EFFECT_VOLUME) {
  if (muted) return;
  const audio = effectPlayer(url);
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {
    // blocked or failed to load: an effect isn't worth retrying
  });
}

// Play this track (a URL under public/), or nothing with null.
export function playPreview(url: string | null) {
  wanted = url;
  sync();
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // the choice just won't be remembered
  }
  sync();
}
