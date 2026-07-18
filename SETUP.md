# Setting up Daily Dashboard

This guide takes you from a brand-new computer to a working dashboard, one step
at a time. You don't need to know anything about Obsidian to follow it — every
step says exactly what to click. It takes about 20 minutes.

If a step doesn't look quite like the picture in your head, that's okay. Read the
step, do the part you can, and move on. Nothing here can break your computer.

---

## What you're setting up

**Obsidian** is a free app for keeping notes. **Daily Dashboard** is an add-on
for it that gives you a friendly home screen — a clock, a verse for the day,
your to-dos, today's calendar, a journal, your meals, and a search box — all on
one page.

You'll install three things: Obsidian itself, a small helper called **BRAT**
(which installs add-ons that aren't in the main store yet), and then Daily
Dashboard and the Recipe Manager add-on through BRAT.

---

## Step 1 — Install Obsidian

1. Go to **https://obsidian.md** in your web browser.
2. Click the big **Download** button. It will pick the right version for your
   computer automatically.
3. Open the file it downloaded and follow the prompts to install, the same way
   you'd install any app.
4. Open Obsidian once it's installed.

## Step 2 — Make a vault

A "vault" is just a folder where your notes live. You only do this once.

1. On Obsidian's welcome screen, click **Create new vault**.
2. Give it a name — anything you like, for example **My Notes**.
3. Choose where to keep it (the default location is fine), and click **Create**.

You now have an empty vault. Good.

## Step 3 — Make your folders

Daily Dashboard expects a few folders. Making them now keeps everything tidy.

On the left is a sidebar with your files. Right-click in the empty space there
and choose **New folder** for each of these. To make a folder *inside* another
folder, right-click the parent folder first.

```
Knowledge base
   Notes           (inside "Knowledge base")
   Categories      (inside "Knowledge base")
Second brain
   Archive         (inside "Second brain")
Logs
Templates
Recipes
```

- **Knowledge base → Notes** is for things you want to remember.
- **Second brain** is for projects you're working on now. When a project is
  finished, the dashboard can move it into **Second brain → Archive** for you.
- **Logs** is where your day-by-day notes go.
- **Templates** holds the starting layout for each daily note (next step).
- **Recipes** is for the Recipe Manager add-on.

## Step 4 — Create the daily-note template

Every day gets its own note, and they all start from the same simple layout.

1. Right-click the **Templates** folder → **New note**.
2. Name it exactly: **Daily Note Template**
3. Open it and paste in exactly this:

```
# Brain dump

# Completed tasks

# Meals

# Journal

# Reference tomorrow
```

> **Important:** don't add a colon (`:`) after any of these headings. Some
> add-ons look for the heading `# Meals` and get confused by `# Meals:`. Keep
> them plain, exactly as above.

## Step 5 — Turn on Daily Notes

This is a feature already built into Obsidian; you just switch it on.

1. Click the **gear icon** (Settings) at the bottom-left.
2. In the left column, under **Core plugins**, click **Core plugins**.
3. Find **Daily notes** in the list and turn its switch **on**.
4. Still in Settings, click **Daily notes** (it now appears in the left column
   under *Core plugins*) and set:
   - **New file location**: `Logs`
   - **Date format**: `YYYY-MM-DD`
   - **Template file location**: `Templates/Daily Note Template`

Close Settings when you're done.

## Step 6 — Install BRAT

BRAT is the helper that installs Daily Dashboard.

1. Open **Settings** (gear icon) again.
2. In the left column, click **Community plugins**.
3. If you see a message about Community plugins being off, click **Turn on
   community plugins** (this is safe).
4. Click **Browse**, type **BRAT** in the search box, click the result named
   **BRAT** (by TfTHacker), then click **Install**, and then **Enable**.
5. Close the browse window.

## Step 7 — Add Daily Dashboard and Recipe Manager through BRAT

1. In **Settings**, click **BRAT** in the left column (near the bottom).
2. Click **Add beta plugin**.
3. Paste this address and click **Add plugin**:

   ```
   https://github.com/SilentNinja06/friendly_dash_obs
   ```

4. Click **Add beta plugin** again, paste this one, and click **Add plugin**:

   ```
   https://github.com/SilentNinja06/Recipes_obs
   ```

BRAT downloads and turns both on for you.

## Step 8 — Open your dashboard

1. Look at the far-left edge of the Obsidian window for a small **dashboard
   icon** (a little square with lines). Click it.
   - If you don't see it, press **Ctrl/Cmd + P**, type **Open dashboard**, and
     press Enter.
2. Your dashboard opens. The clock and today's verse are already working.

**Tip:** to make the dashboard open by itself each time you start Obsidian, go to
**Settings → Daily Dashboard** and turn on **Open on startup**.

## Step 9 — Pick a theme

1. Go to **Settings → Daily Dashboard**.
2. At the top, use the **Theme** dropdown to try each of the four looks —
   **Sleek Modern**, **Pastel / Floral**, **Mellow**, and **Geometric**. The
   dashboard changes instantly, so pick whichever feels best. You can change it
   any time.

## Step 10 — Add your calendars (optional)

If you use Proton Calendar (or another calendar that can share a public link),
the dashboard can show today's events.

1. In your calendar app, find the option to **share** a calendar as a public
   link (in Proton Calendar this is *Share → Share with anyone → Copy link*).
   The link usually ends in `.ics`.
2. In **Settings → Daily Dashboard → Today's agenda → Calendar share links**,
   add one calendar per line like this:

   ```
   Family | https://...the-link-you-copied...
   Work | https://...another-link...
   ```

3. Your events appear on the dashboard. You can add up to 20 calendars.

> Note: after you change something in your calendar, it can take a few hours to
> show up here — that's the calendar service's own delay, not the dashboard. If a
> calendar ever stops updating, the dashboard will tell you in plain words, and
> you can re-share the calendar to get a fresh link.

---

## That's everything

You now have a working dashboard. Add a to-do, write in the journal, search your
notes — it all saves automatically.

If you ever set this up again on a new computer, you only need Steps 1–8 (your
notes come back automatically if you use Obsidian Sync or keep the vault folder).
