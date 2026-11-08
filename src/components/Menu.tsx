import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import "../styles/menu.css";
import { isMuted, playEffect, playPreview, preloadEffect, setMuted } from "../lib/sound";

type Status = "cleared" | "in-progress" | "coming-soon";

type Project = {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  difficulty: number;
  status: Status;
  tags: string[];
};

type Category = {
  id: string;
  label: string;
  blurb: string;
  ready: boolean; // false = can't be opened yet
  href?: string; // opens this in a new tab instead of a page on the site
  // just for show in the preview, like a song's stats
  bpm: number;
  difficulty: number;
  genre: string;
};

// Order matches your list. Flip `ready` to true once the page exists.
const CATEGORIES: Category[] = [
  {
    id: "about",
    label: "ABOUT",
    blurb: "Who's behind the screen",
    ready: false,
    bpm: 120,
    difficulty: 2,
    genre: "Profile",
  },
  {
    id: "resume",
    label: "RESUME",
    blurb: "My experience at a glance",
    ready: true,
    // the PDF in public/
    href: "/Nam_Bui_Resume.pdf",
    bpm: 128,
    difficulty: 4,
    genre: "Career",
  },
  {
    id: "projects",
    label: "PROJECTS",
    blurb: "Things I've built",
    ready: true,
    bpm: 150,
    difficulty: 7,
    genre: "Software",
  },
  {
    id: "skills",
    label: "SKILLS",
    blurb: "Tools I've used in real projects",
    ready: false,
    bpm: 135,
    difficulty: 5,
    genre: "Toolbox",
  },
  {
    id: "contact",
    label: "CONTACT",
    blurb: "Say hello",
    ready: false,
    bpm: 98,
    difficulty: 1,
    genre: "Social",
  },
];

// The header timer counts down from this, one step per second, and stops at 00.
const TIMER_START = 99;

const STATUS_LABEL: Record<Status, string> = {
  cleared: "Cleared",
  "in-progress": "In progress",
  "coming-soon": "Coming soon",
};

// How long the "HERE WE GO!" wipe plays before the page changes.
const LAUNCH_MS = 700;

// Music that plays while a row is selected, by category id (files in
// public/sounds). The projects track keeps playing inside the Projects list.
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

// Row text color, like the game's difficulty colors: green for your own
// rows, yellow then red for the filler.
type Tone = "easy" | "medium" | "hard";

type Item = {
  key: string;
  label: string;
  sub: string;
  locked: boolean;
  tag: string | null; // level chip on project rows
  tone: Tone;
};

// Locked "COMING SOON" rows pad each list out so the wheel looks full.
const MIN_ROWS = 10;

function withFiller(items: Item[]): Item[] {
  const count = Math.max(MIN_ROWS - items.length, 0);
  // first half yellow, second half red
  const filler = Array.from({ length: count }, (_, n) => ({
    key: `filler-${n}`,
    label: "COMING SOON",
    sub: "Not unlocked yet",
    locked: true,
    tag: null,
    tone: (n < Math.ceil(count / 2) ? "medium" : "hard") as Tone,
  }));
  return [...items, ...filler];
}

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

function Diamonds({ level }: { level: number }) {
  return (
    <span className="diamonds" aria-hidden="true">
      {Array.from({ length: 10 }, (_, d) => (
        <span
          key={d}
          className={d < level ? "diamond on" : "diamond"}
          style={{ "--i": d } as CSSProperties}
        >
          {d < level ? "◆" : "◇"}
        </span>
      ))}
    </span>
  );
}

export default function Menu({ projects }: { projects: Project[] }) {
  const [screen, setScreen] = useState<"categories" | "songs">("categories");
  // place on the endless wheel; see SPAN
  const [pos, setPos] = useState(0);
  const [launching, setLaunching] = useState<string | null>(null);
  const [timer, setTimer] = useState(TIMER_START);
  // starts "on" for the server render; the saved choice is read after load
  const [muted, setMutedState] = useState(false);
  // which list has finished sliding in, so rows added later don't replay it
  const [settled, setSettled] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);
  // Whether the row under the pointer was already selected when pressed.
  const pressedSelected = useRef(true);

  const realItems: Item[] =
    screen === "categories"
      ? CATEGORIES.map((c) => ({
          key: c.id,
          label: c.label,
          sub: c.blurb,
          locked: !c.ready,
          tag: null,
          tone: "easy",
        }))
      : projects.map((p) => ({
          key: p.id,
          label: p.title,
          sub: p.artist,
          locked: p.status === "coming-soon",
          tag: p.status === "coming-soon" ? null : `Lv ${p.difficulty}`,
          tone: p.status === "coming-soon" ? "hard" : "easy",
        }));
  // No filler when there's nothing real to show, so the empty message appears.
  const items = realItems.length > 0 ? withFiller(realItems) : realItems;
  const n = items.length;
  const index = n > 0 ? mod(pos, n) : 0;

  // Both are null on a filler row.
  const project = screen === "songs" ? (projects[index] ?? null) : null;
  const category = screen === "categories" ? (CATEGORIES[index] ?? null) : null;

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
  }, [pos, screen]);

  // Coming back from a case study (/#projects/<id>) reopens the song list
  // on that song, like backing out of a song in the game.
  useEffect(() => {
    const match = window.location.hash.match(/^#projects\/(.+)$/);
    if (!match) return;
    const i = projects.findIndex((p) => p.id === decodeURIComponent(match[1]));
    setScreen("songs");
    setPos(Math.max(i, 0));
    history.replaceState(null, "", window.location.pathname);
  }, []);

  // Header timer, like the game's song-select countdown. Purely decorative:
  // nothing happens when it runs out.
  useEffect(() => {
    if (timer === 0) return;
    const id = window.setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [timer]);

  // The browser's back button can restore this page from cache mid-wipe.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLaunching(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // A new list's rows slide in once. After that, rows that join the strip as
  // it moves just appear (off screen) instead of playing the entrance again.
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(screen), 900);
    return () => window.clearTimeout(id);
  }, [screen]);

  // The selected row's music. Rows without a track (and the filler) are quiet.
  const previewId = screen === "categories" ? CATEGORIES[index]?.id : "projects";
  useEffect(() => {
    playPreview((previewId && PREVIEWS[previewId]) ?? null);
  }, [previewId]);

  useEffect(() => {
    setMutedState(isMuted());
    preloadEffect(SWOOSH);
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
    }, LAUNCH_MS);
  }

  function activate(i: number) {
    const item = items[i];
    if (!item || item.locked || launching) return;

    if (screen === "categories") {
      const href = CATEGORIES[i]?.href;
      if (item.key === "projects") {
        setScreen("songs");
        setPos(0);
      } else if (href) {
        // a file like the resume opens in its own tab, leaving the menu here
        window.open(href, "_blank", "noopener");
      } else {
        go(`/${item.key}`);
      }
    } else {
      go(`/projects/${item.key}`);
    }
  }

  function back() {
    if (screen === "songs" && !launching) {
      setScreen("categories");
      setPos(CATEGORIES.findIndex((c) => c.id === "projects"));
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
      activate(index);
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "Escape") {
      e.preventDefault();
      back();
      return;
    }
    if (e.key === "m" || e.key === "M") {
      toggleSound();
      return;
    }
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPos((p) => p + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPos((p) => p - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      activate(index);
    }
  }

  // Pointer: the first click or tap on a row selects it, the next one opens
  // it, like moving the wheel and then pressing start. Keyboard Enter/Space
  // has no pointerdown, so it always opens.
  function onRowClick(p: number) {
    if (!pressedSelected.current) {
      pressedSelected.current = true;
      setPos(p);
      return;
    }
    activate(mod(p, n));
  }

  const bpm = project?.bpm ?? category?.bpm ?? "???";

  // What the preview lists for the selected row. Only the filler rows are
  // "Coming soon"; your own categories that aren't open yet are "In progress".
  const stats = project
    ? {
        difficulty: project.difficulty,
        genre: project.tags.length > 0 ? project.tags.join(", ") : "—",
        status: STATUS_LABEL[project.status],
        chip: `chip-${project.status}`,
      }
    : category
      ? {
          difficulty: category.difficulty,
          genre: category.genre,
          status: category.ready ? "Open" : "In progress",
          chip: category.ready ? "chip-cleared" : "chip-in-progress",
        }
      : { difficulty: null, genre: "???", status: "Coming soon", chip: "chip-coming-soon" };

  return (
    <div className="stage" ref={stageRef}>
      <div className="window">
        <Backdrop />

        <header className="window-bar">
          <div className="title-block">
            <h1 className="title">Select Music</h1>
          </div>
          {screen === "songs" && <span className="section">PROJECTS</span>}
          {screen === "songs" && (
            <button type="button" className="back" onClick={back}>
              Back
            </button>
          )}
          {/* hidden from screen readers so it isn't announced every second */}
          <span className="badge timer" aria-hidden="true">
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
                  <span className="stat-value">1st</span>
                </span>
                <span className="stat">
                  <span className="stat-label">SPEED</span>
                  <span className="stat-value">{bpm} BPM</span>
                </span>
              </p>
              {/* Placeholder until there's real jacket art for each track. */}
              <div className="jacket-art" aria-hidden="true">
                <span className="jacket-placeholder">Jacket art</span>
              </div>
            </div>

            {/* Best score and stats sit together in the space below the jacket. */}
            <div className="lower-preview">
              <p className="best-score">
                <span className="best-score-label">BEST SCORE</span>
                <span className="best-score-value">00000000</span>
              </p>
              <div className="meta-panel">
                {/* Keyed by selection so it re-mounts and plays its entrance each move. */}
                <div className="meta" key={`${screen}-${index}`}>
                  {/* The row already shows the name and blurb, so this is just stats. */}
                  <dl>
                    <dt>Difficulty</dt>
                    {stats.difficulty === null ? (
                      <dd aria-label="Unknown">
                        <Diamonds level={0} />
                      </dd>
                    ) : (
                      <dd aria-label={`${stats.difficulty} out of 10`}>
                        <Diamonds level={stats.difficulty} />
                      </dd>
                    )}
                    <dt>Genre</dt>
                    <dd>{stats.genre}</dd>
                    <dt>Status</dt>
                    <dd>
                      <span className={`chip ${stats.chip}`}>{stats.status}</span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </aside>

          {items.length === 0 ? (
            <p className="empty">No tracks yet. Add a file to src/content/projects.</p>
          ) : (
            <div className="wheel">
              {/* Keyed by screen so the rows slide in again when switching lists. */}
              <ul className={settled === screen ? "list" : "list fresh"} key={screen}>
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
                        selected && launching && "launching",
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
                      {item.tag && <span className="chip chip-level">{item.tag}</span>}
                      <span className="row-arrow" aria-hidden="true" />
                    </button>
                  </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <p className="hint">
          <span className="hint-keys">
            <span>Move <kbd>↑</kbd><kbd>↓</kbd></span>
            <span>Select <kbd>Space</kbd></span>
            <span>Back <kbd>Esc</kbd></span>
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

      {launching && (
        <div className="go" aria-hidden="true">
          <span className="go-text">Here we go!</span>
        </div>
      )}
    </div>
  );
}
