import { useEffect, useRef, useState } from "react";
import "../styles/start.css";
import { enableSound, playEffect, preloadEffect } from "../lib/sound";

// Shown on every visit. index.astro skips it only when coming back from a
// game screen, by adding .skip-start before first paint.

// How long "1/1" shows after the coin goes in, then how long the fade out takes.
const COIN_MS = 500;
const FADE_MS = 400;

// Played together when the coin goes in (files in public/sounds).
const COIN_SOUNDS = [
  "/sounds/soundreality-ui-interface-sound-16-299042.mp3",
  "/sounds/edr-electronic-impact-hard-10018.mp3",
];

// Called out as the menu appears, in the pause before its pieces slide in,
// and how long it lasts (the file is about 1.9s).
const SELECT_MUSIC_SOUND = "/sounds/Selectmusic.m4a";
const SELECT_MUSIC_MS = 1900;

// The menu sits empty this long before its pieces slide in (--enter-delay in
// menu.css; keep the two the same).
const ENTER_DELAY_MS = 1300;

// The first track waits until the call-out has finished.
const MUSIC_DELAY_MS = COIN_MS + SELECT_MUSIC_MS;

// Starfield: how many stars, how fast they come at you (depth per second),
// and their colours, mostly white with a few accents (aqua would vanish into
// the sky blue).
const STAR_COUNT = 420;
const STAR_SPEED = 0.32;
const STAR_COLORS = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#E8F1F4", "#C9F33D", "#FFD23F", "#FF4FA3"];

// Wireframe ground below the horizon: how many cross lines scroll towards
// you per second, and how far apart the lines running out to the horizon
// are where they reach the bottom of the screen (as a share of its width).
const GROUND_SPEED = 1.2;
const GROUND_COLUMN = 0.1;

type Star = { x: number; y: number; z: number; color: string };

// A star somewhere in front of you; z is its depth, 1 = far away.
function spawnStar(z: number): Star {
  return {
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z,
    color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
  };
}

type Phase = "idle" | "coin" | "leaving" | "gone";

export default function StartScreen() {
  const [phase, setPhase] = useState<Phase>("idle");
  const inserted = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Stars fly out from the middle towards you, leaving short streaks, so it
  // feels like travelling through space.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const stars = Array.from({ length: STAR_COUNT }, () => spawnStar(Math.random()));
    let width = 0;
    let height = 0;
    // the stars come from the middle of the horizon (--horizon in start.css)
    let horizon = 0.5;
    // how far the ground has scrolled, in rows
    let groundPhase = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.lineCap = "round";
      horizon = parseFloat(getComputedStyle(canvas!).getPropertyValue("--horizon")) / 100 || 0.5;
    }

    function draw(dt: number) {
      ctx!.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height * horizon;
      const scale = Math.max(width, height) * 0.5;

      // Wireframe ground: lines running out from the vanishing point, and
      // cross lines that come towards you, all fading into the horizon.
      groundPhase = (groundPhase + dt * GROUND_SPEED) % 1;
      const ground = height - cy;
      const fade = ctx!.createLinearGradient(0, cy, 0, height);
      fade.addColorStop(0, "rgba(61, 227, 234, 0)");
      fade.addColorStop(0.3, "rgba(61, 227, 234, 0.35)");
      fade.addColorStop(1, "rgba(61, 227, 234, 0.9)");
      ctx!.globalAlpha = 1;
      ctx!.strokeStyle = fade;
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      const column = width * GROUND_COLUMN;
      const columns = Math.ceil(width / column) * 2;
      for (let i = -columns; i <= columns; i++) {
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(cx + i * column, height);
      }
      // row k sits k rows away; perspective puts it at ground / distance
      for (let k = 1; k <= 40; k++) {
        const y = cy + ground / (k - groundPhase);
        ctx!.moveTo(0, y);
        ctx!.lineTo(width, y);
      }
      ctx!.stroke();

      for (const star of stars) {
        star.z -= dt * STAR_SPEED;
        const x = cx + (star.x / star.z) * scale;
        const y = cy + (star.y / star.z) * scale;
        if (star.z <= 0.02 || x < -40 || x > width + 40 || y < -40 || y > height + 40) {
          Object.assign(star, spawnStar(1));
          continue;
        }
        // the streak runs back to where the star was a moment ago
        const tail = star.z + dt * STAR_SPEED * 5;
        const near = 1 - star.z;
        // far stars are faint pinpricks; they brighten and thicken as they near
        ctx!.globalAlpha = Math.min(1, 0.3 + near * 1.2);
        ctx!.strokeStyle = star.color;
        ctx!.lineWidth = 1 + near * 3;
        ctx!.beginPath();
        ctx!.moveTo(cx + (star.x / tail) * scale, cy + (star.y / tail) * scale);
        ctx!.lineTo(x, y);
        ctx!.stroke();
      }
    }

    resize();
    draw(0);

    let frame = 0;
    let last = performance.now();
    function tick(now: number) {
      // cap the step so a background tab doesn't jump the stars on return
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      draw(dt);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
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
      {/* passing stars, behind everything */}
      <canvas className="start-stars" ref={canvasRef} aria-hidden="true" />

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
