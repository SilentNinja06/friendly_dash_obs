# Daily Dashboard

A calm, simple home surface for [Obsidian](https://obsidian.md) — a clock, a
quote or verse of the day, today's agenda, persistent to-dos, a journal, a
daily-note calendar, your knowledge base and projects, all on one page — plus
cards for companion plugins you install. Works on desktop and mobile.

Built to be legible and forgiving for someone who did not build it: empty states
explain themselves, errors say what to do, and there is no jargon or assumed
vault convention.

**New here? Start with [SETUP.md](./SETUP.md)** — a step-by-step guide that takes
you from a fresh install to a working dashboard.

## Panels

Every panel is a separate module. Turn on only the ones you want in
**Settings → Daily Dashboard → Panels**, reorder them, and (on the desktop) put
each in a column with an optional span.

| Panel | What it does |
| --- | --- |
| **Clock** | Time of day (12-hour by default, 24-hour optional) with the date. |
| **Daily words** | Your choice under **Daily words**: a **Quote of the day** from your own collection (the default), a **Verse of the day** (one verse of Proverbs, KJV, public domain), or nothing. |
| **To-do** | A persistent to-do list with recurring items, scheduling, sub-tasks, due dates and notes. Nothing resets overnight; completing a task logs it in today's note. **Week in review** looks back over the last seven days. |
| **Today's Agenda** | Today's events from up to 20 calendar share links plus your own one-off events, a **Now / Next** strip, **Week's goals**, and **Print week**. |
| **Journal** | Writes into the `# Brain dump`, `# Journal`, and `# Reference tomorrow` sections of today's daily note. |
| **Calendar** | A month grid of your daily notes (click a day to open it), a Bases table, and a search inside daily notes. |
| **Knowledge base** | Fuzzy search across your chosen folders; make notes and categories. |
| **Second Brain** | Your active projects; archive a finished one or start a new one. |
| **Quick Actions** | One-tap buttons: add a to-do, event or shopping item, the week's goals, the week in review. |
| **Shopping** | Shopping lists with quantity, aisle, store and who's paying; imports a Recipe Manager grocery list. |

### Companion plugins

These are separate plugins. Each one's card **only appears while that plugin is
installed and turned on**; otherwise there's no trace of it on the dashboard.
Cards only read — anything that changes data happens in the plugin itself — and
nothing they read leaves your device. Install them with
[BRAT](https://github.com/TfTHacker/obsidian42-brat):

| Card | Plugin (BRAT repository) |
| --- | --- |
| **Flights** — focus sessions as flights | Brainstormer (`SilentNinja06/brainstormer.obs`) |
| **Meals** — today's meals and groceries | Recipe Manager (`SilentNinja06/Recipes_obs`) |
| **Contacts** — who you're due to catch up with | Simple Contact Manager (`SilentNinja06/simple_cm`) |
| **Meditation** — streak and a button to sit | Discipline (`SilentNinja06/meditations.obs`) |
| **Music** — songs in progress | Music (`SilentNinja06/music.obs`) |
| **Wardrobe** — laundry and today's outfit | Wardrobe (`SilentNinja06/outfit_obs`) |
| **Food log** — today's log and quick buttons | ARFID Tracker (`SilentNinja06/ARFID_obs`) |
| **Commons** — notes for whoever's next | Commons (not public yet) |
| **Budget** — a quick way into your budget | Treasury (not public yet) |

**Privacy check.** Before any dashboard release, an automatic check scans this
plugin and the latest release of every companion above for personal details
(email addresses, phone numbers, and a private list of terms the author keeps
as a repository secret). It also runs weekly. A finding blocks the release.

### Updating from 0.6

Nothing is deleted, and nothing you were using disappears:

- **Verse of the Day** and **Quote of the Day** became one **Daily words** panel,
  in the Verse panel's old spot. It keeps showing whichever you had on (the quote
  if you had both). Change it any time under **Daily words**.
- **Daily Brief** and **Places** are no longer offered to new installs. If you
  have them on, they keep working and stay in the panel list until you switch them
  off. Your shortcuts and your AI key file stay where they are.
- **Meals** and **Contacts** are now companion cards: they show only when Recipe
  Manager / Simple Contact Manager are installed.
- New look: a new default theme, **Midnight**, and a quieter frame for every
  theme. Your chosen theme is kept.

### Phone tabs

On a phone the dashboard can be split into tabs (e.g. *Today*, *Home*, *Notes*)
instead of one long scroll: add tabs in **Settings → Daily Dashboard → Phone
tabs**, star the one that opens first, and pick a tab for each panel. The desktop
always shows everything.

### Everything syncs

Your to-dos, local events, panel layout and tabs, shopping lists, quotes, and the
AI key (if you use one) are kept in small Markdown files under `Daily Dashboard/`,
so Obsidian Sync carries them to every device and they survive plugin updates.

## Support and updates

- Announcements on [Signal](https://signal.group/#CjQKIE0SrZPTQLhQDCNcponi2KvgzOTbpyvwB7t57bbtBK_vEhDZsGKwWZHJMpBLz8AgGrMe)
- [Discord server](https://discord.gg/KcKG73WGq)
- [Buy me a coffee](https://buymeacoffee.com/pipertruac1)

These links are also in **Settings → Daily Dashboard → Support & updates**.

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
