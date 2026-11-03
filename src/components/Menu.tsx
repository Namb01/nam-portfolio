import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
};

// Order matches your list. Flip `ready` to true once the page exists.
const CATEGORIES: Category[] = [
  { id: "about", label: "About", blurb: "Who's behind the screen", ready: false },
  { id: "projects", label: "Projects", blurb: "Things I've built", ready: true },
  { id: "skills", label: "Skills", blurb: "Tools I've used in real projects", ready: false },
  { id: "contact", label: "Contact", blurb: "Say hello", ready: false },
];

const STATUS_LABEL: Record<Status, string> = {
  cleared: "Cleared",
  "in-progress": "In progress",
  "coming-soon": "Coming soon",
};

// How long the "HERE WE GO!" wipe plays before the page changes.
const LAUNCH_MS = 700;

type Item = {
  key: string;
  label: string;
  sub: string;
  locked: boolean;
  tag: string | null;
};

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
  const stageRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mounted = useRef(false);
  const placedScreen = useRef<string | null>(null);
  // Whether the row under the pointer was already selected when pressed.
  const pressedSelected = useRef(true);

  const items: Item[] =
    screen === "categories"
      ? CATEGORIES.map((c) => ({
          key: c.id,
          label: c.label,
          sub: c.blurb,
          locked: !c.ready,
          tag: c.ready ? null : "Coming soon",
        }))
      : projects.map((p) => ({
          key: p.id,
          label: p.title,
          sub: p.artist,
          locked: p.status === "coming-soon",
          tag: p.status === "coming-soon" ? "Coming soon" : `Lv ${p.difficulty}`,
        }));

  const project = screen === "songs" ? projects[index] : null;
  const category = screen === "categories" ? CATEGORIES[index] : null;

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

  // The browser's back button can restore this page from cache mid-wipe.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLaunching(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // Wheel: slide the list so the selected row sits in the middle, like the
  // song wheel. Snap without animating on first paint and on screen changes.
  useLayoutEffect(() => {
    const wheel = wheelRef.current;
    const list = listRef.current;
    const li = itemRefs.current[index]?.parentElement;
    if (!wheel || !list || !li) return;

    const place = (animate: boolean) => {
      list.style.transition = animate ? "" : "none";
      list.style.transform = `translateY(${
        wheel.clientHeight / 2 - (li.offsetTop + li.offsetHeight / 2)
      }px)`;
      wheel.scrollTop = 0;
    };
    place(placedScreen.current === screen);
    placedScreen.current = screen;

    // Re-centre when the wheel resizes or the fonts load and change row heights.
    const observer = new ResizeObserver(() => place(false));
    observer.observe(wheel);
    observer.observe(list);
    return () => observer.disconnect();
  }, [index, screen, items.length]);

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

  const arrowStyle = { "--rot": `${(index % 4) * 90}deg` } as CSSProperties;

  return (
    <div className="stage" ref={stageRef}>
      <div className="window">
        <header className="window-bar">
          <h1 className="title">Select Music</h1>
          {screen === "songs" && <span className="section">Projects</span>}
          {screen === "songs" && (
            <button type="button" className="back" onClick={back}>
              Back
            </button>
          )}
          <span className="badge" aria-label={`${items.length} items`}>
            {String(items.length).padStart(2, "0")}
          </span>
        </header>

        <div className="body">
          <aside className="preview" aria-live="polite">
            <div className="jacket" aria-hidden="true">
              <svg className="jacket-arrow" style={arrowStyle} viewBox="0 0 100 100">
                <polygon
                  points="54,12 96,56 72,56 72,96 36,96 36,56 12,56"
                  fill="#0B0B12"
                />
                <polygon
                  points="50,8 92,52 68,52 68,92 32,92 32,52 8,52"
                  fill="#C9F33D"
                  stroke="#0B0B12"
                  strokeWidth="4"
                />
              </svg>
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
                    <dt>BPM</dt>
                    <dd>{project.bpm}</dd>
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
            </div>
          </aside>

          {items.length === 0 ? (
            <p className="empty">No tracks yet. Add a file to src/content/projects.</p>
          ) : (
            <div className="wheel" ref={wheelRef}>
              {/* Keyed by screen so the rows slide in again when switching lists. */}
              <ul className="list" ref={listRef} key={screen}>
                {items.map((item, i) => (
                  <li
                    key={item.key}
                    // --d (distance from the selected row) shortens rows to curve the wheel
                    style={{ "--i": i, "--d": Math.abs(i - index) } as CSSProperties}
                  >
                    <button
                      type="button"
                      ref={(el) => {
                        itemRefs.current[i] = el;
                      }}
                      className={[
                        "row",
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
                      <span className="row-cursor" aria-hidden="true" />
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
                ))}
              </ul>
            </div>
          )}
        </div>

        <p className="hint">
          <span className="hint-keys">
            <kbd>↑</kbd>
            <kbd>↓</kbd> Move <kbd>→</kbd>
            <kbd>Space</kbd> Select <kbd>←</kbd>
            <kbd>Esc</kbd> Back
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
