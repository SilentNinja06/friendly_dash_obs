# Daily Dashboard

A warm, simple home surface for [Obsidian](https://obsidian.md) — a clock, a
verse of the day, today's agenda, persistent to-dos, a journal, meals, and
search, all on one page. Works on desktop and mobile.

Built to be legible and forgiving for someone who did not build it: empty states
explain themselves, errors say what to do, and there is no jargon or assumed
vault convention.

**New here? Start with [SETUP.md](./SETUP.md)** — a step-by-step guide that takes
you from a fresh install to a working dashboard.

## Panels

| Panel | What it does |
| --- | --- |
| **Clock** | Time of day (12-hour by default, 24-hour optional) with the date. |
| **Verse of the Day** | One verse of Proverbs, chosen from the date. King James Version (public domain). No commentary. |
| **To-do** | A persistent to-do list with recurring items and scheduling. Nothing resets overnight; completing a task logs it in today's note. |
| **Today's Agenda** | Today's events from up to 20 calendar share links (public `.ics` URLs). Scrolls inside a fixed height and jumps to "now". |
| **Journal** | Writes into the `# Brain dump`, `# Journal`, and `# Reference tomorrow` sections of today's daily note. Yesterday's "Reference tomorrow" is carried to the top so it greets you today. |
| **Meals** | Today's planned recipes and grocery list, via the Recipe Manager add-on. Hides itself politely if that add-on isn't installed. |
| **Search** | Fuzzy search across your chosen folders (filenames and headings), plus make notes, make categories, and file notes under a category. |
| **Calendar** | A month grid — click a day to open its daily note. A button opens a Bases table of all daily notes, and a search box finds words inside daily-note bodies (ignoring the shared section headings). |
| **Second Brain** | Your active projects; archive a finished one (links are kept) or start a new one. |
| **Places** | Shortcut buttons to your favourite notes, folders, and commands. |

Every panel can be turned off or reordered in **Settings → Daily Dashboard**.

## Themes

Four themes, switched live in settings over a single design-token contract, so
panels never know which theme is active:

- **Sleek Modern** — clean, near-monochrome, one deep-green accent (default).
- **Pastel / Floral** — soft rose, sage, and lavender on cream.
- **Mellow** — a muted violet/orange/blue dark dusk.
- **Geometric** — bold Bauhaus blocks with sharp edges.

Muted body text was checked to WCAG AA contrast in all four.

## The Verse of the Day scheme

The chapter is the day of the month (the 15th → Proverbs 15). The verse advances
with a **per-chapter** pointer: each chapter moves forward one verse every month
it's actually read, wrapping within its own length. Short months simply never
reach chapters 29–31, so those advance more slowly — there's no special-casing,
it falls out of the calendar. The whole thing is a pure function of the local
date: no stored state, no drift. See `src/core/verse.ts` and the tests in
`src/tests/`.

The KJV text is vendored from a public-domain dataset (see
`scripts/build-proverbs.mjs`), never generated. Only the KJV is bundled — most
modern translations are under copyright and can only be referenced, not shipped.

## Development

```bash
npm install
npm test        # verse engine + data guards
npm run build   # typecheck + bundle to main.js
```

`npm run dev` starts esbuild in watch mode. Releases are cut automatically by the
GitHub Actions workflow when `manifest.json`'s version is bumped; each release
attaches `main.js`, `manifest.json`, and `styles.css` for BRAT.

## Install for testing

Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat) by adding
`SilentNinja06/friendly_dash_obs`, or copy `main.js`, `manifest.json`, and
`styles.css` into `.obsidian/plugins/daily-dash/` in your vault.

## License

MIT.
