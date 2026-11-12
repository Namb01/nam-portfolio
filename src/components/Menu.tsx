import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import "../styles/menu.css";
import { isMuted, playEffect, playPreview, preloadEffect, setMuted } from "../lib/sound";
import Radar from "./Radar";
import { CATEGORIES } from "../data/categories";

// The header timer counts down from this, one step per second, and stops at 00.
const TIMER_START = 99;

// Opening a row: the menu's pieces slide back out (LEAVE_MS, matching the
// exit in menu.css), then the screen fades to the game screen's navy
// (FADE_OUT_MS), then the game screen loads and fades in.
const LEAVE_MS = 900;
const FADE_OUT_MS = 350;

// Music that plays while a row is selected, by category id (files in
// public/sounds).
const PREVIEWS: Record<string, string> = {
  about: "/sounds/alex-morgan-grime-instrumental-601081.mp3",
  resume: "/sounds/ztmusic-ztmusic-midnight-love-drive-eurobeat-205498.mp3",
  projects: "/sounds/ztmusic-ztmusic-tokai-no-angel-eurobeat-256476.mp3",
  skills: "/sounds/bombinsound-retro-funky-groove-version-2-lightwight-funk-622860.mp3",
  contact: "/sounds/kulakovka-retro-music-624647.mp3",
};

// A quiet swoosh each time the wheel moves to another row.
const SWOOSH = "/sounds/universfield-fast-swoosh-383967.mp3";
const SWOOSH_VOLUME = 0.06;

// The interface sound for picking something on the wheel: any click or tap
// on a row, and Enter, or Space on the selected one. The same
// sound as the coin on the start screen, a little quieter.
const CLICK = "/sounds/soundreality-ui-interface-sound-16-299042.mp3";
const CLICK_VOLUME = 0.2;

// Row text color, like the game's difficulty colors: green for your own
// rows, yellow then red for the filler.
type Tone = "easy" | "medium" | "hard";

type Item = {
  key: string;
  label: string;
  sub: string;
  locked: boolean;
  tone: Tone;
};

// Locked "COMING SOON" rows pad the wheel out so it looks full.
const MIN_ROWS = 10;

// filler rows "COMING SOON"
function withFiller(items: Item[]): Item[] {
  const count = Math.max(MIN_ROWS - items.length, 0);
  // first half yellow, second half red
  const filler = Array.from({ length: count }, (_, n) => ({
    key: `filler-${n}`,
    label: "COMING SOON",
    sub: "Not unlocked yet",
    locked: true,
    tone: (n < Math.ceil(count / 2) ? "medium" : "hard") as Tone,
  }));
  return [...items, ...filler];
}

// Every category is a song that opens its game screen; the filler after them.
const ITEMS = withFiller(
  CATEGORIES.map((c): Item => ({ key: c.id, label: c.label, sub: c.blurb, locked: false, tone: "easy" })),
);

// The wheel is an endless strip: `pos` counts up and down forever, and the
// item at any spot is items[pos mod n]. Only SPAN spots either side of the
// selection are drawn, so a row joins or leaves the strip off screen and every
// visible row slides on each move.
const SPAN = 10;

function mod(a: number, n: number) {
  return ((a % n) + n) % n;
}

// The menu's backdrop: a dark band that runs across the screen and steps up
// on a slant, with soft dots inside it, like the art behind the game's menus.
// Drawn in a 1600 x 900 box stretched to fill the screen, so the dots go a
// little oval on wide screens, as they do in the game.
const BAND =
  "M -20 303 L 560 303 Q 600 303 625 270 L 815 58 Q 840 25 880 25 L 1620 25 " +
  "L 1620 552 L 1260 552 Q 1220 552 1195 585 L 1020 785 Q 995 810 955 810 L -20 810 Z";

// [x, y, radius] for each dot: two rows of big soft dots along the low end,
// and two lines of small dots along the high end.
const BAND_DOTS: [number, number, number][] = [
  ...Array.from({ length: 9 }, (_, i): [number, number, number] => [70 + i * 125, 715, 58]),
  ...Array.from({ length: 8 }, (_, i): [number, number, number] => [40 + i * 110, 565, 40]),
  ...Array.from({ length: 24 }, (_, i): [number, number, number] => [930 + i * 28, 95, 9]),
  ...Array.from({ length: 16 }, (_, i): [number, number, number] => [1140 + i * 30, 140, 10]),
];

function Backdrop() {
  return (
    <svg className="backdrop" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <clipPath id="backdrop-band">
          <path d={BAND} />
        </clipPath>
      </defs>
      {/* edges: a mid-teal rim outside a dark line, then the band over them */}
      <path d={BAND} className="band-rim" vectorEffect="non-scaling-stroke" />
      <path d={BAND} className="band-line" vectorEffect="non-scaling-stroke" />
      <path d={BAND} className="band-fill" />
      <g clipPath="url(#backdrop-band)" className="band-dots">
        {BAND_DOTS.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}

export default function Menu() {
  // place on the endless wheel; see SPAN
  const [pos, setPos] = useState(0);
  const [launching, setLaunching] = useState<string | null>(null);
  const [timer, setTimer] = useState(TIMER_START);
  // whether the timer has started counting down (see below)
  const [counting, setCounting] = useState(false);
  // starts "on" for the server render; the saved choice is read after load
  const [muted, setMutedState] = useState(false);
  // whether the rows have finished sliding in, so rows added later don't replay it
  const [settled, setSettled] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);
  // Whether the row under the pointer was already selected when pressed.
  const pressedSelected = useRef(true);

  const items = ITEMS;
  const n = items.length;
  const index = mod(pos, n);

  // null on a filler row
  const category = CATEGORIES[index] ?? null;

  // Listen on the window so arrow keys work before anything is clicked.
  // The ref always points at this render's handler, so the listener sees
  // current state without being re-added on every render.
  const keyHandler = useRef(onKeyDown);
  keyHandler.current = onKeyDown;
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  // Keep keyboard focus on the selected row. Skip the first render so the
  // page doesn't grab focus on load.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    selectedRef.current?.focus({ preventScroll: true });
  }, [pos]);

  // Coming back from a game screen (/#<id>) lands on the row it came from,
  // like backing out of a song.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    setPos(Math.max(CATEGORIES.findIndex((c) => c.id === hash), 0));
    history.replaceState(null, "", window.location.pathname);
  }, []);

  // Header timer, like the game's song-select countdown. Purely decorative:
  // nothing happens when it runs out. It holds at 99 until the timer has slid
  // in with the rest of the menu (its onAnimationEnd below).
  useEffect(() => {
    if (!counting || timer === 0) return;
    const id = window.setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [timer, counting]);

  // The browser's back button can restore this page from cache mid-wipe.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLaunching(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // The rows slide in once. After that, rows that join the strip as it moves
  // just appear (off screen) instead of playing the entrance again.
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(true), 900);
    return () => window.clearTimeout(id);
  }, []);

  // The selected row's music. Rows without a track (and the filler) are quiet.
  const previewId = category?.id;
  useEffect(() => {
    playPreview((previewId && PREVIEWS[previewId]) ?? null);
  }, [previewId]);

  useEffect(() => {
    setMutedState(isMuted());
    preloadEffect(SWOOSH);
    preloadEffect(CLICK);
  }, []);

  // Swoosh whenever the selected row changes, but not for the first row the
  // page opens on.
  const firstPos = useRef(true);
  useEffect(() => {
    if (firstPos.current) {
      firstPos.current = false;
      return;
    }
    playEffect(SWOOSH, SWOOSH_VOLUME);
  }, [pos]);

  function toggleSound() {
    setMuted(!muted);
    setMutedState(!muted);
  }

  function go(url: string) {
    playPreview(null);
    setLaunching(url);
    window.setTimeout(() => {
      window.location.href = url;
    }, LEAVE_MS + FADE_OUT_MS);
  }

  function activate(i: number) {
    const item = items[i];
    if (!item || item.locked || launching) return;

    // A file like the resume opens in its own tab, leaving the menu here;
    // every other row is a song and opens its game screen.
    const href = CATEGORIES[i]?.href;
    if (href) {
      window.open(href, "_blank", "noopener");
    } else {
      go(`/play/${item.key}`);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // The menu is the whole page, so keys work straight away without
    // clicking first. Leave keys alone if focus is somewhere else (a link).
    const target = e.target as HTMLElement;
    const inMenu = target === document.body || stageRef.current?.contains(target);
    if (!inMenu) return;

    if (launching) {
      e.preventDefault();
      return;
    }
    // Enter and Space activate a focused button on their own; before anything
    // is focused they act on the selected row.
    if ((e.key === "Enter" || e.key === " ") && target.tagName !== "BUTTON") {
      e.preventDefault();
      playEffect(CLICK, CLICK_VOLUME);
      activate(index);
      return;
    }
    if (e.key === "m" || e.key === "M") {
      toggleSound();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPos((p) => p + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPos((p) => p - 1);
    }
  }

  // Pointer: the first click or tap on a row selects it, the next one opens
  // it, like moving the wheel and then pressing start. Keyboard Enter/Space
  // has no pointerdown, so it always opens.
  function onRowClick(p: number) {
    playEffect(CLICK, CLICK_VOLUME);
    if (!pressedSelected.current) {
      pressedSelected.current = true;
      setPos(p);
      return;
    }
    activate(mod(p, n));
  }

  // the selected row's stats; an empty radar on a filler row
  const bpm = category?.bpm ?? "???";
  const radar = category?.radar ?? null;

  return (
    // .leaving slides the pieces back out (menu.css)
    <div className={launching ? "stage leaving" : "stage"} ref={stageRef}>
      <div className="window">
        <Backdrop />

        <header className="window-bar">
          <div className="title-block">
            <h1 className="title">Select Music</h1>
          </div>
          {/* hidden from screen readers so it isn't announced every second */}
          <span className="badge timer" aria-hidden="true" onAnimationEnd={() => setCounting(true)}>
            {String(timer).padStart(2, "0")}
          </span>
        </header>

        <div className="body">
          <aside className="select-preview" aria-live="polite">
            {/* Banner that runs off the left edge, a mirror of the wheel rows. */}
            <div className="jacket-box">
              <p className="jacket-stats">
                <span className="stat">
                  <span className="stat-label">STAGE</span>
                  <span className="stat-value"> 1ST</span>
                </span>
                <span className="stat">
                  <span className="stat-label">SPEED</span>
                  <span className="stat-value">{bpm} BPM</span>
                </span>
              </p>
              {/* The row's art, or a placeholder until it has some. */}
              <div className="jacket-art" aria-hidden="true">
                {category?.jacket ? (
                  <img className="jacket-image" src={category.jacket} alt="" />
                ) : (
                  <span className="jacket-placeholder">Jacket art</span>
                )}
              </div>
              <p className="best-score">
                <span className="best-score-label">BEST SCORE</span>
                <span className="best-score-value">00000000</span>
              </p>
            </div>

            {/* The stats radar fills the space below the jacket. Not keyed, so
                it stays put and its shape morphs between rows. */}
            <div className="lower-preview">
              <Radar stats={radar} />
            </div>
          </aside>

          <div className="wheel">
              <ul className={settled ? "list" : "list fresh"}>
                {Array.from({ length: SPAN * 2 + 1 }, (_, s) => {
                  const offset = s - SPAN;
                  const p = pos + offset;
                  const item = items[mod(p, n)];
                  const selected = offset === 0;
                  // The strip shows some items more than once. Only the copy
                  // nearest the selection is real to keyboards and screen
                  // readers; the rest are just scenery.
                  const half = Math.floor(n / 2);
                  const copy = offset < -half || offset > n - 1 - half;
                  return (
                  <li
                    // keyed by spot on the strip, so each row keeps its
                    // element (and slides) as the wheel moves
                    key={p}
                    aria-hidden={copy || undefined}
                    inert={copy || undefined}
                    // --o places the row on the wheel; --d (distance from the
                    // selected row) shortens rows to curve it
                    style={{ "--o": offset, "--d": Math.abs(offset) } as CSSProperties}
                  >
                    <button
                      type="button"
                      ref={selected ? selectedRef : undefined}
                      className={[
                        "row",
                        `tone-${item.tone}`,
                        selected && "selected",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      tabIndex={selected ? 0 : -1}
                      aria-disabled={item.locked || undefined}
                      onPointerDown={() => {
                        pressedSelected.current = selected;
                      }}
                      onFocus={() => setPos(p)}
                      onClick={() => onRowClick(p)}
                    >
                      <span className="row-text">
                        <span className="row-label">{item.label}</span>
                        <span className="row-sub">{item.sub}</span>
                      </span>
                      <span className="row-arrow" aria-hidden="true" />
                    </button>
                  </li>
                  );
                })}
              </ul>
          </div>
        </div>

        <p className="hint">
          <span className="hint-keys">
            <span>Move <kbd>↑</kbd><kbd>↓</kbd></span>
            <span>Select <kbd>Space</kbd></span>
          </span>
          <span className="hint-touch">Tap to pick, tap again to open</span>
          <button
            type="button"
            className="sound-toggle"
            aria-pressed={!muted}
            aria-label={muted ? "Turn music on" : "Turn music off"}
            onClick={toggleSound}
          >
            ♪ {muted ? "OFF" : "ON"} <kbd>M</kbd>
          </button>
        </p>
      </div>

      {/* once the pieces have slid out, fade to the game screen's navy */}
      {launching && (
        <div
          className="fade-out"
          aria-hidden="true"
          style={{ animationDelay: `${LEAVE_MS}ms`, animationDuration: `${FADE_OUT_MS}ms` }}
        />
      )}
    </div>
  );
}
