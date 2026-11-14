import type { RadarStats } from "../components/Radar";

// The rows on the Select Music wheel. Each one is a "song": picking it opens
// its game screen at /play/<id>, unless it has an `href`, which opens that
// file in a new tab instead (the resume).

export type Category = {
  id: string;
  label: string;
  blurb: string;
  // a file in public/ to open in a new tab instead of a game screen
  href?: string;
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
    radar: { hype: 6, chill: 8, flair: 7, focus: 4, soul: 10 },
  },
  {
    id: "resume",
    label: "RESUME",
    href: "/Nam_Bui_Resume.pdf",
    jacket: "/jackets/resume.webp",
    blurb: "My experience at a glance",
    bpm: 153,
    radar: { hype: 5, chill: 3, flair: 4, focus: 10, soul: 5 },
  },
  {
    id: "projects",
    label: "PROJECTS",
    jacket: "/jackets/projects.webp",
    blurb: "Things I've built",
    bpm: 161,
    radar: { hype: 9, chill: 4, flair: 8, focus: 8, soul: 7 },
  },
  {
    id: "skills",
    label: "SKILLS",
    jacket: "/jackets/skills.webp",
    blurb: "Tools I've used in real projects",
    bpm: 122,
    radar: { hype: 7, chill: 5, flair: 6, focus: 9, soul: 4 },
  },
  {
    id: "contact",
    label: "CONTACT",
    jacket: "/jackets/contact.webp",
    blurb: "Say hello",
    bpm: 80,
    radar: { hype: 4, chill: 10, flair: 6, focus: 3, soul: 8 },
  },
];
