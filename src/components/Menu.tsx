import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import "../styles/menu.css";

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
  ready: boolean; // false = shows a red "Coming soon" tag and can't be opened yet
  bpm: number; // just for show in the preview's BPM readout
};

// Order matches your list. Flip `ready` to true once the page exists.
const CATEGORIES: Category[] = [
  { id: "about", label: "ABOUT", blurb: "Who's behind the screen", ready: false, bpm: 120 },
  { id: "projects", label: "PROJECTS", blurb: "Things I've built", ready: true, bpm: 150 },
  { id: "skills", label: "SKILLS", blurb: "Tools I've used in real projects", ready: false, bpm: 135 },
  { id: "contact", label: "CONTACT", blurb: "Say hello", ready: false, bpm: 98 },
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

// Row text color, like the game's difficulty colors: green for your own
// rows, yellow then red for the filler.
type Tone = "easy" | "medium" | "hard";

type Item = {
  key: string;
  label: string;
  sub: string;
  locked: boolean;
  tag: string | null;
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

// The wheel loops: each row's place relative to the selected one, taking the
// short way round, so there are always rows above and below the selection.
function wheelOffset(i: number, index: number, n: number) {
  const half = Math.floor(n / 2);
  return ((((i - index) % n) + n + half) % n) - half;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  const [index, setIndex] = useState(0);
  const [launching, setLaunching] = useState<string | null>(null);
  const [timer, setTimer] = useState(TIMER_START);
  const stageRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
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
          tag: c.ready ? null : "Coming soon",
          tone: "easy",
        }))
      : projects.map((p) => ({
          key: p.id,
          label: p.title,
          sub: p.artist,
          locked: p.status === "coming-soon",
          tag: p.status === "coming-soon" ? "Coming soon" : `Lv ${p.difficulty}`,
          tone: p.status === "coming-soon" ? "hard" : "easy",
        }));
  // No filler when there's nothing real to show, so the empty message appears.
  const items = realItems.length > 0 ? withFiller(realItems) : realItems;

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
    itemRefs.current[index]?.focus({ preventScroll: true });
  }, [index, screen]);

  // Coming back from a case study (/#projects/<id>) reopens the song list
  // on that song, like backing out of a song in the game.
  useEffect(() => {
    const match = window.location.hash.match(/^#projects\/(.+)$/);
    if (!match) return;
    const i = projects.findIndex((p) => p.id === decodeURIComponent(match[1]));
    setScreen("songs");
    setIndex(Math.max(i, 0));
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

  // Remember where the wheel was, so the row that wraps from one end to the
  // other can jump instead of sliding across the whole wheel.
  const prevIndex = useRef(index);
  useEffect(() => {
    prevIndex.current = index;
  }, [index]);

  function go(url: string) {
    if (prefersReducedMotion()) {
      window.location.href = url;
      return;
    }
    setLaunching(url);
    window.setTimeout(() => {
      window.location.href = url;
    }, LAUNCH_MS);
  }

  function activate(i: number) {
    const item = items[i];
    if (!item || item.locked || launching) return;

    if (screen === "categories") {
      if (item.key === "projects") {
        setScreen("songs");
        setIndex(0);
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
      setIndex(CATEGORIES.findIndex((c) => c.id === "projects"));
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
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      activate(index);
    }
  }

  // Pointer: the first click or tap on a row selects it, the next one opens
  // it, like moving the wheel and then pressing start. Keyboard Enter/Space
  // has no pointerdown, so it always opens.
  function onRowClick(i: number) {
    if (!pressedSelected.current) {
      pressedSelected.current = true;
      setIndex(i);
      return;
    }
    activate(i);
  }

  const bpm = project?.bpm ?? category?.bpm ?? "???";

  return (
    <div className="stage" ref={stageRef}>
      <div className="window">
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
          <aside className="preview" aria-live="polite">
            <p className="bpm">
              <span className="bpm-label">BPM</span>
              <span className="bpm-value">{bpm}</span>
            </p>
            {/* Placeholder until there's real jacket art for each track. */}
            <div className="jacket" aria-hidden="true">
              <span className="jacket-placeholder">Jacket art</span>
            </div>

            {/* Keyed by selection so it re-mounts and plays its entrance each move. */}
            <div className="meta" key={`${screen}-${index}`}>
              {project && (
                <>
                  <h2 className="meta-title">{project.title}</h2>
                  <p className="meta-sub">{project.artist}</p>
                  <dl>
                    <dt>Difficulty</dt>
                    <dd aria-label={`${project.difficulty} out of 10`}>
                      <Diamonds level={project.difficulty} />
                    </dd>
                    <dt>Status</dt>
                    <dd>
                      <span className={`chip chip-${project.status}`}>
                        {STATUS_LABEL[project.status]}
                      </span>
                    </dd>
                    {project.tags.length > 0 && (
                      <>
                        <dt>Genre</dt>
                        <dd>{project.tags.join(", ")}</dd>
                      </>
                    )}
                  </dl>
                </>
              )}

              {category && (
                <>
                  <h2 className="meta-title">{category.label}</h2>
                  <p className="meta-sub">{category.blurb}</p>
                  <dl>
                    {category.id === "projects" && (
                      <>
                        <dt>Tracks</dt>
                        <dd>{projects.length}</dd>
                      </>
                    )}
                    <dt>Status</dt>
                    <dd>
                      <span
                        className={`chip ${category.ready ? "chip-cleared" : "chip-coming-soon"}`}
                      >
                        {category.ready ? "Open" : "Coming soon"}
                      </span>
                    </dd>
                  </dl>
                </>
              )}

              {!project && !category && (
                <>
                  <h2 className="meta-title">COMING SOON</h2>
                  <p className="meta-sub">Not unlocked yet</p>
                </>
              )}
            </div>
          </aside>

          {items.length === 0 ? (
            <p className="empty">No tracks yet. Add a file to src/content/projects.</p>
          ) : (
            <div className="wheel">
              {/* Keyed by screen so the rows slide in again when switching lists. */}
              <ul className="list" key={screen}>
                {items.map((item, i) => {
                  const offset = wheelOffset(i, index, items.length);
                  const wrapped =
                    Math.abs(offset - wheelOffset(i, prevIndex.current, items.length)) > 1;
                  return (
                  <li
                    key={item.key}
                    className={wrapped ? "wrapped" : undefined}
                    // --o places the row on the wheel; --d (distance from the
                    // selected row) shortens rows to curve it
                    style={{ "--o": offset, "--d": Math.abs(offset) } as CSSProperties}
                  >
                    <button
                      type="button"
                      ref={(el) => {
                        itemRefs.current[i] = el;
                      }}
                      className={[
                        "row",
                        `tone-${item.tone}`,
                        i === index && "selected",
                        i === index && launching && "launching",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      tabIndex={i === index ? 0 : -1}
                      aria-disabled={item.locked || undefined}
                      onPointerDown={() => {
                        pressedSelected.current = i === index;
                      }}
                      onFocus={() => setIndex(i)}
                      onClick={() => onRowClick(i)}
                    >
                      <span className="row-text">
                        <span className="row-label">{item.label}</span>
                        <span className="row-sub">{item.sub}</span>
                      </span>
                      {item.tag && (
                        <span
                          className={item.locked ? "chip chip-coming-soon" : "chip chip-level"}
                        >
                          {item.tag}
                        </span>
                      )}
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
             Move <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>
            Select <kbd>Space</kbd>
            Back <kbd>Esc</kbd>
          </span>
          <span className="hint-touch">Tap to pick, tap again to open</span>
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
