import { useEffect, useRef } from "react";

// Stats radar for the selected row, like the circular stats chart on a
// rhythm game's song select: five stats from 0 to 10 plotted as a filled
// shape over a pentagon in a ringed disc, with the stat names around the
// outside. When the selection changes, the shape morphs from the old stats
// into the new ones.
//
// The stats describe each row's feel, like a song's, not tech skills:
//   hype   how much energy it has
//   chill  how laid-back it is
//   flair  how much style and personality it shows
//   focus  how detailed and heads-down it is
//   soul   how personal it is

export type RadarStats = {
  hype: number;
  chill: number;
  flair: number;
  focus: number;
  soul: number;
};

// clockwise from the top
const AXES: { key: keyof RadarStats; label: string }[] = [
  { key: "hype", label: "HYPE" },
  { key: "chill", label: "CHILL" },
  { key: "flair", label: "FLAIR" },
  { key: "focus", label: "FOCUS" },
  { key: "soul", label: "SOUL" },
];

// drawing sizes, in the SVG's own units (the viewBox is centred on 0, 0)
const R = 78; // the pentagon's corners touch the disc's edge (a stat of 10)
const RINGS = [0.3, 0.55, 0.8];

// where each name sits outside the disc, and which side of it the text runs
const LABELS: { x: number; y: number; anchor: "start" | "middle" | "end" }[] = [
  { x: 0, y: -94, anchor: "middle" },
  { x: 92, y: -26, anchor: "start" },
  { x: 62, y: 94, anchor: "start" },
  { x: -62, y: 94, anchor: "end" },
  { x: -92, y: -26, anchor: "end" },
];

const MORPH_MS = 320;

function point(i: number, radius: number) {
  const angle = (-90 + i * 72) * (Math.PI / 180);
  return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
}

function polygon(radii: number[]) {
  return radii.map((r, i) => point(i, r).join(",")).join(" ");
}

// the shape's corner distances for these stats; all zero (a dot) when unknown
function shapeFor(stats: RadarStats | null) {
  return AXES.map(({ key }) => (stats ? (R * Math.max(0, Math.min(10, stats[key]))) / 10 : 0));
}

// ease out, so the shape settles into place
const ease = (t: number) => 1 - (1 - t) ** 3;

// `stats` is null for the filler rows: an empty chart.
export default function Radar({ stats }: { stats: RadarStats | null }) {
  const shapeRef = useRef<SVGPolygonElement>(null);
  // what's drawn right now, so a morph can start from mid-way through another
  const shown = useRef<number[]>(AXES.map(() => 0));
  const target = shapeFor(stats);
  const targetKey = target.join(",");

  // Morph from what's drawn to the new stats. The first one grows out of the
  // centre, since `shown` starts at zero.
  useEffect(() => {
    const el = shapeRef.current;
    if (!el) return;
    const from = shown.current;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = ease(Math.min((now - start) / MORPH_MS, 1));
      shown.current = from.map((r, i) => r + (target[i] - r) * t);
      el.setAttribute("points", polygon(shown.current));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // `target` is rebuilt every render; targetKey is the same numbers as text
  }, [targetKey]);

  const summary = stats
    ? AXES.map(({ key, label }) => `${label.toLowerCase()} ${stats[key]} out of 10`).join(", ")
    : "unknown";

  return (
    <svg className="radar" viewBox="-190 -112 380 222" role="img" aria-label={`Stats: ${summary}`}>
      <circle className="radar-disc" r={R} />
      {RINGS.map((ring) => (
        <circle key={ring} className="radar-ring" r={R * ring} />
      ))}
      <polygon className="radar-frame" points={polygon(AXES.map(() => R))} />
      {AXES.map((_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} className="radar-axis" x1={0} y1={0} x2={x} y2={y} />;
      })}

      <polygon ref={shapeRef} className="radar-shape" points={polygon(shown.current)} />

      {AXES.map(({ label }, i) => (
        <text key={label} className="radar-label" x={LABELS[i].x} y={LABELS[i].y} textAnchor={LABELS[i].anchor}>
          {label}
        </text>
      ))}
    </svg>
  );
}
