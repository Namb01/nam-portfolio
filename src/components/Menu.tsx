import { useEffect, useRef, useState } from "react";

type Project = {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  difficulty: number;
  status: "cleared" | "in-progress" | "coming-soon";
  tags: string[];
};

const CATEGORIES = [
  { id: "projects", label: "Projects", blurb: "Things I've built" },
  { id: "journey", label: "Journey", blurb: "What I've learned so far" },
  { id: "about", label: "About Me", blurb: "Who's behind the screen" },
  { id: "contact", label: "Contact", blurb: "Say hello" },
];

export default function Menu({ projects }: { projects: Project[] }) {
  const [screen, setScreen] = useState<"categories" | "songs">("categories");
  const [index, setIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mounted = useRef(false);

  const items =
    screen === "categories"
      ? CATEGORIES.map((c) => ({ key: c.id, label: c.label, blurb: c.blurb }))
      : projects.map((p) => ({ key: p.id, label: p.title, blurb: p.artist }));

  // Move focus to the selected row (skip on first render so we don't steal focus)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    itemRefs.current[index]?.focus();
  }, [index, screen]);

  function activate(i: number) {
    if (screen === "categories") {
      const cat = CATEGORIES[i];
      if (cat.id === "projects") {
        setScreen("songs");
        setIndex(0);
      } else {
        window.location.href = `/${cat.id}`;
      }
    } else {
      window.location.href = `/projects/${projects[i].id}`;
    }
  }

  function back() {
    if (screen === "songs") {
      setScreen("categories");
      setIndex(0);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // Only handle the keys we need; Enter/Space activate the focused button natively
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      activate(index);
    } else if (e.key === "ArrowLeft" || e.key === "Escape") {
      e.preventDefault();
      back();
    }
  }

  const selectedProject = screen === "songs" ? projects[index] : null;

  return (
    <div className="menu" onKeyDown={onKeyDown}>
      <ul className="menu-list">
        {items.map((item, i) => (
          <li key={item.key}>
            <button
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={i === index ? "row selected" : "row"}
              tabIndex={i === index ? 0 : -1}
              onFocus={() => setIndex(i)}
              onClick={() => activate(i)}
            >
              <span className="row-label">{item.label}</span>
              <span className="row-sub">{item.blurb}</span>
            </button>
          </li>
        ))}
      </ul>

      <aside className="meta" aria-live="polite">
        {selectedProject ? (
          <dl>
            <dt>Difficulty</dt>
            <dd>{"◆".repeat(selectedProject.difficulty)}</dd>
            <dt>BPM</dt>
            <dd>{selectedProject.bpm}</dd>
            <dt>Status</dt>
            <dd>{selectedProject.status}</dd>
          </dl>
        ) : (
          <p>{CATEGORIES[index].blurb}</p>
        )}
      </aside>

      <p className="hint">↑ ↓ move · → / Enter select · ← / Esc back</p>
    </div>
  );
}