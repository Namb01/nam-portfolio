import type { RadarStats } from "../components/Radar";

// The rows on the Select Music wheel. Each one is a "song": picking it opens
// its game screen at /play/<id>.

export type Category = {
  id: string;
  label: string;
  blurb: string;
  // jacket art in public/ (1200 x 500 is ideal); without it, a placeholder
  jacket?: string;
  // just for show in the preview, like a song's stats
  bpm: number;
  radar: RadarStats;
};

// Order matches your list.
export const CATEGORIES: Category[] = [
  {
    id: "about",
    label: "ABOUT",
    jacket: "/jackets/about.webp",
    blurb: "Who's behind the screen",
    bpm: 136,
    radar: { frontend: 3, backend: 3, design: 7, scale: 3, polish: 6 },
  },
  {
    id: "resume",
    label: "RESUME",
    blurb: "My experience at a glance",
    bpm: 153,
    radar: { frontend: 7, backend: 7, design: 5, scale: 6, polish: 8 },
  },
  {
    id: "projects",
    label: "PROJECTS",
    blurb: "Things I've built",
    bpm: 161,
    radar: { frontend: 8, backend: 7, design: 6, scale: 6, polish: 7 },
  },
  {
    id: "skills",
    label: "SKILLS",
    blurb: "Tools I've used in real projects",
    bpm: 122,
    radar: { frontend: 8, backend: 6, design: 5, scale: 5, polish: 3 },
  },
  {
    id: "contact",
    label: "CONTACT",
    blurb: "Say hello",
    bpm: 80,
    radar: { frontend: 3, backend: 2, design: 6, scale: 2, polish: 9 },
  },
];
