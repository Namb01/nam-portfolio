import { useEffect, useRef, useState } from "react";
import "../styles/start.css";
import { enableSound, playEffect, preloadEffect } from "../lib/sound";

// Shown on every visit. index.astro skips it only when coming back from a
// game screen, by adding .skip-start before first paint.

// How long "1/1" shows after the coin goes in, then how long the fade out takes.
const COIN_MS = 500;
const FADE_MS = 400;

// Played when the coin goes in (files in public/sounds).
const COIN_SOUNDS = ["/sounds/edr-electronic-impact-hard-10018.mp3"];

// Called out as the menu appears, in the pause before its pieces slide in,
// and how long it lasts (the file is about 1.9s).
const SELECT_MUSIC_SOUND = "/sounds/Selectmusic.m4a";
const SELECT_MUSIC_MS = 1900;

// The menu sits empty this long before its pieces slide in (--enter-delay in
// menu.css; keep the two the same).
const ENTER_DELAY_MS = 1300;

// The first track waits until the call-out has finished.
const MUSIC_DELAY_MS = COIN_MS + SELECT_MUSIC_MS;

type Phase = "idle" | "coin" | "leaving" | "gone";

export default function StartScreen() {
  const [phase, setPhase] = useState<Phase>("idle");
  const inserted = useRef(false);

  function insert() {
    if (inserted.current) return;
    inserted.current = true;
    setPhase("coin");
    for (const url of COIN_SOUNDS) playEffect(url);
    // the menu's music comes in as its pieces slide in
    enableSound(MUSIC_DELAY_MS);
    window.setTimeout(() => {
      // the menu underneath slides its pieces in as this fades (menu.css)
      document.documentElement.classList.add("menu-enter");
      playEffect(SELECT_MUSIC_SOUND);
      setPhase("leaving");
      window.setTimeout(() => setPhase("gone"), FADE_MS);
    }, COIN_MS);
  }

  // Skipped (back from a game screen): the page hid it before paint, so just drop it.
  useEffect(() => {
    if (document.documentElement.classList.contains("skip-start")) {
      setPhase("gone");
      // no coin, but the menu still slides in after its --enter-delay
      enableSound(ENTER_DELAY_MS);
    } else {
      // loaded ahead, so the call-out isn't late when the coin goes in
      preloadEffect(SELECT_MUSIC_SOUND);
    }
  }, []);

  // Any key inserts the coin. Listening in the capture phase and stopping the
  // event keeps the menu underneath from also reacting to it (Enter would
  // otherwise open the selected row).
  const keyHandler = useRef(onKeyDown);
  keyHandler.current = onKeyDown;
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", listener, true);
    return () => window.removeEventListener("keydown", listener, true);
  }, []);

  function onKeyDown(e: KeyboardEvent) {
    if (phase === "gone" || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    insert();
  }

  if (phase === "gone") return null;

  return (
    // The whole screen takes the click; the button is the keyboard and
    // screen reader way in.
    <div className={`start ${phase}`} onClick={insert}>
      {/* Game-style logo: each line sits on its own slanted plate. */}
      <p className="logo">
        <span className="logo-line logo-top">Code Code</span>
        <span className="logo-line logo-main">Revolution</span>
        <span className="logo-line logo-mix">Nam's Mix</span>
      </p>

      <div className="start-foot">
        <button type="button" className="start-coin" aria-label="Insert coin to start">
          INSERT COIN <span className="start-credit">{phase === "idle" ? "0" : "1"}/1</span>
        </button>

        <p className="start-copy">© 2026 Nam Bui</p>
      </div>
    </div>
  );
}
