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

Every panel is a separate module. Turn on only the ones you want in
**Settings → Daily Dashboard → Panels**, reorder them, and (on the desktop) put
each in a column with an optional span. Panels that need another plugin explain
what they need instead of erroring.

| Panel | What it does | On by default |
| --- | --- | --- |
| **Daily Brief** | An AI-written summary of your day, plus an “End the day” recap written into today's note. Needs your own API key (Anthropic or any OpenAI-compatible service); only the categories you allow are sent. | No |
| **Clock** | Time of day (12-hour by default, 24-hour optional) with the date. | Yes |
| **Verse of the Day** | One verse of Proverbs, chosen from the date. King James Version (public domain). No commentary. | Yes |
| **To-do** | A persistent to-do list with recurring items, scheduling, sub-tasks, due dates and notes. Nothing resets overnight; completing a task logs it in today's note. A **Week in review** button looks back over the last seven days. | Yes |
| **Today's Agenda** | Today's events from up to 20 calendar share links plus your own one-off events. A **Now / Next** strip shows what's happening and how long you're free (each calendar can be left out of it, and given its own colour). **Week's goals** sets goals for the week (each can become a to-do), and **Print week** prints a week-at-a-glance planner with those goals at the top. | Yes |
| **Journal** | Writes into the `# Brain dump`, `# Journal`, and `# Reference tomorrow` sections of today's daily note. Yesterday's "Reference tomorrow" is carried to the top. | Yes |
| **Meals** | Today's planned recipes and grocery list, via the Recipe Manager plugin. | Yes |
| **Shopping** | Shopping lists with quantity, aisle, store and who's paying; filter for a trip, group by aisle, tick things off. Imports a Recipe Manager grocery list in one tap. | Yes |
| **Quick Actions** | One-tap buttons: add a to-do, event or shopping item, the week's goals, the week in review — plus buttons for Recipe Manager, Simple Contact Manager or the food tracker when those are installed. | Yes |
| **Contacts** | Who's due or overdue for a catch-up, via the Simple Contact Manager plugin, with a one-tap “Log”. | No |
| **Quote of the Day** | A quote a day from your own collection of things people have said (add, search, edit in the app). | No |
| **Search** | Fuzzy search across your chosen folders, plus make notes, make categories, and file notes under a category. | Yes |
| **Calendar** | A month grid — click a day to open its daily note — plus a Bases table and a search inside daily notes. | Yes |
| **Second Brain** | Your active projects; archive a finished one or start a new one. | Yes |
| **Places** | Shortcut buttons to your favourite notes, folders, and commands. | Yes |

### Phone tabs

On a phone the dashboard can be split into tabs (e.g. *Today*, *Home*, *Notes*)
instead of one long scroll: add tabs in **Settings → Daily Dashboard → Phone
tabs**, star the one that opens first, and pick a tab for each panel. The desktop
always shows everything.

### Everything syncs

Your to-dos, local events, panel layout and tabs, shopping lists, quotes, and the
AI key (if you use one) are kept in small Markdown files under `Daily Dashboard/`,
so Obsidian Sync carries them to every device and they survive plugin updates.

## Commands and links

Everything is reachable without opening the dashboard — from the command palette,
a hotkey, or a phone shortcut:

- Open dashboard · Refresh dashboard
- Add a to-do · Complete the next to-do
- Write in Brain dump / Journal / Reference tomorrow
- Add an event to today's agenda · Copy today's agenda into today's note
- Set this week's goals · Week in review
- Open the shopping list · Add a shopping item
- Add a quote · Browse quotes
- Write today's brief (AI) · End the day (AI)
- Show to-do list status / Restore the to-do list from this device's backup (troubleshooting)

Links (for iOS/macOS Shortcuts, a desktop launcher, etc.):

```
obsidian://daily-dash?action=open
obsidian://daily-dash?action=complete-next
obsidian://daily-dash?action=add-todo&text=<urlencoded>
obsidian://daily-dash?action=log&field=braindump|journal|tomorrow&text=<urlencoded>
obsidian://daily-dash?action=add-event&summary=<urlencoded>&date=YYYY-MM-DD&start=HH:mm&end=HH:mm
```

Without `text` (or `summary`), each opens the matching window instead.

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
