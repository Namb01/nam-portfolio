// Each game screen's backdrop takes its colours from that row's jacket art,
// so the page feels like the song you picked. One line per page:
//
//   bg      the screen's dark base colour
//   band    the wide slanted band
//   rim     the hard edge along the band (also the card's accent colour)
//   stripe  the stripe beside the band
//
//   about    - electric blue and violet, with a magenta stripe
//   projects - burnt orange and amber
//   skills   - purple and magenta with a lime rim
//   contact  - dark teal and aqua
const THEMES: Record<string, Record<string, string>> = {
  about: { bg: "#050A2E", band: "#1A1F9C", rim: "#7C5CFF", stripe: "#C02A6B" },
  projects: { bg: "#2A1200", band: "#7A3A00", rim: "#FFB020", stripe: "#FF8A1F" },
  skills: { bg: "#1E0633", band: "#5A0F7A", rim: "#C9F33D", stripe: "#E0207A" },
  contact: { bg: "#021A1F", band: "#063C46", rim: "#3DE3EA", stripe: "#0B7C8C" },
};

// The page's colours as CSS variables (--bd-bg, --bd-band, ...), ready to go
// in a style attribute. game.css reads them. A page without its own theme
// gets About's.
export function themeStyle(id: string) {
  return Object.entries(THEMES[id] ?? THEMES.about)
    .map(([name, value]) => `--bd-${name}: ${value}`)
    .join("; ");
}
