# Code Code Revolution: Nam's Mix

Nam Bui's portfolio, built like an arcade rhythm game. A start screen takes a
coin, a "Select Music" wheel lists the sections, and each section plays as a
game screen with the content on top.

Built with [Astro](https://docs.astro.build) and a few React components.

## How the site flows

1. **Start screen** (`/`): INSERT COIN. Any key or click starts.
2. **Select Music menu** (`/`): a looping wheel of rows. Each row has jacket
   art, a stats radar and its own music.
3. **Game screen** (`/play/<id>`): the page for About, Projects, Skills and
   Contact. Resume opens the PDF in a new tab instead.

## Where things are

```text
public/
├── jackets/            jacket art for each wheel row (1200 x 500 WebP)
├── sounds/             menu music and sound effects
├── ddr arrow.svg       the step arrow used on the game screen
├── tealarrow.svg       the fading arrows on each wheel row
├── headshot.webp       the About page photo
└── Nam_Bui_Resume.pdf

src/
├── data/               the things you edit most
│   ├── categories.ts   the wheel's rows: label, blurb, jacket, BPM, radar
│   ├── content.ts      the words on the Projects, Skills and Contact pages
│   └── themes.ts       each game screen's backdrop colours
├── pages/
│   ├── index.astro     start screen + Select Music menu
│   └── play/[id].astro one game screen per row
├── components/
│   ├── StartScreen.tsx the start screen (stars, logo, coin)
│   ├── Menu.tsx        the Select Music menu and its wheel
│   ├── Radar.tsx       the stats radar on the menu
│   ├── game/           the game screen's scenery
│   │   ├── Backdrop.astro      a slanted band in the jacket art's colours
│   │   ├── Meters.astro        life meters and stage, along the top
│   │   ├── Lane.astro          step arrows and notes
│   │   └── ScorePanel.astro    score and Back, bottom left
│   └── cards/          each page's content
│       ├── Card.astro          the shell they share: the title header
│       ├── AboutCard.astro
│       ├── ProjectsCard.astro
│       ├── SkillsCard.astro
│       └── ContactCard.astro
├── layouts/Base.astro  the HTML shell every page shares
├── lib/sound.ts        music previews and sound effects
└── styles/
    ├── tokens.css      shared colours, fonts, spacing
    ├── global.css      page-wide basics
    ├── start.css       start screen
    ├── menu.css        Select Music menu
    └── game.css        game screen
```

## Common changes

| To change                                   | Edit                                   |
| :------------------------------------------ | :------------------------------------- |
| A wheel row's label, blurb, BPM or radar    | `src/data/categories.ts`               |
| A row's jacket art                          | add a file to `public/jackets/`, then set `jacket` in `categories.ts` |
| A row's music                               | `PREVIEWS` in `src/components/Menu.tsx` |
| The projects, skills or contact details     | `src/data/content.ts`                  |
| The About text or photo                     | `src/components/cards/AboutCard.astro` |
| A game screen's backdrop colours            | `src/data/themes.ts`                   |
| The site's colours and fonts                | `src/styles/tokens.css`                |

## Commands

Run these from the project folder. The dependencies are installed for Linux,
so on Windows run them inside WSL.

| Command           | What it does                                  |
| :---------------- | :-------------------------------------------- |
| `npm install`     | Installs dependencies                         |
| `npm run dev`     | Starts the dev server at `localhost:4321`     |
| `npm run build`   | Builds the site to `./dist/`                  |
| `npm run preview` | Serves the built site locally                 |
| `npm run astro check` | Type checks the project                   |
