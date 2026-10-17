/*
Daily Dashboard — an Obsidian plugin.
This is a bundled build. Source: https://github.com/SilentNinja06/friendly_dash_obs
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => DailyDashPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian44 = require("obsidian");

// src/settings.ts
var import_obsidian40 = require("obsidian");

// node_modules/dash-core/src/core/ics.ts
var import_obsidian = require("obsidian");
function tzOffsetMinutes(tz, utcMs) {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const parts = dtf.formatToParts(new Date(utcMs));
    const map = {};
    for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value);
    const asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
    return (asUTC - utcMs) / 6e4;
  } catch (e) {
    return 0;
  }
}
function toEpochMs(v) {
  if (v.zone === "utc") return Date.UTC(v.y, v.mo - 1, v.d, v.h, v.mi, v.s);
  if (v.zone === "local") return new Date(v.y, v.mo - 1, v.d, v.h, v.mi, v.s).getTime();
  const guess = Date.UTC(v.y, v.mo - 1, v.d, v.h, v.mi, v.s);
  let off = tzOffsetMinutes(v.zone, guess);
  let utc = guess - off * 6e4;
  off = tzOffsetMinutes(v.zone, utc);
  utc = guess - off * 6e4;
  return utc;
}
function unfold(text) {
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("	")) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}
function parseDateVal(rawKey, value) {
  const params = rawKey.split(";").slice(1);
  let tzid = "";
  let isDate = false;
  for (const p of params) {
    const [k, v2] = p.split("=");
    if (k.toUpperCase() === "TZID") tzid = v2;
    if (k.toUpperCase() === "VALUE" && v2.toUpperCase() === "DATE") isDate = true;
  }
  const v = value.trim();
  if (isDate || /^\d{8}$/.test(v)) {
    return {
      allDay: true,
      y: +v.slice(0, 4),
      mo: +v.slice(4, 6),
      d: +v.slice(6, 8),
      h: 0,
      mi: 0,
      s: 0,
      zone: "local"
    };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) {
    const mm = (0, import_obsidian.moment)(v);
    return { allDay: false, y: mm.year(), mo: mm.month() + 1, d: mm.date(), h: mm.hour(), mi: mm.minute(), s: mm.second(), zone: "local" };
  }
  const zone = m[7] ? "utc" : tzid || "local";
  return { allDay: false, y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: +m[6], zone };
}
var WEEKDAY_CODES = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function parseRRule(value) {
  const parts = {};
  for (const seg of value.split(";")) {
    const [k, v] = seg.split("=");
    if (k && v) parts[k.toUpperCase()] = v;
  }
  const freq = parts.FREQ;
  if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return void 0;
  const rule = { freq, interval: Math.max(1, Number(parts.INTERVAL) || 1) };
  if (parts.COUNT) rule.count = Number(parts.COUNT);
  if (parts.UNTIL) rule.until = parseDateVal("UNTIL", parts.UNTIL);
  if (parts.BYDAY) {
    rule.byday = parts.BYDAY.split(",").map((c) => WEEKDAY_CODES[c.replace(/^[+-]?\d+/, "").toUpperCase()]).filter((n) => n !== void 0);
  }
  if (parts.BYMONTHDAY) rule.bymonthday = parts.BYMONTHDAY.split(",").map(Number);
  return rule;
}
function parseICS(text) {
  const lines = unfold(text);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = { summary: "", location: "", uid: "", exdates: /* @__PURE__ */ new Set() };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur && cur.start) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = rawKey.split(";")[0].toUpperCase();
    switch (key) {
      case "UID":
        cur.uid = value.trim();
        break;
      case "SUMMARY":
        cur.summary = unescapeText(value);
        break;
      case "LOCATION":
        cur.location = unescapeText(value);
        break;
      case "DTSTART":
        cur.start = parseDateVal(rawKey, value);
        break;
      case "DTEND":
        cur.end = parseDateVal(rawKey, value);
        break;
      case "RRULE":
        cur.rrule = parseRRule(value);
        break;
      case "EXDATE": {
        for (const piece of value.split(",")) {
          const dv = parseDateVal(rawKey, piece);
          cur.exdates.add(canonicalDate(dv));
        }
        break;
      }
      case "RECURRENCE-ID": {
        cur.recurrenceId = canonicalDate(parseDateVal(rawKey, value));
        break;
      }
    }
  }
  return events;
}
function unescapeText(v) {
  return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}
function canonicalDate(v) {
  return `${pad4(v.y)}-${pad2(v.mo)}-${pad2(v.d)}`;
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function pad4(n) {
  return String(n).padStart(4, "0");
}
function occurrencesOn(ev, targetDate) {
  const start = ev.start;
  const localDateOf = (v) => v.allDay ? canonicalDate(v) : (0, import_obsidian.moment)(toEpochMs(v)).format("YYYY-MM-DD");
  if (!ev.rrule) {
    if (localDateOf(start) === targetDate) return [start];
    if (ev.end && spansDate(ev, targetDate)) return [start];
    return [];
  }
  const rule = ev.rrule;
  const results = [];
  const targetEndMs = (0, import_obsidian.moment)(targetDate, "YYYY-MM-DD").endOf("day").valueOf();
  const untilMs = rule.until ? toEpochMs(rule.until) : Infinity;
  let emitted = 0;
  const guard = 2e4;
  const cursor = { y: start.y, mo: start.mo, d: start.d };
  for (let i = 0; i < guard; i++) {
    const candidates = expandPeriod(rule, cursor, start);
    for (const cand of candidates) {
      const occ = { ...start, y: cand.y, mo: cand.mo, d: cand.d };
      const occMs = occ.allDay ? Date.UTC(occ.y, occ.mo - 1, occ.d) : toEpochMs(occ);
      if (compareTuple(cand, { y: start.y, mo: start.mo, d: start.d }) < 0) continue;
      if (occMs > untilMs && rule.until) return results;
      if (ev.exdates.has(canonicalDate(occ))) continue;
      emitted++;
      if (localDateOf(occ) === targetDate) results.push(occ);
      if (rule.count && emitted >= rule.count) return results;
    }
    advancePeriod(rule, cursor);
    const cursorStartMs = Date.UTC(cursor.y, cursor.mo - 1, cursor.d);
    if (cursorStartMs > targetEndMs + 8 * 864e5) break;
  }
  return results;
}
function expandPeriod(rule, cursor, start) {
  if (rule.freq === "WEEKLY" && rule.byday && rule.byday.length) {
    const base = new Date(Date.UTC(cursor.y, cursor.mo - 1, cursor.d));
    const dow = base.getUTCDay();
    const weekStart = new Date(base.getTime() - dow * 864e5);
    return rule.byday.slice().sort((a, b) => a - b).map((wd) => {
      const dt = new Date(weekStart.getTime() + wd * 864e5);
      return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
    });
  }
  if (rule.freq === "MONTHLY" && rule.bymonthday && rule.bymonthday.length) {
    return rule.bymonthday.map((md) => clampDay({ y: cursor.y, mo: cursor.mo, d: md }));
  }
  return [{ y: cursor.y, mo: cursor.mo, d: cursor.d }];
}
function advancePeriod(rule, cursor) {
  const step = rule.interval;
  if (rule.freq === "DAILY") {
    const dt = new Date(Date.UTC(cursor.y, cursor.mo - 1, cursor.d + step));
    assign(cursor, dt);
  } else if (rule.freq === "WEEKLY") {
    const dt = new Date(Date.UTC(cursor.y, cursor.mo - 1, cursor.d + 7 * step));
    assign(cursor, dt);
  } else if (rule.freq === "MONTHLY") {
    let mo = cursor.mo - 1 + step;
    let y = cursor.y + Math.floor(mo / 12);
    mo = (mo % 12 + 12) % 12;
    cursor.y = y;
    cursor.mo = mo + 1;
  } else {
    cursor.y += step;
  }
}
function assign(cursor, dt) {
  cursor.y = dt.getUTCFullYear();
  cursor.mo = dt.getUTCMonth() + 1;
  cursor.d = dt.getUTCDate();
}
function clampDay(t) {
  const dim = new Date(Date.UTC(t.y, t.mo, 0)).getUTCDate();
  return { y: t.y, mo: t.mo, d: Math.min(t.d, dim) };
}
function compareTuple(a, b) {
  return a.y - b.y || a.mo - b.mo || a.d - b.d;
}
function spansDate(ev, targetDate) {
  if (!ev.end) return false;
  const startDay = ev.start.allDay ? canonicalDate(ev.start) : (0, import_obsidian.moment)(toEpochMs(ev.start)).format("YYYY-MM-DD");
  const endMs = ev.end.allDay ? (0, import_obsidian.moment)(canonicalDate(ev.end), "YYYY-MM-DD").valueOf() : toEpochMs(ev.end);
  const targetStartMs = (0, import_obsidian.moment)(targetDate, "YYYY-MM-DD").startOf("day").valueOf();
  const startMs = ev.start.allDay ? (0, import_obsidian.moment)(startDay, "YYYY-MM-DD").valueOf() : toEpochMs(ev.start);
  return startMs <= (0, import_obsidian.moment)(targetDate, "YYYY-MM-DD").endOf("day").valueOf() && endMs > targetStartMs;
}
function eventsOnDate(events, localDate) {
  const overridden = /* @__PURE__ */ new Set();
  for (const ev of events) if (ev.recurrenceId) overridden.add(`${ev.uid}|${ev.recurrenceId}`);
  const items = [];
  for (const ev of events) {
    const occs = ev.recurrenceId ? occurrencesOn(ev, localDate) : occurrencesOn(ev, localDate).filter(
      (o) => !overridden.has(`${ev.uid}|${canonicalDate(o)}`)
    );
    for (const occ of occs) items.push(toAgendaItem(ev, occ));
  }
  items.sort((a, b) => a.sortKey - b.sortKey || a.summary.localeCompare(b.summary));
  return items;
}
function toAgendaItem(ev, occ) {
  if (occ.allDay) {
    return {
      summary: ev.summary || "(untitled)",
      location: ev.location,
      allDay: true,
      startMs: (0, import_obsidian.moment)(canonicalDate(occ), "YYYY-MM-DD").valueOf(),
      timeLabel: "",
      sortKey: -1
    };
  }
  const startMs = toEpochMs(occ);
  const startM = (0, import_obsidian.moment)(startMs);
  let timeLabel = startM.format("HH:mm");
  let endMs;
  if (ev.end && !ev.end.allDay) {
    const origStart = toEpochMs(ev.start);
    const origEnd = toEpochMs(ev.end);
    const durMs = Math.max(0, origEnd - origStart);
    endMs = startMs + durMs;
    timeLabel += `\u2013${(0, import_obsidian.moment)(endMs).format("HH:mm")}`;
  }
  return {
    summary: ev.summary || "(untitled)",
    location: ev.location,
    allDay: false,
    startMs,
    endMs,
    timeLabel,
    sortKey: startM.hour() * 60 + startM.minute()
  };
}
async function fetchICS(url) {
  const res = await (0, import_obsidian.requestUrl)({ url, method: "GET", throw: false });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text;
}

// node_modules/dash-core/src/core/agendamath.ts
function agendaState(items, now) {
  const timed = items.filter((i) => !i.allDay).sort((a, b) => a.startMs - b.startMs);
  const inProgress = timed.filter((i) => i.endMs !== void 0 && i.startMs <= now && i.endMs > now).sort((a, b) => a.endMs - b.endMs)[0];
  const nextEvent = timed.find((i) => i.startMs > now);
  if (inProgress) {
    const gapStart = inProgress.endMs;
    return {
      kind: "now",
      summary: inProgress.summary,
      untilMs: gapStart - now,
      gapMs: nextEvent ? Math.max(0, nextEvent.startMs - gapStart) : void 0
    };
  }
  if (nextEvent) {
    return {
      kind: "next",
      summary: nextEvent.summary,
      untilMs: nextEvent.startMs - now,
      gapMs: nextEvent.startMs - now
    };
  }
  return { kind: "clear" };
}
function formatGap(ms) {
  const totalMin = Math.floor(Math.max(0, ms) / 6e4);
  if (totalMin < 1) return "less than a minute";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// node_modules/dash-core/src/core/localevents.ts
function localEventToAgendaItem(ev) {
  const [y, mo, d] = ev.date.split("-").map(Number);
  if (!ev.start) {
    return {
      summary: ev.summary || "(untitled)",
      location: "",
      allDay: true,
      startMs: new Date(y, mo - 1, d).getTime(),
      timeLabel: "",
      sortKey: -1
    };
  }
  const [sh, sm] = ev.start.split(":").map(Number);
  const startMs = new Date(y, mo - 1, d, sh, sm).getTime();
  let endMs;
  let timeLabel = ev.start;
  if (ev.end) {
    const [eh, em] = ev.end.split(":").map(Number);
    endMs = new Date(y, mo - 1, d, eh, em).getTime();
    timeLabel += `\u2013${ev.end}`;
  }
  return {
    summary: ev.summary || "(untitled)",
    location: "",
    allDay: false,
    startMs,
    endMs,
    timeLabel,
    sortKey: sh * 60 + sm
  };
}

// node_modules/dash-core/src/core/directivesserde.ts
var DEFAULT_DIRECTIVES_HEADER = "%% Dashboard \u2014 persistent to-do list. Managed automatically; edit these in the dashboard, not here. %%";
function buildMarkdown(items, header = DEFAULT_DIRECTIVES_HEADER) {
  const body = items.length ? `{
  "version": 1,
  "todos": [
${items.map((t) => "    " + JSON.stringify(t)).join(",\n")}
  ]
}` : `{
  "version": 1,
  "todos": []
}`;
  return `${header}

\`\`\`json
${body}
\`\`\`
`;
}
function jsonCandidates(raw) {
  const out = [];
  const fencedJson = raw.match(/```+\s*json\b\s*([\s\S]*?)```+/i);
  if (fencedJson) out.push(fencedJson[1]);
  const anyFence = raw.match(/```+[^\n]*\n([\s\S]*?)```+/);
  if (anyFence) out.push(anyFence[1]);
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a >= 0 && b > a) out.push(raw.slice(a, b + 1));
  out.push(raw);
  return out;
}
function deSmarten(s) {
  return s.replace(/[“”„‟«»]/g, '"').replace(/[‘’‚‛]/g, "'").replace(/ /g, " ");
}
function repairJson(s) {
  let out = s.replace(/"(completions|skips)"\s*:\s*\[([\s\S]*?)\]/g, (_m, key, inner) => {
    const dates = inner.match(/\d{4}-\d{2}-\d{2}/g) || [];
    const uniq = [...new Set(dates)];
    return `"${key}": [${uniq.map((d) => `"${d}"`).join(", ")}]`;
  });
  out = out.replace(/,(\s*,)+/g, ",");
  out = out.replace(/,(\s*[\]}])/g, "$1");
  out = out.replace(/"(\s*\n\s*)"/g, '",$1"');
  return out;
}
function tryParseJson(raw) {
  const candidates = jsonCandidates(raw);
  for (let i = 0; i < candidates.length; i++) {
    const desmartened = deSmarten(candidates[i]);
    const variants = [candidates[i], desmartened, repairJson(desmartened)];
    for (let v = 0; v < variants.length; v++) {
      try {
        return { value: JSON.parse(variants[v]), recovered: i > 0 || v > 0 };
      } catch (e) {
      }
    }
  }
  return null;
}
function tryParseTodos(raw) {
  var _a;
  const r = tryParseJson(raw);
  const todos = (_a = r == null ? void 0 : r.value) == null ? void 0 : _a.todos;
  if (r && Array.isArray(todos)) return { ok: true, todos, recovered: r.recovered };
  return { ok: false, todos: [] };
}
function unionById(onDisk, local) {
  const seen = new Set(onDisk.map((t) => t.id));
  return [...onDisk, ...local.filter((t) => !seen.has(t.id))];
}

// node_modules/dash-core/src/core/localeventsserde.ts
var DEFAULT_LOCAL_EVENTS_HEADER = "%% Dashboard \u2014 local (dashboard-only) schedule events. Managed automatically; edit these in the dashboard, not here. %%";
function isLocalEvent(e) {
  if (!e || typeof e !== "object") return false;
  const r = e;
  return typeof r.id === "string" && typeof r.date === "string" && typeof r.summary === "string" && (r.start === void 0 || typeof r.start === "string") && (r.end === void 0 || typeof r.end === "string");
}
function buildLocalEventsMarkdown(events, header = DEFAULT_LOCAL_EVENTS_HEADER) {
  const body = events.length ? `{
  "version": 1,
  "events": [
${events.map((e) => "    " + JSON.stringify(e)).join(",\n")}
  ]
}` : `{
  "version": 1,
  "events": []
}`;
  return `${header}

\`\`\`json
${body}
\`\`\`
`;
}
function tryParseLocalEvents(raw) {
  var _a;
  const r = tryParseJson(raw);
  const events = (_a = r == null ? void 0 : r.value) == null ? void 0 : _a.events;
  if (r && Array.isArray(events)) return { ok: true, events: events.filter(isLocalEvent) };
  return { ok: false, events: [] };
}
function unionEventsById(onDisk, local) {
  const seen = new Set(onDisk.map((e) => e.id));
  return [...onDisk, ...local.filter((e) => !seen.has(e.id))];
}

// node_modules/dash-core/src/core/localeventsstore.ts
var import_obsidian2 = require("obsidian");
var DEFAULT_PATH = "Dashboard/Local Events.md";
var LocalEventsFileStore = class {
  constructor(app, getPath, opts = {}) {
    this.app = app;
    this.getPath = getPath;
    this.opts = opts;
    __publicField(this, "events", []);
    /** The exact text we last read from / wrote to disk, so a modify event
     * caused by our own write reloads to identical content and is ignored. */
    __publicField(this, "lastSerialized", "");
    /** Same sync-safety guards as DirectivesStore: don't clobber an unreadable or
     * not-yet-loaded file, and never CREATE an empty one. */
    __publicField(this, "unreadable", false);
    __publicField(this, "everLoaded", false);
  }
  getEvents() {
    return this.events;
  }
  /** The Markdown file the events live in. Any configured extension is coerced
   * to `.md` so the file always syncs. */
  path() {
    const raw = (this.getPath() || this.opts.defaultPath || DEFAULT_PATH).trim();
    return (0, import_obsidian2.normalizePath)(raw.replace(/\.[^./]+$/, "") + ".md");
  }
  isLocalEventsPath(path) {
    return (0, import_obsidian2.normalizePath)(path) === this.path();
  }
  /** Load from the Markdown file. Returns true if the file existed. */
  async load() {
    const file = this.app.vault.getAbstractFileByPath(this.path());
    if (!(file instanceof import_obsidian2.TFile)) return false;
    try {
      const raw = await this.app.vault.read(file);
      const res = tryParseLocalEvents(raw);
      if (res.ok) {
        this.events = this.everLoaded ? res.events : unionEventsById(res.events, this.events);
        this.lastSerialized = raw;
        this.unreadable = false;
        this.everLoaded = true;
      } else {
        this.unreadable = true;
        console.error("dash-core: local-events file did not parse \u2014 preserving it and refusing to overwrite.");
      }
    } catch (e) {
      this.unreadable = true;
      console.error("dash-core: could not read the local-events file", e);
    }
    return true;
  }
  /** One-time migration seed from an in-memory array (e.g. events that used to
   * live in the plugin's `data.json`). Writes the file out so subsequent loads
   * find it. No-op for an empty array. */
  async seedFrom(events) {
    if (events.length === 0) return;
    this.events = events.map((e) => ({ ...e }));
    this.lastSerialized = "";
    await this.save();
  }
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  // -------- LocalEventsStore CRUD (each persists immediately) --------
  async add(patch) {
    this.events.push({ id: this.genId(), ...patch });
    await this.save();
  }
  async update(id, patch) {
    const ev = this.events.find((e) => e.id === id);
    if (!ev) return;
    Object.assign(ev, patch);
    await this.save();
  }
  async remove(id) {
    this.events = this.events.filter((e) => e.id !== id);
    await this.save();
  }
  /** Write the current events to the Markdown file (creating it and its folder
   * if needed). No-op when the content is unchanged. */
  async save() {
    if (this.unreadable) return;
    if (!this.everLoaded) {
      const existing2 = this.app.vault.getAbstractFileByPath(this.path());
      if (existing2 instanceof import_obsidian2.TFile) {
        try {
          const res = tryParseLocalEvents(await this.app.vault.read(existing2));
          if (res.ok) this.events = unionEventsById(res.events, this.events);
          else {
            this.unreadable = true;
            return;
          }
        } catch (e) {
          return;
        }
      }
    }
    const body = buildLocalEventsMarkdown(this.events, this.opts.header);
    if (body === this.lastSerialized) return;
    const path = this.path();
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (!(existing instanceof import_obsidian2.TFile) && this.events.length === 0) return;
    this.lastSerialized = body;
    if (existing instanceof import_obsidian2.TFile) {
      await this.app.vault.modify(existing, body);
    } else {
      await this.ensureFolder(path);
      await this.app.vault.create(path, body);
    }
    this.everLoaded = true;
  }
  /** React to a vault change on the events file (e.g. Obsidian Sync landing the
   * other device's edit). Returns true if the in-memory list actually changed —
   * our own writes reload to identical content and return false. */
  async onExternalChange(path) {
    if (!this.isLocalEventsPath(path)) return false;
    const before = this.lastSerialized;
    await this.load();
    return this.lastSerialized !== before;
  }
  async ensureFolder(path) {
    const dir = path.split("/").slice(0, -1).join("/");
    if (!dir) return;
    if (this.app.vault.getAbstractFileByPath(dir) instanceof import_obsidian2.TFolder) return;
    await this.app.vault.createFolder(dir).catch(() => {
    });
  }
};

// node_modules/dash-core/src/core/todostore.ts
var import_obsidian4 = require("obsidian");

// node_modules/dash-core/src/core/dailynote.ts
var import_obsidian3 = require("obsidian");
function getDailyNotesOptions(app) {
  var _a, _b, _c, _d;
  const dn = (_b = (_a = app.internalPlugins) == null ? void 0 : _a.getPluginById) == null ? void 0 : _b.call(_a, "daily-notes");
  return (_d = (_c = dn == null ? void 0 : dn.instance) == null ? void 0 : _c.options) != null ? _d : {};
}
function dailyNotesFolder(app) {
  var _a;
  const opts = getDailyNotesOptions(app);
  return ((_a = opts.folder) != null ? _a : "").trim().replace(/\/+$/, "");
}
function dailyNotePath(app, date) {
  var _a;
  const opts = getDailyNotesOptions(app);
  const format = opts.format || "YYYY-MM-DD";
  const folder = ((_a = opts.folder) != null ? _a : "").trim().replace(/\/+$/, "");
  const d = date != null ? date : (0, import_obsidian3.moment)().format("YYYY-MM-DD");
  const name = (0, import_obsidian3.moment)(d, "YYYY-MM-DD").format(format);
  return (0, import_obsidian3.normalizePath)((folder ? folder + "/" : "") + name + ".md");
}
function getDailyNoteFile(app, date) {
  const f = app.vault.getAbstractFileByPath(dailyNotePath(app, date));
  return f instanceof import_obsidian3.TFile ? f : null;
}
async function ensureDailyNote(app, date) {
  const path = dailyNotePath(app, date);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof import_obsidian3.TFile) return existing;
  await ensureParentFolder(app, path);
  const opts = getDailyNotesOptions(app);
  const body = await renderDailyTemplate(app, opts, path, date != null ? date : (0, import_obsidian3.moment)().format("YYYY-MM-DD"));
  const raced = app.vault.getAbstractFileByPath(path);
  if (raced instanceof import_obsidian3.TFile) return raced;
  return app.vault.create(path, body);
}
async function ensureParentFolder(app, path) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (!dir) return;
  if (app.vault.getAbstractFileByPath(dir) instanceof import_obsidian3.TFolder) return;
  await app.vault.createFolder(dir).catch(() => {
  });
}
async function renderDailyTemplate(app, opts, dailyPath, date) {
  var _a, _b, _c;
  const templateSetting = ((_a = opts.template) != null ? _a : "").trim();
  if (!templateSetting) return "";
  const templatePath = (0, import_obsidian3.normalizePath)(
    templateSetting.endsWith(".md") ? templateSetting : templateSetting + ".md"
  );
  const tFile = app.vault.getAbstractFileByPath(templatePath);
  if (!(tFile instanceof import_obsidian3.TFile)) return "";
  const raw = await app.vault.cachedRead(tFile);
  const basename = (_c = (_b = dailyPath.split("/").pop()) == null ? void 0 : _b.replace(/\.md$/, "")) != null ? _c : "";
  const m = (0, import_obsidian3.moment)(date, "YYYY-MM-DD");
  const now = (0, import_obsidian3.moment)();
  return raw.replace(/{{\s*title\s*}}/gi, basename).replace(/{{\s*date(?::([^}]+))?\s*}}/gi, (_, fmt2) => m.format(fmt2 || "YYYY-MM-DD")).replace(/{{\s*time(?::([^}]+))?\s*}}/gi, (_, fmt2) => now.format(fmt2 || "HH:mm"));
}
var HEADING_RE = /^#{1,6}\s/;
function headingField(heading) {
  const esc = heading.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { anchor: new RegExp(`^#{1,6}\\s+${esc}:?\\s*$`, "i") };
}
function locate(lines, spec) {
  var _a;
  const anchorIdx = lines.findIndex((l) => spec.anchor.test(l));
  if (anchorIdx === -1) return null;
  const stopAtHeading = spec.stopAtHeading !== false;
  let end = lines.length;
  for (let i = anchorIdx + 1; i < lines.length; i++) {
    if (stopAtHeading && HEADING_RE.test(lines[i])) {
      end = i;
      break;
    }
    if ((_a = spec.stops) == null ? void 0 : _a.some((re) => re.test(lines[i]))) {
      end = i;
      break;
    }
  }
  return { anchorIdx, start: anchorIdx + 1, end };
}
function readField(content, spec) {
  const lines = content.split("\n");
  const r = locate(lines, spec);
  if (!r) return "";
  return lines.slice(r.start, r.end).join("\n").replace(/^\n+/, "").replace(/\s+$/, "");
}
function replaceField(content, spec, body) {
  const lines = content.split("\n");
  const r = locate(lines, spec);
  if (!r) return content;
  const bodyLines = body.replace(/\s+$/, "").split("\n");
  const replacement = body.trim() ? ["", ...bodyLines, ""] : [""];
  lines.splice(r.start, r.end - r.start, ...replacement);
  return lines.join("\n");
}
var PLUGIN_LOG_LINE = /^- \d{2}:\d{2}\b/;
function insertLogLine(content, line, opts) {
  var _a;
  const lines = content.split("\n");
  if (lines.some((l) => l.trim() === line.trim())) return content;
  let anchor = -1;
  const marker = (_a = opts.marker) == null ? void 0 : _a.trim();
  if (marker) anchor = lines.findIndex((l) => l.includes(marker));
  if (anchor === -1) {
    const heading = opts.heading.trim().toLowerCase().replace(/:$/, "");
    anchor = lines.findIndex((l) => {
      const m = l.match(/^#{1,6}\s+(.*?)\s*$/);
      return !!m && m[1].trim().toLowerCase().replace(/:$/, "") === heading;
    });
  }
  if (anchor === -1) {
    const trimmed = content.replace(/\n+$/, "");
    return (trimmed ? trimmed + "\n\n" : "") + `# ${opts.heading.replace(/:$/, "")}
${line}
`;
  }
  let insertAt = anchor + 1;
  while (insertAt < lines.length && PLUGIN_LOG_LINE.test(lines[insertAt])) {
    const existingTime = lines[insertAt].slice(2, 7);
    if (existingTime > opts.time) break;
    insertAt++;
  }
  lines.splice(insertAt, 0, line);
  return lines.join("\n");
}
function openEditorFor(app, file) {
  var _a;
  for (const leaf of app.workspace.getLeavesOfType("markdown")) {
    const view = leaf.view;
    if (view instanceof import_obsidian3.MarkdownView && ((_a = view.file) == null ? void 0 : _a.path) === file.path) return view;
  }
  return null;
}
async function editDailyNote(app, transform, date) {
  const file = await ensureDailyNote(app, date);
  const view = openEditorFor(app, file);
  if (view) {
    const editor = view.editor;
    const before = editor.getValue();
    const after = transform(before);
    if (after !== before) {
      const { from, to, text } = minimalDiff(before, after);
      editor.replaceRange(text, editor.offsetToPos(from), editor.offsetToPos(to));
    }
    return;
  }
  await app.vault.process(file, transform);
}
function minimalDiff(a, b) {
  let start = 0;
  const max = Math.min(a.length, b.length);
  while (start < max && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  return { from: start, to: endA, text: b.slice(start, endB) };
}
async function writeDailyField(app, spec, body) {
  await editDailyNote(app, (content) => replaceField(content, spec, body));
}
async function writeDailyFieldOrCreate(app, spec, body, heading) {
  await editDailyNote(app, (content) => {
    if (content.split("\n").some((l) => spec.anchor.test(l))) return replaceField(content, spec, body);
    if (!body.trim()) return content;
    const trimmed = content.replace(/\s+$/, "");
    const section = `## ${heading}

${body.trim()}
`;
    return trimmed ? `${trimmed}

${section}` : section;
  });
}
async function appendToDailyField(app, spec, text, ensureHeading) {
  const clean = text.trim();
  if (!clean) return false;
  const file = getDailyNoteFile(app);
  if (file) {
    const raw = await readDailyNoteRaw(app);
    if (!raw.split("\n").some((l) => spec.anchor.test(l))) {
      if (!ensureHeading) return false;
      await writeDailyFieldOrCreate(app, spec, clean, ensureHeading);
      return true;
    }
  }
  const current = await readDailyField(app, spec);
  const next = current ? `${current}
${clean}` : clean;
  if (ensureHeading) await writeDailyFieldOrCreate(app, spec, next, ensureHeading);
  else await writeDailyField(app, spec, next);
  return true;
}
async function readDailyField(app, spec) {
  const file = getDailyNoteFile(app);
  if (!file) return "";
  const view = openEditorFor(app, file);
  const content = view ? view.editor.getValue() : await app.vault.cachedRead(file);
  return readField(content, spec);
}
async function appendDailyLogLine(app, line, opts, date) {
  await editDailyNote(app, (content) => insertLogLine(content, line, opts), date);
}
function readHeadingSection(content, heading) {
  return readField(content, headingField(heading));
}
async function readDailyNoteRaw(app, date) {
  const file = getDailyNoteFile(app, date);
  if (!file) return "";
  const view = openEditorFor(app, file);
  return view ? view.editor.getValue() : app.vault.cachedRead(file);
}
function readMarkerLogLines(content, marker, heading) {
  const lines = content.split("\n");
  let anchor = lines.findIndex((l) => l.includes(marker));
  if (anchor === -1 && heading) {
    const h = heading.trim().toLowerCase().replace(/:$/, "");
    anchor = lines.findIndex((l) => {
      const m = l.match(/^#{1,6}\s+(.*?)\s*$/);
      return !!m && m[1].trim().toLowerCase().replace(/:$/, "") === h;
    });
  }
  if (anchor === -1) return [];
  const out = [];
  for (let i = anchor + 1; i < lines.length; i++) {
    if (HEADING_RE.test(lines[i])) break;
    if (/^- \d{2}:\d{2}\b/.test(lines[i])) out.push(lines[i]);
    else if (lines[i].includes("%%") && !lines[i].includes(marker)) break;
  }
  return out;
}

// node_modules/dash-core/src/core/todostore.ts
var WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function describeRecurrence(r) {
  var _a, _b, _c;
  switch (r.type) {
    case "none":
      return "One-time";
    case "daily":
      return "Every day";
    case "weekdays":
      return "Weekdays";
    case "weekly": {
      const days = ((_a = r.days) != null ? _a : []).slice().sort((a, b) => a - b).map((d) => WEEKDAY_NAMES[d]);
      return days.length ? `Weekly \xB7 ${days.join(", ")}` : "Weekly";
    }
    case "monthly":
      return `Monthly \xB7 day ${(_b = r.date) != null ? _b : 1}`;
    case "everyNDays":
      return `Every ${(_c = r.n) != null ? _c : 2} days`;
  }
}
function todayStr() {
  return (0, import_obsidian4.moment)().format("YYYY-MM-DD");
}
function nowTime() {
  return (0, import_obsidian4.moment)().format("HH:mm");
}
function weekday(date) {
  return (0, import_obsidian4.moment)(date, "YYYY-MM-DD").day();
}
function dayOfMonth(date) {
  return (0, import_obsidian4.moment)(date, "YYYY-MM-DD").date();
}
function lastDayOfMonth(date) {
  return (0, import_obsidian4.moment)(date, "YYYY-MM-DD").daysInMonth();
}
function daysBetween(a, b) {
  return (0, import_obsidian4.moment)(b, "YYYY-MM-DD").diff((0, import_obsidian4.moment)(a, "YYYY-MM-DD"), "days");
}
var TodoStore = class {
  constructor(app, getItems, setItems, save, getLogTarget) {
    this.app = app;
    this.getItems = getItems;
    this.setItems = setItems;
    this.save = save;
    this.getLogTarget = getLogTarget;
  }
  all() {
    return this.getItems().slice().sort((a, b) => a.order - b.order);
  }
  anchorDate(item) {
    return item.scheduledDate || (0, import_obsidian4.moment)(item.createdAt).format("YYYY-MM-DD");
  }
  /** Whether `date` is an occurrence for this item's recurrence. */
  isOccurrence(item, date) {
    var _a, _b, _c;
    const start = item.scheduledDate;
    if (start && date < start) return false;
    const r = item.recurrence;
    switch (r.type) {
      case "none":
        return start ? date >= start : true;
      case "daily":
        return true;
      case "weekdays": {
        const d = weekday(date);
        return d >= 1 && d <= 5;
      }
      case "weekly":
        return ((_a = r.days) != null ? _a : []).includes(weekday(date));
      case "monthly": {
        const target = (_b = r.date) != null ? _b : 1;
        const dom = dayOfMonth(date);
        if (dom === target) return true;
        return target > lastDayOfMonth(date) && dom === lastDayOfMonth(date);
      }
      case "everyNDays": {
        const n = Math.max(1, (_c = r.n) != null ? _c : 2);
        return daysBetween(this.anchorDate(item), date) % n === 0;
      }
    }
  }
  /** Latest occurrence strictly before `date`, or null. Bounded scan. */
  previousOccurrence(item, date) {
    for (let i = 1; i <= 366; i++) {
      const d = (0, import_obsidian4.moment)(date, "YYYY-MM-DD").subtract(i, "days").format("YYYY-MM-DD");
      if (item.scheduledDate && d < item.scheduledDate) return null;
      if (this.isOccurrence(item, d)) return d;
    }
    return null;
  }
  isRecurring(item) {
    return item.recurrence.type !== "none";
  }
  isHiddenByTime(item, date) {
    if (item.scheduledDate && date < item.scheduledDate) return true;
    if (item.scheduledDate === date && item.scheduledTime) {
      return nowTime() < item.scheduledTime;
    }
    return false;
  }
  /** Instances to render for `date` (default today): eligible, not future-hidden. */
  instancesFor(date = todayStr()) {
    var _a, _b, _c, _d;
    const out = [];
    for (const item of this.all()) {
      if (this.isHiddenByTime(item, date)) continue;
      if (this.isRecurring(item)) {
        if (!this.isOccurrence(item, date)) continue;
        const done = ((_a = item.completions) != null ? _a : []).includes(date);
        const skipped = !done && ((_b = item.skips) != null ? _b : []).includes(date);
        const prev = this.previousOccurrence(item, date);
        const missed = !done && !skipped && !!prev && !((_c = item.completions) != null ? _c : []).includes(prev) && !((_d = item.skips) != null ? _d : []).includes(prev);
        out.push({
          item,
          recurring: true,
          done,
          skipped,
          flagged: missed,
          flagLabel: missed ? missedLabel(prev, date) : ""
        });
      } else {
        if (item.completed) {
          if (item.completedDate === date) {
            out.push({ item, recurring: false, done: true, skipped: false, flagged: false, flagLabel: "" });
          }
          continue;
        }
        const carried = !!item.scheduledDate && item.scheduledDate < date;
        out.push({
          item,
          recurring: false,
          done: false,
          skipped: false,
          flagged: carried,
          flagLabel: carried ? "carried over" : ""
        });
      }
    }
    return out;
  }
  /** Directives to draw on the printed week planner for `date`: opt-in items
   * that occur on that date (recurring), or whose scheduled/due date is that day
   * (one-time). Ignores time-of-day hiding and completion — the planner is a
   * blank-space paper artifact, not the live list. */
  itemsForWeekPrint(date) {
    const out = [];
    for (const item of this.all()) {
      if (!item.showOnWeekPrint) continue;
      if (this.isRecurring(item)) {
        if (this.isOccurrence(item, date)) out.push(item);
      } else if (item.scheduledDate === date || item.dueDate === date) {
        out.push(item);
      }
    }
    return out;
  }
  /** Count of slipped items for overdue-based weighting. */
  overdueCount(date = todayStr()) {
    return this.instancesFor(date).filter((i) => i.flagged && !i.done).length;
  }
  /** Count of pending (undone, un-postponed, eligible) items today. */
  pendingCount(date = todayStr()) {
    return this.instancesFor(date).filter((i) => !i.done && !i.skipped).length;
  }
  /** The top pending instance for `date` in the same order the panel shows —
   * flagged (slipped) first, then by scheduled time, then stored order. Used by
   * the `complete-next-directive` command (§1.1). */
  firstPending(date = todayStr()) {
    var _a;
    const active = this.instancesFor(date).filter((i) => !i.done && !i.skipped);
    active.sort((a, b) => {
      var _a2, _b;
      if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
      const at = (_a2 = a.item.scheduledTime) != null ? _a2 : "99:99";
      const bt = (_b = b.item.scheduledTime) != null ? _b : "99:99";
      if (at !== bt) return at.localeCompare(bt);
      return a.item.order - b.item.order;
    });
    return (_a = active[0]) != null ? _a : null;
  }
  // ----------------------------------------------------------- mutations
  async add(partial) {
    var _a;
    const items = this.getItems();
    const maxOrder = items.reduce((m, i) => Math.max(m, i.order), 0);
    const item = {
      id: cryptoId(),
      text: partial.text.trim(),
      recurrence: (_a = partial.recurrence) != null ? _a : { type: "none" },
      createdAt: Date.now(),
      order: maxOrder + 1,
      scheduledDate: partial.scheduledDate,
      scheduledTime: partial.scheduledTime,
      dueDate: partial.dueDate,
      showOnWeekPrint: partial.showOnWeekPrint,
      completions: [],
      skips: []
    };
    items.push(item);
    this.setItems(items);
    await this.save();
  }
  async update(id, patch) {
    const items = this.getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    Object.assign(item, patch);
    this.setItems(items);
    await this.save();
  }
  /** First-class removal (§7.4) — deletes the item and all its recurrence. */
  async remove(id) {
    this.setItems(this.getItems().filter((i) => i.id !== id));
    await this.save();
  }
  // ------------------------------------------------- sub-items + note (§1.2)
  /** Add a sub-task to a directive. */
  async addSubItem(parentId, text) {
    var _a;
    const trimmed = text.trim();
    if (!trimmed) return;
    const items = this.getItems();
    const item = items.find((i) => i.id === parentId);
    if (!item) return;
    ((_a = item.subItems) != null ? _a : item.subItems = []).push({ id: cryptoId(), text: trimmed, done: false });
    this.setItems(items);
    await this.save();
  }
  /** Remove a sub-task, and forget its per-occurrence completion state. */
  async removeSubItem(parentId, subId) {
    var _a;
    const items = this.getItems();
    const item = items.find((i) => i.id === parentId);
    if (!item) return;
    item.subItems = ((_a = item.subItems) != null ? _a : []).filter((s) => s.id !== subId);
    if (item.subCompletions) {
      for (const date of Object.keys(item.subCompletions)) {
        item.subCompletions[date] = item.subCompletions[date].filter((id) => id !== subId);
        if (item.subCompletions[date].length === 0) delete item.subCompletions[date];
      }
    }
    this.setItems(items);
    await this.save();
  }
  /** Toggle a sub-task's done state for `date`. Recurring parents key the state
   * by date; non-recurring parents use the flat `SubItem.done`. */
  async toggleSubItem(parentId, subId, date = todayStr()) {
    var _a, _b, _c;
    const items = this.getItems();
    const item = items.find((i) => i.id === parentId);
    if (!item) return;
    const sub = ((_a = item.subItems) != null ? _a : []).find((s) => s.id === subId);
    if (!sub) return;
    if (this.isRecurring(item)) {
      const map = (_b = item.subCompletions) != null ? _b : item.subCompletions = {};
      const set = new Set((_c = map[date]) != null ? _c : []);
      if (set.has(subId)) set.delete(subId);
      else set.add(subId);
      if (set.size === 0) delete map[date];
      else map[date] = [...set];
    } else {
      sub.done = !sub.done;
    }
    this.setItems(items);
    await this.save();
  }
  /** Set (or clear) the directive's single note line. */
  async setNote(id, text) {
    const items = this.getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const trimmed = text.trim();
    item.note = trimmed || void 0;
    this.setItems(items);
    await this.save();
  }
  async reorder(orderedIds) {
    const items = this.getItems();
    orderedIds.forEach((id, idx) => {
      const item = items.find((i) => i.id === id);
      if (item) item.order = idx;
    });
    this.setItems(items);
    await this.save();
  }
  /** Toggle completion for `date` (default today). Appends the archive line on
   * the transition into completed; un-completing does not touch the note. */
  async toggleComplete(id, date = todayStr()) {
    var _a, _b, _c;
    const items = this.getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    let didComplete = false;
    if (this.isRecurring(item)) {
      const set = new Set((_a = item.completions) != null ? _a : []);
      if (set.has(date)) {
        set.delete(date);
      } else {
        set.add(date);
        (_b = item.skips) != null ? _b : item.skips = [];
        item.skips = ((_c = item.skips) != null ? _c : []).filter((d) => d !== date);
        didComplete = true;
      }
      item.completions = [...set];
    } else {
      if (item.completed && item.completedDate === date) {
        item.completed = false;
        item.completedDate = void 0;
      } else {
        item.completed = true;
        item.completedDate = date;
        didComplete = true;
      }
    }
    this.setItems(items);
    await this.save();
    if (didComplete && date === todayStr()) await this.archiveCompletion(item);
  }
  /** Dismiss/skip a single occurrence (recurring): leaves today's list, keeps
   * future recurrence, and does not flag the next occurrence as missed. */
  async skipInstance(id, date = todayStr()) {
    var _a, _b;
    const items = this.getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (this.isRecurring(item)) {
      const set = new Set((_a = item.skips) != null ? _a : []);
      set.add(date);
      item.skips = [...set];
      item.completions = ((_b = item.completions) != null ? _b : []).filter((d) => d !== date);
    } else {
      item.completed = true;
      item.completedDate = date;
    }
    this.setItems(items);
    await this.save();
  }
  /** Un-postpone a skipped occurrence — bring it back to the active list. */
  async unskipInstance(id, date = todayStr()) {
    var _a;
    const items = this.getItems();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (this.isRecurring(item)) {
      item.skips = ((_a = item.skips) != null ? _a : []).filter((d) => d !== date);
    } else if (item.completedDate === date) {
      item.completed = false;
      item.completedDate = void 0;
    }
    this.setItems(items);
    await this.save();
  }
  async archiveCompletion(item) {
    const { marker, heading } = this.getLogTarget();
    const time = nowTime();
    try {
      await appendDailyLogLine(this.app, `- ${time} ${item.text}`, { marker, heading, time });
    } catch (e) {
      console.error("dash-core: could not archive completed task", e);
    }
  }
};
function missedLabel(prev, date) {
  if (!prev) return "missed";
  const diff = daysBetween(prev, date);
  if (diff === 1) return "missed yesterday";
  return `missed ${(0, import_obsidian4.moment)(prev, "YYYY-MM-DD").format("MMM D")}`;
}
function cryptoId() {
  const c = globalThis.crypto;
  if (c == null ? void 0 : c.randomUUID) return c.randomUUID();
  return "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// node_modules/dash-core/src/core/subitems.ts
function isRecurringItem(item) {
  return item.recurrence.type !== "none";
}
function subItemDone(item, subId, date) {
  var _a, _b, _c, _d;
  if (isRecurringItem(item)) {
    return ((_b = (_a = item.subCompletions) == null ? void 0 : _a[date]) != null ? _b : []).includes(subId);
  }
  return !!((_d = (_c = item.subItems) == null ? void 0 : _c.find((s) => s.id === subId)) == null ? void 0 : _d.done);
}
function subItemsDoneCount(item, date) {
  var _a;
  const subs = (_a = item.subItems) != null ? _a : [];
  return subs.filter((s) => subItemDone(item, s.id, date)).length;
}
function allSubItemsDone(item, date) {
  var _a;
  const subs = (_a = item.subItems) != null ? _a : [];
  return subs.length > 0 && subs.every((s) => subItemDone(item, s.id, date));
}

// node_modules/dash-core/src/core/directivesstore.ts
var import_obsidian5 = require("obsidian");
var DEFAULT_PATH2 = "Dashboard/Directives.md";
var DirectivesStore = class {
  constructor(app, getPath, opts = {}) {
    this.app = app;
    this.getPath = getPath;
    this.opts = opts;
    __publicField(this, "items", []);
    /** The exact text we last read from / wrote to disk, so a modify event
     * caused by our own write reloads to identical content and is ignored. */
    __publicField(this, "lastSerialized", "");
    /** True when the file exists but didn't parse (corrupt / mid-sync). While set,
     * we never overwrite it — protecting the on-disk list from being clobbered by
     * an accidental empty save. Cleared on the next successful read. */
    __publicField(this, "unreadable", false);
    /** True once we have actually READ an existing on-disk file (or created a fresh
     * one). Until then a save must not blindly overwrite: on a secondary device the
     * real file may simply not have synced into the vault index yet, and writing our
     * (empty / just-added) list would clobber it once Sync lands it. See `save()`. */
    __publicField(this, "everLoaded", false);
    /** Until this timestamp, refuse to CREATE the file when it's absent — a fresh
     * install and a still-downloading synced vault are indistinguishable at startup,
     * so we give Sync a window to deliver the real file before we'd mint a rival
     * (empty/just-added) copy that clobbers it. Set by the host on a fileless start. */
    __publicField(this, "graceUntil", 0);
    /** Last load outcome, for the diagnostics command. */
    __publicField(this, "lastStatus", "not loaded yet");
  }
  getItems() {
    return this.items;
  }
  setItems(items) {
    this.items = items;
  }
  /** Whether an on-disk file has been read this session. */
  hasLoaded() {
    return this.everLoaded;
  }
  /** Defer CREATING the file for `ms` when it's absent at startup, so a syncing
   * copy can land first. No effect once the file has loaded. */
  deferCreateFor(ms) {
    this.graceUntil = Date.now() + ms;
  }
  /** The Markdown file the directives live in. Any configured extension is
   * coerced to `.md` so the file always syncs. */
  path() {
    const raw = (this.getPath() || this.opts.defaultPath || DEFAULT_PATH2).trim();
    return (0, import_obsidian5.normalizePath)(raw.replace(/\.[^./]+$/, "") + ".md");
  }
  /** The pre-1.5.6 `.json` location, for one-time migration. */
  legacyJsonPath() {
    return this.path().replace(/\.md$/i, ".json");
  }
  isDirectivesPath(path) {
    return (0, import_obsidian5.normalizePath)(path) === this.path();
  }
  /** Load from the Markdown file. Returns true if the file existed. Heals a file
   * that is empty OR unparseable when this device has a known-good list to restore
   * from (memory this session, or the persisted per-device backup) — so a wipe or
   * a corrupting reformat can't erase the list; it is rewritten intact. */
  async load() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
    const path = this.path();
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian5.TFile)) {
      this.lastStatus = `no file at "${path}"`;
      return false;
    }
    let raw;
    try {
      raw = await this.app.vault.read(file);
    } catch (e) {
      this.unreadable = true;
      this.lastStatus = `read error at "${path}": ${e.message}`;
      console.error("dash-core: could not read the directives file", e);
      return true;
    }
    const res = tryParseTodos(raw);
    const emptyOrBroken = !res.ok || res.todos.length === 0;
    if (emptyOrBroken) {
      const restore = this.items.length > 0 ? this.items : (_c = (_b = (_a = this.opts).getBackup) == null ? void 0 : _b.call(_a)) != null ? _c : [];
      const seenReal = this.everLoaded || !!((_e = (_d = this.opts).hasSeenFile) == null ? void 0 : _e.call(_d));
      if (restore.length > 0 && seenReal) {
        console.warn(`dash-core: directives file ${res.ok ? "was empty" : "did not parse"} but this device holds a real list \u2014 healing it (${restore.length} items).`);
        this.items = restore.map((t) => ({ ...t }));
        this.unreadable = false;
        this.everLoaded = true;
        (_g = (_f = this.opts).markSeenFile) == null ? void 0 : _g.call(_f);
        (_i = (_h = this.opts).setBackup) == null ? void 0 : _i.call(_h, this.items);
        this.lastSerialized = "";
        await this.save();
        this.lastStatus = `healed ${res.ok ? "empty" : "unparseable"} file \u2192 ${this.items.length} items`;
        return true;
      }
      if (!res.ok) {
        this.unreadable = true;
        this.lastStatus = `unparseable file at "${path}" (${raw.length} bytes), no backup to heal from`;
        console.error("dash-core: directives file did not parse \u2014 preserving it and refusing to overwrite.");
        return true;
      }
    }
    this.items = this.everLoaded ? res.todos : unionById(res.todos, this.items);
    this.lastSerialized = raw;
    this.unreadable = false;
    this.everLoaded = true;
    (_k = (_j = this.opts).markSeenFile) == null ? void 0 : _k.call(_j);
    if (this.items.length > 0) (_m = (_l = this.opts).setBackup) == null ? void 0 : _m.call(_l, this.items);
    this.lastStatus = `loaded ${this.items.length} items from "${path}"`;
    if (res.recovered && this.items.length > 0) {
      console.warn("dash-core: recovered a mangled directives file \u2014 rewriting it in clean canonical form.");
      this.lastSerialized = "";
      await this.save();
      this.lastStatus = `recovered + healed \u2192 ${this.items.length} items`;
    }
    return true;
  }
  /** If we still haven't loaded a file and none exists on disk, but this device
   * has a non-empty backup, recreate the file from it. Covers a directives file
   * that was deleted or moved out from under us. Returns true if it recreated. */
  async ensureFromBackup() {
    var _a, _b, _c;
    if (this.everLoaded) return false;
    if (this.app.vault.getAbstractFileByPath(this.path()) instanceof import_obsidian5.TFile) return false;
    const backup = (_c = (_b = (_a = this.opts).getBackup) == null ? void 0 : _b.call(_a)) != null ? _c : [];
    if (backup.length === 0) return false;
    console.warn(`dash-core: no directives file on disk \u2014 recreating from backup (${backup.length} items).`);
    this.items = backup.map((t) => ({ ...t }));
    await this.save();
    this.lastStatus = `recreated file from backup \u2192 ${this.items.length} items`;
    return true;
  }
  /** Whether the store is currently protecting an unreadable file. */
  isUnreadable() {
    return this.unreadable;
  }
  /** Migrate from the old `.json` file if it exists. Returns true if migrated. */
  async loadLegacyJson() {
    const file = this.app.vault.getAbstractFileByPath(this.legacyJsonPath());
    if (!(file instanceof import_obsidian5.TFile)) return false;
    try {
      const raw = await this.app.vault.read(file);
      const res = tryParseTodos(raw);
      if (!res.ok) return false;
      this.items = res.todos;
      this.everLoaded = true;
      this.lastSerialized = "";
      return true;
    } catch (e) {
      console.error("dash-core: could not read the legacy directives file", e);
      return false;
    }
  }
  /** Write the current list to the Markdown file (creating it and its folder if
   * needed). No-op when the content is unchanged. */
  async save() {
    var _a, _b, _c, _d, _e, _f;
    if (this.unreadable) {
      console.warn("dash-core: skipping directives save \u2014 last read was unreadable (protecting the file).");
      return;
    }
    if (!this.everLoaded) {
      const existing2 = this.app.vault.getAbstractFileByPath(this.path());
      if (existing2 instanceof import_obsidian5.TFile) {
        try {
          const res = tryParseTodos(await this.app.vault.read(existing2));
          if (res.ok) this.items = unionById(res.todos, this.items);
          else {
            this.unreadable = true;
            console.warn("dash-core: directives file appeared but didn't parse on save \u2014 preserving it.");
            return;
          }
        } catch (e) {
          console.error("dash-core: could not re-read directives before save \u2014 preserving the file.", e);
          return;
        }
      } else if (((_b = (_a = this.opts).hasSeenFile) == null ? void 0 : _b.call(_a)) || Date.now() < this.graceUntil) {
        console.warn("dash-core: directives file not present yet \u2014 deferring create to protect a possibly-syncing copy.");
        return;
      }
    }
    const body = buildMarkdown(this.items, this.opts.header);
    if (body === this.lastSerialized) return;
    const path = this.path();
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (!(existing instanceof import_obsidian5.TFile) && this.items.length === 0) {
      return;
    }
    this.lastSerialized = body;
    if (existing instanceof import_obsidian5.TFile) {
      await this.app.vault.modify(existing, body);
    } else {
      await this.ensureFolder(path);
      await this.app.vault.create(path, body);
    }
    this.everLoaded = true;
    (_d = (_c = this.opts).markSeenFile) == null ? void 0 : _d.call(_c);
    (_f = (_e = this.opts).setBackup) == null ? void 0 : _f.call(_e, this.items);
  }
  /** React to a vault change on the directives file (e.g. Obsidian Sync landing
   * the other device's edit). Returns true if the in-memory list actually
   * changed — our own writes reload to identical content and return false. */
  async onExternalChange(path) {
    if (!this.isDirectivesPath(path)) return false;
    const before = this.lastSerialized;
    await this.load();
    return this.lastSerialized !== before;
  }
  async ensureFolder(path) {
    const dir = path.split("/").slice(0, -1).join("/");
    if (!dir) return;
    if (this.app.vault.getAbstractFileByPath(dir) instanceof import_obsidian5.TFolder) return;
    await this.app.vault.createFolder(dir).catch(() => {
    });
  }
};

// node_modules/dash-core/src/core/aicredsserde.ts
var DEFAULT_AI_CREDS_HEADER = "%% Dashboard \u2014 AI credentials (synced secret). Managed automatically; edit the key in the dashboard settings, not here. Keep this file out of version control. %%";
function buildAICredsMarkdown(creds, header = DEFAULT_AI_CREDS_HEADER) {
  var _a;
  const file = { version: 1, apiKey: (_a = creds.apiKey) != null ? _a : "" };
  if (creds.baseUrl) file.baseUrl = creds.baseUrl;
  return `${header}

\`\`\`json
${JSON.stringify(file)}
\`\`\`
`;
}
function tryParseAICreds(raw) {
  const r = tryParseJson(raw);
  const v = r == null ? void 0 : r.value;
  if (r && v && typeof v.apiKey === "string") {
    return { ok: true, creds: { apiKey: v.apiKey, baseUrl: typeof v.baseUrl === "string" ? v.baseUrl : void 0 } };
  }
  return { ok: false, creds: { apiKey: "" } };
}

// node_modules/dash-core/src/core/aicredsstore.ts
var import_obsidian6 = require("obsidian");
var DEFAULT_PATH3 = "MERIDIAN/AI Credentials.md";
var AICredsStore = class {
  constructor(app, getPath, opts = {}) {
    this.app = app;
    this.getPath = getPath;
    this.opts = opts;
    __publicField(this, "creds", { apiKey: "" });
    /** Exact text last read/written, so our own writes reload to identical content. */
    __publicField(this, "lastSerialized", "");
    /** File exists but didn't parse (corrupt / mid-sync) — never overwrite while set. */
    __publicField(this, "unreadable", false);
    /** True once a real file has been read (or written) this session. */
    __publicField(this, "everLoaded", false);
  }
  get() {
    return this.creds;
  }
  getApiKey() {
    var _a;
    return (_a = this.creds.apiKey) != null ? _a : "";
  }
  getBaseUrl() {
    return this.creds.baseUrl;
  }
  hasLoaded() {
    return this.everLoaded;
  }
  /** The Markdown file the credentials live in. Any extension is coerced to `.md`
   * so the file always syncs. */
  path() {
    const raw = (this.getPath() || this.opts.defaultPath || DEFAULT_PATH3).trim();
    return (0, import_obsidian6.normalizePath)(raw.replace(/\.[^./]+$/, "") + ".md");
  }
  isCredsPath(path) {
    return (0, import_obsidian6.normalizePath)(path) === this.path();
  }
  /** Load from the Markdown file. Returns true if the file existed. An empty key
   * in the file is a legitimate state (the user cleared it on another device). */
  async load() {
    const file = this.app.vault.getAbstractFileByPath(this.path());
    if (!(file instanceof import_obsidian6.TFile)) return false;
    try {
      const raw = await this.app.vault.read(file);
      const res = tryParseAICreds(raw);
      if (res.ok) {
        this.creds = res.creds;
        this.lastSerialized = raw;
        this.unreadable = false;
        this.everLoaded = true;
      } else {
        this.unreadable = true;
        console.error("dash-core: AI credentials file did not parse \u2014 preserving it and refusing to overwrite.");
      }
    } catch (e) {
      this.unreadable = true;
      console.error("dash-core: could not read the AI credentials file", e);
    }
    return true;
  }
  /** One-time migration seed from the key that used to live in `data.json`.
   * Writes the file only when there's a real key and no synced file has landed
   * yet — so an existing device's key becomes the synced source of truth without
   * ever originating an empty file. */
  async seedFrom(apiKey, baseUrl) {
    if (!apiKey) return;
    if (this.everLoaded && this.creds.apiKey) return;
    if (this.app.vault.getAbstractFileByPath(this.path()) instanceof import_obsidian6.TFile) {
      await this.load();
      if (this.creds.apiKey) return;
    }
    this.creds = { apiKey, baseUrl: baseUrl || void 0 };
    this.lastSerialized = "";
    await this.writeFile();
  }
  /** A deliberate user edit in settings. Persists whatever the user typed —
   * INCLUDING an empty key to clear it — but still never CREATES the file for an
   * empty key (nothing to store, and an auto/startup path must never mint one). */
  async setFromSettings(apiKey, baseUrl) {
    this.creds = { apiKey: apiKey != null ? apiKey : "", baseUrl: baseUrl || void 0 };
    const existing = this.app.vault.getAbstractFileByPath(this.path());
    if (!(existing instanceof import_obsidian6.TFile) && !this.creds.apiKey) {
      this.lastSerialized = "";
      return;
    }
    this.unreadable = false;
    this.lastSerialized = "";
    await this.writeFile();
  }
  /** React to a vault change on the credentials file (Sync landing another
   * device's edit). Returns true if the in-memory key actually changed. */
  async onExternalChange(path) {
    if (!this.isCredsPath(path)) return false;
    const before = this.lastSerialized;
    await this.load();
    return this.lastSerialized !== before;
  }
  /** Write the current credentials out. No-op when unchanged. Never creates the
   * file for an empty key; refuses while the file is unreadable. */
  async writeFile() {
    if (this.unreadable) return;
    const body = buildAICredsMarkdown(this.creds, this.opts.header);
    if (body === this.lastSerialized) return;
    const path = this.path();
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (!(existing instanceof import_obsidian6.TFile) && !this.creds.apiKey) return;
    this.lastSerialized = body;
    if (existing instanceof import_obsidian6.TFile) {
      await this.app.vault.modify(existing, body);
    } else {
      await this.ensureFolder(path);
      await this.app.vault.create(path, body);
    }
    this.everLoaded = true;
  }
  async ensureFolder(path) {
    const dir = path.split("/").slice(0, -1).join("/");
    if (!dir) return;
    if (this.app.vault.getAbstractFileByPath(dir) instanceof import_obsidian6.TFolder) return;
    await this.app.vault.createFolder(dir).catch(() => {
    });
  }
};

// node_modules/dash-core/src/core/layoutserde.ts
var DEFAULT_LAYOUT_HEADER = "%% Dashboard \u2014 layout (synced). Mobile tabs, card assignments, and panel order/columns. Managed automatically; edit it in the dashboard settings, not here. %%";
function buildLayoutMarkdown(layout, header = DEFAULT_LAYOUT_HEADER) {
  const file = { version: 1, ...layout };
  return `${header}

\`\`\`json
${JSON.stringify(file)}
\`\`\`
`;
}
function tryParseLayout(raw) {
  const r = tryParseJson(raw);
  const v = r == null ? void 0 : r.value;
  if (!r || !v || typeof v !== "object" || Array.isArray(v)) return { ok: false, layout: {} };
  const o = v;
  const layout = {};
  if (typeof o.mobileTabs === "boolean") layout.mobileTabs = o.mobileTabs;
  if (Array.isArray(o.tabs)) {
    layout.tabs = o.tabs.filter((t) => !!t && typeof t.id === "string" && typeof t.name === "string").map((t) => ({ id: t.id, name: t.name }));
  }
  if (o.tabAssignments && typeof o.tabAssignments === "object") {
    layout.tabAssignments = {};
    for (const [k, val] of Object.entries(o.tabAssignments)) if (typeof val === "string") layout.tabAssignments[k] = val;
  }
  if (typeof o.defaultTabId === "string" || o.defaultTabId === null) layout.defaultTabId = o.defaultTabId;
  if (Array.isArray(o.panelOrder)) layout.panelOrder = o.panelOrder.filter((p) => typeof p === "string");
  if (o.enabledPanels && typeof o.enabledPanels === "object") {
    layout.enabledPanels = {};
    for (const [k, val] of Object.entries(o.enabledPanels)) if (typeof val === "boolean") layout.enabledPanels[k] = val;
  }
  layout.panelColumns = pickNumberMap(o.panelColumns);
  layout.panelSpans = pickNumberMap(o.panelSpans);
  if (!layout.panelColumns) delete layout.panelColumns;
  if (!layout.panelSpans) delete layout.panelSpans;
  return { ok: true, layout };
}
function pickNumberMap(map) {
  if (!map || typeof map !== "object") return void 0;
  const out = {};
  for (const [k, v] of Object.entries(map)) if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  return Object.keys(out).length ? out : void 0;
}
function layoutHasContent(layout) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  return ((_b = (_a = layout.tabs) == null ? void 0 : _a.length) != null ? _b : 0) > 0 || Object.keys((_c = layout.tabAssignments) != null ? _c : {}).length > 0 || ((_e = (_d = layout.panelOrder) == null ? void 0 : _d.length) != null ? _e : 0) > 0 || Object.keys((_f = layout.enabledPanels) != null ? _f : {}).length > 0 || Object.keys((_g = layout.panelColumns) != null ? _g : {}).length > 0 || Object.keys((_h = layout.panelSpans) != null ? _h : {}).length > 0;
}

// node_modules/dash-core/src/core/layoutstore.ts
var import_obsidian7 = require("obsidian");
var DEFAULT_PATH4 = "MERIDIAN/Dashboard Layout.md";
var LayoutStore = class {
  constructor(app, getPath, opts = {}) {
    this.app = app;
    this.getPath = getPath;
    this.opts = opts;
    __publicField(this, "layout", {});
    /** Exact text last read/written, so our own writes reload to identical content. */
    __publicField(this, "lastSerialized", "");
    /** File exists but didn't parse (corrupt / mid-sync) — never overwrite while set. */
    __publicField(this, "unreadable", false);
    /** True once a real file has been read (or written) this session. */
    __publicField(this, "everLoaded", false);
  }
  get() {
    return this.layout;
  }
  hasLoaded() {
    return this.everLoaded;
  }
  /** The Markdown file the layout lives in. Any extension is coerced to `.md`
   * so the file always syncs. */
  path() {
    const raw = (this.getPath() || this.opts.defaultPath || DEFAULT_PATH4).trim();
    return (0, import_obsidian7.normalizePath)(raw.replace(/\.[^./]+$/, "") + ".md");
  }
  isLayoutPath(path) {
    return (0, import_obsidian7.normalizePath)(path) === this.path();
  }
  /** Load from the Markdown file. Returns true if the file existed. */
  async load() {
    const file = this.app.vault.getAbstractFileByPath(this.path());
    if (!(file instanceof import_obsidian7.TFile)) return false;
    try {
      const raw = await this.app.vault.read(file);
      const res = tryParseLayout(raw);
      if (res.ok) {
        this.layout = res.layout;
        this.lastSerialized = raw;
        this.unreadable = false;
        this.everLoaded = true;
      } else {
        this.unreadable = true;
        console.error("dash-core: dashboard layout file did not parse \u2014 preserving it and refusing to overwrite.");
      }
    } catch (e) {
      this.unreadable = true;
      console.error("dash-core: could not read the dashboard layout file", e);
    }
    return true;
  }
  /** One-time migration seed from the layout that used to live in `data.json`.
   * Writes the file only when there's real layout content and no synced file has
   * landed yet — so an existing device's config becomes the synced source of
   * truth without ever originating an empty file. */
  async seedFrom(layout) {
    if (!layoutHasContent(layout)) return;
    if (this.everLoaded && layoutHasContent(this.layout)) return;
    if (this.app.vault.getAbstractFileByPath(this.path()) instanceof import_obsidian7.TFile) {
      await this.load();
      if (layoutHasContent(this.layout)) return;
    }
    this.layout = layout;
    this.lastSerialized = "";
    await this.writeFile(true);
  }
  /** A deliberate user edit in settings. Persists whatever the layout now is —
   * creating the file if needed (the user is actively configuring the layout, so
   * the synced file should exist from here on). */
  async setFromSettings(layout) {
    this.layout = layout;
    this.unreadable = false;
    this.lastSerialized = "";
    await this.writeFile(true);
  }
  /** React to a vault change on the layout file (Sync landing another device's
   * edit). Returns true if the in-memory layout actually changed. */
  async onExternalChange(path) {
    if (!this.isLayoutPath(path)) return false;
    const before = this.lastSerialized;
    await this.load();
    return this.lastSerialized !== before;
  }
  /** Write the current layout out. No-op when unchanged. Refuses while the file
   * is unreadable. When `create` is false, never mints a missing file. */
  async writeFile(create) {
    if (this.unreadable) return;
    const body = buildLayoutMarkdown(this.layout, this.opts.header);
    if (body === this.lastSerialized) return;
    const path = this.path();
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (!(existing instanceof import_obsidian7.TFile) && !create) return;
    this.lastSerialized = body;
    if (existing instanceof import_obsidian7.TFile) {
      await this.app.vault.modify(existing, body);
    } else {
      await this.ensureFolder(path);
      await this.app.vault.create(path, body);
    }
    this.everLoaded = true;
  }
  async ensureFolder(path) {
    const dir = path.split("/").slice(0, -1).join("/");
    if (!dir) return;
    if (this.app.vault.getAbstractFileByPath(dir) instanceof import_obsidian7.TFolder) return;
    await this.app.vault.createFolder(dir).catch(() => {
    });
  }
};

// node_modules/dash-core/src/core/jsonliststore.ts
var import_obsidian8 = require("obsidian");

// node_modules/dash-core/src/core/library.ts
var import_obsidian9 = require("obsidian");
var LibraryStore = class {
  constructor(app, cfg) {
    this.app = app;
    this.cfg = cfg;
  }
  root() {
    return (0, import_obsidian9.normalizePath)((this.cfg().root || "Library").replace(/\/+$/, ""));
  }
  /** Folder new/active notes live in. */
  notesFolder() {
    var _a;
    const sub = ((_a = this.cfg().notesSubfolder) != null ? _a : "").trim().replace(/\/+$/, "");
    return sub ? (0, import_obsidian9.normalizePath)(this.root() + "/" + sub) : this.root();
  }
  categoriesFolder() {
    return (0, import_obsidian9.normalizePath)(this.root() + "/" + (this.cfg().categoriesSubfolder || "Categories"));
  }
  archiveFolder() {
    return (0, import_obsidian9.normalizePath)(this.root() + "/" + (this.cfg().archiveSubfolder || "Archive"));
  }
  heading() {
    return (this.cfg().listHeading || "Notes").trim();
  }
  inFolder(file, folder) {
    return file.path === folder || file.path.startsWith(folder + "/");
  }
  /** Active notes. With a notes subfolder, that folder's notes; otherwise
   * everything under the root except the Archive and Categories subfolders. */
  listNotes() {
    var _a;
    const sub = ((_a = this.cfg().notesSubfolder) != null ? _a : "").trim();
    const files = this.app.vault.getMarkdownFiles();
    let active;
    if (sub) {
      const notes = this.notesFolder();
      active = files.filter((f) => this.inFolder(f, notes));
    } else {
      const root = this.root();
      const cats = this.categoriesFolder();
      const arch = this.archiveFolder();
      active = files.filter(
        (f) => this.inFolder(f, root) && !this.inFolder(f, cats) && !this.inFolder(f, arch)
      );
    }
    return active.sort((a, b) => a.basename.localeCompare(b.basename));
  }
  listArchived() {
    const arch = this.archiveFolder();
    return this.app.vault.getMarkdownFiles().filter((f) => this.inFolder(f, arch)).sort((a, b) => a.basename.localeCompare(b.basename));
  }
  listCategories() {
    const cats = this.categoriesFolder();
    return this.app.vault.getMarkdownFiles().filter((f) => this.inFolder(f, cats)).map((file) => ({ name: file.basename, file, members: [] })).sort((a, b) => a.name.localeCompare(b.name));
  }
  async categoryMembers(file) {
    const content = await this.app.vault.cachedRead(file);
    return this.parseMembers(content);
  }
  // ----------------------------------------------------------- mutations
  async ensureFolder(path) {
    const norm = (0, import_obsidian9.normalizePath)(path);
    if (!norm || norm === "/") return;
    if (this.app.vault.getAbstractFileByPath(norm) instanceof import_obsidian9.TFolder) return;
    const parts = norm.split("/");
    let cur = "";
    for (const p of parts) {
      cur = cur ? cur + "/" + p : p;
      if (!(this.app.vault.getAbstractFileByPath(cur) instanceof import_obsidian9.TFolder)) {
        await this.app.vault.createFolder(cur).catch(() => {
        });
      }
    }
  }
  sanitize(name) {
    return name.replace(/[\\/:*?"<>|#^[\]]/g, "-").trim();
  }
  uniquePath(folder, base) {
    let name = base;
    for (let i = 1; i < 1e3; i++) {
      const path = (0, import_obsidian9.normalizePath)(`${folder}/${name}.md`);
      if (!this.app.vault.getAbstractFileByPath(path)) return path;
      name = `${base} ${i + 1}`;
    }
    return (0, import_obsidian9.normalizePath)(`${folder}/${base} ${Date.now()}.md`);
  }
  /** Create a category note (with the list heading) if it doesn't exist. */
  async createCategory(name) {
    const clean = this.sanitize(name);
    await this.ensureFolder(this.categoriesFolder());
    const existing = this.app.vault.getAbstractFileByPath(
      (0, import_obsidian9.normalizePath)(`${this.categoriesFolder()}/${clean}.md`)
    );
    if (existing instanceof import_obsidian9.TFile) return existing;
    const body = `---
type: category
---

# ${clean}

## ${this.heading()}
`;
    const path = this.uniquePath(this.categoriesFolder(), clean);
    return this.app.vault.create(path, body);
  }
  /** Create a note in the notes folder, optionally assigning a category. */
  async createNote(title, category) {
    const clean = this.sanitize(title);
    await this.ensureFolder(this.notesFolder());
    const path = this.uniquePath(this.notesFolder(), clean);
    const file = await this.app.vault.create(path, `# ${clean}

`);
    if (category) await this.assign(file, category);
    return file;
  }
  /** Delete a note (to the user's configured trash) and delink it from every
   * category. */
  async deleteNote(file) {
    for (const cat of this.listCategories()) {
      await this.removeMember(cat.file, file.basename);
    }
    const fm = this.app.fileManager;
    if (typeof fm.trashFile === "function") await fm.trashFile(file);
    else await this.app.vault.trash(file, true);
  }
  /** Assign `file` to `category`: write the frontmatter entry AND the
   * alphabetized wikilink in the category note (creating it if needed). */
  async assign(file, category) {
    const catFile = await this.createCategory(category);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      const list = Array.isArray(fm.categories) ? fm.categories.map(String) : fm.categories ? [String(fm.categories)] : [];
      if (!list.includes(catFile.basename)) list.push(catFile.basename);
      fm.categories = list;
    });
    await this.addMember(catFile, file.basename);
  }
  async unassign(file, category) {
    const catFile = this.app.vault.getAbstractFileByPath(
      (0, import_obsidian9.normalizePath)(`${this.categoriesFolder()}/${this.sanitize(category)}.md`)
    );
    if (catFile instanceof import_obsidian9.TFile) await this.removeMember(catFile, file.basename);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      if (Array.isArray(fm.categories)) {
        fm.categories = fm.categories.map(String).filter((c) => c !== category);
      } else if (fm.categories === category) {
        delete fm.categories;
      }
    });
  }
  /** Archive a note: remove it from every category list, then move it into the
   * Archive subfolder (inbound links elsewhere are repointed by Obsidian). */
  async archiveNote(file) {
    for (const cat of this.listCategories()) {
      await this.removeMember(cat.file, file.basename);
    }
    await this.ensureFolder(this.archiveFolder());
    let dest = (0, import_obsidian9.normalizePath)(`${this.archiveFolder()}/${file.name}`);
    if (this.app.vault.getAbstractFileByPath(dest)) {
      dest = this.uniquePath(this.archiveFolder(), file.basename);
    }
    await this.app.fileManager.renameFile(file, dest);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.archived = true;
    });
  }
  async restoreNote(file) {
    await this.ensureFolder(this.notesFolder());
    let dest = (0, import_obsidian9.normalizePath)(`${this.notesFolder()}/${file.name}`);
    if (this.app.vault.getAbstractFileByPath(dest)) {
      dest = this.uniquePath(this.notesFolder(), file.basename);
    }
    await this.app.fileManager.renameFile(file, dest);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      delete fm.archived;
    });
  }
  // -------------------------------------------------- category list I/O
  headingRe() {
    const esc = this.heading().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^#{1,6}\\s+${esc}:?\\s*$`, "i");
  }
  parseMembers(content) {
    const lines = content.split("\n");
    const start = lines.findIndex((l) => this.headingRe().test(l));
    if (start === -1) return [];
    const out = [];
    for (let i = start + 1; i < lines.length; i++) {
      if (/^#{1,6}\s/.test(lines[i])) break;
      const m = lines[i].match(/^\s*-\s+\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*$/);
      if (m) out.push(m[1].trim());
    }
    return out;
  }
  async writeMembers(file, members) {
    const sorted = [...new Set(members)].sort(
      (a, b) => a.localeCompare(b, void 0, { sensitivity: "base" })
    );
    await this.app.vault.process(file, (content) => {
      const lines = content.split("\n");
      let start = lines.findIndex((l) => this.headingRe().test(l));
      if (start === -1) {
        const trimmed = content.replace(/\n+$/, "");
        const block2 = [`## ${this.heading()}`, "", ...sorted.map((m) => `- [[${m}]]`)].join("\n");
        return (trimmed ? trimmed + "\n\n" : "") + block2 + "\n";
      }
      let end = lines.length;
      for (let i = start + 1; i < lines.length; i++) {
        if (/^#{1,6}\s/.test(lines[i])) {
          end = i;
          break;
        }
      }
      const block = ["", ...sorted.map((m) => `- [[${m}]]`), ""];
      lines.splice(start + 1, end - (start + 1), ...block);
      return lines.join("\n");
    });
  }
  async addMember(file, basename) {
    const members = await this.categoryMembers(file);
    if (members.includes(basename)) return;
    members.push(basename);
    await this.writeMembers(file, members);
  }
  async removeMember(file, basename) {
    const members = await this.categoryMembers(file);
    if (!members.includes(basename)) return;
    await this.writeMembers(
      file,
      members.filter((m) => m !== basename)
    );
  }
};

// node_modules/dash-core/src/core/streak.ts
var DEFAULT_STREAK = { current: 0, longest: 0, lastDayCounted: "" };

// node_modules/dash-core/src/panels/types.ts
var BasePanel = class {
  constructor() {
    __publicField(this, "el");
    __publicField(this, "ctx");
    __publicField(this, "cleanups", []);
  }
  async mount(el, ctx) {
    this.el = el;
    this.ctx = ctx;
    await this.setup();
    await this.draw();
  }
  async refresh(reason) {
    var _a;
    if ((_a = this.el) == null ? void 0 : _a.isConnected) await this.draw(reason);
  }
  unmount() {
    for (const c of this.cleanups) {
      try {
        c();
      } catch (e) {
      }
    }
    this.cleanups = [];
  }
  onCleanup(fn) {
    this.cleanups.push(fn);
  }
  /** One-time setup (intervals, event subscriptions). Optional. */
  async setup() {
  }
  /** Re-run the body render from within the panel (after a local change). */
  rerender() {
    void this.draw("manual");
  }
  async draw(reason) {
    this.el.empty();
    await this.renderBody(reason);
  }
  setInterval(fn, ms) {
    const id = window.setInterval(fn, ms);
    this.onCleanup(() => window.clearInterval(id));
  }
  /** Wire a text input/textarea so a host that honours `runtime.textFocused`
   * pauses its refresh bus while the field is focused (no jumpy re-render under
   * the cursor), resuming on blur. Hosts that ignore the flag are unaffected. */
  bindTextFocus(el) {
    el.addEventListener("focus", () => {
      this.ctx.runtime.textFocused = true;
    });
    el.addEventListener("blur", () => {
      this.ctx.runtime.textFocused = false;
    });
  }
};
function placard(el, title) {
  const head = el.createDiv({ cls: "dash-placard" });
  head.createSpan({ cls: "dash-placard-title", text: title });
  return head;
}

// node_modules/dash-core/src/panels/layout.ts
var MAX_COLUMNS = 3;
function clampInt(v, lo, hi) {
  const n = Math.floor(Number.isFinite(v) ? v : lo);
  return Math.max(lo, Math.min(hi, n));
}
function computeLayout(order, enabled, columns, spans) {
  const ids = order.filter((id) => enabled[id] !== false);
  const raw = ids.map((id) => {
    var _a, _b;
    return {
      id,
      col: clampInt((_a = columns[id]) != null ? _a : 1, 1, MAX_COLUMNS),
      span: clampInt((_b = spans[id]) != null ? _b : 1, 1, MAX_COLUMNS)
    };
  });
  const configured = raw.some((p) => p.col > 1 || p.span > 1);
  if (!configured) {
    return { configured: false, columns: 1, placements: ids.map((id) => ({ id, column: 1, span: 1 })) };
  }
  let N = 1;
  for (const p of raw) N = Math.max(N, p.col + p.span - 1);
  N = Math.min(MAX_COLUMNS, Math.max(1, N));
  const placements = raw.map((p) => {
    const column = p.col > N ? 1 : p.col;
    const span = Math.max(1, Math.min(p.span, N - column + 1));
    return { id: p.id, column, span };
  });
  return { configured: true, columns: N, placements };
}

// node_modules/dash-core/src/panels/promptmodal.ts
var import_obsidian10 = require("obsidian");
var PromptModal = class extends import_obsidian10.Modal {
  constructor(app, opts, onSubmit) {
    var _a;
    super(app);
    this.opts = opts;
    this.onSubmit = onSubmit;
    __publicField(this, "value");
    this.value = (_a = opts.initial) != null ? _a : "";
  }
  onOpen() {
    this.titleEl.setText(this.opts.title);
    const setting = new import_obsidian10.Setting(this.contentEl);
    if (this.opts.multiline) {
      setting.addTextArea((t) => {
        var _a;
        t.setPlaceholder((_a = this.opts.placeholder) != null ? _a : "").setValue(this.value).onChange((v) => this.value = v);
        t.inputEl.classList.add("dash-modal-wide");
        t.inputEl.rows = 4;
        t.inputEl.focus();
      });
    } else {
      setting.addText((t) => {
        var _a;
        t.setPlaceholder((_a = this.opts.placeholder) != null ? _a : "").setValue(this.value).onChange((v) => this.value = v);
        t.inputEl.classList.add("dash-modal-wide");
        t.inputEl.focus();
        t.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            this.submit();
          }
        });
      });
    }
    new import_obsidian10.Setting(this.contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => this.close())).addButton((b) => {
      var _a;
      return b.setButtonText((_a = this.opts.cta) != null ? _a : "Save").setCta().onClick(() => this.submit());
    });
  }
  submit() {
    const text = this.value.trim();
    this.close();
    if (text) this.onSubmit(text);
  }
  onClose() {
    this.contentEl.empty();
  }
};

// node_modules/dash-core/src/panels/calendar.ts
var import_obsidian11 = require("obsidian");

// node_modules/dash-core/src/panels/todomodal.ts
var import_obsidian12 = require("obsidian");

// node_modules/dash-core/src/panels/categorymodals.ts
var import_obsidian13 = require("obsidian");
var DEFAULT_CATEGORY_MODALS_COPY = {
  newNoteTitle: "New note",
  titleLabel: "Title",
  titlePlaceholder: "Note title",
  categoryLabel: "Category",
  categoryDesc: "Optional \u2014 assign on creation.",
  orNewCategoryLabel: "Or a new category",
  orNewCategoryDesc: "Creates the category and assigns this note to it.",
  newCategoryPlaceholder: "New category name",
  noneOption: "(none)",
  cancel: "Cancel",
  create: "Create",
  noteNeedsTitle: "A note needs a title.",
  newCategoryTitle: "New category",
  nameLabel: "Name",
  namePlaceholder: "Category name",
  categoryNeedsName: "A category needs a name.",
  noNotesToAssign: "No notes to assign yet.",
  pickNotePlaceholder: "Pick a note to assign\u2026",
  assignTitle: "Assign to category",
  existingCategoryLabel: "Existing category",
  orUseCategoryDesc: "Leave blank to use the one above.",
  assign: "Assign",
  pickOrNameCategory: "Pick or name a category.",
  assignedNotice: "Assigned {note} to {category}."
};
var NewNoteModal = class extends import_obsidian13.Modal {
  constructor(app, store, onDone, copy) {
    super(app);
    this.store = store;
    this.onDone = onDone;
    __publicField(this, "title", "");
    __publicField(this, "picked", "");
    __publicField(this, "newCategory", "");
    __publicField(this, "copy");
    this.copy = { ...DEFAULT_CATEGORY_MODALS_COPY, ...copy };
  }
  onOpen() {
    const c = this.copy;
    this.titleEl.setText(c.newNoteTitle);
    const cats = this.store.listCategories().map((cat) => cat.name);
    this.picked = "";
    new import_obsidian13.Setting(this.contentEl).setName(c.titleLabel).addText((t) => {
      t.setPlaceholder(c.titlePlaceholder).onChange((v) => this.title = v);
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.submit();
        }
      });
    });
    new import_obsidian13.Setting(this.contentEl).setName(c.categoryLabel).setDesc(c.categoryDesc).addDropdown((dd) => {
      dd.addOption("", c.noneOption);
      for (const cat of cats) dd.addOption(cat, cat);
      dd.setValue("").onChange((v) => this.picked = v);
    });
    new import_obsidian13.Setting(this.contentEl).setName(c.orNewCategoryLabel).setDesc(c.orNewCategoryDesc).addText((t) => t.setPlaceholder(c.newCategoryPlaceholder).onChange((v) => this.newCategory = v));
    new import_obsidian13.Setting(this.contentEl).addButton((b) => b.setButtonText(c.cancel).onClick(() => this.close())).addButton((b) => b.setButtonText(c.create).setCta().onClick(() => void this.submit()));
  }
  async submit() {
    const title = this.title.trim();
    if (!title) {
      new import_obsidian13.Notice(this.copy.noteNeedsTitle);
      return;
    }
    const category = this.newCategory.trim() || this.picked.trim();
    const file = await this.store.createNote(title, category || void 0);
    this.close();
    this.onDone();
    await this.app.workspace.getLeaf(false).openFile(file);
  }
  onClose() {
    this.contentEl.empty();
  }
};
var NewCategoryModal = class extends import_obsidian13.Modal {
  constructor(app, store, onDone, copy) {
    super(app);
    this.store = store;
    this.onDone = onDone;
    __publicField(this, "name", "");
    __publicField(this, "copy");
    this.copy = { ...DEFAULT_CATEGORY_MODALS_COPY, ...copy };
  }
  onOpen() {
    const c = this.copy;
    this.titleEl.setText(c.newCategoryTitle);
    new import_obsidian13.Setting(this.contentEl).setName(c.nameLabel).addText((t) => {
      t.setPlaceholder(c.namePlaceholder).onChange((v) => this.name = v);
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.submit();
        }
      });
    });
    new import_obsidian13.Setting(this.contentEl).addButton((b) => b.setButtonText(c.cancel).onClick(() => this.close())).addButton((b) => b.setButtonText(c.create).setCta().onClick(() => void this.submit()));
  }
  async submit() {
    const name = this.name.trim();
    if (!name) {
      new import_obsidian13.Notice(this.copy.categoryNeedsName);
      return;
    }
    await this.store.createCategory(name);
    this.close();
    this.onDone();
  }
  onClose() {
    this.contentEl.empty();
  }
};
function runAssignFlow(app, store, onDone, copy) {
  const c = { ...DEFAULT_CATEGORY_MODALS_COPY, ...copy };
  const notes = store.listNotes();
  if (notes.length === 0) {
    new import_obsidian13.Notice(c.noNotesToAssign);
    return;
  }
  new NoteSuggestModal(app, notes, c.pickNotePlaceholder, (note) => {
    const cats = store.listCategories().map((cat) => cat.name);
    new CategoryPromptModal(app, cats, c, async (category) => {
      await store.assign(note, category);
      new import_obsidian13.Notice(c.assignedNotice.replace("{note}", note.basename).replace("{category}", category));
      onDone();
    }).open();
  }).open();
}
var NoteSuggestModal = class extends import_obsidian13.FuzzySuggestModal {
  constructor(app, notes, placeholder, onChoose) {
    super(app);
    this.notes = notes;
    this.onChoose = onChoose;
    this.setPlaceholder(placeholder);
  }
  getItems() {
    return this.notes;
  }
  getItemText(file) {
    return file.basename;
  }
  onChooseItem(file) {
    this.onChoose(file);
  }
};
var CategoryPromptModal = class extends import_obsidian13.Modal {
  constructor(app, categories, copy, onChoose) {
    super(app);
    this.categories = categories;
    this.copy = copy;
    this.onChoose = onChoose;
    __publicField(this, "picked", "");
    __publicField(this, "newName", "");
  }
  onOpen() {
    var _a;
    const c = this.copy;
    this.titleEl.setText(c.assignTitle);
    this.picked = (_a = this.categories[0]) != null ? _a : "";
    if (this.categories.length > 0) {
      new import_obsidian13.Setting(this.contentEl).setName(c.existingCategoryLabel).addDropdown((dd) => {
        for (const cat of this.categories) dd.addOption(cat, cat);
        dd.setValue(this.picked).onChange((v) => this.picked = v);
      });
    }
    new import_obsidian13.Setting(this.contentEl).setName(c.orNewCategoryLabel).setDesc(c.orUseCategoryDesc).addText((t) => {
      t.setPlaceholder(c.newCategoryPlaceholder).onChange((v) => this.newName = v);
      if (this.categories.length === 0) t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.submit();
        }
      });
    });
    new import_obsidian13.Setting(this.contentEl).addButton((b) => b.setButtonText(c.cancel).onClick(() => this.close())).addButton((b) => b.setButtonText(c.assign).setCta().onClick(() => this.submit()));
  }
  submit() {
    const category = this.newName.trim() || this.picked.trim();
    if (!category) {
      new import_obsidian13.Notice(this.copy.pickOrNameCategory);
      return;
    }
    this.close();
    this.onChoose(category);
  }
  onClose() {
    this.contentEl.empty();
  }
};

// node_modules/dash-core/src/panels/clock.ts
var import_obsidian14 = require("obsidian");

// node_modules/dash-core/src/panels/util.ts
function commandExists(app, fullId) {
  var _a, _b;
  const commands = (_b = (_a = app.commands) == null ? void 0 : _a.commands) != null ? _b : {};
  return !!commands[fullId];
}
function runCommand(app, fullId) {
  var _a, _b;
  (_b = (_a = app.commands) == null ? void 0 : _a.executeCommandById) == null ? void 0 : _b.call(_a, fullId);
}
function commandButton(parent, app, fullId, label, opts = {}) {
  var _a;
  const btn = parent.createEl("button", { cls: `dash-btn ${(_a = opts.cls) != null ? _a : ""}`.trim(), text: label });
  if (!commandExists(app, fullId)) {
    btn.setAttr("disabled", "true");
    btn.addClass("is-unavailable");
    if (opts.offlineText) btn.setAttr("title", opts.offlineText);
    return btn;
  }
  btn.addEventListener("click", () => {
    var _a2;
    runCommand(app, fullId);
    (_a2 = opts.onRun) == null ? void 0 : _a2.call(opts);
  });
  return btn;
}

// node_modules/dash-core/src/panels/places.ts
var PlacesPanel = class extends BasePanel {
  constructor(copy) {
    super();
    this.copy = copy;
    __publicField(this, "id", "places");
    __publicField(this, "title");
    this.title = copy.title;
  }
  renderBody() {
    placard(this.el, this.copy.title);
    const grid = this.el.createDiv({ cls: "dash-places" });
    const places = this.ctx.settings().places;
    if (places.length === 0) {
      grid.createDiv({ cls: "dash-muted", text: this.copy.empty });
      return;
    }
    for (const place of places) {
      if (place.type === "command") {
        commandButton(grid, this.ctx.app, place.target, place.label, {
          cls: "dash-place-btn",
          offlineText: this.copy.commandOffline
        });
      } else {
        const btn = grid.createEl("button", { cls: "dash-btn dash-place-btn", text: place.label });
        btn.addEventListener("click", () => {
          void this.ctx.app.workspace.openLinkText(place.target, "", false);
        });
      }
    }
  }
};

// node_modules/dash-core/src/panels/localeventmodal.ts
var import_obsidian15 = require("obsidian");
var LocalEventModal = class extends import_obsidian15.Modal {
  constructor(app, store, existing, onDone) {
    var _a, _b, _c, _d;
    super(app);
    this.store = store;
    this.existing = existing;
    this.onDone = onDone;
    __publicField(this, "summary");
    __publicField(this, "date");
    __publicField(this, "start");
    __publicField(this, "end");
    const e = existing;
    this.summary = (_a = e == null ? void 0 : e.summary) != null ? _a : "";
    this.date = (_b = e == null ? void 0 : e.date) != null ? _b : (0, import_obsidian15.moment)().format("YYYY-MM-DD");
    this.start = (_c = e == null ? void 0 : e.start) != null ? _c : "";
    this.end = (_d = e == null ? void 0 : e.end) != null ? _d : "";
  }
  onOpen() {
    this.titleEl.setText(this.existing ? "Edit event" : "New event");
    const { contentEl } = this;
    new import_obsidian15.Setting(contentEl).setName("Event").addText((t) => {
      t.setPlaceholder("What's on").setValue(this.summary).onChange((v) => this.summary = v);
      t.inputEl.classList.add("dash-modal-wide");
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.submit();
        }
      });
    });
    new import_obsidian15.Setting(contentEl).setName("Date").addText((t) => {
      t.inputEl.type = "date";
      t.setValue(this.date).onChange((v) => this.date = v);
    });
    new import_obsidian15.Setting(contentEl).setName("Time").setDesc("Optional. Leave the start empty for an all-day event.").addText((t) => {
      t.inputEl.type = "time";
      t.setValue(this.start).onChange((v) => this.start = v);
    }).addText((t) => {
      t.inputEl.type = "time";
      t.setValue(this.end).onChange((v) => this.end = v);
    });
    const buttons = new import_obsidian15.Setting(contentEl);
    if (this.existing) {
      buttons.addButton(
        (b) => b.setButtonText("Delete").setWarning().onClick(async () => {
          await this.store.remove(this.existing.id);
          this.close();
          this.onDone();
        })
      );
    }
    buttons.addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
    buttons.addButton((b) => b.setButtonText(this.existing ? "Save" : "Add").setCta().onClick(() => void this.submit()));
  }
  async submit() {
    const summary = this.summary.trim();
    if (!summary) {
      new import_obsidian15.Notice("An event needs a description.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.date)) {
      new import_obsidian15.Notice("An event needs a valid date.");
      return;
    }
    const patch = {
      summary,
      date: this.date,
      start: this.start || void 0,
      end: this.start && this.end ? this.end : void 0
    };
    if (this.existing) await this.store.update(this.existing.id, patch);
    else await this.store.add(patch);
    this.close();
    this.onDone();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// node_modules/dash-core/src/panels/meals.ts
var import_obsidian16 = require("obsidian");
var MealsPanel = class extends BasePanel {
  constructor(copy) {
    super();
    this.copy = copy;
    __publicField(this, "id", "meals");
    __publicField(this, "title");
    this.title = copy.title;
  }
  async renderBody() {
    var _a, _b, _c, _d, _e;
    const companion = this.ctx.companion;
    placard(this.el, this.copy.title);
    if (!((_a = companion.recipesAvailable) == null ? void 0 : _a.call(companion))) {
      this.el.createDiv({ cls: "dash-muted", text: this.copy.offline });
      return;
    }
    const meals = (_c = await ((_b = companion.plannedMeals) == null ? void 0 : _b.call(companion))) != null ? _c : [];
    const mealsWrap = this.el.createDiv({ cls: "dash-meals" });
    mealsWrap.createDiv({ cls: "dash-subhead", text: this.copy.plannedHeading });
    if (meals.length === 0) {
      mealsWrap.createDiv({ cls: "dash-muted", text: this.copy.noMeals });
    } else {
      const cards = mealsWrap.createDiv({ cls: "dash-meal-cards" });
      for (const meal of meals) {
        const card = cards.createDiv({ cls: "dash-meal-card" });
        card.createDiv({ cls: "dash-meal-name", text: meal.name });
        card.createDiv({ cls: "dash-meal-open", text: this.copy.openRecipe });
        card.addEventListener("click", () => {
          const dest = this.ctx.app.metadataCache.getFirstLinkpathDest(meal.link, "");
          if (dest instanceof import_obsidian16.TFile) void this.ctx.app.workspace.getLeaf(false).openFile(dest);
        });
      }
    }
    if (this.copy.showGrocery !== false) {
      const grocery = (_e = await ((_d = companion.groceryList) == null ? void 0 : _d.call(companion))) != null ? _e : { path: "", items: [], exists: false };
      const gWrap = this.el.createDiv({ cls: "dash-grocery" });
      gWrap.createDiv({ cls: "dash-subhead", text: this.copy.groceryHeading });
      if (!grocery.exists) {
        gWrap.createDiv({ cls: "dash-muted", text: this.copy.noGroceryAt.replace("{path}", grocery.path) });
      } else if (grocery.items.length === 0) {
        gWrap.createDiv({ cls: "dash-muted", text: this.copy.groceryEmpty });
      } else {
        const remaining = grocery.items.filter((i) => !i.checked).length;
        gWrap.createDiv({
          cls: "dash-grocery-count",
          text: this.copy.remaining.replace("{remaining}", String(remaining)).replace("{total}", String(grocery.items.length))
        });
        const list = gWrap.createDiv({ cls: "dash-grocery-list" });
        for (const item of grocery.items) {
          if (companion.toggleGroceryItem) {
            const row = list.createEl("label", { cls: "dash-grocery-row" });
            if (item.checked) row.addClass("is-checked");
            const box = row.createEl("input", { attr: { type: "checkbox" } });
            box.checked = item.checked;
            box.addEventListener("change", async () => {
              var _a2;
              await ((_a2 = companion.toggleGroceryItem) == null ? void 0 : _a2.call(companion, item.line));
              this.ctx.markFoodFocus();
              this.rerender();
            });
            row.createSpan({ cls: "dash-grocery-name", text: item.name });
          } else {
            const row = list.createDiv({ cls: "dash-grocery-row" });
            if (item.checked) row.addClass("is-checked");
            row.createSpan({ cls: "dash-grocery-box", text: item.checked ? "\u2611" : "\u2610" });
            row.createSpan({ cls: "dash-grocery-name", text: item.name });
          }
        }
      }
    }
    const actions = this.el.createDiv({ cls: "dash-btn-row" });
    const nudge = () => this.ctx.markFoodFocus();
    for (const cmd of this.copy.commands) {
      commandButton(actions, this.ctx.app, cmd.id, cmd.label, {
        cls: cmd.cls,
        offlineText: this.copy.commandOffline,
        onRun: cmd.food ? nudge : void 0
      });
    }
  }
};

// node_modules/dash-core/src/panels/journal.ts
var import_obsidian17 = require("obsidian");
var JournalPanel = class extends BasePanel {
  constructor(copy) {
    super();
    this.copy = copy;
    __publicField(this, "id", "journal");
    __publicField(this, "title");
    __publicField(this, "editing", false);
    this.title = copy.title;
  }
  async refresh(reason) {
    var _a;
    if (reason === "vault" && this.editing) return;
    if ((_a = this.el) == null ? void 0 : _a.isConnected) {
      this.el.empty();
      await this.renderBody();
    }
  }
  async renderBody() {
    placard(this.el, this.copy.title);
    await this.renderYesterdayCarry();
    const wrap = this.el.createDiv({ cls: "dash-journal" });
    for (const field of this.copy.fields) {
      await this.renderField(wrap, field);
    }
  }
  /** Read-only carry-over of yesterday's configured heading onto today. */
  async renderYesterdayCarry() {
    if (!this.copy.carryHeading) return;
    const yesterday = (0, import_obsidian17.moment)().subtract(1, "day").format("YYYY-MM-DD");
    let text = "";
    try {
      const raw = await readDailyNoteRaw(this.ctx.app, yesterday);
      text = tidy(readField(raw, headingField(this.copy.carryHeading)));
    } catch (e) {
      console.error("dash-core: could not read yesterday's carry-over", e);
    }
    if (!text) return;
    const block = this.el.createDiv({ cls: "dash-carry" });
    if (this.copy.carryLabel) block.createDiv({ cls: "dash-carry-label", text: this.copy.carryLabel });
    block.createDiv({ cls: "dash-carry-body", text });
  }
  async renderField(parent, field) {
    const block = parent.createDiv({ cls: "dash-journal-field" });
    block.createDiv({ cls: "dash-journal-label", text: field.label });
    const ta = block.createEl("textarea", {
      cls: "dash-journal-input",
      attr: field.placeholder ? { placeholder: field.placeholder } : {}
    });
    const loaded = await readDailyField(this.ctx.app, field.spec);
    ta.value = field.stripPlaceholder ? tidy(loaded) : loaded;
    autosize(ta);
    let lastWidth = -1;
    const ro = new ResizeObserver((entries) => {
      var _a, _b;
      const width = (_b = (_a = entries[0]) == null ? void 0 : _a.contentRect.width) != null ? _b : 0;
      if (width === lastWidth) return;
      lastWidth = width;
      autosize(ta);
    });
    ro.observe(block);
    this.onCleanup(() => ro.disconnect());
    let timer = null;
    const save = () => {
      const write = field.ensureHeading ? writeDailyFieldOrCreate(this.ctx.app, field.spec, ta.value, field.ensureHeading) : writeDailyField(this.ctx.app, field.spec, ta.value);
      void write.catch((e) => console.error("dash-core: journal save failed", e));
    };
    ta.addEventListener("focus", () => {
      this.editing = true;
      this.ctx.runtime.typingUntil = Date.now() + 2e3;
    });
    ta.addEventListener("blur", () => {
      this.editing = false;
      this.ctx.runtime.typingUntil = 0;
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      save();
    });
    ta.addEventListener("input", () => {
      this.ctx.runtime.typingUntil = Date.now() + 2e3;
      autosize(ta);
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        save();
      }, 800);
    });
    this.onCleanup(() => {
      if (timer !== null) window.clearTimeout(timer);
    });
  }
};
function autosize(ta) {
  ta.style.height = "auto";
  ta.style.height = Math.max(48, ta.scrollHeight) + "px";
}
function tidy(text) {
  return text.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim() !== "" && !/^\s*-\s*(\[[ xX]?\]\s*)?$/.test(l)).join("\n").trim();
}

// node_modules/dash-core/src/panels/weeklygoals.ts
var import_obsidian18 = require("obsidian");
function weekKeyOf(weekStart) {
  return weekStart.clone().startOf("week").format("YYYY-MM-DD");
}
function currentWeekKey() {
  return weekKeyOf((0, import_obsidian18.moment)());
}
function weekLabel(weekKey) {
  const start = (0, import_obsidian18.moment)(weekKey, "YYYY-MM-DD");
  return `${start.format("MMM D")} \u2013 ${start.clone().add(6, "days").format("MMM D")}`;
}
var WeeklyGoalsModal = class extends import_obsidian18.Modal {
  constructor(app, store, todos, weekKey, onDone, copy) {
    super(app);
    this.store = store;
    this.todos = todos;
    this.weekKey = weekKey;
    this.onDone = onDone;
    this.copy = copy;
    __publicField(this, "draft", "");
  }
  onOpen() {
    this.titleEl.setText(this.copy.titleTemplate.replace("{week}", weekLabel(this.weekKey)));
    this.render();
  }
  render() {
    const { contentEl } = this;
    contentEl.empty();
    const goals = this.store.forWeek(this.weekKey);
    const list = contentEl.createDiv({ cls: "dash-goals-list" });
    if (goals.length === 0) {
      list.createDiv({ cls: "dash-muted", text: this.copy.empty });
    }
    for (const goal of goals) {
      const row = list.createDiv({ cls: "dash-goals-row" });
      row.createSpan({ cls: "dash-goals-text", text: goal.text });
      const actions = row.createDiv({ cls: "dash-goals-actions" });
      const toDir = actions.createEl("button", { cls: "dash-btn dash-btn-sm", text: this.copy.toItem });
      toDir.addEventListener("click", () => void this.toItem(goal.text));
      const del = actions.createEl("button", {
        cls: "dash-icon-btn",
        text: "\u{1F5D1}",
        attr: { "aria-label": this.copy.removeGoal, title: this.copy.removeGoal }
      });
      del.addEventListener("click", async () => {
        await this.store.remove(this.weekKey, goal.id);
        this.onDone();
        this.render();
      });
    }
    const addRow = new import_obsidian18.Setting(contentEl).setName(this.copy.addName);
    addRow.addText((t) => {
      t.setPlaceholder(this.copy.addPlaceholder).setValue(this.draft).onChange((v) => this.draft = v);
      t.inputEl.classList.add("dash-modal-wide");
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.add();
        }
      });
    });
    addRow.addButton((b) => b.setButtonText(this.copy.addButton).setCta().onClick(() => void this.add()));
    new import_obsidian18.Setting(contentEl).addButton((b) => b.setButtonText(this.copy.done).onClick(() => this.close()));
  }
  async add() {
    const text = this.draft.trim();
    if (!text) return;
    await this.store.add(this.weekKey, text);
    this.draft = "";
    this.onDone();
    this.render();
  }
  /** Send a goal to the to-do list as a one-time item due at week's end. */
  async toItem(text) {
    const due = (0, import_obsidian18.moment)(this.weekKey, "YYYY-MM-DD").add(6, "days").format("YYYY-MM-DD");
    await this.todos.add({ text, dueDate: due });
    new import_obsidian18.Notice(this.copy.addedNotice);
    this.onDone();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// node_modules/dash-core/src/panels/secondbrain.ts
var import_obsidian19 = require("obsidian");
var DEFAULT_SECOND_BRAIN_COPY = {
  title: "Second Brain",
  activeBadge: "{n} active",
  newNote: "+ Note",
  searchPlaceholder: "Search the Second Brain\u2026",
  noMatches: "No matches.",
  noActiveNotes: "No active notes yet.",
  moreHint: "+{n} more \u2014 type to search.",
  archiveTooltip: "Archive",
  deleteTooltip: "Delete",
  unarchiveTooltip: "Unarchive",
  archivedHeading: "Archive \xB7 {n}",
  restoredNotice: "Restored {name}.",
  archivedNotice: "Archived {name}.",
  deletedNotice: "Deleted {name}.",
  deleteHeading: "Delete \u201C{name}\u201D?",
  deleteBody: "It goes to your configured trash and is removed from any category.",
  cancel: "Cancel",
  deleteConfirm: "Delete",
  newNoteTitle: "New note",
  noteTitleLabel: "Title",
  noteTitlePlaceholder: "Note title",
  create: "Create",
  noteNeedsTitle: "A note needs a title."
};
var SecondBrainPanel = class extends BasePanel {
  constructor(store, copy) {
    super();
    this.store = store;
    __publicField(this, "id", "secondbrain");
    __publicField(this, "title", "Second Brain");
    __publicField(this, "query", "");
    __publicField(this, "copy");
    this.copy = { ...DEFAULT_SECOND_BRAIN_COPY, ...copy };
    this.title = this.copy.title;
  }
  renderBody() {
    const c = this.copy;
    const head = placard(this.el, c.title);
    const notes = this.store.listNotes();
    head.createSpan({ cls: "dash-placard-badge", text: c.activeBadge.replace("{n}", String(notes.length)) });
    const actions = this.el.createDiv({ cls: "dash-btn-row" });
    const add = actions.createEl("button", { cls: "dash-btn dash-btn-primary", text: c.newNote });
    add.addEventListener("click", () => new NewNoteModal2(this.ctx.app, this.store, c, () => this.rerender()).open());
    const input = this.el.createEl("input", {
      cls: "dash-search-input",
      attr: { type: "search", placeholder: c.searchPlaceholder }
    });
    input.value = this.query;
    this.bindTextFocus(input);
    const results = this.el.createDiv({ cls: "dash-sb-results" });
    const render = () => {
      results.empty();
      const q = this.query.trim();
      const list = q ? this.fuzzy(notes, q) : notes.slice(0, 12);
      if (list.length === 0) {
        results.createDiv({ cls: "dash-muted", text: q ? c.noMatches : c.noActiveNotes });
        return;
      }
      for (const file of list) this.renderNoteRow(results, file);
      if (!q && notes.length > 12) {
        results.createDiv({ cls: "dash-muted", text: c.moreHint.replace("{n}", String(notes.length - 12)) });
      }
    };
    input.addEventListener("input", () => {
      this.query = input.value;
      render();
    });
    render();
    const archived = this.store.listArchived();
    if (archived.length > 0) {
      const arch = this.el.createEl("details", { cls: "dash-sb-archived" });
      arch.createEl("summary", { text: c.archivedHeading.replace("{n}", String(archived.length)) });
      const list = arch.createDiv();
      for (const file of archived) {
        const row = list.createDiv({ cls: "dash-sb-member" });
        const link = row.createEl("a", { cls: "dash-sb-link", text: file.basename });
        link.addEventListener("click", (e) => {
          e.preventDefault();
          void this.ctx.app.workspace.getLeaf(false).openFile(file);
        });
        this.iconBtn(row, "\u293A", c.unarchiveTooltip, async () => {
          await this.store.restoreNote(file);
          new import_obsidian19.Notice(c.restoredNotice.replace("{name}", file.basename));
          this.rerender();
        });
      }
    }
  }
  renderNoteRow(parent, file) {
    const c = this.copy;
    const row = parent.createDiv({ cls: "dash-sb-row" });
    const link = row.createEl("a", { cls: "dash-sb-link", text: file.basename });
    link.addEventListener("click", (e) => {
      e.preventDefault();
      void this.ctx.app.workspace.getLeaf(false).openFile(file);
    });
    this.iconBtn(row, "\u{1F5C4}", c.archiveTooltip, async () => {
      await this.store.archiveNote(file);
      new import_obsidian19.Notice(c.archivedNotice.replace("{name}", file.basename));
      this.rerender();
    });
    this.iconBtn(row, "\u{1F5D1}", c.deleteTooltip, () => {
      new ConfirmModal(
        this.ctx.app,
        c.deleteHeading.replace("{name}", file.basename),
        c.deleteBody,
        c.cancel,
        c.deleteConfirm,
        async () => {
          await this.store.deleteNote(file);
          new import_obsidian19.Notice(c.deletedNotice.replace("{name}", file.basename));
          this.rerender();
        }
      ).open();
    });
  }
  iconBtn(parent, glyph, label, onClick) {
    const b = parent.createEl("button", { cls: "dash-icon-btn dash-sb-icon", text: glyph, attr: { title: label, "aria-label": label } });
    b.addEventListener("click", onClick);
  }
  fuzzy(files, query) {
    var _a;
    const search = (0, import_obsidian19.prepareFuzzySearch)(query);
    const scored = [];
    for (const file of files) {
      let best = search(file.basename);
      const cache = this.ctx.app.metadataCache.getFileCache(file);
      for (const h of (_a = cache == null ? void 0 : cache.headings) != null ? _a : []) {
        const r = search(h.heading);
        if (r && (!best || r.score > best.score)) best = r;
      }
      if (best) scored.push({ file, score: best.score });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 20).map((s) => s.file);
  }
};
var NewNoteModal2 = class extends import_obsidian19.Modal {
  constructor(app, store, copy, onDone) {
    super(app);
    this.store = store;
    this.copy = copy;
    this.onDone = onDone;
    __publicField(this, "title", "");
  }
  onOpen() {
    const c = this.copy;
    this.titleEl.setText(c.newNoteTitle);
    new import_obsidian19.Setting(this.contentEl).setName(c.noteTitleLabel).addText((t) => {
      t.setPlaceholder(c.noteTitlePlaceholder).onChange((v) => this.title = v);
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.submit();
        }
      });
    });
    new import_obsidian19.Setting(this.contentEl).addButton((b) => b.setButtonText(c.cancel).onClick(() => this.close())).addButton((b) => b.setButtonText(c.create).setCta().onClick(() => void this.submit()));
  }
  async submit() {
    const title = this.title.trim();
    if (!title) {
      new import_obsidian19.Notice(this.copy.noteNeedsTitle);
      return;
    }
    const file = await this.store.createNote(title);
    this.close();
    this.onDone();
    await this.app.workspace.getLeaf(false).openFile(file);
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ConfirmModal = class extends import_obsidian19.Modal {
  constructor(app, heading, body, cancelLabel, confirmLabel, onConfirm) {
    super(app);
    this.heading = heading;
    this.body = body;
    this.cancelLabel = cancelLabel;
    this.confirmLabel = confirmLabel;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    this.titleEl.setText(this.heading);
    this.contentEl.createEl("p", { text: this.body });
    new import_obsidian19.Setting(this.contentEl).addButton((b) => b.setButtonText(this.cancelLabel).onClick(() => this.close())).addButton(
      (b) => b.setButtonText(this.confirmLabel).setWarning().onClick(() => {
        this.close();
        this.onConfirm();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};

// node_modules/dash-core/src/panels/search.ts
var import_obsidian20 = require("obsidian");
var DEFAULT_SEARCH_COPY = {
  title: "Knowledge Base",
  newNote: "+ Note",
  newCategory: "+ Category",
  assign: "Assign to category",
  searchPlaceholder: "Search the knowledge base\u2026",
  categoriesHeading: "Categories \xB7 {n}",
  noCategories: "No categories yet. Create one to start organizing.",
  categoryEmpty: "Empty.",
  recentHeading: "Recently modified \xB7 {n}",
  noNotesInScope: "No notes in the knowledge-base scope yet.",
  noMatches: "No matches in the knowledge base."
};
var BODY_SCAN_CAP = 1e5;
var SearchPanel = class extends BasePanel {
  constructor(store, copy, categoryCopy) {
    super();
    this.store = store;
    __publicField(this, "id", "search");
    __publicField(this, "title", "Knowledge Base");
    __publicField(this, "index", []);
    __publicField(this, "selected", 0);
    __publicField(this, "hits", []);
    __publicField(this, "resultsEl");
    __publicField(this, "inputEl");
    __publicField(this, "debounce", null);
    /** Bumped per query so a slow body scan from a stale query is discarded. */
    __publicField(this, "queryToken", 0);
    __publicField(this, "showingRecent", true);
    __publicField(this, "copy");
    __publicField(this, "categoryCopy");
    this.copy = { ...DEFAULT_SEARCH_COPY, ...copy };
    this.categoryCopy = categoryCopy;
    this.title = this.copy.title;
  }
  async setup() {
    this.buildIndex();
    this.onCleanup(() => {
      if (this.debounce !== null) window.clearTimeout(this.debounce);
    });
  }
  buildIndex() {
    var _a, _b;
    const s = this.ctx.settings();
    const paths = (s.kbSearchPaths && s.kbSearchPaths.length ? s.kbSearchPaths : [(_a = s.kbSearchPath) != null ? _a : ""]).map(normalizeFolder).filter((p) => p);
    this.index = [];
    for (const file of this.ctx.app.vault.getMarkdownFiles()) {
      if (paths.length && !paths.some((p) => file.path.startsWith(p))) continue;
      const cache = this.ctx.app.metadataCache.getFileCache(file);
      const headings = ((_b = cache == null ? void 0 : cache.headings) != null ? _b : []).map((h) => h.heading);
      this.index.push({ file, basename: file.basename, headings, mtime: file.stat.mtime, size: file.stat.size });
    }
  }
  renderBody() {
    this.buildIndex();
    const c = this.copy;
    placard(this.el, c.title);
    const store = this.store;
    const actions = this.el.createDiv({ cls: "dash-btn-row" });
    const note = actions.createEl("button", { cls: "dash-btn dash-btn-primary", text: c.newNote });
    note.addEventListener("click", () => new NewNoteModal(this.ctx.app, store, () => this.rerender(), this.categoryCopy).open());
    const cat = actions.createEl("button", { cls: "dash-btn", text: c.newCategory });
    cat.addEventListener("click", () => new NewCategoryModal(this.ctx.app, store, () => this.rerender(), this.categoryCopy).open());
    const assign2 = actions.createEl("button", { cls: "dash-btn", text: c.assign });
    assign2.addEventListener("click", () => runAssignFlow(this.ctx.app, store, () => this.rerender(), this.categoryCopy));
    const input = this.el.createEl("input", {
      cls: "dash-search-input",
      attr: { type: "search", placeholder: c.searchPlaceholder, enterkeyhint: "search" }
    });
    this.inputEl = input;
    this.bindTextFocus(input);
    this.resultsEl = this.el.createDiv({ cls: "dash-search-results" });
    input.addEventListener("input", () => this.scheduleQuery(input.value));
    input.addEventListener("keydown", (e) => this.onKey(e));
    void this.runQuery("");
    this.renderCategories();
  }
  /** Debounce body-scanning input ~150ms; empty query resolves immediately. */
  scheduleQuery(query) {
    if (this.debounce !== null) window.clearTimeout(this.debounce);
    if (!query.trim()) {
      void this.runQuery(query);
      return;
    }
    this.debounce = window.setTimeout(() => {
      this.debounce = null;
      void this.runQuery(query);
    }, 150);
  }
  renderCategories() {
    const c = this.copy;
    const store = this.store;
    const cats = store.listCategories();
    const section = this.el.createDiv({ cls: "dash-sb-cats" });
    section.createDiv({ cls: "dash-subhead", text: c.categoriesHeading.replace("{n}", String(cats.length)) });
    if (cats.length === 0) {
      section.createDiv({ cls: "dash-muted", text: c.noCategories });
      return;
    }
    const listEl = section.createDiv();
    void (async () => {
      const withMembers = await Promise.all(
        cats.map(async (ct) => ({ cat: ct, members: await store.categoryMembers(ct.file) }))
      );
      if (!listEl.isConnected) return;
      for (const { cat, members } of withMembers) {
        const details = listEl.createEl("details", { cls: "dash-sb-cat" });
        const summary = details.createEl("summary");
        summary.createSpan({ cls: "dash-sb-cat-name", text: cat.name });
        summary.createSpan({ cls: "dash-chip dash-chip-cold", text: String(members.length) });
        const body = details.createDiv({ cls: "dash-sb-cat-body" });
        if (members.length === 0) body.createDiv({ cls: "dash-muted", text: c.categoryEmpty });
        for (const m of members) {
          const row = body.createDiv({ cls: "dash-sb-member" });
          const link = row.createEl("a", { cls: "dash-sb-link", text: m });
          link.addEventListener("click", (e) => {
            e.preventDefault();
            void this.ctx.app.workspace.openLinkText(m, cat.file.path, false);
          });
        }
      }
    })();
  }
  async runQuery(query) {
    var _a;
    const q = query.trim();
    const token = ++this.queryToken;
    this.selected = 0;
    if (!q) {
      this.showingRecent = true;
      const n = Math.max(0, (_a = this.ctx.settings().kbRecentCount) != null ? _a : 8);
      this.hits = this.index.slice().sort((a, b) => b.mtime - a.mtime).slice(0, n).map((cand) => ({ file: cand.file, title: cand.basename, context: "", score: 0, body: false }));
      this.renderResults();
      return;
    }
    this.showingRecent = false;
    const search = (0, import_obsidian20.prepareFuzzySearch)(q);
    const nameHits = [];
    for (const cand of this.index) {
      let best = search(cand.basename);
      let context = "";
      for (const h of cand.headings) {
        const r = search(h);
        if (r && (!best || r.score > best.score)) {
          best = r;
          context = h;
        }
      }
      if (best) nameHits.push({ file: cand.file, title: cand.basename, context, score: best.score, body: false });
    }
    nameHits.sort((a, b) => b.score - a.score);
    this.hits = nameHits.slice(0, 20);
    this.renderResults();
    if (!this.ctx.settings().kbSearchBody) return;
    const already = new Set(nameHits.map((h) => h.file.path));
    const needle = q.toLowerCase();
    const bodyHits = [];
    for (const cand of this.index) {
      if (already.has(cand.file.path)) continue;
      if (cand.size > BODY_SCAN_CAP) continue;
      let content;
      try {
        content = await this.ctx.app.vault.cachedRead(cand.file);
      } catch (e) {
        continue;
      }
      if (token !== this.queryToken) return;
      const snippet = firstMatchingLine(content, needle);
      if (snippet) bodyHits.push({ file: cand.file, title: cand.basename, context: snippet, score: 0, body: true });
    }
    if (token !== this.queryToken) return;
    this.hits = [...nameHits, ...bodyHits].slice(0, 30);
    this.renderResults();
  }
  renderResults() {
    const c = this.copy;
    const el = this.resultsEl;
    if (!el) return;
    el.empty();
    if (this.showingRecent) {
      if (this.hits.length === 0) {
        el.createDiv({ cls: "dash-muted", text: c.noNotesInScope });
        return;
      }
      el.createDiv({ cls: "dash-subhead", text: c.recentHeading.replace("{n}", String(this.hits.length)) });
    } else if (this.hits.length === 0) {
      el.createDiv({ cls: "dash-muted", text: c.noMatches });
      return;
    }
    this.hits.forEach((hit, i) => {
      const row = el.createDiv({ cls: "dash-search-row" });
      if (i === this.selected) row.addClass("is-selected");
      row.createDiv({ cls: "dash-search-title", text: hit.title });
      if (hit.context && hit.context !== hit.title) {
        const ctx = row.createDiv({ cls: "dash-search-context", text: hit.context });
        if (hit.body) ctx.addClass("is-body");
      }
      row.addEventListener("click", () => this.open(hit.file));
    });
  }
  onKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.selected = Math.min(this.hits.length - 1, this.selected + 1);
      this.renderResults();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.selected = Math.max(0, this.selected - 1);
      this.renderResults();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = this.hits[this.selected];
      if (hit) this.open(hit.file);
    }
  }
  open(file) {
    void this.ctx.app.workspace.getLeaf(false).openFile(file);
  }
};
function normalizeFolder(path) {
  const p = path.trim().replace(/^\/+/, "");
  if (!p) return "";
  return p.endsWith("/") ? p : p + "/";
}
function firstMatchingLine(content, needle) {
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.toLowerCase().includes(needle)) {
      return line.length > 120 ? line.slice(0, 117) + "\u2026" : line;
    }
  }
  return "";
}

// node_modules/dash-core/src/panels/todo.ts
var import_obsidian21 = require("obsidian");

// node_modules/dash-core/src/panels/weekreview.ts
var import_obsidian22 = require("obsidian");
var WeekReviewModal = class extends import_obsidian22.Modal {
  constructor(app, config) {
    super(app);
    this.config = config;
  }
  onOpen() {
    this.titleEl.setText(this.config.title);
    this.modalEl.addClass("dash-review-modal");
    const body = this.contentEl.createDiv({ cls: "dash-review" });
    body.createDiv({ cls: "dash-muted", text: this.config.compilingText });
    void this.config.compile().then((data) => {
      if (!body.isConnected) return;
      this.render(body, data);
    });
  }
  render(host, data) {
    host.empty();
    host.createDiv({ cls: "dash-review-header", text: data.header });
    if (data.streakLine) host.createDiv({ cls: "dash-review-streak", text: data.streakLine });
    for (const block of data.blocks) {
      const b = host.createDiv({ cls: "dash-review-block" });
      b.createDiv({ cls: "dash-review-stat-head", text: block.head });
      if (block.figure !== void 0) b.createDiv({ cls: "dash-review-figure", text: block.figure });
      if (block.bars) this.renderBars(b, block.bars);
      if (block.line !== void 0) b.createDiv({ cls: "dash-review-line", text: block.line });
      if (block.chips) {
        const chips = b.createDiv({ cls: "dash-review-chips" });
        for (const name of block.chips) chips.createSpan({ cls: "dash-chip dash-chip-cold", text: name });
      }
    }
  }
  renderBars(parent, data) {
    const bars = parent.createDiv({ cls: "dash-review-bars" });
    const max = Math.max(1, ...data.map((d) => d.count));
    for (const d of data) {
      const cell = bars.createDiv({ cls: "dash-review-bar-cell" });
      const track = cell.createDiv({ cls: "dash-review-bar-track" });
      const fill = track.createDiv({ cls: "dash-review-bar-fill" });
      fill.style.height = `${Math.round(d.count / max * 100)}%`;
      if (d.count === 0) fill.addClass("is-empty");
      cell.createDiv({ cls: "dash-review-bar-day", text: d.label });
      cell.createDiv({ cls: "dash-review-bar-count", text: String(d.count) });
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};

// node_modules/dash-core/src/panels/agenda.ts
var import_obsidian23 = require("obsidian");

// node_modules/dash-core/src/panels/weekprint.ts
var import_obsidian24 = require("obsidian");

// src/panels/clock.ts
var import_obsidian25 = require("obsidian");

// src/panels/types.ts
var BasePanel2 = class {
  constructor() {
    this.cleanups = [];
  }
  async mount(el, ctx) {
    this.el = el;
    this.ctx = ctx;
    await this.setup();
    await this.draw();
  }
  async refresh(reason) {
    var _a;
    if ((_a = this.el) == null ? void 0 : _a.isConnected) await this.draw(reason);
  }
  unmount() {
    for (const c of this.cleanups) {
      try {
        c();
      } catch (e) {
      }
    }
    this.cleanups = [];
  }
  onCleanup(fn) {
    this.cleanups.push(fn);
  }
  /** One-time setup (intervals, event subscriptions). Optional. */
  async setup() {
  }
  /** Re-run the body render from within the panel (after a local change). */
  rerender() {
    void this.draw("manual");
  }
  async draw(reason) {
    this.el.empty();
    await this.renderBody(reason);
  }
  setInterval(fn, ms) {
    const id = window.setInterval(fn, ms);
    this.onCleanup(() => window.clearInterval(id));
  }
  /** Wire a text input/textarea so the whole dashboard stops refreshing while
   * it is focused (no jumpy re-render under the cursor), resuming on blur. */
  bindTextFocus(el) {
    el.addEventListener("focus", () => {
      this.ctx.runtime.textFocused = true;
    });
    el.addEventListener("blur", () => {
      this.ctx.runtime.textFocused = false;
    });
  }
};
function placard2(el, title) {
  const head = el.createDiv({ cls: "dash-placard" });
  head.createSpan({ cls: "dash-placard-title", text: title });
  return head;
}

// src/panels/clock.ts
var ClockPanel = class extends BasePanel2 {
  constructor() {
    super(...arguments);
    this.id = "clock";
    this.title = "Clock";
  }
  async setup() {
    this.setInterval(() => this.tick(), 1e3);
  }
  renderBody() {
    placard2(this.el, "Clock");
    const wrap = this.el.createDiv({ cls: "dash-clock" });
    this.timeEl = wrap.createDiv({ cls: "dash-clock-time" });
    this.dateEl = wrap.createDiv({ cls: "dash-clock-date" });
    this.tick();
  }
  tick() {
    const now = (0, import_obsidian25.moment)();
    const format = this.ctx.settings().clock24h ? "H:mm" : "h:mm A";
    if (this.timeEl) this.timeEl.setText(now.format(format));
    if (this.dateEl) this.dateEl.setText(now.format("dddd, MMMM D, YYYY"));
  }
};

// src/core/verse.ts
var EPOCH_YEAR = 2026;
var EPOCH_MONTH = 1;
function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}
function occurrences(chapter, y, m) {
  let n = 0;
  for (let Y = EPOCH_YEAR; Y <= y; Y++) {
    const last = Y === y ? m : 12;
    for (let M = Y === EPOCH_YEAR ? EPOCH_MONTH : 1; M <= last; M++) {
      if (daysInMonth(Y, M) >= chapter) n++;
    }
  }
  return n;
}
function verseFor(y, m, d, verseCounts2) {
  const chapter = d;
  const count = verseCounts2[chapter - 1];
  if (!count || count < 1) {
    return { chapter, verse: 1 };
  }
  const k = occurrences(chapter, y, m);
  const verse = (k - 1) % count + 1;
  return { chapter, verse };
}
function localYMD(date = /* @__PURE__ */ new Date()) {
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}
function verseForDate(date, verseCounts2) {
  const { y, m, d } = localYMD(date);
  return verseFor(y, m, d, verseCounts2);
}

// data/proverbs-kjv.json
var proverbs_kjv_default = { translation: "KJV", translationName: "King James Version", book: "Proverbs", license: "Public domain (US). Sourced from github.com/aruljohn/Bible-kjv.", chapters: [{ chapter: 1, verses: ["The proverbs of Solomon the son of David, king of Israel;", "To know wisdom and instruction; to perceive the words of understanding;", "To receive the instruction of wisdom, justice, and judgment, and equity;", "To give subtilty to the simple, to the young man knowledge and discretion.", "A wise man will hear, and will increase learning; and a man of understanding shall attain unto wise counsels:", "To understand a proverb, and the interpretation; the words of the wise, and their dark sayings.", "The fear of the LORD is the beginning of knowledge: but fools despise wisdom and instruction.", "My son, hear the instruction of thy father, and forsake not the law of thy mother:", "For they shall be an ornament of grace unto thy head, and chains about thy neck.", "My son, if sinners entice thee, consent thou not.", "If they say, Come with us, let us lay wait for blood, let us lurk privily for the innocent without cause:", "Let us swallow them up alive as the grave; and whole, as those that go down into the pit:", "We shall find all precious substance, we shall fill our houses with spoil:", "Cast in thy lot among us; let us all have one purse:", "My son, walk not thou in the way with them; refrain thy foot from their path:", "For their feet run to evil, and make haste to shed blood.", "Surely in vain the net is spread in the sight of any bird.", "And they lay wait for their own blood; they lurk privily for their own lives.", "So are the ways of every one that is greedy of gain; which taketh away the life of the owners thereof.", "Wisdom crieth without; she uttereth her voice in the streets:", "She crieth in the chief place of concourse, in the openings of the gates: in the city she uttereth her words, saying,", "How long, ye simple ones, will ye love simplicity? and the scorners delight in their scorning, and fools hate knowledge?", "Turn you at my reproof: behold, I will pour out my spirit unto you, I will make known my words unto you.", "Because I have called, and ye refused; I have stretched out my hand, and no man regarded;", "But ye have set at nought all my counsel, and would none of my reproof:", "I also will laugh at your calamity; I will mock when your fear cometh;", "When your fear cometh as desolation, and your destruction cometh as a whirlwind; when distress and anguish cometh upon you.", "Then shall they call upon me, but I will not answer; they shall seek me early, but they shall not find me:", "For that they hated knowledge, and did not choose the fear of the LORD:", "They would none of my counsel: they despised all my reproof.", "Therefore shall they eat of the fruit of their own way, and be filled with their own devices.", "For the turning away of the simple shall slay them, and the prosperity of fools shall destroy them.", "But whoso hearkeneth unto me shall dwell safely, and shall be quiet from fear of evil."] }, { chapter: 2, verses: ["My son, if thou wilt receive my words, and hide my commandments with thee;", "So that thou incline thine ear unto wisdom, and apply thine heart to understanding;", "Yea, if thou criest after knowledge, and liftest up thy voice for understanding;", "If thou seekest her as silver, and searchest for her as for hid treasures;", "Then shalt thou understand the fear of the LORD, and find the knowledge of God.", "For the LORD giveth wisdom: out of his mouth cometh knowledge and understanding.", "He layeth up sound wisdom for the righteous: he is a buckler to them that walk uprightly.", "He keepeth the paths of judgment, and preserveth the way of his saints.", "Then shalt thou understand righteousness, and judgment, and equity; yea, every good path.", "When wisdom entereth into thine heart, and knowledge is pleasant unto thy soul;", "Discretion shall preserve thee, understanding shall keep thee:", "To deliver thee from the way of the evil man, from the man that speaketh froward things;", "Who leave the paths of uprightness, to walk in the ways of darkness;", "Who rejoice to do evil, and delight in the frowardness of the wicked;", "Whose ways are crooked, and they froward in their paths:", "To deliver thee from the strange woman, even from the stranger which flattereth with her words;", "Which forsaketh the guide of her youth, and forgetteth the covenant of her God.", "For her house inclineth unto death, and her paths unto the dead.", "None that go unto her return again, neither take they hold of the paths of life.", "That thou mayest walk in the way of good men, and keep the paths of the righteous.", "For the upright shall dwell in the land, and the perfect shall remain in it.", "But the wicked shall be cut off from the earth, and the transgressors shall be rooted out of it."] }, { chapter: 3, verses: ["My son, forget not my law; but let thine heart keep my commandments:", "For length of days, and long life, and peace, shall they add to thee.", "Let not mercy and truth forsake thee: bind them about thy neck; write them upon the table of thine heart:", "So shalt thou find favour and good understanding in the sight of God and man.", "Trust in the LORD with all thine heart; and lean not unto thine own understanding.", "In all thy ways acknowledge him, and he shall direct thy paths.", "Be not wise in thine own eyes: fear the LORD, and depart from evil.", "It shall be health to thy navel, and marrow to thy bones.", "Honour the LORD with thy substance, and with the firstfruits of all thine increase:", "So shall thy barns be filled with plenty, and thy presses shall burst out with new wine.", "My son, despise not the chastening of the LORD; neither be weary of his correction:", "For whom the LORD loveth he correcteth; even as a father the son in whom he delighteth.", "Happy is the man that findeth wisdom, and the man that getteth understanding.", "For the merchandise of it is better than the merchandise of silver, and the gain thereof than fine gold.", "She is more precious than rubies: and all the things thou canst desire are not to be compared unto her.", "Length of days is in her right hand; and in her left hand riches and honour.", "Her ways are ways of pleasantness, and all her paths are peace.", "She is a tree of life to them that lay hold upon her: and happy is every one that retaineth her.", "The LORD by wisdom hath founded the earth; by understanding hath he established the heavens.", "By his knowledge the depths are broken up, and the clouds drop down the dew.", "My son, let not them depart from thine eyes: keep sound wisdom and discretion:", "So shall they be life unto thy soul, and grace to thy neck.", "Then shalt thou walk in thy way safely, and thy foot shall not stumble.", "When thou liest down, thou shalt not be afraid: yea, thou shalt lie down, and thy sleep shall be sweet.", "Be not afraid of sudden fear, neither of the desolation of the wicked, when it cometh.", "For the LORD shall be thy confidence, and shall keep thy foot from being taken.", "Withhold not good from them to whom it is due, when it is in the power of thine hand to do it.", "Say not unto thy neighbour, Go, and come again, and to morrow I will give; when thou hast it by thee.", "Devise not evil against thy neighbour, seeing he dwelleth securely by thee.", "Strive not with a man without cause, if he have done thee no harm.", "Envy thou not the oppressor, and choose none of his ways.", "For the froward is abomination to the LORD: but his secret is with the righteous.", "The curse of the LORD is in the house of the wicked: but he blesseth the habitation of the just.", "Surely he scorneth the scorners: but he giveth grace unto the lowly.", "The wise shall inherit glory: but shame shall be the promotion of fools."] }, { chapter: 4, verses: ["Hear, ye children, the instruction of a father, and attend to know understanding.", "For I give you good doctrine, forsake ye not my law.", "For I was my father\u2019s son, tender and only beloved in the sight of my mother.", "He taught me also, and said unto me, Let thine heart retain my words: keep my commandments, and live.", "Get wisdom, get understanding: forget it not; neither decline from the words of my mouth.", "Forsake her not, and she shall preserve thee: love her, and she shall keep thee.", "Wisdom is the principal thing; therefore get wisdom: and with all thy getting get understanding.", "Exalt her, and she shall promote thee: she shall bring thee to honour, when thou dost embrace her.", "She shall give to thine head an ornament of grace: a crown of glory shall she deliver to thee.", "Hear, O my son, and receive my sayings; and the years of thy life shall be many.", "I have taught thee in the way of wisdom; I have led thee in right paths.", "When thou goest, thy steps shall not be straitened; and when thou runnest, thou shalt not stumble.", "Take fast hold of instruction; let her not go: keep her; for she is thy life.", "Enter not into the path of the wicked, and go not in the way of evil men.", "Avoid it, pass not by it, turn from it, and pass away.", "For they sleep not, except they have done mischief; and their sleep is taken away, unless they cause some to fall.", "For they eat the bread of wickedness, and drink the wine of violence.", "But the path of the just is as the shining light, that shineth more and more unto the perfect day.", "The way of the wicked is as darkness: they know not at what they stumble.", "My son, attend to my words; incline thine ear unto my sayings.", "Let them not depart from thine eyes; keep them in the midst of thine heart.", "For they are life unto those that find them, and health to all their flesh.", "Keep thy heart with all diligence; for out of it are the issues of life.", "Put away from thee a froward mouth, and perverse lips put far from thee.", "Let thine eyes look right on, and let thine eyelids look straight before thee.", "Ponder the path of thy feet, and let all thy ways be established.", "Turn not to the right hand nor to the left: remove thy foot from evil."] }, { chapter: 5, verses: ["My son, attend unto my wisdom, and bow thine ear to my understanding:", "That thou mayest regard discretion, and that thy lips may keep knowledge.", "For the lips of a strange woman drop as an honeycomb, and her mouth is smoother than oil:", "But her end is bitter as wormwood, sharp as a two-edged sword.", "Her feet go down to death; her steps take hold on hell.", "Lest thou shouldest ponder the path of life, her ways are moveable, that thou canst not know them.", "Hear me now therefore, O ye children, and depart not from the words of my mouth.", "Remove thy way far from her, and come not nigh the door of her house:", "Lest thou give thine honour unto others, and thy years unto the cruel:", "Lest strangers be filled with thy wealth; and thy labours be in the house of a stranger;", "And thou mourn at the last, when thy flesh and thy body are consumed,", "And say, How have I hated instruction, and my heart despised reproof;", "And have not obeyed the voice of my teachers, nor inclined mine ear to them that instructed me!", "I was almost in all evil in the midst of the congregation and assembly.", "Drink waters out of thine own cistern, and running waters out of thine own well.", "Let thy fountains be dispersed abroad, and rivers of waters in the streets.", "Let them be only thine own, and not strangers\u2019 with thee.", "Let thy fountain be blessed: and rejoice with the wife of thy youth.", "Let her be as the loving hind and pleasant roe; let her breasts satisfy thee at all times; and be thou ravished always with her love.", "And why wilt thou, my son, be ravished with a strange woman, and embrace the bosom of a stranger?", "For the ways of man are before the eyes of the LORD, and he pondereth all his goings.", "His own iniquities shall take the wicked himself, and he shall be holden with the cords of his sins.", "He shall die without instruction; and in the greatness of his folly he shall go astray."] }, { chapter: 6, verses: ["My son, if thou be surety for thy friend, if thou hast stricken thy hand with a stranger,", "Thou art snared with the words of thy mouth, thou art taken with the words of thy mouth.", "Do this now, my son, and deliver thyself, when thou art come into the hand of thy friend; go, humble thyself, and make sure thy friend.", "Give not sleep to thine eyes, nor slumber to thine eyelids.", "Deliver thyself as a roe from the hand of the hunter, and as a bird from the hand of the fowler.", "Go to the ant, thou sluggard; consider her ways, and be wise:", "Which having no guide, overseer, or ruler,", "Provideth her meat in the summer, and gathereth her food in the harvest.", "How long wilt thou sleep, O sluggard? when wilt thou arise out of thy sleep?", "Yet a little sleep, a little slumber, a little folding of the hands to sleep:", "So shall thy poverty come as one that travelleth, and thy want as an armed man.", "A naughty person, a wicked man, walketh with a froward mouth.", "He winketh with his eyes, he speaketh with his feet, he teacheth with his fingers;", "Frowardness is in his heart, he deviseth mischief continually; he soweth discord.", "Therefore shall his calamity come suddenly; suddenly shall he be broken without remedy.", "These six things doth the LORD hate: yea, seven are an abomination unto him:", "A proud look, a lying tongue, and hands that shed innocent blood,", "An heart that deviseth wicked imaginations, feet that be swift in running to mischief,", "A false witness that speaketh lies, and he that soweth discord among brethren.", "My son, keep thy father\u2019s commandment, and forsake not the law of thy mother:", "Bind them continually upon thine heart, and tie them about thy neck.", "When thou goest, it shall lead thee; when thou sleepest, it shall keep thee; and when thou awakest, it shall talk with thee.", "For the commandment is a lamp; and the law is light; and reproofs of instruction are the way of life:", "To keep thee from the evil woman, from the flattery of the tongue of a strange woman.", "Lust not after her beauty in thine heart; neither let her take thee with her eyelids.", "For by means of a whorish woman a man is brought to a piece of bread: and the adulteress will hunt for the precious life.", "Can a man take fire in his bosom, and his clothes not be burned?", "Can one go upon hot coals, and his feet not be burned?", "So he that goeth in to his neighbour\u2019s wife; whosoever toucheth her shall not be innocent.", "Men do not despise a thief, if he steal to satisfy his soul when he is hungry;", "But if he be found, he shall restore sevenfold; he shall give all the substance of his house.", "But whoso committeth adultery with a woman lacketh understanding: he that doeth it destroyeth his own soul.", "A wound and dishonour shall he get; and his reproach shall not be wiped away.", "For jealousy is the rage of a man: therefore he will not spare in the day of vengeance.", "He will not regard any ransom; neither will he rest content, though thou givest many gifts."] }, { chapter: 7, verses: ["My son, keep my words, and lay up my commandments with thee.", "Keep my commandments, and live; and my law as the apple of thine eye.", "Bind them upon thy fingers, write them upon the table of thine heart.", "Say unto wisdom, Thou art my sister; and call understanding thy kinswoman:", "That they may keep thee from the strange woman, from the stranger which flattereth with her words.", "For at the window of my house I looked through my casement,", "And beheld among the simple ones, I discerned among the youths, a young man void of understanding,", "Passing through the street near her corner; and he went the way to her house,", "In the twilight, in the evening, in the black and dark night:", "And, behold, there met him a woman with the attire of an harlot, and subtil of heart.", "(She is loud and stubborn; her feet abide not in her house:", "Now is she without, now in the streets, and lieth in wait at every corner.)", "So she caught him, and kissed him, and with an impudent face said unto him,", "I have peace offerings with me; this day have I payed my vows.", "Therefore came I forth to meet thee, diligently to seek thy face, and I have found thee.", "I have decked my bed with coverings of tapestry, with carved works, with fine linen of Egypt.", "I have perfumed my bed with myrrh, aloes, and cinnamon.", "Come, let us take our fill of love until the morning: let us solace ourselves with loves.", "For the goodman is not at home, he is gone a long journey:", "He hath taken a bag of money with him, and will come home at the day appointed.", "With her much fair speech she caused him to yield, with the flattering of her lips she forced him.", "He goeth after her straightway, as an ox goeth to the slaughter, or as a fool to the correction of the stocks;", "Till a dart strike through his liver; as a bird hasteth to the snare, and knoweth not that it is for his life.", "Hearken unto me now therefore, O ye children, and attend to the words of my mouth.", "Let not thine heart decline to her ways, go not astray in her paths.", "For she hath cast down many wounded: yea, many strong men have been slain by her.", "Her house is the way to hell, going down to the chambers of death."] }, { chapter: 8, verses: ["Doth not wisdom cry? and understanding put forth her voice?", "She standeth in the top of high places, by the way in the places of the paths.", "She crieth at the gates, at the entry of the city, at the coming in at the doors.", "Unto you, O men, I call; and my voice is to the sons of man.", "O ye simple, understand wisdom: and, ye fools, be ye of an understanding heart.", "Hear; for I will speak of excellent things; and the opening of my lips shall be right things.", "For my mouth shall speak truth; and wickedness is an abomination to my lips.", "All the words of my mouth are in righteousness; there is nothing froward or perverse in them.", "They are all plain to him that understandeth, and right to them that find knowledge.", "Receive my instruction, and not silver; and knowledge rather than choice gold.", "For wisdom is better than rubies; and all the things that may be desired are not to be compared to it.", "I wisdom dwell with prudence, and find out knowledge of witty inventions.", "The fear of the LORD is to hate evil: pride, and arrogancy, and the evil way, and the froward mouth, do I hate.", "Counsel is mine, and sound wisdom: I am understanding; I have strength.", "By me kings reign, and princes decree justice.", "By me princes rule, and nobles, even all the judges of the earth.", "I love them that love me; and those that seek me early shall find me.", "Riches and honour are with me; yea, durable riches and righteousness.", "My fruit is better than gold, yea, than fine gold; and my revenue than choice silver.", "I lead in the way of righteousness, in the midst of the paths of judgment:", "That I may cause those that love me to inherit substance; and I will fill their treasures.", "The LORD possessed me in the beginning of his way, before his works of old.", "I was set up from everlasting, from the beginning, or ever the earth was.", "When there were no depths, I was brought forth; when there were no fountains abounding with water.", "Before the mountains were settled, before the hills was I brought forth:", "While as yet he had not made the earth, nor the fields, nor the highest part of the dust of the world.", "When he prepared the heavens, I was there: when he set a compass upon the face of the depth:", "When he established the clouds above: when he strengthened the fountains of the deep:", "When he gave to the sea his decree, that the waters should not pass his commandment: when he appointed the foundations of the earth:", "Then I was by him, as one brought up with him: and I was daily his delight, rejoicing always before him;", "Rejoicing in the habitable part of his earth; and my delights were with the sons of men.", "Now therefore hearken unto me, O ye children: for blessed are they that keep my ways.", "Hear instruction, and be wise, and refuse it not.", "Blessed is the man that heareth me, watching daily at my gates, waiting at the posts of my doors.", "For whoso findeth me findeth life, and shall obtain favour of the LORD.", "But he that sinneth against me wrongeth his own soul: all they that hate me love death."] }, { chapter: 9, verses: ["Wisdom hath builded her house, she hath hewn out her seven pillars:", "She hath killed her beasts; she hath mingled her wine; she hath also furnished her table.", "She hath sent forth her maidens: she crieth upon the highest places of the city,", "Whoso is simple, let him turn in hither: as for him that wanteth understanding, she saith to him,", "Come, eat of my bread, and drink of the wine which I have mingled.", "Forsake the foolish, and live; and go in the way of understanding.", "He that reproveth a scorner getteth to himself shame: and he that rebuketh a wicked man getteth himself a blot.", "Reprove not a scorner, lest he hate thee: rebuke a wise man, and he will love thee.", "Give instruction to a wise man, and he will be yet wiser: teach a just man, and he will increase in learning.", "The fear of the LORD is the beginning of wisdom: and the knowledge of the holy is understanding.", "For by me thy days shall be multiplied, and the years of thy life shall be increased.", "If thou be wise, thou shalt be wise for thyself: but if thou scornest, thou alone shalt bear it.", "A foolish woman is clamorous: she is simple, and knoweth nothing.", "For she sitteth at the door of her house, on a seat in the high places of the city,", "To call passengers who go right on their ways:", "Whoso is simple, let him turn in hither: and as for him that wanteth understanding, she saith to him,", "Stolen waters are sweet, and bread eaten in secret is pleasant.", "But he knoweth not that the dead are there; and that her guests are in the depths of hell."] }, { chapter: 10, verses: ["The proverbs of Solomon. A wise son maketh a glad father: but a foolish son is the heaviness of his mother.", "Treasures of wickedness profit nothing: but righteousness delivereth from death.", "The LORD will not suffer the soul of the righteous to famish: but he casteth away the substance of the wicked.", "He becometh poor that dealeth with a slack hand: but the hand of the diligent maketh rich.", "He that gathereth in summer is a wise son: but he that sleepeth in harvest is a son that causeth shame.", "Blessings are upon the head of the just: but violence covereth the mouth of the wicked.", "The memory of the just is blessed: but the name of the wicked shall rot.", "The wise in heart will receive commandments: but a prating fool shall fall.", "He that walketh uprightly walketh surely: but he that perverteth his ways shall be known.", "He that winketh with the eye causeth sorrow: but a prating fool shall fall.", "The mouth of a righteous man is a well of life: but violence covereth the mouth of the wicked.", "Hatred stirreth up strifes: but love covereth all sins.", "In the lips of him that hath understanding wisdom is found: but a rod is for the back of him that is void of understanding.", "Wise men lay up knowledge: but the mouth of the foolish is near destruction.", "The rich man\u2019s wealth is his strong city: the destruction of the poor is their poverty.", "The labour of the righteous tendeth to life: the fruit of the wicked to sin.", "He is in the way of life that keepeth instruction: but he that refuseth reproof erreth.", "He that hideth hatred with lying lips, and he that uttereth a slander, is a fool.", "In the multitude of words there wanteth not sin: but he that refraineth his lips is wise.", "The tongue of the just is as choice silver: the heart of the wicked is little worth.", "The lips of the righteous feed many: but fools die for want of wisdom.", "The blessing of the LORD, it maketh rich, and he addeth no sorrow with it.", "It is as sport to a fool to do mischief: but a man of understanding hath wisdom.", "The fear of the wicked, it shall come upon him: but the desire of the righteous shall be granted.", "As the whirlwind passeth, so is the wicked no more: but the righteous is an everlasting foundation.", "As vinegar to the teeth, and as smoke to the eyes, so is the sluggard to them that send him.", "The fear of the LORD prolongeth days: but the years of the wicked shall be shortened.", "The hope of the righteous shall be gladness: but the expectation of the wicked shall perish.", "The way of the LORD is strength to the upright: but destruction shall be to the workers of iniquity.", "The righteous shall never be removed: but the wicked shall not inhabit the earth.", "The mouth of the just bringeth forth wisdom: but the froward tongue shall be cut out.", "The lips of the righteous know what is acceptable: but the mouth of the wicked speaketh frowardness."] }, { chapter: 11, verses: ["A false balance is abomination to the LORD: but a just weight is his delight.", "When pride cometh, then cometh shame: but with the lowly is wisdom.", "The integrity of the upright shall guide them: but the perverseness of transgressors shall destroy them.", "Riches profit not in the day of wrath: but righteousness delivereth from death.", "The righteousness of the perfect shall direct his way: but the wicked shall fall by his own wickedness.", "The righteousness of the upright shall deliver them: but transgressors shall be taken in their own naughtiness.", "When a wicked man dieth, his expectation shall perish: and the hope of unjust men perisheth.", "The righteous is delivered out of trouble, and the wicked cometh in his stead.", "An hypocrite with his mouth destroyeth his neighbour: but through knowledge shall the just be delivered.", "When it goeth well with the righteous, the city rejoiceth: and when the wicked perish, there is shouting.", "By the blessing of the upright the city is exalted: but it is overthrown by the mouth of the wicked.", "He that is void of wisdom despiseth his neighbour: but a man of understanding holdeth his peace.", "A talebearer revealeth secrets: but he that is of a faithful spirit concealeth the matter.", "Where no counsel is, the people fall: but in the multitude of counsellors there is safety.", "He that is surety for a stranger shall smart for it: and he that hateth suretiship is sure.", "A gracious woman retaineth honour: and strong men retain riches.", "The merciful man doeth good to his own soul: but he that is cruel troubleth his own flesh.", "The wicked worketh a deceitful work: but to him that soweth righteousness shall be a sure reward.", "As righteousness tendeth to life: so he that pursueth evil pursueth it to his own death.", "They that are of a froward heart are abomination to the LORD: but such as are upright in their way are his delight.", "Though hand join in hand, the wicked shall not be unpunished: but the seed of the righteous shall be delivered.", "As a jewel of gold in a swine\u2019s snout, so is a fair woman which is without discretion.", "The desire of the righteous is only good: but the expectation of the wicked is wrath.", "There is that scattereth, and yet increaseth; and there is that withholdeth more than is meet, but it tendeth to poverty.", "The liberal soul shall be made fat: and he that watereth shall be watered also himself.", "He that withholdeth corn, the people shall curse him: but blessing shall be upon the head of him that selleth it.", "He that diligently seeketh good procureth favour: but he that seeketh mischief, it shall come unto him.", "He that trusteth in his riches shall fall; but the righteous shall flourish as a branch.", "He that troubleth his own house shall inherit the wind: and the fool shall be servant to the wise of heart.", "The fruit of the righteous is a tree of life; and he that winneth souls is wise.", "Behold, the righteous shall be recompensed in the earth: much more the wicked and the sinner."] }, { chapter: 12, verses: ["Whoso loveth instruction loveth knowledge: but he that hateth reproof is brutish.", "A good man obtaineth favour of the LORD: but a man of wicked devices will he condemn.", "A man shall not be established by wickedness: but the root of the righteous shall not be moved.", "A virtuous woman is a crown to her husband: but she that maketh ashamed is as rottenness in his bones.", "The thoughts of the righteous are right: but the counsels of the wicked are deceit.", "The words of the wicked are to lie in wait for blood: but the mouth of the upright shall deliver them.", "The wicked are overthrown, and are not: but the house of the righteous shall stand.", "A man shall be commended according to his wisdom: but he that is of a perverse heart shall be despised.", "He that is despised, and hath a servant, is better than he that honoureth himself, and lacketh bread.", "A righteous man regardeth the life of his beast: but the tender mercies of the wicked are cruel.", "He that tilleth his land shall be satisfied with bread: but he that followeth vain persons is void of understanding.", "The wicked desireth the net of evil men: but the root of the righteous yieldeth fruit.", "The wicked is snared by the transgression of his lips: but the just shall come out of trouble.", "A man shall be satisfied with good by the fruit of his mouth: and the recompence of a man\u2019s hands shall be rendered unto him.", "The way of a fool is right in his own eyes: but he that hearkeneth unto counsel is wise.", "A fool\u2019s wrath is presently known: but a prudent man covereth shame.", "He that speaketh truth sheweth forth righteousness: but a false witness deceit.", "There is that speaketh like the piercings of a sword: but the tongue of the wise is health.", "The lip of truth shall be established for ever: but a lying tongue is but for a moment.", "Deceit is in the heart of them that imagine evil: but to the counsellors of peace is joy.", "There shall no evil happen to the just: but the wicked shall be filled with mischief.", "Lying lips are abomination to the LORD: but they that deal truly are his delight.", "A prudent man concealeth knowledge: but the heart of fools proclaimeth foolishness.", "The hand of the diligent shall bear rule: but the slothful shall be under tribute.", "Heaviness in the heart of man maketh it stoop: but a good word maketh it glad.", "The righteous is more excellent than his neighbour: but the way of the wicked seduceth them.", "The slothful man roasteth not that which he took in hunting: but the substance of a diligent man is precious.", "In the way of righteousness is life: and in the pathway thereof there is no death."] }, { chapter: 13, verses: ["A wise son heareth his father\u2019s instruction: but a scorner heareth not rebuke.", "A man shall eat good by the fruit of his mouth: but the soul of the transgressors shall eat violence.", "He that keepeth his mouth keepeth his life: but he that openeth wide his lips shall have destruction.", "The soul of the sluggard desireth, and hath nothing: but the soul of the diligent shall be made fat.", "A righteous man hateth lying: but a wicked man is loathsome, and cometh to shame.", "Righteousness keepeth him that is upright in the way: but wickedness overthroweth the sinner.", "There is that maketh himself rich, yet hath nothing: there is that maketh himself poor, yet hath great riches.", "The ransom of a man\u2019s life are his riches: but the poor heareth not rebuke.", "The light of the righteous rejoiceth: but the lamp of the wicked shall be put out.", "Only by pride cometh contention: but with the well advised is wisdom.", "Wealth gotten by vanity shall be diminished: but he that gathereth by labour shall increase.", "Hope deferred maketh the heart sick: but when the desire cometh, it is a tree of life.", "Whoso despiseth the word shall be destroyed: but he that feareth the commandment shall be rewarded.", "The law of the wise is a fountain of life, to depart from the snares of death.", "Good understanding giveth favour: but the way of transgressors is hard.", "Every prudent man dealeth with knowledge: but a fool layeth open his folly.", "A wicked messenger falleth into mischief: but a faithful ambassador is health.", "Poverty and shame shall be to him that refuseth instruction: but he that regardeth reproof shall be honoured.", "The desire accomplished is sweet to the soul: but it is abomination to fools to depart from evil.", "He that walketh with wise men shall be wise: but a companion of fools shall be destroyed.", "Evil pursueth sinners: but to the righteous good shall be repayed.", "A good man leaveth an inheritance to his children\u2019s children: and the wealth of the sinner is laid up for the just.", "Much food is in the tillage of the poor: but there is that is destroyed for want of judgment.", "He that spareth his rod hateth his son: but he that loveth him chasteneth him betimes.", "The righteous eateth to the satisfying of his soul: but the belly of the wicked shall want."] }, { chapter: 14, verses: ["Every wise woman buildeth her house: but the foolish plucketh it down with her hands.", "He that walketh in his uprightness feareth the LORD: but he that is perverse in his ways despiseth him.", "In the mouth of the foolish is a rod of pride: but the lips of the wise shall preserve them.", "Where no oxen are, the crib is clean: but much increase is by the strength of the ox.", "A faithful witness will not lie: but a false witness will utter lies.", "A scorner seeketh wisdom, and findeth it not: but knowledge is easy unto him that understandeth.", "Go from the presence of a foolish man, when thou perceivest not in him the lips of knowledge.", "The wisdom of the prudent is to understand his way: but the folly of fools is deceit.", "Fools make a mock at sin: but among the righteous there is favour.", "The heart knoweth his own bitterness; and a stranger doth not intermeddle with his joy.", "The house of the wicked shall be overthrown: but the tabernacle of the upright shall flourish.", "There is a way which seemeth right unto a man, but the end thereof are the ways of death.", "Even in laughter the heart is sorrowful; and the end of that mirth is heaviness.", "The backslider in heart shall be filled with his own ways: and a good man shall be satisfied from himself.", "The simple believeth every word: but the prudent man looketh well to his going.", "A wise man feareth, and departeth from evil: but the fool rageth, and is confident.", "He that is soon angry dealeth foolishly: and a man of wicked devices is hated.", "The simple inherit folly: but the prudent are crowned with knowledge.", "The evil bow before the good; and the wicked at the gates of the righteous.", "The poor is hated even of his own neighbour: but the rich hath many friends.", "He that despiseth his neighbour sinneth: but he that hath mercy on the poor, happy is he.", "Do they not err that devise evil? but mercy and truth shall be to them that devise good.", "In all labour there is profit: but the talk of the lips tendeth only to penury.", "The crown of the wise is their riches: but the foolishness of fools is folly.", "A true witness delivereth souls: but a deceitful witness speaketh lies.", "In the fear of the LORD is strong confidence: and his children shall have a place of refuge.", "The fear of the LORD is a fountain of life, to depart from the snares of death.", "In the multitude of people is the king\u2019s honour: but in the want of people is the destruction of the prince.", "He that is slow to wrath is of great understanding: but he that is hasty of spirit exalteth folly.", "A sound heart is the life of the flesh: but envy the rottenness of the bones.", "He that oppresseth the poor reproacheth his Maker: but he that honoureth him hath mercy on the poor.", "The wicked is driven away in his wickedness: but the righteous hath hope in his death.", "Wisdom resteth in the heart of him that hath understanding: but that which is in the midst of fools is made known.", "Righteousness exalteth a nation: but sin is a reproach to any people.", "The king\u2019s favour is toward a wise servant: but his wrath is against him that causeth shame."] }, { chapter: 15, verses: ["A soft answer turneth away wrath: but grievous words stir up anger.", "The tongue of the wise useth knowledge aright: but the mouth of fools poureth out foolishness.", "The eyes of the LORD are in every place, beholding the evil and the good.", "A wholesome tongue is a tree of life: but perverseness therein is a breach in the spirit.", "A fool despiseth his father\u2019s instruction: but he that regardeth reproof is prudent.", "In the house of the righteous is much treasure: but in the revenues of the wicked is trouble.", "The lips of the wise disperse knowledge: but the heart of the foolish doeth not so.", "The sacrifice of the wicked is an abomination to the LORD: but the prayer of the upright is his delight.", "The way of the wicked is an abomination unto the LORD: but he loveth him that followeth after righteousness.", "Correction is grievous unto him that forsaketh the way: and he that hateth reproof shall die.", "Hell and destruction are before the LORD: how much more then the hearts of the children of men?", "A scorner loveth not one that reproveth him: neither will he go unto the wise.", "A merry heart maketh a cheerful countenance: but by sorrow of the heart the spirit is broken.", "The heart of him that hath understanding seeketh knowledge: but the mouth of fools feedeth on foolishness.", "All the days of the afflicted are evil: but he that is of a merry heart hath a continual feast.", "Better is little with the fear of the LORD than great treasure and trouble therewith.", "Better is a dinner of herbs where love is, than a stalled ox and hatred therewith.", "A wrathful man stirreth up strife: but he that is slow to anger appeaseth strife.", "The way of the slothful man is as an hedge of thorns: but the way of the righteous is made plain.", "A wise son maketh a glad father: but a foolish man despiseth his mother.", "Folly is joy to him that is destitute of wisdom: but a man of understanding walketh uprightly.", "Without counsel purposes are disappointed: but in the multitude of counsellors they are established.", "A man hath joy by the answer of his mouth: and a word spoken in due season, how good is it!", "The way of life is above to the wise, that he may depart from hell beneath.", "The LORD will destroy the house of the proud: but he will establish the border of the widow.", "The thoughts of the wicked are an abomination to the LORD: but the words of the pure are pleasant words.", "He that is greedy of gain troubleth his own house; but he that hateth gifts shall live.", "The heart of the righteous studieth to answer: but the mouth of the wicked poureth out evil things.", "The LORD is far from the wicked: but he heareth the prayer of the righteous.", "The light of the eyes rejoiceth the heart: and a good report maketh the bones fat.", "The ear that heareth the reproof of life abideth among the wise.", "He that refuseth instruction despiseth his own soul: but he that heareth reproof getteth understanding.", "The fear of the LORD is the instruction of wisdom; and before honour is humility."] }, { chapter: 16, verses: ["The preparations of the heart in man, and the answer of the tongue, is from the LORD.", "All the ways of a man are clean in his own eyes; but the LORD weigheth the spirits.", "Commit thy works unto the LORD, and thy thoughts shall be established.", "The LORD hath made all things for himself: yea, even the wicked for the day of evil.", "Every one that is proud in heart is an abomination to the LORD: though hand join in hand, he shall not be unpunished.", "By mercy and truth iniquity is purged: and by the fear of the LORD men depart from evil.", "When a man\u2019s ways please the LORD, he maketh even his enemies to be at peace with him.", "Better is a little with righteousness than great revenues without right.", "A man\u2019s heart deviseth his way: but the LORD directeth his steps.", "A divine sentence is in the lips of the king: his mouth transgresseth not in judgment.", "A just weight and balance are the LORD\u2019s: all the weights of the bag are his work.", "It is an abomination to kings to commit wickedness: for the throne is established by righteousness.", "Righteous lips are the delight of kings; and they love him that speaketh right.", "The wrath of a king is as messengers of death: but a wise man will pacify it.", "In the light of the king\u2019s countenance is life; and his favour is as a cloud of the latter rain.", "How much better is it to get wisdom than gold! and to get understanding rather to be chosen than silver!", "The highway of the upright is to depart from evil: he that keepeth his way preserveth his soul.", "Pride goeth before destruction, and an haughty spirit before a fall.", "Better it is to be of an humble spirit with the lowly, than to divide the spoil with the proud.", "He that handleth a matter wisely shall find good: and whoso trusteth in the LORD, happy is he.", "The wise in heart shall be called prudent: and the sweetness of the lips increaseth learning.", "Understanding is a wellspring of life unto him that hath it: but the instruction of fools is folly.", "The heart of the wise teacheth his mouth, and addeth learning to his lips.", "Pleasant words are as an honeycomb, sweet to the soul, and health to the bones.", "There is a way that seemeth right unto a man, but the end thereof are the ways of death.", "He that laboureth laboureth for himself; for his mouth craveth it of him.", "An ungodly man diggeth up evil: and in his lips there is as a burning fire.", "A froward man soweth strife: and a whisperer separateth chief friends.", "A violent man enticeth his neighbour, and leadeth him into the way that is not good.", "He shutteth his eyes to devise froward things: moving his lips he bringeth evil to pass.", "The hoary head is a crown of glory, if it be found in the way of righteousness.", "He that is slow to anger is better than the mighty; and he that ruleth his spirit than he that taketh a city.", "The lot is cast into the lap; but the whole disposing thereof is of the LORD."] }, { chapter: 17, verses: ["Better is a dry morsel, and quietness therewith, than an house full of sacrifices with strife.", "A wise servant shall have rule over a son that causeth shame, and shall have part of the inheritance among the brethren.", "The fining pot is for silver, and the furnace for gold: but the LORD trieth the hearts.", "A wicked doer giveth heed to false lips; and a liar giveth ear to a naughty tongue.", "Whoso mocketh the poor reproacheth his Maker: and he that is glad at calamities shall not be unpunished.", "Children\u2019s children are the crown of old men; and the glory of children are their fathers.", "Excellent speech becometh not a fool: much less do lying lips a prince.", "A gift is as a precious stone in the eyes of him that hath it: whithersoever it turneth, it prospereth.", "He that covereth a transgression seeketh love; but he that repeateth a matter separateth very friends.", "A reproof entereth more into a wise man than an hundred stripes into a fool.", "An evil man seeketh only rebellion: therefore a cruel messenger shall be sent against him.", "Let a bear robbed of her whelps meet a man, rather than a fool in his folly.", "Whoso rewardeth evil for good, evil shall not depart from his house.", "The beginning of strife is as when one letteth out water: therefore leave off contention, before it be meddled with.", "He that justifieth the wicked, and he that condemneth the just, even they both are abomination to the LORD.", "Wherefore is there a price in the hand of a fool to get wisdom, seeing he hath no heart to it?", "A friend loveth at all times, and a brother is born for adversity.", "A man void of understanding striketh hands, and becometh surety in the presence of his friend.", "He loveth transgression that loveth strife: and he that exalteth his gate seeketh destruction.", "He that hath a froward heart findeth no good: and he that hath a perverse tongue falleth into mischief.", "He that begetteth a fool doeth it to his sorrow: and the father of a fool hath no joy.", "A merry heart doeth good like a medicine: but a broken spirit drieth the bones.", "A wicked man taketh a gift out of the bosom to pervert the ways of judgment.", "Wisdom is before him that hath understanding; but the eyes of a fool are in the ends of the earth.", "A foolish son is a grief to his father, and bitterness to her that bare him.", "Also to punish the just is not good, nor to strike princes for equity.", "He that hath knowledge spareth his words: and a man of understanding is of an excellent spirit.", "Even a fool, when he holdeth his peace, is counted wise: and he that shutteth his lips is esteemed a man of understanding."] }, { chapter: 18, verses: ["Through desire a man, having separated himself, seeketh and intermeddleth with all wisdom.", "A fool hath no delight in understanding, but that his heart may discover itself.", "When the wicked cometh, then cometh also contempt, and with ignominy reproach.", "The words of a man\u2019s mouth are as deep waters, and the wellspring of wisdom as a flowing brook.", "It is not good to accept the person of the wicked, to overthrow the righteous in judgment.", "A fool\u2019s lips enter into contention, and his mouth calleth for strokes.", "A fool\u2019s mouth is his destruction, and his lips are the snare of his soul.", "The words of a talebearer are as wounds, and they go down into the innermost parts of the belly.", "He also that is slothful in his work is brother to him that is a great waster.", "The name of the LORD is a strong tower: the righteous runneth into it, and is safe.", "The rich man\u2019s wealth is his strong city, and as an high wall in his own conceit.", "Before destruction the heart of man is haughty, and before honour is humility.", "He that answereth a matter before he heareth it, it is folly and shame unto him.", "The spirit of a man will sustain his infirmity; but a wounded spirit who can bear?", "The heart of the prudent getteth knowledge; and the ear of the wise seeketh knowledge.", "A man\u2019s gift maketh room for him, and bringeth him before great men.", "He that is first in his own cause seemeth just; but his neighbour cometh and searcheth him.", "The lot causeth contentions to cease, and parteth between the mighty.", "A brother offended is harder to be won than a strong city: and their contentions are like the bars of a castle.", "A man\u2019s belly shall be satisfied with the fruit of his mouth; and with the increase of his lips shall he be filled.", "Death and life are in the power of the tongue: and they that love it shall eat the fruit thereof.", "Whoso findeth a wife findeth a good thing, and obtaineth favour of the LORD.", "The poor useth intreaties; but the rich answereth roughly.", "A man that hath friends must shew himself friendly: and there is a friend that sticketh closer than a brother."] }, { chapter: 19, verses: ["Better is the poor that walketh in his integrity, than he that is perverse in his lips, and is a fool.", "Also, that the soul be without knowledge, it is not good; and he that hasteth with his feet sinneth.", "The foolishness of man perverteth his way: and his heart fretteth against the LORD.", "Wealth maketh many friends; but the poor is separated from his neighbour.", "A false witness shall not be unpunished, and he that speaketh lies shall not escape.", "Many will intreat the favour of the prince: and every man is a friend to him that giveth gifts.", "All the brethren of the poor do hate him: how much more do his friends go far from him? he pursueth them with words, yet they are wanting to him.", "He that getteth wisdom loveth his own soul: he that keepeth understanding shall find good.", "A false witness shall not be unpunished, and he that speaketh lies shall perish.", "Delight is not seemly for a fool; much less for a servant to have rule over princes.", "The discretion of a man deferreth his anger; and it is his glory to pass over a transgression.", "The king\u2019s wrath is as the roaring of a lion; but his favour is as dew upon the grass.", "A foolish son is the calamity of his father: and the contentions of a wife are a continual dropping.", "House and riches are the inheritance of fathers: and a prudent wife is from the LORD.", "Slothfulness casteth into a deep sleep; and an idle soul shall suffer hunger.", "He that keepeth the commandment keepeth his own soul; but he that despiseth his ways shall die.", "He that hath pity upon the poor lendeth unto the LORD; and that which he hath given will he pay him again.", "Chasten thy son while there is hope, and let not thy soul spare for his crying.", "A man of great wrath shall suffer punishment: for if thou deliver him, yet thou must do it again.", "Hear counsel, and receive instruction, that thou mayest be wise in thy latter end.", "There are many devices in a man\u2019s heart; nevertheless the counsel of the LORD, that shall stand.", "The desire of a man is his kindness: and a poor man is better than a liar.", "The fear of the LORD tendeth to life: and he that hath it shall abide satisfied; he shall not be visited with evil.", "A slothful man hideth his hand in his bosom, and will not so much as bring it to his mouth again.", "Smite a scorner, and the simple will beware: and reprove one that hath understanding, and he will understand knowledge.", "He that wasteth his father, and chaseth away his mother, is a son that causeth shame, and bringeth reproach.", "Cease, my son, to hear the instruction that causeth to err from the words of knowledge.", "An ungodly witness scorneth judgment: and the mouth of the wicked devoureth iniquity.", "Judgments are prepared for scorners, and stripes for the back of fools."] }, { chapter: 20, verses: ["Wine is a mocker, strong drink is raging: and whosoever is deceived thereby is not wise.", "The fear of a king is as the roaring of a lion: whoso provoketh him to anger sinneth against his own soul.", "It is an honour for a man to cease from strife: but every fool will be meddling.", "The sluggard will not plow by reason of the cold; therefore shall he beg in harvest, and have nothing.", "Counsel in the heart of man is like deep water; but a man of understanding will draw it out.", "Most men will proclaim every one his own goodness: but a faithful man who can find?", "The just man walketh in his integrity: his children are blessed after him.", "A king that sitteth in the throne of judgment scattereth away all evil with his eyes.", "Who can say, I have made my heart clean, I am pure from my sin?", "Divers weights, and divers measures, both of them are alike abomination to the LORD.", "Even a child is known by his doings, whether his work be pure, and whether it be right.", "The hearing ear, and the seeing eye, the LORD hath made even both of them.", "Love not sleep, lest thou come to poverty; open thine eyes, and thou shalt be satisfied with bread.", "It is naught, it is naught, saith the buyer: but when he is gone his way, then he boasteth.", "There is gold, and a multitude of rubies: but the lips of knowledge are a precious jewel.", "Take his garment that is surety for a stranger: and take a pledge of him for a strange woman.", "Bread of deceit is sweet to a man; but afterwards his mouth shall be filled with gravel.", "Every purpose is established by counsel: and with good advice make war.", "He that goeth about as a talebearer revealeth secrets: therefore meddle not with him that flattereth with his lips.", "Whoso curseth his father or his mother, his lamp shall be put out in obscure darkness.", "An inheritance may be gotten hastily at the beginning; but the end thereof shall not be blessed.", "Say not thou, I will recompense evil; but wait on the LORD, and he shall save thee.", "Divers weights are an abomination unto the LORD; and a false balance is not good.", "Man\u2019s goings are of the LORD; how can a man then understand his own way?", "It is a snare to the man who devoureth that which is holy, and after vows to make enquiry.", "A wise king scattereth the wicked, and bringeth the wheel over them.", "The spirit of man is the candle of the LORD, searching all the inward parts of the belly.", "Mercy and truth preserve the king: and his throne is upholden by mercy.", "The glory of young men is their strength: and the beauty of old men is the grey head.", "The blueness of a wound cleanseth away evil: so do stripes the inward parts of the belly."] }, { chapter: 21, verses: ["The king\u2019s heart is in the hand of the LORD, as the rivers of water: he turneth it whithersoever he will.", "Every way of a man is right in his own eyes: but the LORD pondereth the hearts.", "To do justice and judgment is more acceptable to the LORD than sacrifice.", "An high look, and a proud heart, and the plowing of the wicked, is sin.", "The thoughts of the diligent tend only to plenteousness; but of every one that is hasty only to want.", "The getting of treasures by a lying tongue is a vanity tossed to and fro of them that seek death.", "The robbery of the wicked shall destroy them; because they refuse to do judgment.", "The way of man is froward and strange: but as for the pure, his work is right.", "It is better to dwell in a corner of the housetop, than with a brawling woman in a wide house.", "The soul of the wicked desireth evil: his neighbour findeth no favour in his eyes.", "When the scorner is punished, the simple is made wise: and when the wise is instructed, he receiveth knowledge.", "The righteous man wisely considereth the house of the wicked: but God overthroweth the wicked for their wickedness.", "Whoso stoppeth his ears at the cry of the poor, he also shall cry himself, but shall not be heard.", "A gift in secret pacifieth anger: and a reward in the bosom strong wrath.", "It is joy to the just to do judgment: but destruction shall be to the workers of iniquity.", "The man that wandereth out of the way of understanding shall remain in the congregation of the dead.", "He that loveth pleasure shall be a poor man: he that loveth wine and oil shall not be rich.", "The wicked shall be a ransom for the righteous, and the transgressor for the upright.", "It is better to dwell in the wilderness, than with a contentious and an angry woman.", "There is treasure to be desired and oil in the dwelling of the wise; but a foolish man spendeth it up.", "He that followeth after righteousness and mercy findeth life, righteousness, and honour.", "A wise man scaleth the city of the mighty, and casteth down the strength of the confidence thereof.", "Whoso keepeth his mouth and his tongue keepeth his soul from troubles.", "Proud and haughty scorner is his name, who dealeth in proud wrath.", "The desire of the slothful killeth him; for his hands refuse to labour.", "He coveteth greedily all the day long: but the righteous giveth and spareth not.", "The sacrifice of the wicked is abomination: how much more, when he bringeth it with a wicked mind?", "A false witness shall perish: but the man that heareth speaketh constantly.", "A wicked man hardeneth his face: but as for the upright, he directeth his way.", "There is no wisdom nor understanding nor counsel against the LORD.", "The horse is prepared against the day of battle: but safety is of the LORD."] }, { chapter: 22, verses: ["A GOOD name is rather to be chosen than great riches, and loving favour rather than silver and gold.", "The rich and poor meet together: the LORD is the maker of them all.", "A prudent man foreseeth the evil, and hideth himself: but the simple pass on, and are punished.", "By humility and the fear of the LORD are riches, and honour, and life.", "Thorns and snares are in the way of the froward: he that doth keep his soul shall be far from them.", "Train up a child in the way he should go: and when he is old, he will not depart from it.", "The rich ruleth over the poor, and the borrower is servant to the lender.", "He that soweth iniquity shall reap vanity: and the rod of his anger shall fail.", "He that hath a bountiful eye shall be blessed; for he giveth of his bread to the poor.", "Cast out the scorner, and contention shall go out; yea, strife and reproach shall cease.", "He that loveth pureness of heart, for the grace of his lips the king shall be his friend.", "The eyes of the LORD preserve knowledge, and he overthroweth the words of the transgressor.", "The slothful man saith, There is a lion without, I shall be slain in the streets.", "The mouth of strange women is a deep pit: he that is abhorred of the LORD shall fall therein.", "Foolishness is bound in the heart of a child; but the rod of correction shall drive it far from him.", "He that oppresseth the poor to increase his riches, and he that giveth to the rich, shall surely come to want.", "Bow down thine ear, and hear the words of the wise, and apply thine heart unto my knowledge.", "For it is a pleasant thing if thou keep them within thee; they shall withal be fitted in thy lips.", "That thy trust may be in the LORD, I have made known to thee this day, even to thee.", "Have not I written to thee excellent things in counsels and knowledge,", "That I might make thee know the certainty of the words of truth; that thou mightest answer the words of truth to them that send unto thee?", "Rob not the poor, because he is poor: neither oppress the afflicted in the gate:", "For the LORD will plead their cause, and spoil the soul of those that spoiled them.", "Make no friendship with an angry man; and with a furious man thou shalt not go:", "Lest thou learn his ways, and get a snare to thy soul.", "Be not thou one of them that strike hands, or of them that are sureties for debts.", "If thou hast nothing to pay, why should he take away thy bed from under thee?", "Remove not the ancient landmark, which thy fathers have set.", "Seest thou a man diligent in his business? he shall stand before kings; he shall not stand before mean men."] }, { chapter: 23, verses: ["When thou sittest to eat with a ruler, consider diligently what is before thee:", "And put a knife to thy throat, if thou be a man given to appetite.", "Be not desirous of his dainties: for they are deceitful meat.", "Labour not to be rich: cease from thine own wisdom.", "Wilt thou set thine eyes upon that which is not? for riches certainly make themselves wings; they fly away as an eagle toward heaven.", "Eat thou not the bread of him that hath an evil eye, neither desire thou his dainty meats:", "For as he thinketh in his heart, so is he: Eat and drink, saith he to thee; but his heart is not with thee.", "The morsel which thou hast eaten shalt thou vomit up, and lose thy sweet words.", "Speak not in the ears of a fool: for he will despise the wisdom of thy words.", "Remove not the old landmark; and enter not into the fields of the fatherless:", "For their redeemer is mighty; he shall plead their cause with thee.", "Apply thine heart unto instruction, and thine ears to the words of knowledge.", "Withhold not correction from the child: for if thou beatest him with the rod, he shall not die.", "Thou shalt beat him with the rod, and shalt deliver his soul from hell.", "My son, if thine heart be wise, my heart shall rejoice, even mine.", "Yea, my reins shall rejoice, when thy lips speak right things.", "Let not thine heart envy sinners: but be thou in the fear of the LORD all the day long.", "For surely there is an end; and thine expectation shall not be cut off.", "Hear thou, my son, and be wise, and guide thine heart in the way.", "Be not among winebibbers; among riotous eaters of flesh:", "For the drunkard and the glutton shall come to poverty: and drowsiness shall clothe a man with rags.", "Hearken unto thy father that begat thee, and despise not thy mother when she is old.", "Buy the truth, and sell it not; also wisdom, and instruction, and understanding.", "The father of the righteous shall greatly rejoice: and he that begetteth a wise child shall have joy of him.", "Thy father and thy mother shall be glad, and she that bare thee shall rejoice.", "My son, give me thine heart, and let thine eyes observe my ways.", "For a whore is a deep ditch; and a strange woman is a narrow pit.", "She also lieth in wait as for a prey, and increaseth the transgressors among men.", "Who hath woe? who hath sorrow? who hath contentions? who hath babbling? who hath wounds without cause? who hath redness of eyes?", "They that tarry long at the wine; they that go to seek mixed wine.", "Look not thou upon the wine when it is red, when it giveth his colour in the cup, when it moveth itself aright.", "At the last it biteth like a serpent, and stingeth like an adder.", "Thine eyes shall behold strange women, and thine heart shall utter perverse things.", "Yea, thou shalt be as he that lieth down in the midst of the sea, or as he that lieth upon the top of a mast.", "They have stricken me, shalt thou say, and I was not sick; they have beaten me, and I felt it not: when shall I awake? I will seek it yet again."] }, { chapter: 24, verses: ["Be not thou envious against evil men, neither desire to be with them.", "For their heart studieth destruction, and their lips talk of mischief.", "Through wisdom is an house builded; and by understanding it is established:", "And by knowledge shall the chambers be filled with all precious and pleasant riches.", "A wise man is strong; yea, a man of knowledge increaseth strength.", "For by wise counsel thou shalt make thy war: and in multitude of counsellors there is safety.", "Wisdom is too high for a fool: he openeth not his mouth in the gate.", "He that deviseth to do evil shall be called a mischievous person.", "The thought of foolishness is sin: and the scorner is an abomination to men.", "If thou faint in the day of adversity, thy strength is small.", "If thou forbear to deliver them that are drawn unto death, and those that are ready to be slain;", "If thou sayest, Behold, we knew it not; doth not he that pondereth the heart consider it? and he that keepeth thy soul, doth not he know it? and shall not he render to every man according to his works?", "My son, eat thou honey, because it is good; and the honeycomb, which is sweet to thy taste:", "So shall the knowledge of wisdom be unto thy soul: when thou hast found it, then there shall be a reward, and thy expectation shall not be cut off.", "Lay not wait, O wicked man, against the dwelling of the righteous; spoil not his resting place:", "For a just man falleth seven times, and riseth up again: but the wicked shall fall into mischief.", "Rejoice not when thine enemy falleth, and let not thine heart be glad when he stumbleth:", "Lest the LORD see it, and it displease him, and he turn away his wrath from him.", "Fret not thyself because of evil men, neither be thou envious at the wicked;", "For there shall be no reward to the evil man; the candle of the wicked shall be put out.", "My son, fear thou the LORD and the king: and meddle not with them that are given to change:", "For their calamity shall rise suddenly; and who knoweth the ruin of them both?", "These things also belong to the wise. It is not good to have respect of persons in judgment.", "He that saith unto the wicked, Thou art righteous; him shall the people curse, nations shall abhor him:", "But to them that rebuke him shall be delight, and a good blessing shall come upon them.", "Every man shall kiss his lips that giveth a right answer.", "Prepare thy work without, and make it fit for thyself in the field; and afterwards build thine house.", "Be not a witness against thy neighbour without cause; and deceive not with thy lips.", "Say not, I will do so to him as he hath done to me: I will render to the man according to his work.", "I went by the field of the slothful, and by the vineyard of the man void of understanding;", "And, lo, it was all grown over with thorns, and nettles had covered the face thereof, and the stone wall thereof was broken down.", "Then I saw, and considered it well: I looked upon it, and received instruction.", "Yet a little sleep, a little slumber, a little folding of the hands to sleep:", "So shall thy poverty come as one that travelleth; and thy want as an armed man."] }, { chapter: 25, verses: ["These are also proverbs of Solomon, which the men of Hezekiah king of Judah copied out.", "It is the glory of God to conceal a thing: but the honour of kings is to search out a matter.", "The heaven for height, and the earth for depth, and the heart of kings is unsearchable.", "Take away the dross from the silver, and there shall come forth a vessel for the finer.", "Take away the wicked from before the king, and his throne shall be established in righteousness.", "Put not forth thyself in the presence of the king, and stand not in the place of great men:", "For better it is that it be said unto thee, Come up hither; than that thou shouldest be put lower in the presence of the prince whom thine eyes have seen.", "Go not forth hastily to strive, lest thou know not what to do in the end thereof, when thy neighbour hath put thee to shame.", "Debate thy cause with thy neighbour himself; and discover not a secret to another:", "Lest he that heareth it put thee to shame, and thine infamy turn not away.", "A word fitly spoken is like apples of gold in pictures of silver.", "As an earring of gold, and an ornament of fine gold, so is a wise reprover upon an obedient ear.", "As the cold of snow in the time of harvest, so is a faithful messenger to them that send him: for he refresheth the soul of his masters.", "Whoso boasteth himself of a false gift is like clouds and wind without rain.", "By long forbearing is a prince persuaded, and a soft tongue breaketh the bone.", "Hast thou found honey? eat so much as is sufficient for thee, lest thou be filled therewith, and vomit it.", "Withdraw thy foot from thy neighbour\u2019s house; lest he be weary of thee, and so hate thee.", "A man that beareth false witness against his neighbour is a maul, and a sword, and a sharp arrow.", "Confidence in an unfaithful man in time of trouble is like a broken tooth, and a foot out of joint.", "As he that taketh away a garment in cold weather, and as vinegar upon nitre, so is he that singeth songs to an heavy heart.", "If thine enemy be hungry, give him bread to eat; and if he be thirsty, give him water to drink:", "For thou shalt heap coals of fire upon his head, and the LORD shall reward thee.", "The north wind driveth away rain: so doth an angry countenance a backbiting tongue.", "It is better to dwell in the corner of the housetop, than with a brawling woman and in a wide house.", "As cold waters to a thirsty soul, so is good news from a far country.", "A righteous man falling down before the wicked is as a troubled fountain, and a corrupt spring.", "It is not good to eat much honey: so for men to search their own glory is not glory.", "He that hath no rule over his own spirit is like a city that is broken down, and without walls."] }, { chapter: 26, verses: ["As snow in summer, and as rain in harvest, so honour is not seemly for a fool.", "As the bird by wandering, as the swallow by flying, so the curse causeless shall not come.", "A whip for the horse, a bridle for the ass, and a rod for the fool\u2019s back.", "Answer not a fool according to his folly, lest thou also be like unto him.", "Answer a fool according to his folly, lest he be wise in his own conceit.", "He that sendeth a message by the hand of a fool cutteth off the feet, and drinketh damage.", "The legs of the lame are not equal: so is a parable in the mouth of fools.", "As he that bindeth a stone in a sling, so is he that giveth honour to a fool.", "As a thorn goeth up into the hand of a drunkard, so is a parable in the mouth of fools.", "The great God that formed all things both rewardeth the fool, and rewardeth transgressors.", "As a dog returneth to his vomit, so a fool returneth to his folly.", "Seest thou a man wise in his own conceit? there is more hope of a fool than of him.", "The slothful man saith, There is a lion in the way; a lion is in the streets.", "As the door turneth upon his hinges, so doth the slothful upon his bed.", "The slothful hideth his hand in his bosom; it grieveth him to bring it again to his mouth.", "The sluggard is wiser in his own conceit than seven men that can render a reason.", "He that passeth by, and meddleth with strife belonging not to him, is like one that taketh a dog by the ears.", "As a mad man who casteth firebrands, arrows, and death,", "So is the man that deceiveth his neighbour, and saith, Am not I in sport?", "Where no wood is, there the fire goeth out: so where there is no talebearer, the strife ceaseth.", "As coals are to burning coals, and wood to fire; so is a contentious man to kindle strife.", "The words of a talebearer are as wounds, and they go down into the innermost parts of the belly.", "Burning lips and a wicked heart are like a potsherd covered with silver dross.", "He that hateth dissembleth with his lips, and layeth up deceit within him;", "When he speaketh fair, believe him not: for there are seven abominations in his heart.", "Whose hatred is covered by deceit, his wickedness shall be shewed before the whole congregation.", "Whoso diggeth a pit shall fall therein: and he that rolleth a stone, it will return upon him.", "A lying tongue hateth those that are afflicted by it; and a flattering mouth worketh ruin."] }, { chapter: 27, verses: ["Boast not thyself of to morrow; for thou knowest not what a day may bring forth.", "Let another man praise thee, and not thine own mouth; a stranger, and not thine own lips.", "A stone is heavy, and the sand weighty; but a fool\u2019s wrath is heavier than them both.", "Wrath is cruel, and anger is outrageous; but who is able to stand before envy?", "Open rebuke is better than secret love.", "Faithful are the wounds of a friend; but the kisses of an enemy are deceitful.", "The full soul loatheth an honeycomb; but to the hungry soul every bitter thing is sweet.", "As a bird that wandereth from her nest, so is a man that wandereth from his place.", "Ointment and perfume rejoice the heart: so doth the sweetness of a man\u2019s friend by hearty counsel.", "Thine own friend, and thy father\u2019s friend, forsake not; neither go into thy brother\u2019s house in the day of thy calamity: for better is a neighbour that is near than a brother far off.", "My son, be wise, and make my heart glad, that I may answer him that reproacheth me.", "A prudent man foreseeth the evil, and hideth himself; but the simple pass on, and are punished.", "Take his garment that is surety for a stranger, and take a pledge of him for a strange woman.", "He that blesseth his friend with a loud voice, rising early in the morning, it shall be counted a curse to him.", "A continual dropping in a very rainy day and a contentious woman are alike.", "Whosoever hideth her hideth the wind, and the ointment of his right hand, which bewrayeth itself.", "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.", "Whoso keepeth the fig tree shall eat the fruit thereof: so he that waiteth on his master shall be honoured.", "As in water face answereth to face, so the heart of man to man.", "Hell and destruction are never full; so the eyes of man are never satisfied.", "As the fining pot for silver, and the furnace for gold; so is a man to his praise.", "Though thou shouldest bray a fool in a mortar among wheat with a pestle, yet will not his foolishness depart from him.", "Be thou diligent to know the state of thy flocks, and look well to thy herds.", "For riches are not for ever: and doth the crown endure to every generation?", "The hay appeareth, and the tender grass sheweth itself, and herbs of the mountains are gathered.", "The lambs are for thy clothing, and the goats are the price of the field.", "And thou shalt have goats\u2019 milk enough for thy food, for the food of thy household, and for the maintenance for thy maidens."] }, { chapter: 28, verses: ["The wicked flee when no man pursueth: but the righteous are bold as a lion.", "For the transgression of a land many are the princes thereof: but by a man of understanding and knowledge the state thereof shall be prolonged.", "A poor man that oppresseth the poor is like a sweeping rain which leaveth no food.", "They that forsake the law praise the wicked: but such as keep the law contend with them.", "Evil men understand not judgment: but they that seek the LORD understand all things.", "Better is the poor that walketh in his uprightness, than he that is perverse in his ways, though he be rich.", "Whoso keepeth the law is a wise son: but he that is a companion of riotous men shameth his father.", "He that by usury and unjust gain increaseth his substance, he shall gather it for him that will pity the poor.", "He that turneth away his ear from hearing the law, even his prayer shall be abomination.", "Whoso causeth the righteous to go astray in an evil way, he shall fall himself into his own pit: but the upright shall have good things in possession.", "The rich man is wise in his own conceit; but the poor that hath understanding searcheth him out.", "When righteous men do rejoice, there is great glory: but when the wicked rise, a man is hidden.", "He that covereth his sins shall not prosper: but whoso confesseth and forsaketh them shall have mercy.", "Happy is the man that feareth alway: but he that hardeneth his heart shall fall into mischief.", "As a roaring lion, and a ranging bear; so is a wicked ruler over the poor people.", "The prince that wanteth understanding is also a great oppressor: but he that hateth covetousness shall prolong his days.", "A man that doeth violence to the blood of any person shall flee to the pit; let no man stay him.", "Whoso walketh uprightly shall be saved: but he that is perverse in his ways shall fall at once.", "He that tilleth his land shall have plenty of bread: but he that followeth after vain persons shall have poverty enough.", "A faithful man shall abound with blessings: but he that maketh haste to be rich shall not be innocent.", "To have respect of persons is not good: for for a piece of bread that man will transgress.", "He that hasteth to be rich hath an evil eye, and considereth not that poverty shall come upon him.", "He that rebuketh a man afterwards shall find more favour than he that flattereth with the tongue.", "Whoso robbeth his father or his mother, and saith, It is no transgression; the same is the companion of a destroyer.", "He that is of a proud heart stirreth up strife: but he that putteth his trust in the LORD shall be made fat.", "He that trusteth in his own heart is a fool: but whoso walketh wisely, he shall be delivered.", "He that giveth unto the poor shall not lack: but he that hideth his eyes shall have many a curse.", "When the wicked rise, men hide themselves: but when they perish, the righteous increase."] }, { chapter: 29, verses: ["He, that being often reproved hardeneth his neck, shall suddenly be destroyed, and that without remedy.", "When the righteous are in authority, the people rejoice: but when the wicked beareth rule, the people mourn.", "Whoso loveth wisdom rejoiceth his father: but he that keepeth company with harlots spendeth his substance.", "The king by judgment establisheth the land: but he that receiveth gifts overthroweth it.", "A man that flattereth his neighbour spreadeth a net for his feet.", "In the transgression of an evil man there is a snare: but the righteous doth sing and rejoice.", "The righteous considereth the cause of the poor: but the wicked regardeth not to know it.", "Scornful men bring a city into a snare: but wise men turn away wrath.", "If a wise man contendeth with a foolish man, whether he rage or laugh, there is no rest.", "The bloodthirsty hate the upright: but the just seek his soul.", "A fool uttereth all his mind: but a wise man keepeth it in till afterwards.", "If a ruler hearken to lies, all his servants are wicked.", "The poor and the deceitful man meet together: the LORD lighteneth both their eyes.", "The king that faithfully judgeth the poor, his throne shall be established for ever.", "The rod and reproof give wisdom: but a child left to himself bringeth his mother to shame.", "When the wicked are multiplied, transgression increaseth: but the righteous shall see their fall.", "Correct thy son, and he shall give thee rest; yea, he shall give delight unto thy soul.", "Where there is no vision, the people perish: but he that keepeth the law, happy is he.", "A servant will not be corrected by words: for though he understand he will not answer.", "Seest thou a man that is hasty in his words? there is more hope of a fool than of him.", "He that delicately bringeth up his servant from a child shall have him become his son at the length.", "An angry man stirreth up strife, and a furious man aboundeth in transgression.", "A man\u2019s pride shall bring him low: but honour shall uphold the humble in spirit.", "Whoso is partner with a thief hateth his own soul: he heareth cursing, and bewrayeth it not.", "The fear of man bringeth a snare: but whoso putteth his trust in the LORD shall be safe.", "Many seek the ruler\u2019s favour; but every man\u2019s judgment cometh from the LORD.", "An unjust man is an abomination to the just: and he that is upright in the way is abomination to the wicked."] }, { chapter: 30, verses: ["The words of Agur the son of Jakeh, even the prophecy: the man spake unto Ithiel, even unto Ithiel and Ucal,", "Surely I am more brutish than any man, and have not the understanding of a man.", "I neither learned wisdom, nor have the knowledge of the holy.", "Who hath ascended up into heaven, or descended? who hath gathered the wind in his fists? who hath bound the waters in a garment? who hath established all the ends of the earth? what is his name, and what is his son\u2019s name, if thou canst tell?", "Every word of God is pure: he is a shield unto them that put their trust in him.", "Add thou not unto his words, lest he reprove thee, and thou be found a liar.", "Two things have I required of thee; deny me them not before I die:", "Remove far from me vanity and lies: give me neither poverty nor riches; feed me with food convenient for me:", "Lest I be full, and deny thee, and say, Who is the LORD? or lest I be poor, and steal, and take the name of my God in vain.", "Accuse not a servant unto his master, lest he curse thee, and thou be found guilty.", "There is a generation that curseth their father, and doth not bless their mother.", "There is a generation that are pure in their own eyes, and yet is not washed from their filthiness.", "There is a generation, O how lofty are their eyes! and their eyelids are lifted up.", "There is a generation, whose teeth are as swords, and their jaw teeth as knives, to devour the poor from off the earth, and the needy from among men.", "The horseleach hath two daughters, crying, Give, give. There are three things that are never satisfied, yea, four things say not, It is enough:", "The grave; and the barren womb; the earth that is not filled with water; and the fire that saith not, It is enough.", "The eye that mocketh at his father, and despiseth to obey his mother, the ravens of the valley shall pick it out, and the young eagles shall eat it.", "There be three things which are too wonderful for me, yea, four which I know not:", "The way of an eagle in the air; the way of a serpent upon a rock; the way of a ship in the midst of the sea; and the way of a man with a maid.", "Such is the way of an adulterous woman; she eateth, and wipeth her mouth, and saith, I have done no wickedness.", "For three things the earth is disquieted, and for four which it cannot bear:", "For a servant when he reigneth; and a fool when he is filled with meat;", "For an odious woman when she is married; and an handmaid that is heir to her mistress.", "There be four things which are little upon the earth, but they are exceeding wise:", "The ants are a people not strong, yet they prepare their meat in the summer;", "The conies are but a feeble folk, yet make they their houses in the rocks;", "The locusts have no king, yet go they forth all of them by bands;", "The spider taketh hold with her hands, and is in kings\u2019 palaces.", "There be three things which go well, yea, four are comely in going:", "A lion which is strongest among beasts, and turneth not away for any;", "A greyhound; an he goat also; and a king, against whom there is no rising up.", "If thou hast done foolishly in lifting up thyself, or if thou hast thought evil, lay thine hand upon thy mouth.", "Surely the churning of milk bringeth forth butter, and the wringing of the nose bringeth forth blood: so the forcing of wrath bringeth forth strife."] }, { chapter: 31, verses: ["The words of king Lemuel, the prophecy that his mother taught him.", "What, my son? and what, the son of my womb? and what, the son of my vows?", "Give not thy strength unto women, nor thy ways to that which destroyeth kings.", "It is not for kings, O Lemuel, it is not for kings to drink wine; nor for princes strong drink:", "Lest they drink, and forget the law, and pervert the judgment of any of the afflicted.", "Give strong drink unto him that is ready to perish, and wine unto those that be of heavy hearts.", "Let him drink, and forget his poverty, and remember his misery no more.", "Open thy mouth for the dumb in the cause of all such as are appointed to destruction.", "Open thy mouth, judge righteously, and plead the cause of the poor and needy.", "Who can find a virtuous woman? for her price is far above rubies.", "The heart of her husband doth safely trust in her, so that he shall have no need of spoil.", "She will do him good and not evil all the days of her life.", "She seeketh wool, and flax, and worketh willingly with her hands.", "She is like the merchants\u2019 ships; she bringeth her food from afar.", "She riseth also while it is yet night, and giveth meat to her household, and a portion to her maidens.", "She considereth a field, and buyeth it: with the fruit of her hands she planteth a vineyard.", "She girdeth her loins with strength, and strengtheneth her arms.", "She perceiveth that her merchandise is good: her candle goeth not out by night.", "She layeth her hands to the spindle, and her hands hold the distaff.", "She stretcheth out her hand to the poor; yea, she reacheth forth her hands to the needy.", "She is not afraid of the snow for her household: for all her household are clothed with scarlet.", "She maketh herself coverings of tapestry; her clothing is silk and purple.", "Her husband is known in the gates, when he sitteth among the elders of the land.", "She maketh fine linen, and selleth it; and delivereth girdles unto the merchant.", "Strength and honour are her clothing; and she shall rejoice in time to come.", "She openeth her mouth with wisdom; and in her tongue is the law of kindness.", "She looketh well to the ways of her household, and eateth not the bread of idleness.", "Her children arise up, and call her blessed; her husband also, and he praiseth her.", "Many daughters have done virtuously, but thou excellest them all.", "Favour is deceitful, and beauty is vain: but a woman that feareth the LORD, she shall be praised.", "Give her of the fruit of her hands; and let her own works praise her in the gates."] }] };

// src/core/proverbs.ts
var PROVERBS = proverbs_kjv_default;
function verseCounts() {
  return PROVERBS.chapters.map((c) => c.verses.length);
}
var TRANSLATION = PROVERBS.translation;
var TRANSLATION_NAME = PROVERBS.translationName;
var BOOK = PROVERBS.book;
function verseText(chapter, verse) {
  var _a;
  const c = PROVERBS.chapters[chapter - 1];
  if (!c) return "";
  return (_a = c.verses[verse - 1]) != null ? _a : "";
}
function reference(chapter, verse) {
  return `${BOOK} ${chapter}:${verse}`;
}

// src/panels/verse.ts
var VersePanel = class extends BasePanel2 {
  constructor() {
    super(...arguments);
    this.id = "verse";
    this.title = "Verse of the Day";
    this.shownRef = "";
  }
  async setup() {
    this.setInterval(() => {
      const { chapter, verse } = verseForDate(/* @__PURE__ */ new Date(), verseCounts());
      if (reference(chapter, verse) !== this.shownRef) this.rerender();
    }, 60 * 1e3);
  }
  renderBody() {
    placard2(this.el, "Verse of the Day");
    const { chapter, verse } = verseForDate(/* @__PURE__ */ new Date(), verseCounts());
    this.shownRef = reference(chapter, verse);
    const card = this.el.createDiv({ cls: "dash-verse" });
    card.createDiv({ cls: "dash-verse-text", text: `\u201C${verseText(chapter, verse)}\u201D` });
    const cite = card.createDiv({ cls: "dash-verse-cite" });
    cite.createSpan({ cls: "dash-verse-ref", text: reference(chapter, verse) });
    cite.createSpan({ cls: "dash-verse-translation", text: TRANSLATION });
  }
};

// src/panels/todo.ts
var import_obsidian26 = require("obsidian");
var TodoPanel = class extends BasePanel2 {
  constructor(openWeeklyReview) {
    super();
    this.openWeeklyReview = openWeeklyReview;
    this.id = "todo";
    this.title = "To-do";
    /** Which rows are expanded to show their sub-tasks / note — survives re-render. */
    this.expanded = /* @__PURE__ */ new Set();
  }
  renderBody() {
    const store = this.ctx.todos;
    const instances = store.instancesFor();
    const active = instances.filter((i) => !i.done && !i.skipped).sort(activeSort);
    const postponed = instances.filter((i) => i.skipped);
    const done = instances.filter((i) => i.done);
    const head = placard2(this.el, "To-do");
    const overdue = active.filter((i) => i.flagged).length;
    if (overdue > 0) head.createSpan({ cls: "dash-chip dash-chip-warn", text: `${overdue} overdue` });
    head.createSpan({ cls: "dash-chip", text: `${active.length} to do` });
    const reviewBtn = head.createEl("button", { cls: "dash-btn dash-btn-sm dash-todo-review", text: "Week in review" });
    reviewBtn.setAttr("title", "A look back at the last seven days");
    reviewBtn.addEventListener("click", () => this.openWeeklyReview());
    const addBtn = this.el.createEl("button", { cls: "dash-btn dash-btn-primary dash-todo-add", text: "+ Add a to-do" });
    addBtn.addEventListener(
      "click",
      () => new TodoEditModal2(this.ctx.app, store, void 0, () => this.after()).open()
    );
    const list = this.el.createDiv({ cls: "dash-todo-list" });
    if (active.length === 0) {
      list.createDiv({
        cls: "dash-empty",
        text: "Nothing to do yet. Tap \u201C+ Add a to-do\u201D to add your first one. You can make it repeat daily, weekly, or on any schedule you like."
      });
    }
    active.forEach((inst, idx) => this.renderRow(list, inst, idx, active.length));
    if (postponed.length > 0) {
      const details = this.el.createEl("details", { cls: "dash-todo-done" });
      details.createEl("summary", { text: `Postponed for today \xB7 ${postponed.length}` });
      const pList = details.createDiv({ cls: "dash-todo-list" });
      for (const inst of postponed) this.renderRow(pList, inst, -1, 0);
    }
    if (done.length > 0) {
      const details = this.el.createEl("details", { cls: "dash-todo-done" });
      details.createEl("summary", { text: `Done today \xB7 ${done.length}` });
      const doneList = details.createDiv({ cls: "dash-todo-list" });
      for (const inst of done) this.renderRow(doneList, inst, -1, 0);
    }
  }
  renderRow(parent, inst, idx, count) {
    var _a;
    const store = this.ctx.todos;
    const item = inst.item;
    const today3 = (0, import_obsidian26.moment)().format("YYYY-MM-DD");
    const wrap = parent.createDiv({ cls: "dash-todo-item" });
    const row = wrap.createDiv({ cls: "dash-todo-row" });
    if (inst.flagged) row.addClass("is-flagged");
    if (inst.done || inst.skipped) row.addClass("is-done");
    const box = row.createEl("button", { cls: "dash-todo-check", attr: { "aria-label": inst.done ? "Mark not done" : "Mark done" } });
    box.setText(inst.done ? "\u2713" : "");
    box.addEventListener("click", async () => {
      await store.toggleComplete(item.id);
      this.after();
    });
    const main = row.createDiv({ cls: "dash-todo-main" });
    main.createDiv({ cls: "dash-todo-text", text: item.text });
    const meta = main.createDiv({ cls: "dash-todo-meta" });
    if (item.recurrence.type !== "none") meta.createSpan({ cls: "dash-chip dash-chip-cold", text: describeRecurrence(item.recurrence) });
    if (item.scheduledTime) meta.createSpan({ cls: "dash-chip", text: item.scheduledTime });
    if (item.dueDate) {
      const overdue = !inst.done && item.dueDate < today3;
      meta.createSpan({ cls: overdue ? "dash-chip dash-chip-warn" : "dash-chip", text: dueLabel(item.dueDate, today3) });
    }
    if (item.showOnWeekPrint) meta.createSpan({ cls: "dash-chip dash-chip-cold", text: "on planner" });
    if (inst.flagged) meta.createSpan({ cls: "dash-chip dash-chip-warn", text: inst.flagLabel });
    const subs = (_a = item.subItems) != null ? _a : [];
    if (subs.length > 0) {
      const doneN = subItemsDoneCount(item, today3);
      const chip = meta.createSpan({ cls: "dash-chip dash-chip-cold", text: `sub-tasks ${doneN}/${subs.length}` });
      if (allSubItemsDone(item, today3)) chip.addClass("dash-chip-warn");
    }
    const actions = row.createDiv({ cls: "dash-todo-actions" });
    const hasDetail = subs.length > 0 || !!item.note;
    const isOpen = this.expanded.has(item.id);
    this.iconBtn(actions, isOpen ? "\u25BE" : "\u25B8", hasDetail ? "Sub-tasks & note" : "Add sub-tasks or a note", false, () => {
      if (isOpen) this.expanded.delete(item.id);
      else this.expanded.add(item.id);
      this.rerender();
    });
    if (!inst.done && count > 1 && idx >= 0) {
      this.iconBtn(actions, "\u2191", "Move up", idx === 0, async () => {
        await this.move(idx, -1);
      });
      this.iconBtn(actions, "\u2193", "Move down", idx === count - 1, async () => {
        await this.move(idx, 1);
      });
    }
    this.iconBtn(actions, "\u270E", "Edit", false, () => {
      new TodoEditModal2(this.ctx.app, store, item, () => this.after()).open();
    });
    if (inst.skipped) {
      this.iconBtn(actions, "\u21A9", "Bring back", false, async () => {
        await store.unskipInstance(item.id);
        this.after();
      });
    } else if (inst.recurring && !inst.done) {
      this.iconBtn(actions, "\u293C", "Skip just for today", false, async () => {
        await store.skipInstance(item.id);
        new import_obsidian26.Notice("Skipped for today. It comes back on the next occurrence.");
        this.after();
      });
    }
    this.iconBtn(actions, "\u{1F5D1}", "Delete", false, async () => {
      await store.remove(item.id);
      this.after();
    });
    if (isOpen) this.renderDetail(wrap, inst, today3);
  }
  /** Expanded region under a row: an inline note line and the sub-task checklist,
   * with per-occurrence completion for repeating to-dos. */
  renderDetail(wrap, inst, today3) {
    var _a, _b;
    const store = this.ctx.todos;
    const item = inst.item;
    const detail = wrap.createDiv({ cls: "dash-todo-detail" });
    const noteInput = detail.createEl("input", {
      cls: "dash-todo-note-input",
      attr: { type: "text", placeholder: "Add a note\u2026", value: (_a = item.note) != null ? _a : "" }
    });
    this.bindTextFocus(noteInput);
    const saveNote = () => {
      var _a2;
      if (((_a2 = item.note) != null ? _a2 : "") === noteInput.value.trim()) return;
      void store.setNote(item.id, noteInput.value).then(() => this.after());
    };
    noteInput.addEventListener("blur", saveNote);
    noteInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        noteInput.blur();
      }
    });
    const subList = detail.createDiv({ cls: "dash-subtask-list" });
    for (const sub of (_b = item.subItems) != null ? _b : []) {
      const srow = subList.createDiv({ cls: "dash-subtask-row" });
      const done = subItemDone(item, sub.id, today3);
      if (done) srow.addClass("is-done");
      const cb = srow.createEl("button", {
        cls: "dash-subtask-check",
        attr: { "aria-label": done ? "Mark sub-task not done" : "Mark sub-task done" }
      });
      cb.setText(done ? "\u2713" : "");
      cb.addEventListener("click", async () => {
        await store.toggleSubItem(item.id, sub.id, today3);
        this.after();
      });
      srow.createSpan({ cls: "dash-subtask-text", text: sub.text });
      this.iconBtn(srow, "\u{1F5D1}", "Remove sub-task", false, async () => {
        await store.removeSubItem(item.id, sub.id);
        this.after();
      });
    }
    const addRow = detail.createDiv({ cls: "dash-subtask-add" });
    const addInput = addRow.createEl("input", {
      cls: "dash-subtask-input",
      attr: { type: "text", placeholder: "Add a sub-task\u2026" }
    });
    this.bindTextFocus(addInput);
    const addSub = () => {
      const text = addInput.value.trim();
      if (!text) return;
      void store.addSubItem(item.id, text).then(() => this.after());
    };
    addInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addSub();
      }
    });
    const addBtn = addRow.createEl("button", { cls: "dash-btn dash-btn-sm", text: "Add" });
    addBtn.addEventListener("click", addSub);
  }
  iconBtn(parent, glyph, label, disabled, onClick) {
    const b = parent.createEl("button", { cls: "dash-icon-btn dash-todo-icon", text: glyph, attr: { "aria-label": label, title: label } });
    if (disabled) b.setAttr("disabled", "true");
    else b.addEventListener("click", onClick);
  }
  async move(idx, delta) {
    const active = this.ctx.todos.instancesFor().filter((i) => !i.done && !i.skipped).sort(activeSort);
    const ids = active.map((i) => i.item.id);
    const j = idx + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    await this.ctx.todos.reorder(ids);
    this.after();
  }
  after() {
    this.ctx.requestRefresh("manual");
  }
};
function dueLabel(due, today3) {
  if (due < today3) return `overdue \xB7 ${(0, import_obsidian26.moment)(due, "YYYY-MM-DD").format("MMM D")}`;
  if (due === today3) return "due today";
  return `due ${(0, import_obsidian26.moment)(due, "YYYY-MM-DD").format("MMM D")}`;
}
function activeSort(a, b) {
  var _a, _b;
  if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
  const at = (_a = a.item.scheduledTime) != null ? _a : "99:99";
  const bt = (_b = b.item.scheduledTime) != null ? _b : "99:99";
  if (at !== bt) return at.localeCompare(bt);
  return a.item.order - b.item.order;
}
var WEEKDAYS = [
  { v: 1, label: "Mon" },
  { v: 2, label: "Tue" },
  { v: 3, label: "Wed" },
  { v: 4, label: "Thu" },
  { v: 5, label: "Fri" },
  { v: 6, label: "Sat" },
  { v: 0, label: "Sun" }
];
var TodoEditModal2 = class extends import_obsidian26.Modal {
  constructor(app, store, existing, onDone) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    super(app);
    this.store = store;
    this.existing = existing;
    this.onDone = onDone;
    const e = existing;
    this.text = (_a = e == null ? void 0 : e.text) != null ? _a : "";
    this.recType = (_b = e == null ? void 0 : e.recurrence.type) != null ? _b : "none";
    this.weeklyDays = new Set((_c = e == null ? void 0 : e.recurrence.days) != null ? _c : [(0, import_obsidian26.moment)().day()]);
    this.monthlyDate = (_d = e == null ? void 0 : e.recurrence.date) != null ? _d : (0, import_obsidian26.moment)().date();
    this.everyN = (_e = e == null ? void 0 : e.recurrence.n) != null ? _e : 2;
    this.scheduledDate = (_f = e == null ? void 0 : e.scheduledDate) != null ? _f : "";
    this.scheduledTime = (_g = e == null ? void 0 : e.scheduledTime) != null ? _g : "";
    this.dueDate = (_h = e == null ? void 0 : e.dueDate) != null ? _h : "";
    this.showOnWeekPrint = (_i = e == null ? void 0 : e.showOnWeekPrint) != null ? _i : false;
  }
  onOpen() {
    this.titleEl.setText(this.existing ? "Edit to-do" : "New to-do");
    const { contentEl } = this;
    new import_obsidian26.Setting(contentEl).setName("To-do").addText((t) => {
      t.setPlaceholder("What needs doing?").setValue(this.text).onChange((v) => this.text = v);
      t.inputEl.classList.add("dash-modal-wide");
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.submit();
        }
      });
    });
    const dynamic = contentEl.createDiv();
    new import_obsidian26.Setting(contentEl).setName("Repeat").addDropdown((dd) => {
      dd.addOptions({
        none: "Just once",
        daily: "Every day",
        weekdays: "Weekdays (Mon\u2013Fri)",
        weekly: "Weekly",
        monthly: "Monthly",
        everyNDays: "Every N days"
      });
      dd.setValue(this.recType).onChange((v) => {
        this.recType = v;
        this.renderDynamic(dynamic);
      });
    });
    contentEl.appendChild(dynamic);
    this.renderDynamic(dynamic);
    new import_obsidian26.Setting(contentEl).setName("Start on").setDesc("Optional. Hide this until a date (and time). For repeats, this is the start date.").addText((t) => {
      t.inputEl.type = "date";
      t.setValue(this.scheduledDate).onChange((v) => this.scheduledDate = v);
    }).addText((t) => {
      t.inputEl.type = "time";
      t.setValue(this.scheduledTime).onChange((v) => this.scheduledTime = v);
    });
    new import_obsidian26.Setting(contentEl).setName("Due by").setDesc("Optional soft deadline. Shown as a chip; once it's past, it reads \u201Coverdue\u201D.").addText((t) => {
      t.inputEl.type = "date";
      t.setValue(this.dueDate).onChange((v) => this.dueDate = v);
    });
    new import_obsidian26.Setting(contentEl).setName("Show on the printed week").setDesc("Draw this to-do on the printable week-at-a-glance planner on its scheduled or due day.").addToggle((t) => t.setValue(this.showOnWeekPrint).onChange((v) => this.showOnWeekPrint = v));
    new import_obsidian26.Setting(contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => this.close())).addButton((b) => b.setButtonText(this.existing ? "Save" : "Add").setCta().onClick(() => void this.submit()));
  }
  renderDynamic(host) {
    host.empty();
    if (this.recType === "weekly") {
      const s = new import_obsidian26.Setting(host).setName("On these days");
      for (const d of WEEKDAYS) {
        const btn = s.controlEl.createEl("button", { cls: "dash-day-toggle", text: d.label });
        if (this.weeklyDays.has(d.v)) btn.addClass("is-on");
        btn.addEventListener("click", () => {
          if (this.weeklyDays.has(d.v)) this.weeklyDays.delete(d.v);
          else this.weeklyDays.add(d.v);
          btn.toggleClass("is-on", this.weeklyDays.has(d.v));
        });
      }
    } else if (this.recType === "monthly") {
      new import_obsidian26.Setting(host).setName("Day of the month").addText((t) => {
        t.inputEl.type = "number";
        t.inputEl.min = "1";
        t.inputEl.max = "31";
        t.setValue(String(this.monthlyDate)).onChange((v) => this.monthlyDate = clamp(Number(v), 1, 31));
      });
    } else if (this.recType === "everyNDays") {
      new import_obsidian26.Setting(host).setName("Every").setDesc("days").addText((t) => {
        t.inputEl.type = "number";
        t.inputEl.min = "1";
        t.setValue(String(this.everyN)).onChange((v) => this.everyN = Math.max(1, Number(v) || 1));
      });
    }
  }
  buildRecurrence() {
    switch (this.recType) {
      case "weekly":
        return { type: "weekly", days: [...this.weeklyDays].sort((a, b) => a - b) };
      case "monthly":
        return { type: "monthly", date: this.monthlyDate };
      case "everyNDays":
        return { type: "everyNDays", n: this.everyN };
      default:
        return { type: this.recType };
    }
  }
  async submit() {
    const text = this.text.trim();
    if (!text) {
      new import_obsidian26.Notice("Please type what the to-do is.");
      return;
    }
    const patch = {
      text,
      recurrence: this.buildRecurrence(),
      scheduledDate: this.scheduledDate || void 0,
      scheduledTime: this.scheduledTime || void 0,
      dueDate: this.dueDate || void 0,
      showOnWeekPrint: this.showOnWeekPrint
    };
    if (this.existing) await this.store.update(this.existing.id, patch);
    else await this.store.add(patch);
    this.close();
    this.onDone();
  }
  onClose() {
    this.contentEl.empty();
  }
};
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}

// src/panels/agenda.ts
var import_obsidian27 = require("obsidian");

// src/core/themes.ts
var THEMES = [
  {
    id: "sleek",
    label: "Sleek Modern",
    blurb: "Clean and near-monochrome, with a single deep-green accent. A calm, neutral place to start."
  },
  {
    id: "pastel",
    label: "Pastel / Floral",
    blurb: "Soft and warm \u2014 dusty rose, sage, and lavender, with gentle rounded corners."
  },
  {
    id: "mellow",
    label: "Mellow",
    blurb: "A quiet mix of muted violet, orange, and dusty blue. Easy on the eyes."
  },
  {
    id: "geometric",
    label: "Geometric",
    blurb: "Bold and graphic \u2014 vermilion, ochre, and cobalt blocks with sharp edges and thick rules."
  }
];
var DEFAULT_THEME = "sleek";
function isThemeId(id) {
  return THEMES.some((t) => t.id === id);
}
var CALENDAR_TOKEN_COUNT = 8;
function calendarColorVar(index) {
  return `var(--dash-cal-${index % CALENDAR_TOKEN_COUNT + 1})`;
}

// src/adapters.ts
function friendlyLocalEvents(plugin) {
  return {
    add: (patch) => plugin.addLocalEvent(patch),
    update: (id, patch) => plugin.updateLocalEvent(id, patch),
    remove: (id) => plugin.removeLocalEvent(id)
  };
}
function friendlyWeeklyGoals(plugin) {
  return {
    forWeek: (weekKey) => plugin.weeklyGoalsFor(weekKey),
    add: (weekKey, text) => plugin.addWeeklyGoal(weekKey, text),
    remove: (weekKey, id) => plugin.removeWeeklyGoal(weekKey, id)
  };
}
var FRIENDLY_WEEKLYGOALS_COPY = {
  titleTemplate: "This week's goals \xB7 {week}",
  empty: "No goals for this week yet. What would make it a good week?",
  toItem: "\u2192 To-do",
  removeGoal: "Remove goal",
  addName: "Add a goal",
  addPlaceholder: "Something you'd like to get done this week",
  addButton: "Add",
  done: "Done",
  addedNotice: "Added to your to-do list, due at the end of the week."
};

// src/panels/agenda.ts
function calColor(cal, index) {
  return cal.color || calendarColorVar(index);
}
var LOCAL_EVENT_COLOR = "var(--dash-cal-local, var(--dash-accent, #b5836b))";
var FETCH_CONCURRENCY = 4;
var AgendaPanel = class extends BasePanel2 {
  constructor() {
    super(...arguments);
    this.id = "agenda";
    this.title = "Today's Agenda";
    this.errors = /* @__PURE__ */ new Map();
    this.fetching = false;
    /** Set once the user scrolls the list; suppresses auto-scroll-to-now until
     * they press "back to now". Persists across re-renders (per session). */
    this.userScrolled = false;
    this.lastScrollTop = 0;
    this.suppressScrollHandler = false;
    /** Today's items that feed the "what's next" countdown, kept for the minute tick. */
    this.countdownItems = [];
    this.hadTimedEvents = false;
  }
  async setup() {
    const minutes = Math.max(1, this.ctx.settings().agendaRefreshMinutes || 30);
    this.setInterval(() => void this.fetchAll(), minutes * 60 * 1e3);
    this.setInterval(() => {
      var _a;
      if ((_a = this.countdownEl) == null ? void 0 : _a.isConnected) this.renderCountdown();
    }, 60 * 1e3);
    void this.fetchAll();
  }
  renderBody() {
    const s = this.ctx.settings();
    const head = placard2(this.el, "Today's Agenda");
    head.createSpan({ cls: "dash-placard-badge", text: (0, import_obsidian27.moment)().format("ddd, MMM D") });
    const toolbar = this.el.createDiv({ cls: "dash-agenda-toolbar" });
    const addBtn = toolbar.createEl("button", { cls: "dash-btn", text: "\uFF0B Add event" });
    addBtn.setAttr("title", "Add a one-off event to today's agenda (stored on the dashboard, synced across devices)");
    addBtn.addEventListener(
      "click",
      () => new LocalEventModal(this.ctx.app, friendlyLocalEvents(this.ctx.plugin), void 0, () => this.rerender()).open()
    );
    const goalsBtn = toolbar.createEl("button", { cls: "dash-btn", text: "\u{1F3AF} Week's goals" });
    goalsBtn.setAttr("title", "Set a few goals for this week \u2014 they print at the top of the week planner");
    goalsBtn.addEventListener(
      "click",
      () => new WeeklyGoalsModal(
        this.ctx.app,
        friendlyWeeklyGoals(this.ctx.plugin),
        this.ctx.todos,
        currentWeekKey(),
        () => this.ctx.requestRefresh("vault"),
        FRIENDLY_WEEKLYGOALS_COPY
      ).open()
    );
    const printBtn = toolbar.createEl("button", { cls: "dash-btn", text: "\u{1F5A8} Print week" });
    printBtn.setAttr("title", "Open a printable week-at-a-glance planner for this week");
    printBtn.addEventListener("click", () => this.printWeek());
    const today3 = (0, import_obsidian27.moment)().format("YYYY-MM-DD");
    const localToday = this.ctx.localEvents.filter((e) => e.date === today3);
    if (s.agendaUrls.length === 0 && localToday.length === 0) {
      this.el.createDiv({
        cls: "dash-empty",
        text: "Nothing scheduled yet. Add your calendar share links in the plugin settings (Settings \u2192 Daily Dashboard \u2192 Today's agenda), or tap \u201C\uFF0B Add event\u201D to jot a one-off onto today."
      });
      return;
    }
    const rows = [];
    let anyCache = false;
    let oldest = Infinity;
    s.agendaUrls.forEach((cal, i) => {
      const cache = this.ctx.plugin.agendaCache[cal.url];
      if (cache) {
        anyCache = true;
        oldest = Math.min(oldest, cache.fetchedAt);
        try {
          for (const item of eventsOnDate(parseICS(cache.text), today3)) {
            rows.push({ item, color: calColor(cal, i), label: cal.label, countdown: cal.countdown !== false });
          }
        } catch (e) {
          this.errors.set(cal.url, "couldn't be read");
        }
      }
    });
    for (const ev of localToday) {
      rows.push({ item: localEventToAgendaItem(ev), color: LOCAL_EVENT_COLOR, label: "Event", local: ev, countdown: true });
    }
    this.countdownItems = rows.filter((r) => r.countdown).map((r) => r.item);
    this.hadTimedEvents = this.countdownItems.some((i) => !i.allDay);
    this.countdownEl = void 0;
    if (rows.length > 0) {
      this.countdownEl = this.el.createDiv({ cls: "dash-agenda-next" });
      this.renderCountdown();
    }
    const failed = s.agendaUrls.filter((c) => this.errors.has(c.url));
    if (failed.length) {
      const box = this.el.createDiv({ cls: "dash-agenda-alert" });
      for (const c of failed) {
        box.createDiv({
          cls: "dash-agenda-alert-line",
          text: `\u201C${c.label}\u201D couldn't be reached (${this.errors.get(c.url)}). A share link can quietly stop working on the calendar's side \u2014 this one may need to be renewed and re-added.`
        });
      }
    }
    rows.sort((a, b) => a.item.sortKey - b.item.sortKey || a.item.summary.localeCompare(b.item.summary));
    const list = this.el.createDiv({ cls: "dash-agenda-list" });
    list.style.height = `${Math.max(120, s.agendaHeight || 320)}px`;
    if (rows.length === 0 && !failed.length) {
      list.createDiv({ cls: "dash-empty", text: "Nothing on the calendar today." });
    }
    const nowMinutes = (0, import_obsidian27.moment)().hour() * 60 + (0, import_obsidian27.moment)().minute();
    let nowMarker = null;
    let markerPlaced = false;
    const placeMarkerBefore = () => {
      const m = list.createDiv({ cls: "dash-agenda-now" });
      m.createSpan({ cls: "dash-agenda-now-label", text: `now \xB7 ${(0, import_obsidian27.moment)().format(this.ctx.settings().clock24h ? "H:mm" : "h:mm A")}` });
      return m;
    };
    for (const r of rows) {
      if (!markerPlaced && !r.item.allDay && r.item.sortKey >= nowMinutes) {
        nowMarker = placeMarkerBefore();
        markerPlaced = true;
      }
      const row = list.createDiv({ cls: "dash-agenda-row" });
      const swatch = row.createSpan({ cls: "dash-agenda-swatch" });
      swatch.style.background = r.color;
      const time = row.createSpan({ cls: "dash-agenda-time" });
      time.setText(r.item.allDay ? "all day" : r.item.timeLabel);
      const body = row.createDiv({ cls: "dash-agenda-body" });
      const title = body.createDiv({ cls: "dash-agenda-title", text: r.item.summary });
      if (r.local) title.createSpan({ cls: "dash-chip dash-agenda-local-chip", text: r.label });
      const sub = [r.local ? "" : r.label, r.item.location].filter(Boolean).join(" \xB7 ");
      if (sub) body.createDiv({ cls: "dash-agenda-sub", text: sub });
      if (r.local) {
        const ev = r.local;
        row.classList.add("dash-agenda-row-editable");
        row.setAttr("title", "Edit or delete this event");
        row.addEventListener(
          "click",
          () => new LocalEventModal(this.ctx.app, friendlyLocalEvents(this.ctx.plugin), ev, () => this.rerender()).open()
        );
      }
    }
    if (!markerPlaced && rows.some((r) => !r.item.allDay)) {
      nowMarker = placeMarkerBefore();
    }
    const backToNow = this.el.createEl("button", { cls: "dash-agenda-backtonow", text: "\u2195 Back to now" });
    backToNow.addEventListener("click", () => {
      this.userScrolled = false;
      this.scrollToNow(list, nowMarker);
    });
    list.addEventListener("scroll", () => {
      if (this.suppressScrollHandler) return;
      this.userScrolled = true;
      this.lastScrollTop = list.scrollTop;
    });
    window.requestAnimationFrame(() => {
      if (!list.isConnected) return;
      if (this.userScrolled) this.setScrollTop(list, this.lastScrollTop);
      else this.scrollToNow(list, nowMarker);
    });
    if (anyCache && oldest !== Infinity) {
      const age = Date.now() - oldest;
      if (age > 90 * 1e3) {
        this.el.createDiv({
          cls: "dash-agenda-age",
          text: `Showing the last update from ${(0, import_obsidian27.moment)(oldest).fromNow()}. Calendars can take up to eight hours to show a change; a fresh check is on its way.`
        });
      }
    }
  }
  /** Draw (or redraw, each minute) the "what's next" strip. */
  renderCountdown() {
    var _a, _b;
    const el = this.countdownEl;
    if (!el) return;
    el.empty();
    const state = agendaState(this.countdownItems, Date.now());
    if (state.kind === "clear") {
      el.addClass("is-clear");
      el.removeClass("is-now");
      el.createDiv({
        cls: "dash-agenda-gap",
        text: this.hadTimedEvents ? "Nothing else on the calendar today \u2014 the rest of the day is yours." : "Nothing on the calendar today."
      });
      return;
    }
    el.removeClass("is-clear");
    el.toggleClass("is-now", state.kind === "now");
    const until = formatGap((_a = state.untilMs) != null ? _a : 0);
    const line = el.createDiv({ cls: "dash-agenda-next-line" });
    line.createSpan({ cls: "dash-agenda-next-label", text: state.kind === "now" ? "Now" : "Next" });
    line.createSpan({ cls: "dash-agenda-next-summary", text: (_b = state.summary) != null ? _b : "" });
    line.createSpan({ cls: "dash-agenda-next-when", text: state.kind === "now" ? `ends in ${until}` : `in ${until}` });
    const gap = state.kind === "now" ? state.gapMs === void 0 ? "After this, you're free for the rest of the day." : `After this, you're free for ${formatGap(state.gapMs)}.` : `You're free for ${until}.`;
    el.createDiv({ cls: "dash-agenda-gap", text: gap });
  }
  scrollToNow(list, marker) {
    if (!marker) {
      this.setScrollTop(list, 0);
      return;
    }
    const target = Math.max(0, marker.offsetTop - list.clientHeight / 2);
    this.setScrollTop(list, target);
  }
  setScrollTop(list, top) {
    this.suppressScrollHandler = true;
    list.scrollTop = top;
    this.lastScrollTop = top;
    window.setTimeout(() => this.suppressScrollHandler = false, 50);
  }
  async fetchAll() {
    var _a;
    if (this.fetching) return;
    const urls = this.ctx.settings().agendaUrls;
    if (urls.length === 0) return;
    this.fetching = true;
    let changed = false;
    try {
      const queue = urls.slice();
      const worker = async () => {
        for (; ; ) {
          const cal = queue.shift();
          if (!cal) return;
          try {
            const text = await fetchICS(cal.url);
            this.ctx.plugin.agendaCache[cal.url] = { text, fetchedAt: Date.now() };
            this.errors.delete(cal.url);
            changed = true;
          } catch (e) {
            this.errors.set(cal.url, humanizeFetchError(e));
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, urls.length) }, worker));
      if (changed) await this.ctx.plugin.saveData_();
    } finally {
      this.fetching = false;
    }
    if ((_a = this.el) == null ? void 0 : _a.isConnected) this.rerender();
  }
  // ----------------------------------------------------- printable week
  /** Resolve the theme's calendar swatch colours to concrete hex, so the
   * printout matches the on-screen colour-coding. Reads the computed
   * `--dash-cal-N` custom properties from the live panel. */
  resolveCalColors() {
    const cs = getComputedStyle(this.el);
    const out = [];
    for (let i = 1; i <= 8; i++) {
      const v = cs.getPropertyValue(`--dash-cal-${i}`).trim();
      out.push(v || FALLBACK_CAL_COLORS[i - 1]);
    }
    return out;
  }
  /** Build and print a week-at-a-glance planner for the current week, with
   * events colour-coded by the calendar they came from and ruled blank space
   * to write in. Opens in a hidden iframe so only the planner prints. */
  printWeek() {
    const s = this.ctx.settings();
    const colors = this.resolveCalColors();
    const calendars = s.agendaUrls.map((cal, i) => {
      const cache = this.ctx.plugin.agendaCache[cal.url];
      let events = [];
      if (cache) {
        try {
          events = parseICS(cache.text);
        } catch (e) {
        }
      }
      return { events, color: cal.color || colors[i % colors.length], label: cal.label };
    });
    const localColor = getComputedStyle(this.el).getPropertyValue("--dash-cal-local").trim() || "#b5836b";
    const start = startOfWeek(/* @__PURE__ */ new Date());
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
      const dateStr = fmtLocal(date);
      const items = [];
      for (const cal of calendars) {
        for (const item of eventsOnDate(cal.events, dateStr)) {
          items.push({ item, color: cal.color, label: cal.label });
        }
      }
      for (const ev of this.ctx.localEvents.filter((e) => e.date === dateStr)) {
        items.push({ item: localEventToAgendaItem(ev), color: localColor, label: "Event" });
      }
      items.sort((a, b) => a.item.sortKey - b.item.sortKey || a.item.summary.localeCompare(b.item.summary));
      const todos = this.ctx.todos.itemsForWeekPrint(dateStr).map((t) => t.text);
      days.push({ date, items, todos });
    }
    const legend = calendars.map((c) => ({ label: c.label, color: c.color }));
    const goals = this.ctx.plugin.weeklyGoalsFor(currentWeekKey()).map((g) => g.text);
    openPrintDocument(buildWeekHtml(days, legend, start, goals));
  }
};
function humanizeFetchError(e) {
  var _a;
  const msg = String((_a = e == null ? void 0 : e.message) != null ? _a : e);
  if (/HTTP\s*4\d\d/.test(msg)) return "the link was refused";
  if (/HTTP\s*5\d\d/.test(msg)) return "the calendar server had an error";
  if (/network|fetch|ENOTFOUND|timeout/i.test(msg)) return "no connection";
  return msg;
}
var FALLBACK_CAL_COLORS = ["#186a5b", "#2f6f97", "#8a5a2b", "#6b6f2f", "#7a3f6b", "#2f7f7a", "#a6602b", "#4a4f8a"];
function startOfWeek(d) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay());
  return s;
}
function fmtLocal(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function buildWeekHtml(days, legend, weekStart, goals) {
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  const title = `${(0, import_obsidian27.moment)(weekStart).format("MMMM D")} \u2013 ${(0, import_obsidian27.moment)(weekEnd).format("MMMM D, YYYY")}`;
  const legendHtml = legend.length ? `<div class="legend">${legend.map((l) => `<span class="leg"><span class="dot" style="background:${l.color}"></span>${escapeHtml(l.label)}</span>`).join("")}</div>` : "";
  const goalsHtml = goals.length ? `<div class="goals"><span class="goals-h">This week's goals</span>${goals.map((g) => `<span class="goal"><span class="todo-box"></span>${escapeHtml(g)}</span>`).join("")}</div>` : "";
  const dayCells = days.map((day) => {
    const events = day.items.map((pi) => {
      const time = pi.item.allDay ? "all day" : escapeHtml(pi.item.timeLabel);
      const title2 = escapeHtml(pi.item.summary || "(untitled)");
      const loc = pi.item.location ? ` \xB7 ${escapeHtml(pi.item.location)}` : "";
      return `<div class="evt" style="border-left-color:${pi.color}">
						<span class="evt-dot" style="background:${pi.color}"></span>
						<span class="evt-time">${time}</span>
						<span class="evt-title">${title2}<span class="evt-cal">${escapeHtml(pi.label)}${loc}</span></span>
					</div>`;
    }).join("");
    const todos = day.todos.length ? `<div class="todos">${day.todos.map((t) => `<div class="todo"><span class="todo-box"></span><span class="todo-text">${escapeHtml(t)}</span></div>`).join("")}</div>` : "";
    return `<section class="day">
				<header class="day-h">
					<span class="day-name">${(0, import_obsidian27.moment)(day.date).format("dddd")}</span>
					<span class="day-date">${(0, import_obsidian27.moment)(day.date).format("MMM D")}</span>
				</header>
				<div class="events">${events}</div>
				${todos}
				<div class="write"></div>
			</section>`;
  }).join("");
  const notesCell = `<section class="day notes">
			<header class="day-h"><span class="day-name">Notes &amp; to-do</span></header>
			<div class="write tall"></div>
		</section>`;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Week at a glance \u2014 ${escapeHtml(title)}</title>
<style>
	* { box-sizing: border-box; }
	html, body { margin: 0; padding: 0; }
	body {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
		color: #111; background: #fff; padding: 14px;
		-webkit-print-color-adjust: exact; print-color-adjust: exact;
	}
	h1 { font-size: 18px; margin: 0 0 2px; }
	.sub { color: #555; font-size: 12px; margin-bottom: 8px; }
	.legend { display: flex; flex-wrap: wrap; gap: 10px; margin: 6px 0 12px; font-size: 11px; }
	.leg { display: inline-flex; align-items: center; gap: 5px; }
	.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
	.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
	.day { border: 1px solid #bbb; border-radius: 6px; padding: 6px 8px; min-height: 56mm; display: flex; flex-direction: column; break-inside: avoid; }
	.day.notes { min-height: 56mm; }
	.day-h { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 4px; }
	.day-name { font-weight: 700; font-size: 13px; }
	.day-date { color: #666; font-size: 12px; }
	.events { display: flex; flex-direction: column; gap: 3px; margin-bottom: 4px; }
	.evt { display: flex; align-items: baseline; gap: 6px; border-left: 4px solid #999; padding: 1px 0 1px 6px; font-size: 11px; }
	.evt-dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%; align-self: center; }
	.evt-time { flex: 0 0 auto; color: #333; font-variant-numeric: tabular-nums; min-width: 66px; }
	.evt-title { font-weight: 600; }
	.evt-cal { display: block; font-weight: 400; color: #777; font-size: 10px; }
	.todos { display: flex; flex-direction: column; gap: 2px; margin: 2px 0 4px; padding-top: 3px; border-top: 1px dashed #ddd; }
	.todo { display: flex; align-items: baseline; gap: 6px; font-size: 11px; }
	.todo-box { flex: 0 0 auto; width: 9px; height: 9px; border: 1px solid #888; border-radius: 2px; align-self: center; }
	.todo-text { font-weight: 500; }
	.goals { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin: 0 0 10px; padding: 6px 8px; border: 1px solid #bbb; border-radius: 6px; font-size: 12px; }
	.goals-h { font-weight: 700; }
	.goal { display: inline-flex; align-items: center; gap: 6px; }
	.write { flex: 1 1 auto; min-height: 22mm; background-image: repeating-linear-gradient(to bottom, transparent, transparent 6mm, #e2e2e2 6mm, #e2e2e2 calc(6mm + 1px)); }
	.write.tall { min-height: 48mm; }
	@media print { body { padding: 0; } @page { margin: 12mm; } }
</style></head>
<body>
	<h1>Week at a glance</h1>
	<div class="sub">${escapeHtml(title)}</div>
	${goalsHtml}
	${legendHtml}
	<div class="grid">${dayCells}${notesCell}</div>
</body></html>`;
}
function openPrintDocument(html) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  const doc = win == null ? void 0 : win.document;
  if (!win || !doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    iframe.remove();
  };
  win.addEventListener("afterprint", () => window.setTimeout(cleanup, 500));
  window.setTimeout(cleanup, 5 * 60 * 1e3);
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch (e) {
      cleanup();
    }
  }, 300);
}

// src/panels/calendar.ts
var import_obsidian29 = require("obsidian");

// src/core/dailynotes.ts
var import_obsidian28 = require("obsidian");
var DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;
function inFolder(path, folder) {
  return path === folder || path.startsWith(folder + "/");
}
function listDailyNoteFiles(app) {
  const folder = dailyNotesFolder(app);
  return app.vault.getMarkdownFiles().filter((f) => {
    if (folder) return inFolder(f.path, folder);
    return DATE_LIKE.test(f.basename);
  });
}
async function searchDailyNoteBodies(app, query, limit = 30) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const files = listDailyNoteFiles(app).sort((a, b) => b.stat.mtime - a.stat.mtime);
  const out = [];
  for (const file of files) {
    let content;
    try {
      content = await app.vault.cachedRead(file);
    } catch (e) {
      continue;
    }
    const body = content.split("\n").filter((l) => !/^#{1,6}\s/.test(l)).join("\n");
    const idx = body.toLowerCase().indexOf(q);
    if (idx !== -1) {
      out.push({ file, snippet: makeSnippet(body, idx, q.length) });
      if (out.length >= limit) break;
    }
  }
  return out;
}
function makeSnippet(body, idx, len) {
  const pad = 48;
  const start = Math.max(0, idx - pad);
  const end = Math.min(body.length, idx + len + pad);
  let s = body.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) s = "\u2026 " + s;
  if (end < body.length) s = s + " \u2026";
  return s;
}
async function ensureDailyNotesBase(app, basePath) {
  const path = (0, import_obsidian28.normalizePath)(basePath.endsWith(".base") ? basePath : basePath + ".base");
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof import_obsidian28.TFile) return existing;
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir && !app.vault.getAbstractFileByPath(dir)) {
    await app.vault.createFolder(dir).catch(() => {
    });
  }
  const folder = dailyNotesFolder(app);
  return app.vault.create(path, baseContent(folder));
}
function baseContent(folder) {
  const filter = folder ? `    - file.inFolder("${folder}")` : `    - file.ext == "md"`;
  return [
    "filters:",
    "  and:",
    filter,
    "views:",
    "  - type: table",
    "    name: Daily notes",
    "    order:",
    "      - file.name",
    "      - file.mtime",
    ""
  ].join("\n");
}

// src/panels/calendar.ts
var WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
var CalendarPanel = class extends BasePanel2 {
  constructor() {
    super(...arguments);
    this.id = "calendar";
    this.title = "Calendar";
    /** First day of the month being viewed. */
    this.cursor = startOfMonth(/* @__PURE__ */ new Date());
    this.searchQuery = "";
    this.searchTimer = null;
  }
  renderBody() {
    placard2(this.el, "Calendar");
    this.renderMonthNav();
    this.renderGrid();
    this.renderBaseButton();
    this.renderSearch();
  }
  // ------------------------------------------------------------- month grid
  renderMonthNav() {
    const nav = this.el.createDiv({ cls: "dash-cal-nav" });
    const prev = nav.createEl("button", { cls: "dash-icon-btn", text: "\u2039", attr: { "aria-label": "Previous month" } });
    prev.addEventListener("click", () => {
      this.cursor = addMonths(this.cursor, -1);
      this.rerender();
    });
    const label = nav.createSpan({ cls: "dash-cal-month", text: (0, import_obsidian29.moment)(this.cursor).format("MMMM YYYY") });
    label.addEventListener("click", () => {
      this.cursor = startOfMonth(/* @__PURE__ */ new Date());
      this.rerender();
    });
    const next = nav.createEl("button", { cls: "dash-icon-btn", text: "\u203A", attr: { "aria-label": "Next month" } });
    next.addEventListener("click", () => {
      this.cursor = addMonths(this.cursor, 1);
      this.rerender();
    });
  }
  renderGrid() {
    const grid = this.el.createDiv({ cls: "dash-cal-grid" });
    for (const w of WEEKDAY_LABELS) grid.createDiv({ cls: "dash-cal-dow", text: w });
    const year = this.cursor.getFullYear();
    const month = this.cursor.getMonth();
    const first = new Date(year, month, 1);
    const leading = first.getDay();
    const start = new Date(year, month, 1 - leading);
    const todayStr2 = (0, import_obsidian29.moment)().format("YYYY-MM-DD");
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const dateStr = fmt(d);
      const cell = grid.createEl("button", { cls: "dash-cal-day", text: String(d.getDate()) });
      if (d.getMonth() !== month) cell.addClass("is-outside");
      if (dateStr === todayStr2) cell.addClass("is-today");
      if (getDailyNoteFile(this.ctx.app, dateStr)) cell.addClass("has-note");
      cell.setAttr("aria-label", (0, import_obsidian29.moment)(d).format("dddd, MMMM D, YYYY"));
      cell.addEventListener("click", () => void this.openDay(dateStr));
    }
  }
  async openDay(dateStr) {
    try {
      const file = await ensureDailyNote(this.ctx.app, dateStr);
      await this.ctx.app.workspace.getLeaf(false).openFile(file);
    } catch (e) {
      console.error("Daily Dashboard: could not open the daily note", e);
      new import_obsidian29.Notice("Couldn't open that day's note.");
    }
  }
  // -------------------------------------------------------------- base button
  renderBaseButton() {
    const row = this.el.createDiv({ cls: "dash-btn-row" });
    const btn = row.createEl("button", { cls: "dash-btn", text: "Open all-days table" });
    btn.addEventListener("click", async () => {
      try {
        const path = this.ctx.settings().calendarBasePath;
        const file = await ensureDailyNotesBase(this.ctx.app, path);
        await this.ctx.app.workspace.getLeaf(false).openFile(file);
      } catch (e) {
        console.error("Daily Dashboard: could not open the daily-notes base", e);
        new import_obsidian29.Notice("Couldn't open the daily-notes table. Check the base file path in settings.");
      }
    });
  }
  // ------------------------------------------------------------------ search
  renderSearch() {
    this.el.createDiv({ cls: "dash-subhead", text: "Search all daily notes" });
    const input = this.el.createEl("input", {
      cls: "dash-search-input",
      attr: { type: "search", placeholder: "Find words inside your daily notes\u2026", enterkeyhint: "search" }
    });
    input.value = this.searchQuery;
    this.bindTextFocus(input);
    this.searchResultsEl = this.el.createDiv({ cls: "dash-search-results" });
    input.addEventListener("input", () => {
      this.searchQuery = input.value;
      if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
      this.searchTimer = window.setTimeout(() => void this.runSearch(), 250);
    });
    this.onCleanup(() => {
      if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
    });
    if (this.searchQuery.trim()) void this.runSearch();
  }
  async runSearch() {
    const el = this.searchResultsEl;
    if (!el) return;
    const q = this.searchQuery.trim();
    el.empty();
    if (!q) return;
    const hits = await searchDailyNoteBodies(this.ctx.app, q);
    if (!el.isConnected) return;
    if (hits.length === 0) {
      el.createDiv({ cls: "dash-muted", text: "Nothing found in your daily notes." });
      return;
    }
    for (const hit of hits) this.renderHit(el, hit);
  }
  renderHit(el, hit) {
    const row = el.createDiv({ cls: "dash-search-row" });
    row.createDiv({ cls: "dash-search-title", text: hit.file.basename });
    row.createDiv({ cls: "dash-search-context", text: hit.snippet });
    row.addEventListener("click", () => this.open(hit.file));
  }
  open(file) {
    void this.ctx.app.workspace.getLeaf(false).openFile(file);
  }
};
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d, delta) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}
function fmt(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// src/shopping.ts
var import_obsidian30 = require("obsidian");
var DEFAULT_LISTS = ["Groceries", "Shopping"];
function genId() {
  const c = globalThis.crypto;
  if (c == null ? void 0 : c.randomUUID) return c.randomUUID();
  return "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
function shoppingPath(plugin) {
  let p = (plugin.settings.shoppingPath || "Shopping.md").trim();
  if (!/\.md$/i.test(p)) p += ".md";
  return (0, import_obsidian30.normalizePath)(p);
}
function normItem(raw) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  if (!raw || typeof raw !== "object") return null;
  const o = raw;
  const name = String((_a = o.name) != null ? _a : "").trim();
  if (!name) return null;
  return {
    id: String((_b = o.id) != null ? _b : "") || genId(),
    list: String((_c = o.list) != null ? _c : "").trim() || DEFAULT_LISTS[0],
    name,
    qty: String((_d = o.qty) != null ? _d : "").trim(),
    unit: String((_e = o.unit) != null ? _e : "").trim(),
    section: String((_f = o.section) != null ? _f : "").trim(),
    store: String((_g = o.store) != null ? _g : "").trim(),
    payer: String((_h = o.payer) != null ? _h : "").trim(),
    note: String((_i = o.note) != null ? _i : "").trim(),
    checked: !!o.checked
  };
}
function defaultStore() {
  return { items: [], lists: [...DEFAULT_LISTS] };
}
async function loadShopping(plugin) {
  const app = plugin.app;
  const f = app.vault.getAbstractFileByPath(shoppingPath(plugin));
  if (!(f instanceof import_obsidian30.TFile)) return defaultStore();
  try {
    const parsed = JSON.parse(await app.vault.read(f));
    const items = Array.isArray(parsed.items) ? parsed.items.map(normItem).filter((x) => !!x) : [];
    const listSet = new Set(Array.isArray(parsed.lists) ? parsed.lists.map((l) => String(l).trim()).filter(Boolean) : []);
    for (const l of DEFAULT_LISTS) listSet.add(l);
    for (const it of items) listSet.add(it.list);
    return { items, lists: [...listSet] };
  } catch (e) {
    return defaultStore();
  }
}
async function saveShopping(plugin, store) {
  const app = plugin.app;
  const path = shoppingPath(plugin);
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir && !app.vault.getAbstractFileByPath(dir)) await app.vault.createFolder(dir).catch(() => {
  });
  const content = JSON.stringify(store, null, 2);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof import_obsidian30.TFile) await app.vault.modify(existing, content);
  else await app.vault.create(path, content);
}
function blankItem(list, p = {}) {
  return { id: genId(), list, name: "", qty: "", unit: "", section: "", store: "", payer: "", note: "", checked: false, ...p };
}
async function addItem(plugin, item) {
  const store = await loadShopping(plugin);
  if (!store.lists.includes(item.list)) store.lists.push(item.list);
  store.items.push(item);
  await saveShopping(plugin, store);
}
async function updateItem(plugin, id, patch) {
  const store = await loadShopping(plugin);
  const it = store.items.find((x) => x.id === id);
  if (!it) return;
  Object.assign(it, patch);
  if (patch.list && !store.lists.includes(patch.list)) store.lists.push(patch.list);
  await saveShopping(plugin, store);
}
async function deleteItem(plugin, id) {
  const store = await loadShopping(plugin);
  store.items = store.items.filter((x) => x.id !== id);
  await saveShopping(plugin, store);
}
async function toggleItem(plugin, id) {
  const store = await loadShopping(plugin);
  const it = store.items.find((x) => x.id === id);
  if (!it) return;
  it.checked = !it.checked;
  await saveShopping(plugin, store);
}
async function clearChecked(plugin, list) {
  const store = await loadShopping(plugin);
  const before = store.items.length;
  store.items = store.items.filter((x) => !(x.list === list && x.checked));
  const removed = before - store.items.length;
  if (removed) await saveShopping(plugin, store);
  return removed;
}
async function addList(plugin, name) {
  const n = name.trim();
  if (!n) return;
  const store = await loadShopping(plugin);
  if (!store.lists.includes(n)) {
    store.lists.push(n);
    await saveShopping(plugin, store);
  }
}
function itemsFor(store, list) {
  return store.items.filter((x) => x.list === list);
}
function groupBySection(items) {
  return groupBy(items, (i) => i.section.trim() || "Uncategorised");
}
function groupByStore(items) {
  return groupBy(items, (i) => i.store.trim() || "Any store");
}
function groupBy(items, key) {
  var _a;
  const map = /* @__PURE__ */ new Map();
  for (const it of items) {
    const k = key(it);
    ((_a = map.get(k)) != null ? _a : map.set(k, []).get(k)).push(it);
  }
  const groups = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [, list] of groups) {
    list.sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name));
  }
  return groups;
}
function listSummary(items) {
  var _a;
  const total = items.length;
  const checked = items.filter((i) => i.checked).length;
  const payers = /* @__PURE__ */ new Map();
  for (const i of items) {
    const p = i.payer.trim() || "\u2014";
    payers.set(p, ((_a = payers.get(p)) != null ? _a : 0) + 1);
  }
  const byPayer = [...payers.entries()].filter(([p]) => p !== "\u2014").sort((a, b) => b[1] - a[1]);
  return { total, checked, byPayer };
}
function parseGroceryNote(content, list) {
  const out = [];
  for (const raw of content.split("\n")) {
    const m = raw.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (!m) continue;
    const checked = m[1].toLowerCase() === "x";
    let body = m[2].trim();
    if (/already stocked/i.test(body)) continue;
    let qty = "";
    let unit = "";
    const amt = body.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    if (amt) {
      const amount = amt[1].trim();
      body = amt[2].trim();
      const qm = amount.match(/^([\d./\s-]+)\s*(.*)$/);
      if (qm && qm[1].trim()) {
        qty = qm[1].trim();
        unit = qm[2].trim();
      } else {
        unit = amount;
      }
    }
    body = body.replace(/\s*—\s*to taste\s*$/i, "").replace(/\s*\*\([^)]*\)\*\s*$/, "").replace(/^\*\*|\*\*$/g, "").trim();
    if (!body) continue;
    out.push(blankItem(list, { name: body, qty, unit, checked, section: "", store: "", payer: "" }));
  }
  return out;
}

// src/shopping-manager.ts
var import_obsidian32 = require("obsidian");

// src/ui/sheet.ts
var import_obsidian31 = require("obsidian");
var SheetModal = class extends import_obsidian31.Modal {
  constructor(app) {
    super(app);
    this.vvHandler = null;
  }
  onOpen() {
    this.modalEl.addClass("dash-sheet");
    if (import_obsidian31.Platform.isMobile) {
      this.modalEl.addClass("dash-sheet-mobile");
      this.trackKeyboard();
    }
    this.contentEl.addClass("dash-sheet-body");
    this.renderBody(this.contentEl);
  }
  /** Lift the sheet by the keyboard's height so fields are never hidden behind it. */
  trackKeyboard() {
    const vv = window.visualViewport;
    if (!vv) return;
    const apply = () => {
      const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      this.modalEl.style.marginBottom = `${keyboard}px`;
      this.modalEl.style.maxHeight = `${vv.height - 12}px`;
    };
    this.vvHandler = apply;
    vv.addEventListener("resize", apply);
    apply();
  }
  onClose() {
    var _a;
    if (this.vvHandler) (_a = window.visualViewport) == null ? void 0 : _a.removeEventListener("resize", this.vvHandler);
    this.vvHandler = null;
    this.contentEl.empty();
  }
};

// src/shopping-manager.ts
function distinct(store, key) {
  var _a;
  const set = /* @__PURE__ */ new Set();
  for (const i of store.items) {
    const v = String((_a = i[key]) != null ? _a : "").trim();
    if (v) set.add(v);
  }
  return [...set].sort();
}
var ShoppingManagerModal = class extends SheetModal {
  constructor(app, plugin, list, onChange) {
    super(app);
    this.plugin = plugin;
    this.onChange = onChange;
    this.groupMode = "section";
    this.storeFilter = "";
    this.payerFilter = "";
    this.list = list != null ? list : "Groceries";
  }
  renderBody(root) {
    root.addClass("shopping");
    this.titleEl.setText("Shopping");
    this.body = root.createDiv();
    void this.refresh();
  }
  async refresh() {
    var _a, _b;
    this.store = await loadShopping(this.plugin);
    if (!this.store.lists.includes(this.list)) this.list = (_a = this.store.lists[0]) != null ? _a : "Groceries";
    this.paint();
    (_b = this.onChange) == null ? void 0 : _b.call(this);
  }
  async mutate(fn) {
    await fn();
    await this.refresh();
  }
  paint() {
    const c = this.body;
    c.empty();
    const top = c.createDiv({ cls: "shopping-top" });
    const sel = top.createEl("select", { cls: "shopping-select" });
    for (const l of this.store.lists) {
      const opt = sel.createEl("option", { text: l });
      if (l === this.list) opt.selected = true;
    }
    sel.addEventListener("change", () => {
      this.list = sel.value;
      this.storeFilter = "";
      this.payerFilter = "";
      this.paint();
    });
    top.createEl("button", { cls: "dash-btn", text: "New list" }).addEventListener("click", () => this.promptNewList());
    top.createEl("button", { cls: "dash-btn dash-btn-primary", text: "\uFF0B Item" }).addEventListener(
      "click",
      () => new ShoppingItemModal(this.app, this.plugin, this.list, null, () => void this.refresh()).open()
    );
    const items = itemsFor(this.store, this.list);
    const stores = [...new Set(items.map((i) => i.store.trim()).filter(Boolean))].sort();
    const payers = [...new Set(items.map((i) => i.payer.trim()).filter(Boolean))].sort();
    const filters = c.createDiv({ cls: "shopping-filters" });
    if (stores.length) this.filterSelect(filters, "Store", stores, this.storeFilter, (v) => {
      this.storeFilter = v;
      this.paint();
    });
    if (payers.length) this.filterSelect(filters, "Payer", payers, this.payerFilter, (v) => {
      this.payerFilter = v;
      this.paint();
    });
    const grp = filters.createDiv({ cls: "shopping-group-toggle" });
    this.groupBtn(grp, "Aisle", "section");
    this.groupBtn(grp, "Store", "store");
    let shown = items;
    if (this.storeFilter) shown = shown.filter((i) => i.store.trim() === this.storeFilter);
    if (this.payerFilter) shown = shown.filter((i) => i.payer.trim() === this.payerFilter);
    const listEl = c.createDiv({ cls: "shopping-list" });
    if (items.length === 0) {
      listEl.createDiv({ cls: "dash-empty", text: "This list is empty. Add an item, or import a recipe grocery list below." });
    } else if (shown.length === 0) {
      listEl.createDiv({ cls: "dash-empty", text: "Nothing matches those filters." });
    } else {
      const groups = this.groupMode === "section" ? groupBySection(shown) : groupByStore(shown);
      for (const [heading, group] of groups) {
        listEl.createDiv({ cls: "shopping-section", text: heading });
        for (const it of group) this.itemRow(listEl, it);
      }
    }
    const sum = listSummary(items);
    const footer = c.createDiv({ cls: "shopping-footer" });
    const status = footer.createDiv({ cls: "shopping-status" });
    status.createSpan({ text: `${sum.checked} of ${sum.total} got` });
    if (sum.byPayer.length) status.createSpan({ cls: "shopping-payers", text: "  \xB7  " + sum.byPayer.map(([p, n]) => `${p}: ${n}`).join(", ") });
    const actions = footer.createDiv({ cls: "shopping-actions" });
    if (sum.checked > 0) actions.createEl("button", { cls: "dash-btn", text: "Clear got items" }).addEventListener(
      "click",
      () => void this.mutate(async () => {
        const n = await clearChecked(this.plugin, this.list);
        new import_obsidian32.Notice(`Removed ${n} item${n === 1 ? "" : "s"}.`);
      })
    );
    actions.createEl("button", { cls: "dash-btn", text: "Import recipe groceries" }).addEventListener("click", () => void this.importGroceries());
  }
  filterSelect(parent, label, options, value, onChange) {
    const wrap = parent.createDiv({ cls: "shopping-filter" });
    wrap.createSpan({ cls: "shopping-filter-label", text: label });
    const sel = wrap.createEl("select");
    const all = sel.createEl("option", { text: `All`, value: "" });
    if (!value) all.selected = true;
    for (const o of options) {
      const opt = sel.createEl("option", { text: o, value: o });
      if (o === value) opt.selected = true;
    }
    sel.addEventListener("change", () => onChange(sel.value));
  }
  groupBtn(parent, label, mode) {
    const b = parent.createEl("button", { cls: "dash-btn shopping-grp" + (this.groupMode === mode ? " is-on" : ""), text: label });
    b.addEventListener("click", () => {
      this.groupMode = mode;
      this.paint();
    });
  }
  itemRow(parent, it) {
    const row = parent.createDiv({ cls: "shopping-item" + (it.checked ? " is-checked" : "") });
    const box = row.createEl("input", { type: "checkbox" });
    box.checked = it.checked;
    box.addEventListener("change", () => void this.mutate(() => toggleItem(this.plugin, it.id)));
    const main = row.createDiv({ cls: "shopping-item-main" });
    const amount = [it.qty, it.unit].filter(Boolean).join(" ");
    const label = main.createDiv({ cls: "shopping-item-name" });
    if (amount) label.createSpan({ cls: "shopping-item-qty", text: amount + " " });
    label.createSpan({ text: it.name });
    const chips = main.createDiv({ cls: "shopping-item-chips" });
    if (this.groupMode !== "store" && it.store) chips.createSpan({ cls: "dash-chip", text: it.store });
    if (it.payer) chips.createSpan({ cls: "dash-chip dash-chip-cold", text: it.payer });
    if (it.note) chips.createSpan({ cls: "shopping-item-note", text: it.note });
    const acts = row.createDiv({ cls: "shopping-item-actions" });
    acts.createEl("button", { cls: "shopping-icon", text: "\u270E", attr: { "aria-label": "Edit" } }).addEventListener(
      "click",
      () => new ShoppingItemModal(this.app, this.plugin, this.list, it, () => void this.refresh()).open()
    );
    acts.createEl("button", { cls: "shopping-icon", text: "\u{1F5D1}", attr: { "aria-label": "Delete" } }).addEventListener(
      "click",
      () => void this.mutate(() => deleteItem(this.plugin, it.id))
    );
  }
  promptNewList() {
    const modal = new SheetPrompt(this.app, "New list", "e.g. Hardware store", async (name) => {
      if (!name.trim()) return;
      await addList(this.plugin, name.trim());
      this.list = name.trim();
      await this.refresh();
    });
    modal.open();
  }
  async importGroceries() {
    const path = this.plugin.bridge.groceryListPath();
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian32.TFile)) {
      new import_obsidian32.Notice(`No grocery note found at "${path}". Generate one from the recipe manager first.`);
      return;
    }
    const parsed = parseGroceryNote(await this.app.vault.read(file), this.list);
    if (parsed.length === 0) {
      new import_obsidian32.Notice("No grocery items found to import.");
      return;
    }
    await this.mutate(async () => {
      const store = await loadShopping(this.plugin);
      const existing = new Set(itemsFor(store, this.list).map((i) => i.name.toLowerCase()));
      let added = 0;
      for (const it of parsed) {
        if (existing.has(it.name.toLowerCase())) continue;
        store.items.push(it);
        added++;
      }
      await saveShopping(this.plugin, store);
      new import_obsidian32.Notice(`Imported ${added} item${added === 1 ? "" : "s"} into ${this.list}.`);
    });
  }
};
var ShoppingItemModal = class extends SheetModal {
  constructor(app, plugin, list, existing, onDone) {
    super(app);
    this.plugin = plugin;
    this.existing = existing;
    this.onDone = onDone;
    this.isNew = existing === null;
    this.draft = existing ? { ...existing } : blankItem(list);
  }
  renderBody(root) {
    root.addClass("shopping-item-edit");
    this.titleEl.setText(this.isNew ? "Add item" : "Edit item");
    void this.build(root);
  }
  async build(root) {
    const store = await loadShopping(this.plugin);
    new import_obsidian32.Setting(root).setName("Item").addText((t) => t.setValue(this.draft.name).setPlaceholder("e.g. milk").onChange((v) => this.draft.name = v));
    const amount = root.createDiv({ cls: "shopping-amount-row" });
    new import_obsidian32.Setting(amount).setName("Qty").addText((t) => t.setValue(this.draft.qty).setPlaceholder("2").onChange((v) => this.draft.qty = v));
    this.datalistField(amount, "Measure", "unit", store, this.draft.unit, "gal, lb, box", (v) => this.draft.unit = v);
    this.datalistField(root, "Section (aisle)", "section", store, this.draft.section, "Produce, Dairy\u2026", (v) => this.draft.section = v);
    this.datalistField(root, "Store", "store", store, this.draft.store, "Kroger, Target\u2026", (v) => this.draft.store = v);
    this.datalistField(root, "Who's paying", "payer", store, this.draft.payer, "Me, Parents\u2026", (v) => this.draft.payer = v);
    new import_obsidian32.Setting(root).setName("List").addDropdown((d) => {
      var _a;
      for (const l of store.lists) d.addOption(l, l);
      d.setValue(store.lists.includes(this.draft.list) ? this.draft.list : (_a = store.lists[0]) != null ? _a : this.draft.list);
      d.onChange((v) => this.draft.list = v);
    });
    new import_obsidian32.Setting(root).setName("Note").addText((t) => t.setValue(this.draft.note).setPlaceholder("optional").onChange((v) => this.draft.note = v));
    const btns = root.createDiv({ cls: "shopping-edit-buttons" });
    btns.createEl("button", { cls: "dash-btn dash-btn-primary", text: this.isNew ? "Add item" : "Save" }).addEventListener("click", () => void this.save());
  }
  datalistField(parent, label, key, store, value, placeholder, onChange) {
    new import_obsidian32.Setting(parent).setName(label).addText((t) => {
      t.setValue(value).setPlaceholder(placeholder).onChange((v) => onChange(v));
      const id = `sl-${String(key)}-${Math.random().toString(36).slice(2, 7)}`;
      const dl = t.inputEl.ownerDocument.createElement("datalist");
      dl.id = id;
      for (const v of distinct(store, key)) {
        const opt = dl.ownerDocument.createElement("option");
        opt.value = v;
        dl.appendChild(opt);
      }
      t.inputEl.setAttribute("list", id);
      t.inputEl.after(dl);
    });
  }
  async save() {
    if (!this.draft.name.trim()) {
      new import_obsidian32.Notice("Give the item a name.");
      return;
    }
    this.draft.name = this.draft.name.trim();
    if (this.isNew) await addItem(this.plugin, this.draft);
    else await updateItem(this.plugin, this.existing.id, this.draft);
    new import_obsidian32.Notice(this.isNew ? "Item added." : "Item updated.");
    this.onDone();
    this.close();
  }
};
var SheetPrompt = class extends SheetModal {
  constructor(app, heading, placeholder, onSubmit) {
    super(app);
    this.heading = heading;
    this.placeholder = placeholder;
    this.onSubmit = onSubmit;
    this.value = "";
  }
  renderBody(root) {
    this.titleEl.setText(this.heading);
    new import_obsidian32.Setting(root).addText((t) => {
      t.setPlaceholder(this.placeholder).onChange((v) => this.value = v);
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void this.submit();
        }
      });
    });
    root.createEl("button", { cls: "dash-btn dash-btn-primary", text: "Create" }).addEventListener("click", () => void this.submit());
  }
  async submit() {
    await this.onSubmit(this.value);
    this.close();
  }
};

// src/panels/shopping.ts
var ShoppingPanel = class extends BasePanel2 {
  constructor() {
    super(...arguments);
    this.id = "shopping";
    this.title = "Shopping";
  }
  async renderBody() {
    var _a;
    const head = placard2(this.el, "Shopping");
    const tools = head.createDiv({ cls: "dash-qotd-tools" });
    tools.createEl("button", { cls: "dash-qotd-add", text: "\uFF0B", attr: { "aria-label": "Add an item" } }).addEventListener("click", () => this.add());
    tools.createEl("button", { cls: "dash-qotd-add", text: "\u2630", attr: { "aria-label": "Open the shopping list" } }).addEventListener("click", () => this.open());
    const store = await loadShopping(this.ctx.plugin);
    const card = this.el.createDiv({ cls: "shopping-card" });
    const withItems = store.lists.filter((l) => itemsFor(store, l).length > 0);
    if (withItems.length === 0) {
      card.createDiv({ cls: "dash-muted", text: "Nothing on your lists yet. Add an item, or bring in a Recipe Manager grocery list from \u201COpen list\u201D." });
      card.createEl("button", { cls: "dash-qotd-addbig", text: "Add an item" }).addEventListener("click", () => this.add());
      return;
    }
    const chips = card.createDiv({ cls: "shopping-card-lists" });
    for (const l of withItems) {
      const items = itemsFor(store, l);
      const left = items.filter((i) => !i.checked).length;
      const chip = chips.createEl("button", { cls: "shopping-card-chip", text: `${l} \xB7 ${left} left` });
      chip.addEventListener("click", () => this.open(l));
    }
    const active = (_a = withItems.find((l) => itemsFor(store, l).some((i) => !i.checked))) != null ? _a : withItems[0];
    this.preview(card, store, active);
  }
  preview(card, store, list) {
    const unchecked = itemsFor(store, list).filter((i) => !i.checked);
    if (unchecked.length === 0) {
      card.createDiv({ cls: "dash-muted", text: `${list}: all got. Nice.` });
      return;
    }
    const wrap = card.createDiv({ cls: "shopping-card-preview" });
    const groups = groupBySection(unchecked);
    let shown = 0;
    const LIMIT = 8;
    outer: for (const [section, group] of groups) {
      wrap.createDiv({ cls: "shopping-card-section", text: section });
      for (const it of group) {
        if (shown >= LIMIT) break outer;
        shown++;
        const row = wrap.createDiv({ cls: "shopping-card-item" });
        const box = row.createEl("input", { type: "checkbox" });
        box.addEventListener("change", () => void toggleItem(this.ctx.plugin, it.id).then(() => this.ctx.requestRefresh("manual")));
        const amount = [it.qty, it.unit].filter(Boolean).join(" ");
        row.createSpan({ cls: "shopping-card-item-text", text: (amount ? amount + " " : "") + it.name });
        if (it.payer) row.createSpan({ cls: "dash-chip dash-chip-cold", text: it.payer });
      }
    }
    const remaining = unchecked.length - shown;
    const foot = card.createDiv({ cls: "shopping-card-foot" });
    if (remaining > 0) foot.createSpan({ cls: "dash-muted", text: `+${remaining} more` });
    foot.createEl("button", { cls: "dash-qotd-addbig", text: "Open list" }).addEventListener("click", () => this.open(list));
  }
  add() {
    new ShoppingItemModal(this.ctx.app, this.ctx.plugin, "Groceries", null, () => this.ctx.requestRefresh("manual")).open();
  }
  open(list) {
    new ShoppingManagerModal(this.ctx.app, this.ctx.plugin, list, () => this.ctx.requestRefresh("manual")).open();
  }
};

// src/quotes.ts
var import_obsidian33 = require("obsidian");
function genId2() {
  const c = globalThis.crypto;
  if (c == null ? void 0 : c.randomUUID) return c.randomUUID();
  return "q-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
function quotesPath(plugin) {
  let p = (plugin.settings.quotesPath || "Quotes.md").trim();
  if (!/\.md$/i.test(p)) p += ".md";
  return (0, import_obsidian33.normalizePath)(p);
}
function normalize(q) {
  var _a, _b, _c, _d;
  if (!q || typeof q !== "object") return null;
  const o = q;
  const text = String((_a = o.text) != null ? _a : "").trim();
  if (!text) return null;
  return {
    id: String((_b = o.id) != null ? _b : "") || genId2(),
    text,
    author: String((_c = o.author) != null ? _c : "").trim(),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String((_d = o.date) != null ? _d : "")) ? String(o.date) : ""
  };
}
function parseLegacyMarkdown(content) {
  var _a;
  const out = [];
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("-")) continue;
    let body = line.replace(/^-\s*/, "").trim();
    if (!body) continue;
    let date = "";
    const dm = body.match(/\s*\((\d{4}-\d{2}-\d{2})\)\s*$/);
    if (dm) {
      date = dm[1];
      body = body.slice(0, dm.index).trim();
    }
    let text = "";
    let author = "";
    let m = body.match(/^[“"](.+)[”"]\s*(?:[—–-]\s*(.+))?$/);
    if (m) {
      text = m[1].trim();
      author = ((_a = m[2]) != null ? _a : "").trim();
    } else {
      m = body.match(/^(.+?)\s+[—–]\s+(.+)$/);
      if (m) {
        text = m[1].trim();
        author = m[2].trim();
      } else {
        text = body;
      }
    }
    if (text) out.push({ id: genId2(), text, author, date });
  }
  return out;
}
function tryParseStore(raw) {
  try {
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return { quotes: p.map(normalize).filter((q) => !!q) };
    if (p && typeof p === "object" && Array.isArray(p.quotes)) {
      return { quotes: p.quotes.map(normalize).filter((q) => !!q) };
    }
  } catch (e) {
  }
  return null;
}
async function loadStore(plugin) {
  const app = plugin.app;
  const f = app.vault.getAbstractFileByPath(quotesPath(plugin));
  if (!(f instanceof import_obsidian33.TFile)) return { quotes: [] };
  const raw = await app.vault.read(f);
  const parsed = tryParseStore(raw);
  if (parsed) return parsed;
  const migrated = { quotes: parseLegacyMarkdown(raw) };
  await saveStore(plugin, migrated);
  return migrated;
}
async function saveStore(plugin, store) {
  const app = plugin.app;
  const path = quotesPath(plugin);
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir && !app.vault.getAbstractFileByPath(dir)) await app.vault.createFolder(dir).catch(() => {
  });
  const content = JSON.stringify(store, null, 2);
  const existing = app.vault.getAbstractFileByPath(path);
  if (existing instanceof import_obsidian33.TFile) await app.vault.modify(existing, content);
  else await app.vault.create(path, content);
}
async function loadQuotes(plugin) {
  return (await loadStore(plugin)).quotes;
}
async function addQuote(plugin, q) {
  const store = await loadStore(plugin);
  store.quotes.push({ id: genId2(), text: q.text.trim(), author: q.author.trim(), date: q.date.trim() });
  await saveStore(plugin, store);
}
async function updateQuote(plugin, id, patch) {
  const store = await loadStore(plugin);
  const found = store.quotes.find((x) => x.id === id);
  if (!found) return;
  found.text = patch.text.trim();
  found.author = patch.author.trim();
  found.date = patch.date.trim();
  await saveStore(plugin, store);
}
async function deleteQuote(plugin, id) {
  const store = await loadStore(plugin);
  store.quotes = store.quotes.filter((x) => x.id !== id);
  await saveStore(plugin, store);
}
function quoteForDay(quotes, date) {
  const n = quotes.length;
  if (n === 0) return null;
  const day = date != null ? date : (0, import_obsidian33.moment)().format("YYYY-MM-DD");
  const sameDay = quotes.find((q) => q.date === day);
  if (sameDay) return sameDay;
  const m = (0, import_obsidian33.moment)(day, "YYYY-MM-DD");
  const dayNumber = Math.floor(m.valueOf() / 864e5);
  const idx = (dayNumber % n + n) % n;
  return quotes[idx];
}

// src/quote-catalogue.ts
var import_obsidian34 = require("obsidian");
var QuoteEditModal = class extends SheetModal {
  constructor(app, plugin, existing, onDone) {
    var _a, _b, _c;
    super(app);
    this.plugin = plugin;
    this.existing = existing;
    this.onDone = onDone;
    this.isNew = existing === null;
    this.text = (_a = existing == null ? void 0 : existing.text) != null ? _a : "";
    this.author = (_b = existing == null ? void 0 : existing.author) != null ? _b : "";
    this.date = (_c = existing == null ? void 0 : existing.date) != null ? _c : "";
  }
  renderBody(root) {
    root.addClass("quote-edit");
    this.titleEl.setText(this.isNew ? "Add a quote" : "Edit quote");
    if (this.isNew) root.createDiv({ cls: "dash-empty", text: "Something someone said that you want to remember. Date it today to make it today's Quote of the Day." });
    new import_obsidian34.Setting(root).setName("Quote").addTextArea((t) => t.setValue(this.text).setPlaceholder("What they said").onChange((v) => this.text = v));
    new import_obsidian34.Setting(root).setName("Who said it").addText((t) => t.setValue(this.author).setPlaceholder("e.g. Alex (optional)").onChange((v) => this.author = v));
    let dateInput;
    new import_obsidian34.Setting(root).setName("Date spoken / recorded").setDesc("Optional. A quote dated today becomes the Quote of the Day.").addText((t) => {
      t.inputEl.type = "date";
      dateInput = t.inputEl;
      t.setValue(this.date).onChange((v) => this.date = v);
    }).addExtraButton(
      (b) => b.setIcon("calendar-clock").setTooltip("Today").onClick(() => {
        this.date = (0, import_obsidian34.moment)().format("YYYY-MM-DD");
        dateInput.value = this.date;
      })
    );
    const btns = root.createDiv({ cls: "quote-edit-buttons" });
    btns.createEl("button", { cls: "dash-btn dash-btn-primary", text: this.isNew ? "Add quote" : "Save" }).addEventListener("click", () => void this.save());
  }
  async save() {
    var _a;
    if (!this.text.trim()) {
      new import_obsidian34.Notice("Type the quote first.");
      return;
    }
    const payload = { text: this.text, author: this.author, date: this.date };
    if (this.isNew) await addQuote(this.plugin, payload);
    else await updateQuote(this.plugin, this.existing.id, payload);
    new import_obsidian34.Notice(this.isNew ? "Quote added." : "Quote updated.");
    (_a = this.onDone) == null ? void 0 : _a.call(this);
    this.close();
  }
};
var QuoteCatalogueModal = class extends SheetModal {
  constructor(app, plugin, onChange) {
    super(app);
    this.plugin = plugin;
    this.onChange = onChange;
    this.query = "";
    this.quotes = [];
  }
  renderBody(root) {
    root.addClass("quote-catalogue");
    this.titleEl.setText("Quotes");
    const bar = root.createDiv({ cls: "quote-bar" });
    bar.createEl("button", { cls: "dash-btn dash-btn-primary", text: "\uFF0B Add quote" }).addEventListener(
      "click",
      () => new QuoteEditModal(this.app, this.plugin, null, () => void this.refresh()).open()
    );
    const search = bar.createEl("input", { cls: "quote-search", attr: { type: "search", placeholder: "Search quotes or people\u2026" } });
    search.addEventListener("input", () => {
      this.query = search.value.trim().toLowerCase();
      this.paint();
    });
    this.container = root.createDiv({ cls: "quote-list" });
    void this.refresh();
  }
  async refresh() {
    var _a;
    this.quotes = await loadQuotes(this.plugin);
    this.paint();
    (_a = this.onChange) == null ? void 0 : _a.call(this);
  }
  paint() {
    const c = this.container;
    c.empty();
    const q = this.query;
    const list = q ? this.quotes.filter((x) => x.text.toLowerCase().includes(q) || x.author.toLowerCase().includes(q) || x.date.includes(q)) : this.quotes;
    if (this.quotes.length === 0) {
      c.createDiv({ cls: "dash-empty", text: "No quotes yet. Add things people have said \u2014 they'll show up as the Quote of the Day." });
      return;
    }
    if (list.length === 0) {
      c.createDiv({ cls: "dash-empty", text: `No quotes match \u201C${this.query}\u201D.` });
      return;
    }
    c.createDiv({ cls: "quote-count", text: `${list.length} of ${this.quotes.length} quote${this.quotes.length === 1 ? "" : "s"}` });
    for (const quote of list) this.row(c, quote);
  }
  row(parent, quote) {
    const row = parent.createDiv({ cls: "quote-item" });
    row.createDiv({ cls: "quote-item-text", text: `\u201C${quote.text}\u201D` });
    const meta = [];
    if (quote.author) meta.push(quote.author);
    if (quote.date) meta.push(quote.date);
    if (meta.length) row.createDiv({ cls: "quote-item-meta", text: meta.join(" \xB7 ") });
    const actions = row.createDiv({ cls: "quote-item-actions" });
    actions.createEl("button", { cls: "dash-btn", text: "Edit" }).addEventListener(
      "click",
      () => new QuoteEditModal(this.app, this.plugin, quote, () => void this.refresh()).open()
    );
    actions.createEl("button", { cls: "dash-btn quote-danger", text: "Delete" }).addEventListener("click", () => void this.remove(quote));
  }
  async remove(quote) {
    await deleteQuote(this.plugin, quote.id);
    new import_obsidian34.Notice("Quote deleted.");
    await this.refresh();
  }
};

// src/panels/quote.ts
var QuotePanel = class extends BasePanel2 {
  constructor() {
    super(...arguments);
    this.id = "quote";
    this.title = "Quote of the Day";
  }
  async renderBody() {
    const head = placard2(this.el, "Quote of the Day");
    const tools = head.createDiv({ cls: "dash-qotd-tools" });
    tools.createEl("button", { cls: "dash-qotd-add", text: "\uFF0B", attr: { "aria-label": "Add a quote" } }).addEventListener("click", () => this.openAdd());
    tools.createEl("button", { cls: "dash-qotd-add", text: "\u2630", attr: { "aria-label": "Open the quotes catalogue" } }).addEventListener("click", () => this.openCatalogue());
    const card = this.el.createDiv({ cls: "dash-qotd" });
    const quotes = await loadQuotes(this.ctx.plugin);
    if (quotes.length === 0) {
      card.createDiv({ cls: "dash-muted", text: "No quotes yet. Add things people have said that made you smile, and one will show up here each day." });
      card.createEl("button", { cls: "dash-qotd-addbig", text: "Add a quote" }).addEventListener("click", () => this.openAdd());
      return;
    }
    const q = quoteForDay(quotes);
    const mark = card.createDiv({ cls: "dash-qotd-mark", text: "\u201C" });
    mark.setAttribute("aria-hidden", "true");
    card.createDiv({ cls: "dash-qotd-text", text: q.text });
    const attribution = [];
    if (q.author) attribution.push(q.author);
    if (q.date) attribution.push(q.date);
    if (attribution.length) card.createDiv({ cls: "dash-qotd-author", text: `\u2014 ${attribution.join(", ")}` });
  }
  openAdd() {
    new QuoteEditModal(this.ctx.app, this.ctx.plugin, null, () => this.ctx.requestRefresh("manual")).open();
  }
  openCatalogue() {
    new QuoteCatalogueModal(this.ctx.app, this.ctx.plugin, () => this.ctx.requestRefresh("manual")).open();
  }
};

// src/weekreview.ts
var import_obsidian35 = require("obsidian");

// src/core/journalfields.ts
var JOURNAL_FIELDS = {
  braindump: { label: "Brain dump", spec: headingField("Brain dump") },
  journal: { label: "Journal", spec: headingField("Journal") },
  tomorrow: { label: "Reference tomorrow", spec: headingField("Reference tomorrow") }
};
function isJournalField(v) {
  return Object.prototype.hasOwnProperty.call(JOURNAL_FIELDS, v);
}

// src/weekreview.ts
function friendlyWeekReviewConfig(plugin) {
  return {
    title: "Week in review",
    compilingText: "Looking back over your week\u2026",
    compile: () => compile(plugin)
  };
}
async function compile(plugin) {
  var _a;
  const s = plugin.settings;
  const days = [];
  for (let i = 6; i >= 0; i--) days.push((0, import_obsidian35.moment)().subtract(i, "days").format("YYYY-MM-DD"));
  const perDay = [];
  let totalCompleted = 0;
  let journalDays = 0;
  let mealsDays = 0;
  let contactLines = 0;
  const contacts = /* @__PURE__ */ new Set();
  const crm = plugin.bridge.crmAvailable() ? plugin.bridge.crmLogTarget() : null;
  for (const date of days) {
    const raw = await readDailyNoteRaw(plugin.app, date);
    const completed = countBullets(readField(raw, headingField(s.completedTasksHeading)));
    totalCompleted += completed;
    perDay.push({ date, completed });
    if (Object.values(JOURNAL_FIELDS).some((f) => readField(raw, f.spec).trim().length > 0)) journalDays++;
    if (readHeadingSection(raw, "Meals").trim().length > 0) mealsDays++;
    if (crm) {
      const lines = readMarkerLogLines(raw, crm.marker, crm.heading);
      contactLines += lines.length;
      for (const line of lines) {
        const m = line.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
        if (m) contacts.add(((_a = m[2]) != null ? _a : m[1]).trim());
      }
    }
  }
  const blocks = [
    {
      head: "To-dos finished",
      figure: String(totalCompleted),
      bars: perDay.map((d) => ({ label: (0, import_obsidian35.moment)(d.date, "YYYY-MM-DD").format("dd")[0], count: d.completed }))
    },
    { head: "Journal", line: `You wrote on ${journalDays} of 7 ${plural(journalDays, "day", "days")}.` }
  ];
  if (plugin.bridge.recipesAvailable()) {
    blocks.push({ head: "Meals planned", line: `${mealsDays} of 7 ${plural(mealsDays, "day", "days")}.` });
  }
  if (crm) {
    const names = [...contacts].sort((a, b) => a.localeCompare(b));
    blocks.push({
      head: "Caught up with",
      line: `${contactLines} ${plural(contactLines, "catch-up", "catch-ups")} \xB7 ${names.length} ${plural(names.length, "person", "people")}.`,
      chips: names.length > 0 ? names : void 0
    });
  }
  return { header: "Your last seven days, at a glance.", blocks };
}
function countBullets(body) {
  return body.split("\n").filter((l) => /^\s*-\s+\S/.test(l)).length;
}
function plural(n, one, many) {
  return n === 1 ? one : many;
}

// src/copy.ts
var COMMAND_OFFLINE = "This button needs its plugin. Enable the matching plugin to turn it on.";
var FRIENDLY_CATEGORY_COPY = {
  newNoteTitle: "New note",
  titleLabel: "Title",
  titlePlaceholder: "Note title",
  categoryLabel: "Category",
  categoryDesc: "Optional \u2014 file it under a category as you create it.",
  orNewCategoryLabel: "Or a new category",
  orNewCategoryDesc: "Creates the category and files this note under it.",
  newCategoryPlaceholder: "New category name",
  noneOption: "(none)",
  cancel: "Cancel",
  create: "Create",
  noteNeedsTitle: "Please give the note a title.",
  newCategoryTitle: "New category",
  nameLabel: "Name",
  namePlaceholder: "Category name",
  categoryNeedsName: "Please give the category a name.",
  noNotesToAssign: "There are no notes to file yet. Make one first.",
  pickNotePlaceholder: "Pick a note to file\u2026",
  assignTitle: "File under a category",
  existingCategoryLabel: "Existing category",
  orUseCategoryDesc: "Leave blank to use the one above.",
  assign: "File it",
  pickOrNameCategory: "Pick or name a category.",
  assignedNotice: "Filed \u201C{note}\u201D under \u201C{category}\u201D."
};
var FRIENDLY_SEARCH_COPY = {
  title: "Search",
  newNote: "+ Note",
  newCategory: "+ Category",
  assign: "File under category",
  searchPlaceholder: "Search your notes\u2026",
  categoriesHeading: "Categories \xB7 {n}",
  noCategories: "No categories yet. Make one to start grouping your notes.",
  categoryEmpty: "Empty.",
  recentHeading: "Recently edited \xB7 {n}",
  noNotesInScope: "No notes to search here yet.",
  noMatches: "No matching notes."
};
var FRIENDLY_JOURNAL_COPY = {
  title: "Journal",
  carryHeading: "Reference tomorrow",
  carryLabel: "From yesterday \u2014 to reference today",
  fields: Object.values(JOURNAL_FIELDS).map((f) => ({ label: f.label, spec: f.spec, placeholder: `Write in \u201C${f.label}\u201D\u2026` }))
};
var FRIENDLY_MEALS_COPY = {
  title: "Meals",
  offline: "This panel works with the Recipe Manager plugin. Once it's installed and turned on, your planned meals and grocery list show up here. You can also hide this panel in the plugin settings.",
  plannedHeading: "Planned today",
  noMeals: "No meals planned for today.",
  openRecipe: "Open recipe \u2192",
  groceryHeading: "Grocery list",
  noGroceryAt: "No grocery list yet. Use \u201CBuild grocery list\u201D below to make one.",
  groceryEmpty: "Your grocery list is empty.",
  remaining: "{remaining} of {total} still to get",
  commandOffline: COMMAND_OFFLINE,
  commands: [
    { id: "recipe-manager:meal-plan", label: "Plan a meal", cls: "dash-btn-primary" },
    { id: "recipe-manager:grocery-list", label: "Build grocery list" },
    { id: "recipe-manager:open-recipe", label: "Open a recipe" },
    { id: "recipe-manager:new-recipe", label: "New recipe" },
    { id: "recipe-manager:recipe-index", label: "All recipes" }
  ]
};
var FRIENDLY_PLACES_COPY = {
  title: "Places",
  empty: "No places yet. Add shortcuts to your favourite notes and folders in the plugin settings.",
  commandOffline: COMMAND_OFFLINE
};
var FRIENDLY_SECOND_BRAIN_COPY = {
  title: "Second Brain",
  activeBadge: "{n} active",
  newNote: "+ New project",
  searchPlaceholder: "Search your projects\u2026",
  noMatches: "No matching projects.",
  noActiveNotes: "No active projects yet. Tap \u201C+ New project\u201D to start one.",
  moreHint: "+{n} more \u2014 type to search.",
  archiveTooltip: "Archive (project finished)",
  deleteTooltip: "Delete",
  unarchiveTooltip: "Move back to active",
  archivedHeading: "Archived \xB7 {n}",
  restoredNotice: "Moved \u201C{name}\u201D back to active projects.",
  archivedNotice: "Archived \u201C{name}\u201D.",
  deletedNotice: "Deleted \u201C{name}\u201D.",
  deleteHeading: "Delete \u201C{name}\u201D?",
  deleteBody: "It goes to your configured trash. This can\u2019t be undone from here.",
  cancel: "Cancel",
  deleteConfirm: "Delete",
  newNoteTitle: "New project",
  noteTitleLabel: "Project name",
  noteTitlePlaceholder: "What is this project called?",
  create: "Create",
  noteNeedsTitle: "Please give the project a name."
};

// src/panels/actions.ts
var GROUPS = [
  {
    pluginId: "recipe-manager",
    title: "Recipes",
    commands: [
      ["recipe-manager:meal-plan", "Plan a meal"],
      ["recipe-manager:grocery-list", "Build grocery list"],
      ["recipe-manager:new-recipe", "New recipe"],
      ["recipe-manager:open-recipe", "Open a recipe"],
      ["recipe-manager:recipe-index", "All recipes"]
    ]
  },
  {
    pluginId: "simple-contact-manager",
    title: "Contacts",
    commands: [
      ["simple-contact-manager:log-interaction", "Log a catch-up"],
      ["simple-contact-manager:new-contact", "New contact"],
      ["simple-contact-manager:open-dashboard", "All contacts"]
    ]
  },
  {
    pluginId: "arfid-tracker",
    title: "Food log",
    commands: [
      ["arfid-tracker:quick-log", "Log a food"],
      ["arfid-tracker:add-food", "Add a food"],
      ["arfid-tracker:open-dashboard", "Food dashboard"]
    ]
  }
];
var ActionsPanel = class extends BasePanel2 {
  constructor() {
    super(...arguments);
    this.id = "actions";
    this.title = "Quick Actions";
  }
  renderBody() {
    const { app, plugin, bridge } = this.ctx;
    const refresh = () => this.ctx.requestRefresh("vault");
    placard2(this.el, "Quick Actions");
    const mine = this.el.createDiv({ cls: "dash-btn-row" });
    this.button(mine, "+ To-do", "dash-btn-primary", () => new TodoEditModal2(app, this.ctx.todos, void 0, refresh).open());
    this.button(mine, "+ Event", "", () => new LocalEventModal(app, friendlyLocalEvents(plugin), void 0, refresh).open());
    this.button(mine, "+ Shopping", "", () => new ShoppingItemModal(app, plugin, "Groceries", null, refresh).open());
    this.button(
      mine,
      "Week's goals",
      "",
      () => new WeeklyGoalsModal(app, friendlyWeeklyGoals(plugin), this.ctx.todos, currentWeekKey(), refresh, FRIENDLY_WEEKLYGOALS_COPY).open()
    );
    this.button(mine, "Week in review", "", () => new WeekReviewModal(app, friendlyWeekReviewConfig(plugin)).open());
    for (const group of GROUPS) {
      if (!bridge.isPluginEnabled(group.pluginId)) continue;
      const block = this.el.createDiv({ cls: "dash-actions-group" });
      block.createDiv({ cls: "dash-subhead", text: group.title });
      const row = block.createDiv({ cls: "dash-btn-row" });
      for (const [id, label] of group.commands) commandButton(row, app, id, label, { cls: "dash-btn-sm", offlineText: COMMAND_OFFLINE });
    }
  }
  button(parent, text, cls, onClick) {
    parent.createEl("button", { cls: `dash-btn dash-btn-sm ${cls}`.trim(), text }).addEventListener("click", onClick);
  }
};

// src/panels/contacts.ts
var import_obsidian36 = require("obsidian");
var ContactsPanel = class extends BasePanel2 {
  constructor() {
    super(...arguments);
    this.id = "contacts";
    this.title = "Contacts";
    this.reconciled = false;
  }
  async setup() {
    if (this.reconciled || !this.ctx.bridge.crmAvailable()) return;
    this.reconciled = true;
    await this.reconcile();
  }
  renderBody() {
    const { bridge, app } = this.ctx;
    placard2(this.el, "Contacts");
    if (!bridge.crmAvailable()) {
      this.el.createDiv({
        cls: "dash-empty",
        text: "This panel works with the Simple Contact Manager plugin. Once it's installed and turned on, the people you're due to catch up with show up here. You can also hide this panel in the plugin settings."
      });
      return;
    }
    const contacts = bridge.crmContacts();
    const due = contacts.filter((c) => c.overdue || c.dueToday);
    const actions = this.el.createDiv({ cls: "dash-btn-row" });
    commandButton(actions, app, "simple-contact-manager:log-interaction", "Log a catch-up", { cls: "dash-btn-primary", offlineText: COMMAND_OFFLINE });
    const find = actions.createEl("button", { cls: "dash-btn", text: "Find someone" });
    find.addEventListener("click", () => new ContactSearchModal(app, contacts).open());
    commandButton(actions, app, "simple-contact-manager:new-contact", "New contact", { offlineText: COMMAND_OFFLINE });
    const list = this.el.createDiv({ cls: "dash-crm-list" });
    if (due.length === 0) {
      list.createDiv({ cls: "dash-empty", text: "No one is due for a catch-up today." });
      return;
    }
    for (const c of due) this.renderRow(list, c);
  }
  renderRow(parent, c) {
    const row = parent.createDiv({ cls: "dash-crm-row" });
    if (c.overdue) row.addClass("is-overdue");
    const main = row.createDiv({ cls: "dash-crm-main" });
    const name = main.createEl("a", { cls: "dash-crm-name", text: c.name });
    name.addEventListener("click", (e) => {
      e.preventDefault();
      const file = this.ctx.app.vault.getAbstractFileByPath(c.path);
      if (file instanceof import_obsidian36.TFile) void this.ctx.app.workspace.getLeaf(false).openFile(file);
    });
    const meta = main.createDiv({ cls: "dash-crm-meta" });
    if (c.priority) meta.createSpan({ cls: "dash-chip", text: c.priority });
    meta.createSpan({ cls: c.overdue ? "dash-chip dash-chip-warn" : "dash-chip", text: c.overdue ? "overdue" : "due today" });
    if (c.daysSince !== null) meta.createSpan({ cls: "dash-chip dash-chip-cold", text: `${c.daysSince} days since` });
    const log = row.createEl("button", { cls: "dash-btn dash-btn-sm", text: "Log" });
    log.addEventListener("click", () => {
      if (this.ctx.bridge.crmLogViaApi(c.path)) return;
      new InteractionModal(this.ctx.app, c.name, async (text) => {
        const ok = await this.ctx.bridge.crmWriteInteraction(c.path, text);
        new import_obsidian36.Notice(ok ? `Logged a catch-up with ${c.name}.` : "That couldn't be logged.");
        if (ok) this.ctx.requestRefresh("manual");
      }).open();
    });
  }
  /** Backfill any of today's interactions (logged in a contact note) that aren't
   * in today's daily note yet. Best-effort. */
  async reconcile() {
    try {
      const tails = await this.ctx.bridge.crmReconcileLines();
      if (tails.length === 0) return;
      const { marker, heading } = this.ctx.bridge.crmLogTarget();
      const time = (0, import_obsidian36.moment)().format("HH:mm");
      for (const tail of tails) await appendDailyLogLine(this.ctx.app, `- ${time} ${tail}`, { marker, heading, time });
    } catch (e) {
      console.error("Daily Dashboard: contacts reconcile failed", e);
    }
  }
};
var ContactSearchModal = class extends import_obsidian36.FuzzySuggestModal {
  constructor(app, contacts) {
    super(app);
    this.contacts = contacts;
    this.setPlaceholder("Search contacts\u2026");
  }
  getItems() {
    return [...this.contacts].sort((a, b) => a.name.localeCompare(b.name));
  }
  getItemText(c) {
    return c.name;
  }
  onChooseItem(c) {
    const file = this.app.vault.getAbstractFileByPath(c.path);
    if (file instanceof import_obsidian36.TFile) void this.app.workspace.getLeaf(false).openFile(file);
    else new import_obsidian36.Notice("That contact's note couldn't be found.");
  }
};
var InteractionModal = class extends import_obsidian36.Modal {
  constructor(app, contactName, onSubmit) {
    super(app);
    this.contactName = contactName;
    this.onSubmit = onSubmit;
    this.note = "";
  }
  onOpen() {
    this.titleEl.setText(`Catch-up with ${this.contactName}`);
    new import_obsidian36.Setting(this.contentEl).setName("What did you talk about?").addText((t) => {
      t.setPlaceholder("e.g. Called about the weekend").onChange((v) => this.note = v);
      t.inputEl.classList.add("dash-modal-wide");
      t.inputEl.focus();
      t.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.submit();
        }
      });
    });
    new import_obsidian36.Setting(this.contentEl).addButton((b) => b.setButtonText("Cancel").onClick(() => this.close())).addButton((b) => b.setButtonText("Log it").setCta().onClick(() => this.submit()));
  }
  submit() {
    const note = this.note.trim();
    if (!note) {
      new import_obsidian36.Notice("Add a few words about the catch-up first.");
      return;
    }
    this.onSubmit(note);
    this.close();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/panels/brief.ts
var import_obsidian39 = require("obsidian");

// src/ai/brief.ts
var import_obsidian38 = require("obsidian");

// src/ai/client.ts
var import_obsidian37 = require("obsidian");
var ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
var ANTHROPIC_VERSION = "2023-06-01";
async function aiComplete(cfg, system, user, maxTokens = 4e3) {
  if (!cfg.apiKey.trim()) return { ok: false, text: "", error: "No API key set \u2014 add one in Settings \u2192 Daily Dashboard." };
  try {
    return cfg.provider === "anthropic" ? await anthropic(cfg, system, user, maxTokens) : await openai(cfg, system, user, maxTokens);
  } catch (e) {
    return { ok: false, text: "", error: describeError(e) };
  }
}
var FALLBACK_MODELS = /* @__PURE__ */ new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);
async function anthropic(cfg, system, user, maxTokens) {
  var _a, _b;
  const model = cfg.model.trim() || "claude-opus-5-5";
  const fallback = FALLBACK_MODELS.has(model);
  const headers = {
    "content-type": "application/json",
    "x-api-key": cfg.apiKey.trim(),
    "anthropic-version": ANTHROPIC_VERSION,
    // Permit the request from Obsidian's webview origin.
    "anthropic-dangerous-direct-browser-access": "true"
  };
  if (fallback) headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
  const res = await (0, import_obsidian37.requestUrl)({
    url: ANTHROPIC_URL,
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      // A short daily summary doesn't need deep reasoning; keep it quick and cheap.
      output_config: { effort: "low" },
      ...fallback ? { fallbacks: "default" } : {},
      system,
      messages: [{ role: "user", content: user }]
    }),
    throw: false
  });
  if (res.status >= 400) return { ok: false, text: "", error: apiError(res.status, res.json) };
  if (((_a = res.json) == null ? void 0 : _a.stop_reason) === "refusal") return { ok: false, text: "", error: "The model declined to write this one. Try again later." };
  const parts = (_b = res.json) == null ? void 0 : _b.content;
  const text = Array.isArray(parts) ? parts.filter((p) => (p == null ? void 0 : p.type) === "text").map((p) => {
    var _a2;
    return (_a2 = p.text) != null ? _a2 : "";
  }).join("").trim() : "";
  if (!text) return { ok: false, text: "", error: "The model returned an empty response." };
  return { ok: true, text };
}
async function openai(cfg, system, user, maxTokens) {
  var _a, _b, _c, _d, _e;
  const base = (cfg.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  const res = await (0, import_obsidian37.requestUrl)({
    url: `${base}/chat/completions`,
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey.trim()}`
    },
    body: JSON.stringify({
      model: cfg.model || "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    }),
    throw: false
  });
  if (res.status >= 400) return { ok: false, text: "", error: apiError(res.status, res.json) };
  const text = String((_e = (_d = (_c = (_b = (_a = res.json) == null ? void 0 : _a.choices) == null ? void 0 : _b[0]) == null ? void 0 : _c.message) == null ? void 0 : _d.content) != null ? _e : "").trim();
  if (!text) return { ok: false, text: "", error: "The model returned an empty response." };
  return { ok: true, text };
}
function apiError(status, json) {
  var _a, _b, _c;
  const msg = (_c = (_b = (_a = json == null ? void 0 : json.error) == null ? void 0 : _a.message) != null ? _b : json == null ? void 0 : json.message) != null ? _c : "";
  const base = `AI request failed (${status})`;
  if (status === 401 || status === 403) return `${base}: check your API key.`;
  if (status === 429) return `${base}: rate limited or out of credit.`;
  return msg ? `${base}: ${msg}` : base;
}
function describeError(e) {
  const m = e instanceof Error ? e.message : String(e);
  if (/net::|network|Failed to fetch|ENOTFOUND|ETIMEDOUT/i.test(m)) return "Couldn't reach the AI service \u2014 check your connection.";
  return `AI request error: ${m}`;
}

// src/ai/brief.ts
function today() {
  return (0, import_obsidian38.moment)().format("YYYY-MM-DD");
}
function aiConfig(plugin) {
  const s = plugin.settings;
  return { provider: s.aiProvider, apiKey: s.aiApiKey, baseUrl: s.aiBaseUrl, model: s.aiModel };
}
function briefConfigured(plugin) {
  return plugin.settings.aiDailyBriefEnabled && !!plugin.settings.aiApiKey.trim();
}
async function scheduleLines(plugin, date) {
  const lines = [];
  const items = [];
  for (const cal of plugin.settings.agendaUrls) {
    const cache = plugin.agendaCache[cal.url];
    if (!(cache == null ? void 0 : cache.text)) continue;
    try {
      items.push(...eventsOnDate(parseICS(cache.text), date));
    } catch (e) {
    }
  }
  for (const ev of plugin.localEvents.filter((e) => e.date === date)) items.push(localEventToAgendaItem(ev));
  items.sort((a, b) => a.sortKey - b.sortKey);
  for (const it of items) {
    const when = it.allDay ? "all-day" : it.timeLabel || (0, import_obsidian38.moment)(it.startMs).format("HH:mm");
    lines.push(`- ${when}: ${it.summary}${it.location ? ` @ ${it.location}` : ""}`);
  }
  for (const i of plugin.todos.instancesFor(date).filter((i2) => i2.item.scheduledTime && !i2.done && !i2.skipped)) {
    lines.push(`- ${i.item.scheduledTime}: ${i.item.text}`);
  }
  if (plugin.bridge.recipesAvailable()) {
    try {
      for (const m of await plugin.bridge.plannedMeals(date)) lines.push(`- Meal: ${m.name}`);
    } catch (e) {
    }
  }
  return lines;
}
async function collectContext(plugin, date) {
  const s = plugin.settings;
  const sections = [];
  if (s.aiBriefIncludeSchedule) {
    const lines = await scheduleLines(plugin, date);
    sections.push(`SCHEDULE \u2014 things happening at set times (not to-dos):
${lines.length ? lines.join("\n") : "- nothing scheduled"}`);
  }
  if (s.aiBriefIncludeTasks) {
    const pending = plugin.todos.instancesFor(date).filter((i) => !i.done && !i.skipped);
    const lines = pending.map((i) => `- ${i.item.text}${i.flagged && i.flagLabel ? ` (${i.flagLabel})` : ""}`);
    sections.push(`TO-DO LIST:
${lines.length ? lines.join("\n") : "- nothing pending"}`);
  }
  if (s.aiBriefIncludePeople && plugin.bridge.crmAvailable()) {
    const self = s.aiUserName.trim().toLowerCase();
    const due = plugin.bridge.crmContacts().filter((c) => (c.overdue || c.dueToday) && c.name.trim().toLowerCase() !== self).map((c) => `- ${c.name}${c.overdue ? " (overdue)" : " (due today)"}`);
    sections.push(`PEOPLE TO CATCH UP WITH (other people, never the reader):
${due.length ? due.join("\n") : "- no one due"}`);
  }
  return sections.join("\n\n");
}
async function journalText(plugin) {
  const parts = [];
  for (const f of Object.values(JOURNAL_FIELDS)) {
    try {
      const body = (await readDailyField(plugin.app, f.spec)).trim();
      if (body) parts.push(body);
    } catch (e) {
    }
  }
  return parts.join("\n").trim();
}
var GROUND_RULES = "Use only the facts in the data below. Never invent dates, durations, counts, streaks or history that the data doesn't state. When unsure, say less.";
function persona(plugin) {
  const s = plugin.settings;
  const name = s.aiUserName.trim();
  const pron = s.aiUserPronouns.trim();
  const about = s.aiAboutMe.trim();
  const who = name ? `You are writing for ${name}${pron ? ` (${pron})` : ""}, who is reading this. Address them as "you". If "${name}" appears in the data, that's the reader, not a contact.` : `Write to the reader directly as "you".`;
  return about ? `${who} What they've shared about themselves (use only what it says): ${about}` : who;
}
function briefSystem(plugin) {
  return [
    persona(plugin),
    GROUND_RULES,
    "Write a short, friendly morning brief (about 120 words) for their notes app.",
    "Open with one line about the shape of the day, then short sections for the schedule, who to catch up with, and what to get done. Skip empty sections.",
    "Present schedule items as a schedule, never as checkboxes; only the to-do list is a to-do list.",
    "Tone: warm, calm and practical \u2014 no hype. No preamble or sign-off. Plain Markdown."
  ].join(" ");
}
function eodSystem(plugin) {
  return [
    persona(plugin),
    GROUND_RULES,
    "Write a short, balanced end-of-day recap (about 100 words) to add to their journal.",
    "Assume scheduled events happened unless the journal says otherwise. Mention what got done, what's still open on the to-do list, and one kind, practical note for tomorrow.",
    "Tone: warm and genuine, not over-the-top. Plain Markdown, no heading."
  ].join(" ");
}
var inFlight = null;
async function generateMorningBrief(plugin, force = false) {
  if (!briefConfigured(plugin)) {
    if (force) new import_obsidian38.Notice("Turn on the daily brief and add an API key in Settings \u2192 Daily Dashboard first.");
    return null;
  }
  const date = today();
  if (!force && plugin.getBriefDate() === date && plugin.getBriefText()) return plugin.getBriefText();
  if (inFlight) return inFlight;
  inFlight = (async () => {
    var _a;
    const context = await collectContext(plugin, date);
    const nice = (0, import_obsidian38.moment)(date, "YYYY-MM-DD").format("dddd, MMMM D");
    const res = await aiComplete(aiConfig(plugin), briefSystem(plugin), `Today is ${nice}.

${context}`);
    if (!res.ok) {
      new import_obsidian38.Notice((_a = res.error) != null ? _a : "Couldn't write the brief.");
      return null;
    }
    await plugin.setBrief(date, res.text);
    return res.text;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
async function generateEndOfDay(plugin) {
  var _a;
  if (!plugin.settings.aiApiKey.trim()) {
    new import_obsidian38.Notice("Add an API key in Settings \u2192 Daily Dashboard first.");
    return null;
  }
  const date = today();
  const instances = plugin.todos.instancesFor(date);
  const parts = [];
  if (plugin.settings.aiBriefIncludeSchedule) {
    const sched = await scheduleLines(plugin, date);
    if (sched.length) parts.push(`ON TODAY'S SCHEDULE:
${sched.join("\n")}`);
  }
  if (plugin.settings.aiBriefIncludeTasks) {
    const done = instances.filter((i) => i.done).map((i) => `- ${i.item.text}`);
    const open = instances.filter((i) => !i.done && !i.skipped).map((i) => `- ${i.item.text}`);
    parts.push(`DONE TODAY:
${done.length ? done.join("\n") : "- (none recorded)"}`);
    parts.push(`STILL OPEN:
${open.length ? open.join("\n") : "- (none)"}`);
  }
  const journal = await journalText(plugin);
  if (journal) parts.push(`TODAY'S JOURNAL (their own words \u2014 the source of truth):
${journal}`);
  const nice = (0, import_obsidian38.moment)(date, "YYYY-MM-DD").format("dddd, MMMM D");
  const res = await aiComplete(aiConfig(plugin), eodSystem(plugin), `End of ${nice}.

${parts.join("\n\n")}`);
  if (!res.ok) {
    new import_obsidian38.Notice((_a = res.error) != null ? _a : "Couldn't write the recap.");
    return null;
  }
  const heading = plugin.settings.aiEndOfDayHeading.trim() || "End of day";
  const file = await ensureDailyNote(plugin.app);
  await plugin.app.vault.process(file, (content) => {
    const spec = headingField(heading);
    if (spec.anchor.test(content)) return replaceField(content, spec, res.text);
    return `${content.replace(/\s+$/, "")}

## ${heading}

${res.text.trim()}
`;
  });
  new import_obsidian38.Notice("Added an end-of-day recap to today's note.");
  return res.text;
}

// src/panels/brief.ts
var BriefPanel = class extends BasePanel2 {
  constructor() {
    super(...arguments);
    this.id = "brief";
    this.title = "Daily Brief";
  }
  async renderBody() {
    const plugin = this.ctx.plugin;
    const head = placard2(this.el, "Daily Brief");
    const tools = head.createDiv({ cls: "dash-qotd-tools" });
    if (!briefConfigured(plugin)) {
      this.el.createDiv({
        cls: "dash-muted",
        text: plugin.settings.aiApiKey.trim() ? "The daily brief is off. Turn it on in Settings \u2192 Daily Dashboard \u2192 Daily brief." : "This optional panel writes a short summary of your day using an AI service. To use it, add an API key in Settings \u2192 Daily Dashboard \u2192 Daily brief \u2014 or hide this panel."
      });
      return;
    }
    const refresh = tools.createEl("button", { cls: "dash-qotd-add", text: "\u21BB", attr: { "aria-label": "Regenerate the brief" } });
    refresh.addEventListener("click", () => void this.run(true));
    const body = this.el.createDiv({ cls: "dash-brief" });
    const cached = plugin.getBriefDate() === todayISO() ? plugin.getBriefText() : "";
    if (cached) {
      await this.renderMarkdown(body, cached);
    } else {
      body.createDiv({ cls: "dash-muted", text: "Writing today's brief\u2026" });
      void this.run(false, body);
    }
    const foot = this.el.createDiv({ cls: "dash-brief-foot" });
    const endBtn = foot.createEl("button", { cls: "dash-btn dash-btn-sm dash-brief-endday", text: "End the day" });
    endBtn.addEventListener("click", async () => {
      endBtn.disabled = true;
      endBtn.setText("Writing\u2026");
      await generateEndOfDay(plugin);
      endBtn.disabled = false;
      endBtn.setText("End the day");
    });
  }
  /** Generate (or regenerate) and re-render the panel. */
  async run(force, body) {
    const target = body != null ? body : this.el.querySelector(".dash-brief");
    if (target && force) {
      target.empty();
      target.createDiv({ cls: "dash-muted", text: "Regenerating\u2026" });
    }
    const text = await generateMorningBrief(this.ctx.plugin, force);
    if (text && target) {
      target.empty();
      await this.renderMarkdown(target, text);
    } else if (!text && target) {
      target.empty();
      target.createDiv({ cls: "dash-muted", text: "The brief couldn't be written. Check the settings and try \u21BB." });
    }
  }
  async renderMarkdown(el, md) {
    try {
      await import_obsidian39.MarkdownRenderer.render(this.ctx.app, md, el, "", this.ctx.plugin);
    } catch (e) {
      el.createDiv({ text: md });
    }
  }
};
function todayISO() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// src/panels/registry.ts
var PANEL_ORDER = [
  "brief",
  "clock",
  "verse",
  "todo",
  "agenda",
  "journal",
  "meals",
  "shopping",
  "actions",
  "contacts",
  "quote",
  "search",
  "calendar",
  "secondbrain",
  "places"
];
var PANEL_TITLES = {
  brief: "Daily Brief",
  clock: "Clock",
  verse: "Verse of the Day",
  todo: "To-do",
  agenda: "Today's Agenda",
  journal: "Journal",
  meals: "Meals",
  shopping: "Shopping",
  actions: "Quick Actions",
  contacts: "Contacts",
  quote: "Quote of the Day",
  search: "Search",
  calendar: "Calendar",
  secondbrain: "Second Brain",
  places: "Places"
};
var PANEL_DESCRIPTIONS = {
  brief: "An AI-written summary of your day. Optional \u2014 needs your own API key (see \u201CDaily brief\u201D below).",
  clock: "The time and date.",
  verse: "One verse of Proverbs a day (KJV).",
  todo: "Your persistent to-do list, with a weekly review.",
  agenda: "Today's calendar events, a \u201Cwhat's next\u201D countdown, weekly goals and a printable week.",
  journal: "Writes into today's daily note.",
  meals: "Planned meals and groceries. Needs the Recipe Manager plugin.",
  shopping: "Shopping lists grouped by aisle, store and who's paying. Imports Recipe Manager grocery lists.",
  actions: "One-tap buttons for the dashboard and any companion plugins you have installed.",
  contacts: "Who's due for a catch-up. Needs the Simple Contact Manager plugin.",
  quote: "A quote a day from your own collection of things people have said.",
  search: "Search your notes; make notes and categories.",
  calendar: "A month grid of your daily notes, plus a search inside them.",
  secondbrain: "Your active projects.",
  places: "Shortcut buttons to favourite notes and commands."
};
var DEFAULT_OFF = /* @__PURE__ */ new Set(["brief", "contacts", "quote"]);
function createPanels(order, enabled, plugin) {
  const factories = {
    brief: () => new BriefPanel(),
    clock: () => new ClockPanel(),
    verse: () => new VersePanel(),
    todo: () => new TodoPanel(() => new WeekReviewModal(plugin.app, friendlyWeekReviewConfig(plugin)).open()),
    agenda: () => new AgendaPanel(),
    journal: () => new JournalPanel(FRIENDLY_JOURNAL_COPY),
    meals: () => new MealsPanel(FRIENDLY_MEALS_COPY),
    shopping: () => new ShoppingPanel(),
    actions: () => new ActionsPanel(),
    contacts: () => new ContactsPanel(),
    quote: () => new QuotePanel(),
    search: () => new SearchPanel(plugin.knowledgeBase, FRIENDLY_SEARCH_COPY, FRIENDLY_CATEGORY_COPY),
    calendar: () => new CalendarPanel(),
    secondbrain: () => new SecondBrainPanel(plugin.secondBrain, FRIENDLY_SECOND_BRAIN_COPY),
    places: () => new PlacesPanel(FRIENDLY_PLACES_COPY)
  };
  const seen = /* @__PURE__ */ new Set();
  const panels = [];
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (enabled[id] === false) continue;
    const factory = factories[id];
    if (factory) panels.push(factory());
  }
  return panels;
}

// src/settings.ts
var DEFAULT_SETTINGS = {
  theme: DEFAULT_THEME,
  openOnStartup: false,
  replaceNewTab: false,
  panelOrder: [...PANEL_ORDER],
  enabledPanels: Object.fromEntries(PANEL_ORDER.map((id) => [id, !DEFAULT_OFF.has(id)])),
  panelColumns: {},
  panelSpans: {},
  mobileTabs: true,
  tabs: [],
  tabAssignments: {},
  defaultTabId: null,
  layoutPath: "Daily Dashboard/Dashboard Layout.md",
  clock24h: false,
  agendaRefreshMinutes: 30,
  agendaHeight: 320,
  agendaUrls: [],
  kbSearchPaths: ["Knowledge base/Notes", "Second brain"],
  kbRootPath: "Knowledge base",
  kbNotesSubfolder: "Notes",
  kbCategoriesSubfolder: "Categories",
  kbArchiveSubfolder: "Archive",
  kbListHeading: "Notes",
  secondBrainPath: "Second brain",
  secondBrainArchiveSubfolder: "Archive",
  calendarBasePath: "Logs/Daily notes.base",
  places: [
    { label: "Knowledge base", target: "Knowledge base", type: "note" },
    { label: "Second brain", target: "Second brain", type: "note" },
    { label: "Today's note", target: "daily-notes", type: "command" },
    { label: "Recipe index", target: "recipe-manager:recipe-index", type: "command" }
  ],
  directivesPath: "Daily Dashboard/To-dos.md",
  localEventsPath: "Daily Dashboard/Local Events.md",
  completedTasksMarker: "",
  completedTasksHeading: "Completed tasks",
  shoppingPath: "Daily Dashboard/Shopping.md",
  quotesPath: "Daily Dashboard/Quotes.md",
  aiProvider: "anthropic",
  aiApiKey: "",
  aiBaseUrl: "https://api.openai.com/v1",
  aiCredentialsPath: "Daily Dashboard/AI Credentials.md",
  aiModel: "claude-opus-5-5",
  aiDailyBriefEnabled: false,
  aiUserName: "",
  aiUserPronouns: "",
  aiAboutMe: "",
  aiBriefIncludeSchedule: true,
  aiBriefIncludeTasks: true,
  aiBriefIncludePeople: true,
  aiEndOfDayHeading: "End of day"
};
function normalizePlace(p) {
  if (p.type === "note" && p.target.startsWith("cmd:")) {
    return { label: p.label, target: p.target.slice(4), type: "command" };
  }
  return { ...p };
}
function mergeSettings(loaded) {
  var _a, _b, _c, _d, _e, _f, _g;
  const s = { ...DEFAULT_SETTINGS, ...loaded != null ? loaded : {} };
  if (!isThemeId(s.theme)) s.theme = DEFAULT_THEME;
  const order = ((_a = loaded == null ? void 0 : loaded.panelOrder) != null ? _a : []).filter((id) => PANEL_ORDER.includes(id));
  for (const id of PANEL_ORDER) if (!order.includes(id)) order.push(id);
  s.panelOrder = order;
  s.enabledPanels = { ...DEFAULT_SETTINGS.enabledPanels, ...(_b = loaded == null ? void 0 : loaded.enabledPanels) != null ? _b : {} };
  s.panelColumns = pickKnown(loaded == null ? void 0 : loaded.panelColumns);
  s.panelSpans = pickKnown(loaded == null ? void 0 : loaded.panelSpans);
  s.agendaUrls = ((_c = loaded == null ? void 0 : loaded.agendaUrls) != null ? _c : DEFAULT_SETTINGS.agendaUrls).map((c) => ({ ...c }));
  s.kbSearchPaths = ((_d = loaded == null ? void 0 : loaded.kbSearchPaths) != null ? _d : DEFAULT_SETTINGS.kbSearchPaths).slice();
  s.places = ((_e = loaded == null ? void 0 : loaded.places) != null ? _e : DEFAULT_SETTINGS.places).map(normalizePlace);
  s.tabs = [];
  s.tabAssignments = {};
  s.defaultTabId = null;
  applyTabs(s, (_f = loaded == null ? void 0 : loaded.tabs) != null ? _f : [], (_g = loaded == null ? void 0 : loaded.tabAssignments) != null ? _g : {}, loaded == null ? void 0 : loaded.defaultTabId);
  return s;
}
function pickKnown(map) {
  const out = {};
  for (const id of PANEL_ORDER) {
    const v = map == null ? void 0 : map[id];
    if (typeof v === "number" && Number.isFinite(v)) out[id] = v;
  }
  return out;
}
function applyTabs(s, tabs, assignments, defaultTabId) {
  var _a, _b;
  s.tabs = tabs.filter((t) => t && typeof t.id === "string" && typeof t.name === "string").map((t) => ({ id: t.id, name: t.name }));
  const tabIds = new Set(s.tabs.map((t) => t.id));
  s.tabAssignments = {};
  for (const [pid, tid] of Object.entries(assignments)) {
    if (PANEL_ORDER.includes(pid) && tabIds.has(tid)) s.tabAssignments[pid] = tid;
  }
  s.defaultTabId = defaultTabId && tabIds.has(defaultTabId) ? defaultTabId : (_b = (_a = s.tabs[0]) == null ? void 0 : _a.id) != null ? _b : null;
}
function layoutFromSettings(s) {
  return {
    mobileTabs: s.mobileTabs,
    tabs: s.tabs.map((t) => ({ id: t.id, name: t.name })),
    tabAssignments: { ...s.tabAssignments },
    defaultTabId: s.defaultTabId,
    panelOrder: [...s.panelOrder],
    enabledPanels: { ...s.enabledPanels },
    panelColumns: { ...s.panelColumns },
    panelSpans: { ...s.panelSpans }
  };
}
function applyLayout(s, layout) {
  var _a, _b;
  if (typeof layout.mobileTabs === "boolean") s.mobileTabs = layout.mobileTabs;
  applyTabs(
    s,
    (_a = layout.tabs) != null ? _a : s.tabs,
    (_b = layout.tabAssignments) != null ? _b : s.tabAssignments,
    layout.defaultTabId !== void 0 ? layout.defaultTabId : s.defaultTabId
  );
  if (layout.panelOrder) {
    const order = layout.panelOrder.filter((id) => PANEL_ORDER.includes(id));
    for (const id of PANEL_ORDER) if (!order.includes(id)) order.push(id);
    s.panelOrder = order;
  }
  if (layout.enabledPanels) s.enabledPanels = { ...DEFAULT_SETTINGS.enabledPanels, ...layout.enabledPanels };
  if (layout.panelColumns) s.panelColumns = pickKnown(layout.panelColumns);
  if (layout.panelSpans) s.panelSpans = pickKnown(layout.panelSpans);
  return s;
}
var DashSettingTab = class extends import_obsidian40.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  async save() {
    await this.plugin.saveData_();
    this.plugin.refreshOpenViews();
  }
  /** Persist and re-mount open views — for panel enable/reorder changes. */
  async saveLayout() {
    await this.plugin.persistLayout();
    this.plugin.rebuildOpenViews();
  }
  display() {
    const { containerEl } = this;
    const s = this.plugin.settings;
    containerEl.empty();
    new import_obsidian40.Setting(containerEl).setName("Appearance").setHeading();
    new import_obsidian40.Setting(containerEl).setName("Theme").setDesc(`${this.themeBlurb(s.theme)} Each theme follows your Obsidian light/dark setting automatically.`).addDropdown((dd) => {
      for (const t of THEMES) dd.addOption(t.id, t.label);
      dd.setValue(s.theme).onChange(async (v) => {
        s.theme = isThemeId(v) ? v : DEFAULT_THEME;
        await this.plugin.saveData_();
        this.plugin.applyThemeToViews();
        this.display();
      });
    });
    new import_obsidian40.Setting(containerEl).setName("Open on startup").setDesc("Open the dashboard automatically when Obsidian starts.").addToggle(
      (t) => t.setValue(s.openOnStartup).onChange(async (v) => {
        s.openOnStartup = v;
        await this.save();
      })
    );
    new import_obsidian40.Setting(containerEl).setName("Use as the New Tab page").setDesc("Turn every empty New Tab into the dashboard, so it becomes your landing view.").addToggle(
      (t) => t.setValue(s.replaceNewTab).onChange(async (v) => {
        s.replaceNewTab = v;
        await this.save();
        if (v) this.plugin.replaceActiveEmptyLeaf();
      })
    );
    new import_obsidian40.Setting(containerEl).setName("24-hour clock").setDesc("Off shows the time as 2:32 PM. On shows it as 14:32.").addToggle(
      (t) => t.setValue(s.clock24h).onChange(async (v) => {
        s.clock24h = v;
        await this.save();
      })
    );
    new import_obsidian40.Setting(containerEl).setName("Panels").setDesc(
      "Every panel is a separate module \u2014 turn on only the ones you want, and reorder them. On the desktop you can also put each panel in a column (1\u20133) and give it a span; leave everything at column 1 for the default packed layout. A phone always stacks panels in this order."
    ).setHeading();
    const list = containerEl.createDiv({ cls: "dash-settings-panel-list" });
    const renderList = () => {
      list.empty();
      s.panelOrder.forEach((id, index) => {
        var _a, _b;
        const row = new import_obsidian40.Setting(list).setName((_a = PANEL_TITLES[id]) != null ? _a : id).setDesc((_b = PANEL_DESCRIPTIONS[id]) != null ? _b : "");
        row.addExtraButton(
          (b) => b.setIcon("arrow-up").setTooltip("Move up").setDisabled(index === 0).onClick(async () => {
            [s.panelOrder[index - 1], s.panelOrder[index]] = [s.panelOrder[index], s.panelOrder[index - 1]];
            await this.saveLayout();
            renderList();
          })
        );
        row.addExtraButton(
          (b) => b.setIcon("arrow-down").setTooltip("Move down").setDisabled(index === s.panelOrder.length - 1).onClick(async () => {
            [s.panelOrder[index + 1], s.panelOrder[index]] = [s.panelOrder[index], s.panelOrder[index + 1]];
            await this.saveLayout();
            renderList();
          })
        );
        row.addDropdown((dd) => {
          var _a2;
          dd.addOptions({ "1": "Col 1", "2": "Col 2", "3": "Col 3" });
          dd.setValue(String((_a2 = s.panelColumns[id]) != null ? _a2 : 1)).onChange(async (v) => {
            s.panelColumns[id] = Number(v);
            await this.saveLayout();
          });
        });
        row.addDropdown((dd) => {
          var _a2;
          dd.addOptions({ "1": "Span 1", "2": "Span 2", "3": "Span 3" });
          dd.setValue(String((_a2 = s.panelSpans[id]) != null ? _a2 : 1)).onChange(async (v) => {
            s.panelSpans[id] = Number(v);
            await this.saveLayout();
          });
        });
        if (s.tabs.length > 0) {
          row.addDropdown((dd) => {
            var _a2;
            dd.addOption("", "\u25B8 Default tab");
            for (const tab of s.tabs) dd.addOption(tab.id, tab.name);
            dd.setValue((_a2 = s.tabAssignments[id]) != null ? _a2 : "").onChange(async (v) => {
              if (v) s.tabAssignments[id] = v;
              else delete s.tabAssignments[id];
              await this.saveLayout();
            });
          });
        }
        row.addToggle(
          (t) => t.setValue(s.enabledPanels[id] !== false).onChange(async (v) => {
            s.enabledPanels[id] = v;
            await this.saveLayout();
          })
        );
      });
    };
    renderList();
    new import_obsidian40.Setting(containerEl).setName("Phone tabs").setDesc(
      "On a phone, group panels into tabs instead of one long scroll (the desktop always shows everything). Add tabs here, star the one that opens first, then pick a tab for each panel in the list above \u2014 panels without a tab go to the starred one."
    ).setHeading();
    new import_obsidian40.Setting(containerEl).setName("Use tabs on a phone").setDesc("When on and at least one tab exists, the phone dashboard shows a tab bar.").addToggle(
      (t) => t.setValue(s.mobileTabs).onChange(async (v) => {
        s.mobileTabs = v;
        await this.saveLayout();
      })
    );
    const tabsList = containerEl.createDiv({ cls: "dash-settings-tab-list" });
    const renderTabs = () => {
      tabsList.empty();
      s.tabs.forEach((tab, i) => {
        const row = new import_obsidian40.Setting(tabsList);
        row.addText(
          (txt) => txt.setPlaceholder("Tab name").setValue(tab.name).onChange(async (v) => {
            tab.name = v;
            await this.saveLayout();
          })
        );
        row.addExtraButton(
          (b) => b.setIcon(s.defaultTabId === tab.id ? "star" : "star-off").setTooltip(s.defaultTabId === tab.id ? "Opens first" : "Open this tab first").onClick(async () => {
            s.defaultTabId = tab.id;
            await this.saveLayout();
            renderTabs();
          })
        );
        row.addExtraButton(
          (b) => b.setIcon("arrow-up").setTooltip("Move up").setDisabled(i === 0).onClick(async () => {
            [s.tabs[i - 1], s.tabs[i]] = [s.tabs[i], s.tabs[i - 1]];
            await this.saveLayout();
            renderTabs();
          })
        );
        row.addExtraButton(
          (b) => b.setIcon("arrow-down").setTooltip("Move down").setDisabled(i === s.tabs.length - 1).onClick(async () => {
            [s.tabs[i + 1], s.tabs[i]] = [s.tabs[i], s.tabs[i + 1]];
            await this.saveLayout();
            renderTabs();
          })
        );
        row.addExtraButton(
          (b) => b.setIcon("trash-2").setTooltip("Delete tab").onClick(async () => {
            var _a, _b;
            s.tabs.splice(i, 1);
            for (const k of Object.keys(s.tabAssignments)) if (s.tabAssignments[k] === tab.id) delete s.tabAssignments[k];
            if (s.defaultTabId === tab.id) s.defaultTabId = (_b = (_a = s.tabs[0]) == null ? void 0 : _a.id) != null ? _b : null;
            await this.saveLayout();
            this.display();
          })
        );
      });
      new import_obsidian40.Setting(tabsList).addButton(
        (b) => b.setButtonText("+ Add tab").onClick(async () => {
          const id = `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
          s.tabs.push({ id, name: `Tab ${s.tabs.length + 1}` });
          if (!s.defaultTabId) s.defaultTabId = id;
          await this.saveLayout();
          this.display();
        })
      );
    };
    renderTabs();
    new import_obsidian40.Setting(containerEl).setName("Today's agenda").setHeading();
    new import_obsidian40.Setting(containerEl).setName("Refresh interval (minutes)").setDesc("How often your calendars are re-fetched while the dashboard is open.").addText(
      (t) => t.setValue(String(s.agendaRefreshMinutes)).onChange(async (v) => {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) {
          s.agendaRefreshMinutes = n;
          await this.save();
        }
      })
    );
    new import_obsidian40.Setting(containerEl).setName("Agenda height (pixels)").setDesc("The agenda scrolls inside a fixed height so it never takes over the screen. This sets that height.").addText(
      (t) => t.setValue(String(s.agendaHeight)).onChange(async (v) => {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 120) {
          s.agendaHeight = Math.round(n);
          await this.save();
        }
      })
    );
    new import_obsidian40.Setting(containerEl).setName("Calendar share links").setDesc("Up to 20 public Proton Calendar / ICS share links (.ics). Each has a label, its address, a colour (the circle-arrow resets it to the theme's), and a switch for whether it counts toward the \u201Cwhat's next\u201D countdown at the top of the agenda.");
    const calList = containerEl.createDiv({ cls: "dash-settings-cal-list" });
    const renderCals = () => {
      calList.empty();
      s.agendaUrls.forEach((cal, i) => {
        const row = new import_obsidian40.Setting(calList).setName(`Calendar ${i + 1}`);
        row.addText(
          (t) => t.setPlaceholder("Label").setValue(cal.label).onChange(async (v) => {
            cal.label = v.trim() || "Calendar";
            await this.save();
          })
        );
        row.addText((t) => {
          t.setPlaceholder("https://\u2026/basic.ics").setValue(cal.url).onChange(async (v) => {
            cal.url = v.trim();
            await this.save();
          });
          t.inputEl.classList.add("dash-settings-cal-url");
        });
        row.addColorPicker(
          (cp) => {
            var _a;
            return cp.setValue((_a = cal.color) != null ? _a : "#888888").onChange(async (v) => {
              cal.color = v;
              await this.save();
            });
          }
        );
        row.addExtraButton(
          (b) => b.setIcon("rotate-ccw").setTooltip("Use the theme's colour").onClick(async () => {
            delete cal.color;
            await this.save();
            renderCals();
          })
        );
        row.addToggle(
          (t) => t.setTooltip("Count this calendar in \u201Cwhat's next\u201D").setValue(cal.countdown !== false).onChange(async (v) => {
            cal.countdown = v;
            await this.save();
          })
        );
        row.addExtraButton(
          (b) => b.setIcon("trash").setTooltip("Remove this calendar").onClick(async () => {
            s.agendaUrls.splice(i, 1);
            await this.save();
            renderCals();
          })
        );
      });
      const addRow = new import_obsidian40.Setting(calList);
      addRow.addButton(
        (b) => b.setButtonText("+ Add calendar").setDisabled(s.agendaUrls.length >= 20).onClick(async () => {
          if (s.agendaUrls.length >= 20) return;
          s.agendaUrls.push({ label: "Calendar", url: "" });
          await this.save();
          renderCals();
        })
      );
    };
    renderCals();
    new import_obsidian40.Setting(containerEl).setName("Search").setHeading();
    new import_obsidian40.Setting(containerEl).setName("Folders to search").setDesc("The knowledge-base search looks only inside these folders. One folder per line.").addTextArea((t) => {
      t.setValue(s.kbSearchPaths.join("\n"));
      t.inputEl.rows = 3;
      t.onChange(async (v) => {
        const paths = v.split("\n").map((l) => l.trim()).filter(Boolean);
        s.kbSearchPaths = paths.length ? paths : [...DEFAULT_SETTINGS.kbSearchPaths];
        await this.save();
      });
    });
    this.addText(containerEl, "Knowledge base folder", "The folder the Search card creates notes and categories in.", s.kbRootPath, (v) => s.kbRootPath = v || "Knowledge base");
    this.addText(containerEl, "Notes subfolder", "Where new notes go, inside the knowledge-base folder.", s.kbNotesSubfolder, (v) => s.kbNotesSubfolder = v, true);
    this.addText(containerEl, "Categories subfolder", "Where category notes go, inside the knowledge-base folder.", s.kbCategoriesSubfolder, (v) => s.kbCategoriesSubfolder = v || "Categories");
    this.addText(containerEl, "Category list heading", "The heading in a category note under which its notes are listed.", s.kbListHeading, (v) => s.kbListHeading = v || "Notes");
    new import_obsidian40.Setting(containerEl).setName("Calendar").setHeading();
    this.addText(
      containerEl,
      "Daily-notes base file",
      "The Bases (.base) file the Calendar card's button opens. It's created for you the first time you press the button if it doesn't exist yet.",
      s.calendarBasePath,
      (v) => s.calendarBasePath = v || "Logs/Daily notes.base"
    );
    new import_obsidian40.Setting(containerEl).setName("Second brain").setHeading();
    this.addText(containerEl, "Second brain folder", "The ongoing-project folder the Second brain panel manages.", s.secondBrainPath, (v) => s.secondBrainPath = v || "Second brain");
    this.addText(containerEl, "Archive subfolder", "Where a completed project is moved, inside the Second brain folder.", s.secondBrainArchiveSubfolder, (v) => s.secondBrainArchiveSubfolder = v || "Archive");
    new import_obsidian40.Setting(containerEl).setName("Places / navigation").setHeading();
    new import_obsidian40.Setting(containerEl).setName("Destinations").setDesc("One per line as `Label | target`. A target is a note or folder name (e.g. `Knowledge base`) or, prefixed with `cmd:`, a command id (e.g. `cmd:recipe-manager:recipe-index`).").addTextArea((t) => {
      t.setValue(
        s.places.map((p) => `${p.label} | ${p.type === "command" ? "cmd:" + p.target : p.target}`).join("\n")
      );
      t.inputEl.rows = 6;
      t.onChange(async (v) => {
        s.places = v.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
          const bar = line.indexOf("|");
          const label = bar === -1 ? line : line.slice(0, bar).trim();
          let target = bar === -1 ? line : line.slice(bar + 1).trim();
          const type = target.startsWith("cmd:") ? "command" : "note";
          if (type === "command") target = target.slice(4).trim();
          return { label, target, type };
        });
        await this.save();
      });
    });
    new import_obsidian40.Setting(containerEl).setName("To-dos").setHeading();
    this.addText(
      containerEl,
      "To-do list file",
      "The Markdown file your to-do list is saved in. Markdown always syncs via Obsidian Sync, so the list follows you across devices. Any extension you type becomes .md.",
      s.directivesPath,
      (v) => s.directivesPath = v || "Daily Dashboard/To-dos.md"
    );
    this.addText(
      containerEl,
      "Local events file",
      "The Markdown file your dashboard-only agenda events are saved in. Markdown always syncs via Obsidian Sync, so events you add on one device show up on the others. Any extension you type becomes .md.",
      s.localEventsPath,
      (v) => s.localEventsPath = v || "Daily Dashboard/Local Events.md"
    );
    this.addText(containerEl, "Completed-tasks heading", "Completed to-dos are logged under this heading in today's note.", s.completedTasksHeading, (v) => s.completedTasksHeading = v || "Completed tasks");
    this.addText(containerEl, "Completed-tasks marker", "Optional. If set, completed tasks go after this marker instead of the heading.", s.completedTasksMarker, (v) => s.completedTasksMarker = v, true);
    this.addText(
      containerEl,
      "Layout file",
      "Your panel layout and phone tabs are also saved in this Markdown file, so they follow you across devices and survive plugin updates.",
      s.layoutPath,
      (v) => s.layoutPath = v || "Daily Dashboard/Dashboard Layout.md"
    );
    new import_obsidian40.Setting(containerEl).setName("Shopping & quotes").setHeading();
    this.addText(containerEl, "Shopping list file", "Where the Shopping panel saves your lists (managed for you \u2014 edit lists on the dashboard).", s.shoppingPath, (v) => s.shoppingPath = v || "Daily Dashboard/Shopping.md");
    this.addText(containerEl, "Quotes file", "Where the Quote of the Day panel saves your quotes (managed for you).", s.quotesPath, (v) => s.quotesPath = v || "Daily Dashboard/Quotes.md");
    this.renderBriefSettings(containerEl);
  }
  /** The optional AI daily-brief module. Nothing is sent anywhere until a key is
   * added AND the brief is switched on. */
  renderBriefSettings(containerEl) {
    const s = this.plugin.settings;
    new import_obsidian40.Setting(containerEl).setName("Daily brief (optional)").setDesc(
      "An AI-written morning summary of your day, plus an \u201CEnd the day\u201D recap written into your daily note. It uses your own API key and only sends the categories you allow below (\u201CEnd the day\u201D also sends what you wrote in today's journal). Also turn on the Daily Brief panel in the list above."
    ).setHeading();
    new import_obsidian40.Setting(containerEl).setName("Turn on the daily brief").addToggle(
      (t) => t.setValue(s.aiDailyBriefEnabled).onChange(async (v) => {
        s.aiDailyBriefEnabled = v;
        await this.save();
      })
    );
    new import_obsidian40.Setting(containerEl).setName("Provider").setDesc("Anthropic (Claude), or any OpenAI-compatible service.").addDropdown((dd) => {
      dd.addOptions({ anthropic: "Anthropic (Claude)", openai: "OpenAI-compatible" });
      dd.setValue(s.aiProvider).onChange(async (v) => {
        s.aiProvider = v === "openai" ? "openai" : "anthropic";
        if (s.aiProvider === "openai" && s.aiModel.startsWith("claude")) s.aiModel = "gpt-4o-mini";
        if (s.aiProvider === "anthropic" && !s.aiModel.startsWith("claude")) s.aiModel = DEFAULT_SETTINGS.aiModel;
        await this.save();
        this.display();
      });
    });
    new import_obsidian40.Setting(containerEl).setName("API key").setDesc("Stored in this plugin's data and in the AI credentials file below so it reaches your other devices. Keep that file out of anything you share.").addText((t) => {
      t.inputEl.type = "password";
      t.setPlaceholder("sk-\u2026").setValue(s.aiApiKey).onChange(async (v) => {
        s.aiApiKey = v.trim();
        await this.plugin.persistAICreds();
        await this.save();
      });
    });
    if (s.aiProvider === "openai") {
      this.addText(containerEl, "Base URL", "The service's API address.", s.aiBaseUrl, (v) => {
        s.aiBaseUrl = v || DEFAULT_SETTINGS.aiBaseUrl;
        void this.plugin.persistAICreds();
      });
    }
    this.addText(containerEl, "Model", "The model to use. The default works well; change it only if you know you want another.", s.aiModel, (v) => s.aiModel = v);
    this.addText(containerEl, "Your name", "So the brief can talk to you by name.", s.aiUserName, (v) => s.aiUserName = v, true);
    this.addText(containerEl, "Your pronouns", "Optional, e.g. she/her.", s.aiUserPronouns, (v) => s.aiUserPronouns = v, true);
    new import_obsidian40.Setting(containerEl).setName("About you").setDesc("Optional. Anything the brief should keep in mind.").addTextArea((t) => {
      t.setValue(s.aiAboutMe);
      t.inputEl.rows = 3;
      t.onChange(async (v) => {
        s.aiAboutMe = v.trim();
        await this.save();
      });
    });
    const gates = [
      ["Send today's schedule", "aiBriefIncludeSchedule"],
      ["Send your to-do list", "aiBriefIncludeTasks"],
      ["Send who's due a catch-up (Contacts)", "aiBriefIncludePeople"]
    ];
    for (const [label, key] of gates) {
      new import_obsidian40.Setting(containerEl).setName(label).addToggle(
        (t) => t.setValue(s[key]).onChange(async (v) => {
          s[key] = v;
          await this.save();
        })
      );
    }
    this.addText(containerEl, "End-of-day heading", "The heading in today's note the end-of-day recap is written under.", s.aiEndOfDayHeading, (v) => s.aiEndOfDayHeading = v || "End of day");
    this.addText(containerEl, "AI credentials file", "The Markdown file the API key is synced through.", s.aiCredentialsPath, (v) => s.aiCredentialsPath = v || "Daily Dashboard/AI Credentials.md");
  }
  themeBlurb(id) {
    var _a, _b;
    return (_b = (_a = THEMES.find((t) => t.id === id)) == null ? void 0 : _a.blurb) != null ? _b : "";
  }
  addText(el, name, desc, value, set, allowEmpty = false) {
    new import_obsidian40.Setting(el).setName(name).setDesc(desc).addText(
      (t) => t.setValue(value).onChange(async (v) => {
        const trimmed = v.trim();
        if (!trimmed && !allowEmpty) return;
        set(trimmed);
        await this.save();
      })
    );
  }
};

// src/core/bridge.ts
var import_obsidian41 = require("obsidian");
var RECIPES_ID = "recipe-manager";
var CRM_ID = "simple-contact-manager";
var PRIORITY_RANK = { high: 0, medium: 1, low: 2, "": 3 };
var Bridge = class {
  constructor(app) {
    this.app = app;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugin(id) {
    var _a, _b;
    return (_b = (_a = this.app.plugins) == null ? void 0 : _a.plugins) == null ? void 0 : _b[id];
  }
  enabled(id) {
    var _a, _b, _c;
    return !!((_c = (_b = (_a = this.app.plugins) == null ? void 0 : _a.enabledPlugins) == null ? void 0 : _b.has) == null ? void 0 : _c.call(_b, id)) || !!this.plugin(id);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api(id) {
    var _a;
    const api = (_a = this.plugin(id)) == null ? void 0 : _a.api;
    return api && typeof api.version === "number" ? api : null;
  }
  commandExists(fullId) {
    var _a, _b;
    const commands = (_b = (_a = this.app.commands) == null ? void 0 : _a.commands) != null ? _b : {};
    return !!commands[fullId];
  }
  runCommand(fullId) {
    var _a, _b;
    (_b = (_a = this.app.commands) == null ? void 0 : _a.executeCommandById) == null ? void 0 : _b.call(_a, fullId);
  }
  /** Whether a plugin is installed and turned on — optional modules ask this so
   * they can hide politely when their companion plugin isn't there. */
  isPluginEnabled(id) {
    return this.enabled(id);
  }
  // ---------------------------------------------------------------- Contacts
  crmAvailable() {
    return this.enabled(CRM_ID);
  }
  /** Try to log a specific contact through the plugin's own modal (API v2+).
   * Returns true if it handled it. */
  crmLogViaApi(pathOrName) {
    const api = this.api(CRM_ID);
    if ((api == null ? void 0 : api.logInteraction) && api.version >= 2) {
      try {
        return !!api.logInteraction(pathOrName);
      } catch (e) {
        console.error("Daily Dashboard: contacts api logInteraction failed, falling back", e);
      }
    }
    return false;
  }
  crmFolder() {
    var _a, _b, _c;
    return ((_c = (_b = (_a = this.plugin(CRM_ID)) == null ? void 0 : _a.settings) == null ? void 0 : _b.contactsFolder) != null ? _c : "Contacts").trim();
  }
  resolveContact(pathOrName) {
    var _a;
    const byPath = this.app.vault.getAbstractFileByPath(pathOrName);
    if (byPath instanceof import_obsidian41.TFile) return byPath;
    const folder = this.crmFolder();
    return (_a = this.app.vault.getMarkdownFiles().find((f) => (!folder || f.path.startsWith(folder + "/")) && f.basename === pathOrName)) != null ? _a : null;
  }
  /** Log an interaction for a specific contact ourselves, when the plugin's API
   * isn't available (older Simple Contact Manager). Mirrors the plugin's write:
   * update the contact note's Interaction Log, advance the follow-up date in
   * frontmatter, and write the daily-note line. Returns true on success. */
  async crmWriteInteraction(pathOrName, noteText) {
    var _a, _b, _c, _d, _e;
    const file = this.resolveContact(pathOrName);
    if (!file) return false;
    const text = noteText.trim();
    if (!text) return false;
    const fm = (_b = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter) != null ? _b : {};
    const followupDays = Number((_d = (_c = fm.contact) == null ? void 0 : _c.followup_days) != null ? _d : fm.followup_days) || 30;
    const todayStr2 = today2();
    const next = (0, import_obsidian41.moment)().add(followupDays, "days").format("YYYY-MM-DD");
    const name = String((_e = fm.name) != null ? _e : file.basename);
    await this.app.fileManager.processFrontMatter(file, (f) => {
      const c = f.contact && typeof f.contact === "object" ? f.contact : f.contact = {};
      c.last_contacted = todayStr2;
      c.next_followup = next;
      f.updated = todayStr2;
    });
    await this.app.vault.process(file, (content) => insertInteraction(content, todayStr2, text));
    const { marker, heading } = this.crmLogTarget();
    const time = (0, import_obsidian41.moment)().format("HH:mm");
    try {
      await appendDailyLogLine(this.app, `- ${time} [[${name}|${name}]] \u2014 ${text}`, { marker, heading, time });
    } catch (e) {
      console.error("Daily Dashboard: contacts daily-note write failed", e);
    }
    return true;
  }
  /** Where Simple Contact Manager writes its daily-note lines (its own settings). */
  crmLogTarget() {
    var _a, _b, _c, _d;
    const s = (_b = (_a = this.plugin(CRM_ID)) == null ? void 0 : _a.settings) != null ? _b : {};
    return {
      marker: String((_c = s.dailyNoteMarker) != null ? _c : "%% crm-log %%").trim(),
      heading: String((_d = s.dailyNoteHeading) != null ? _d : "Contacts reached").trim()
    };
  }
  crmContacts() {
    var _a;
    const api = this.api(CRM_ID);
    if (api == null ? void 0 : api.getContactsSummary) {
      try {
        const rows = (_a = api.getContactsSummary()) != null ? _a : [];
        return rows.map(normalizeCrmRow).sort(sortCrm);
      } catch (e) {
        console.error("Daily Dashboard: contacts api read failed, falling back", e);
      }
    }
    return this.crmContactsFallback().sort(sortCrm);
  }
  crmContactsFallback() {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const folder = this.crmFolder();
    const todayStr2 = today2();
    const rows = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (folder && !file.path.startsWith(folder + "/")) continue;
      const cache = this.app.metadataCache.getFileCache(file);
      const fm = cache == null ? void 0 : cache.frontmatter;
      if (!fm) continue;
      const tags = cache ? (_a = (0, import_obsidian41.getAllTags)(cache)) != null ? _a : [] : [];
      const isContact = tags.includes("#contact") || fm.tags === "contact" || Array.isArray(fm.tags) && fm.tags.includes("contact");
      if (!isContact || fm.is_template === true) continue;
      const c = (_b = fm.contact) != null ? _b : {};
      const last = String((_d = (_c = c.last_contacted) != null ? _c : fm.last_contacted) != null ? _d : "").slice(0, 10);
      const next = String((_f = (_e = c.next_followup) != null ? _e : fm.next_followup) != null ? _f : "").slice(0, 10);
      rows.push({
        name: String((_g = fm.name) != null ? _g : file.basename),
        path: file.path,
        priority: normalizePriority((_h = c.priority) != null ? _h : fm.priority),
        daysSince: last ? (0, import_obsidian41.moment)(todayStr2).diff((0, import_obsidian41.moment)(last, "YYYY-MM-DD"), "days") : null,
        nextFollowup: next,
        overdue: !!next && next < todayStr2,
        dueToday: !!next && next === todayStr2
      });
    }
    return rows;
  }
  /** Safety-net reconcile: scan contact notes for a `### <today>` block under
   * `## Interaction Log` and return `[[Name|Name]] — <descriptor>` tails missing
   * from today's note, so the Contacts card can backfill them. */
  async crmReconcileLines(date = today2()) {
    var _a, _b;
    const folder = this.crmFolder();
    const { marker, heading } = this.crmLogTarget();
    const raw = await readDailyNoteRaw(this.app, date);
    const existing = new Set(
      readMarkerLogLines(raw, marker, heading).map((l) => l.replace(/^- \d{2}:\d{2}\s*/, "").trim())
    );
    const out = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (folder && !file.path.startsWith(folder + "/")) continue;
      const cache = this.app.metadataCache.getFileCache(file);
      if (!(cache == null ? void 0 : cache.frontmatter)) continue;
      const tags = (_a = (0, import_obsidian41.getAllTags)(cache)) != null ? _a : [];
      if (!tags.includes("#contact")) continue;
      const name = String((_b = cache.frontmatter.name) != null ? _b : file.basename);
      const content = await this.app.vault.cachedRead(file);
      for (const descriptor of interactionsForDate(content, date)) {
        const tail = `[[${name}|${name}]] \u2014 ${descriptor}`;
        if (!existing.has(tail)) out.push(tail);
      }
    }
    return out;
  }
  // ------------------------------------------------------------- Recipes
  recipesAvailable() {
    return this.enabled(RECIPES_ID);
  }
  recipeSetting(key, fallback) {
    var _a, _b;
    const v = (_b = (_a = this.plugin(RECIPES_ID)) == null ? void 0 : _a.settings) == null ? void 0 : _b[key];
    return typeof v === "string" && v.trim() ? v.trim() : fallback;
  }
  async plannedMeals(date = today2()) {
    var _a, _b;
    const api = this.api(RECIPES_ID);
    if (api == null ? void 0 : api.getPlannedMeals) {
      try {
        const res = api.getPlannedMeals(date);
        const meals2 = (_a = res && typeof res.then === "function" ? await res : res) != null ? _a : [];
        return meals2.map((m) => {
          var _a2, _b2, _c, _d, _e;
          return {
            name: (_b2 = (_a2 = m.name) != null ? _a2 : m.basename) != null ? _b2 : "",
            link: (_e = (_d = (_c = m.link) != null ? _c : m.basename) != null ? _d : m.name) != null ? _e : ""
          };
        });
      } catch (e) {
        console.error("Daily Dashboard: recipes api read failed, falling back", e);
      }
    }
    const raw = await readDailyNoteRaw(this.app, date);
    const heading = this.recipeSetting("mealHeading", "Meals");
    const body = readHeadingSection(raw, heading);
    const meals = [];
    for (const line of body.split("\n")) {
      const m = line.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      if (m) meals.push({ name: ((_b = m[2]) != null ? _b : m[1]).trim(), link: m[1].trim() });
    }
    return meals;
  }
  /** The grocery-list path — read from Recipe Manager's own setting, never
   * hardcoded. */
  groceryListPath() {
    let path = this.recipeSetting("groceryListPath", "Grocery List.md");
    if (!path.toLowerCase().endsWith(".md")) path += ".md";
    return path;
  }
  /** Read the grocery list (read-only). The checkboxes reflect the file's
   * current state; editing happens in Recipe Manager or the note itself. */
  async groceryList() {
    const path = this.groceryListPath();
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian41.TFile)) return { path, items: [], exists: false };
    const content = await this.app.vault.cachedRead(file);
    const items = [];
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
      if (m) items.push({ name: stripFormatting(m[2]), checked: m[1].toLowerCase() === "x" });
    }
    return { path, items, exists: true };
  }
};
function today2() {
  return (0, import_obsidian41.moment)().format("YYYY-MM-DD");
}
function stripFormatting(s) {
  return s.replace(/\*\*/g, "").replace(/\*(?!\*)/g, "").replace(/\s+\*\([^)]*\)\s*$/, "").trim();
}
function normalizeCrmRow(r) {
  var _a, _b, _c, _d;
  return {
    name: (_a = r.name) != null ? _a : "",
    path: (_b = r.path) != null ? _b : "",
    priority: normalizePriority(r.priority),
    daysSince: (_c = r.daysSince) != null ? _c : null,
    nextFollowup: (_d = r.nextFollowup) != null ? _d : "",
    overdue: !!r.overdue,
    dueToday: !!r.dueToday
  };
}
function normalizePriority(v) {
  const s = String(v != null ? v : "").trim().toLowerCase();
  return s === "high" || s === "medium" || s === "low" ? s : "";
}
function sortCrm(a, b) {
  var _a, _b;
  const bucket = (r) => r.overdue ? 0 : r.dueToday ? 1 : 2;
  return bucket(a) - bucket(b) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || ((_a = b.daysSince) != null ? _a : -1) - ((_b = a.daysSince) != null ? _b : -1);
}
function insertInteraction(content, date, noteText) {
  const logHeading = /^## Interaction Log\s*$/m;
  const todayHeading = `### ${date}`;
  if (!logHeading.test(content)) {
    return `${content.replace(/\s+$/, "")}

## Interaction Log

${todayHeading}
- ${noteText}
`;
  }
  const todayAtTop = new RegExp(`^## Interaction Log\\n+${todayHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m");
  if (todayAtTop.test(content)) {
    return content.replace(todayAtTop, (match) => `${match}
- ${noteText}`);
  }
  return content.replace(logHeading, (match) => `${match}

${todayHeading}
- ${noteText}
`);
}
function interactionsForDate(content, date) {
  const lines = content.split("\n");
  const logIdx = lines.findIndex((l) => /^##\s+Interaction Log\s*$/i.test(l));
  if (logIdx === -1) return [];
  const dateIdx = lines.findIndex((l, i) => i > logIdx && l.trim() === `### ${date}`);
  if (dateIdx === -1) return [];
  const out = [];
  for (let i = dateIdx + 1; i < lines.length; i++) {
    if (/^#{1,3}\s/.test(lines[i])) break;
    const m = lines[i].match(/^-\s+(.*)$/);
    if (m) {
      const descriptor = m[1].trim();
      if (descriptor && descriptor.toLowerCase() !== "contact created") out.push(descriptor);
    }
  }
  return out;
}

// src/view.ts
var import_obsidian42 = require("obsidian");

// src/companion.ts
function friendlyCompanion(bridge) {
  return {
    recipesAvailable: () => bridge.recipesAvailable(),
    plannedMeals: (date) => bridge.plannedMeals(date),
    groceryList: async () => {
      const g = await bridge.groceryList();
      return {
        path: g.path,
        exists: g.exists,
        items: g.items.map((it, i) => ({ name: it.name, checked: it.checked, line: i }))
      };
    }
  };
}

// src/view.ts
var VIEW_TYPE_DASH = "daily-dashboard";
var DashView = class extends import_obsidian42.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.mounted = [];
    /** The phone tab currently shown. Kept on the view so a refresh never bumps
     * you back to the first tab. */
    this.activeTabId = null;
  }
  getViewType() {
    return VIEW_TYPE_DASH;
  }
  getDisplayText() {
    return "Daily Dashboard";
  }
  getIcon() {
    return "layout-dashboard";
  }
  ctx() {
    return {
      app: this.app,
      plugin: this.plugin,
      bridge: this.plugin.bridge,
      todos: this.plugin.todos,
      // This dashboard has no observation-streak concept; a zeroed snapshot
      // satisfies the core panel surface without introducing the notion.
      streak: DEFAULT_STREAK,
      // Recipe Manager, adapted to the generic companion surface (read-only).
      companion: friendlyCompanion(this.plugin.bridge),
      runtime: this.plugin.runtime,
      // Core library panels take their copy via their constructors; nothing
      // reads context copy on this dashboard yet.
      copy: {},
      settings: () => this.plugin.settings,
      agendaCache: this.plugin.agendaCache,
      localEvents: this.plugin.localEvents,
      persist: () => this.plugin.saveData_(),
      requestRefresh: (reason = "manual") => void this.refreshPanels(reason),
      markFoodFocus: () => {
      }
    };
  }
  async onOpen() {
    await this.build();
  }
  /** Re-mount all panels — used when the panel set or order changes. */
  async rebuild() {
    await this.build();
  }
  /** Live theme switch: restamp the root attribute, no rebuild. */
  applyTheme() {
    this.contentEl.dataset.theme = this.plugin.settings.theme;
  }
  async onClose() {
    this.teardown();
    this.contentEl.empty();
  }
  teardown() {
    var _a, _b;
    for (const m of this.mounted) {
      try {
        (_b = (_a = m.panel).unmount) == null ? void 0 : _b.call(_a);
      } catch (e) {
      }
    }
    this.mounted = [];
  }
  async build() {
    this.teardown();
    const root = this.contentEl;
    root.empty();
    root.addClass("dash-root");
    root.dataset.theme = this.plugin.settings.theme;
    this.renderChrome(root);
    const s = this.plugin.settings;
    const tabsActive = import_obsidian42.Platform.isMobile && s.mobileTabs && s.tabs.length > 0;
    let visible = null;
    if (tabsActive) {
      if (!this.activeTabId || !s.tabs.some((t) => t.id === this.activeTabId)) this.activeTabId = this.defaultTabId(s);
      this.renderTabBar(root, s);
      visible = this.visibleIdsForTab(s, this.activeTabId);
    }
    this.grid = root.createDiv({ cls: "dash-grid" });
    let panels = createPanels(s.panelOrder, s.enabledPanels, this.plugin);
    if (visible) panels = panels.filter((p) => visible.has(p.id));
    const ctx = this.ctx();
    const layout = computeLayout(s.panelOrder, s.enabledPanels, s.panelColumns, s.panelSpans);
    const placeById = new Map(layout.placements.map((p) => [p.id, p]));
    if (layout.configured) {
      this.grid.addClass("dash-grid-cols");
      this.grid.style.setProperty("--dash-cols", String(layout.columns));
    }
    for (const panel of panels) {
      const host = this.grid.createDiv({ cls: "dash-panel" });
      host.dataset.panel = panel.id;
      const place = layout.configured ? placeById.get(panel.id) : void 0;
      if (place) host.style.gridColumn = `${place.column} / span ${place.span}`;
      this.mounted.push({ panel, host });
      await this.mountPanel(panel, host, ctx);
    }
    if (visible && panels.length === 0) {
      this.grid.createDiv({ cls: "dash-empty dash-tab-empty", text: "Nothing on this tab yet \u2014 choose a tab for some panels in the plugin settings." });
    }
    root.createDiv({ cls: "dash-scroll-spacer" });
  }
  defaultTabId(s) {
    if (s.defaultTabId && s.tabs.some((t) => t.id === s.defaultTabId)) return s.defaultTabId;
    return s.tabs[0].id;
  }
  /** Enabled panels on a tab. Unassigned panels go to the default tab, so no
   * panel is ever hidden from every tab. */
  visibleIdsForTab(s, tabId) {
    const def = this.defaultTabId(s);
    const set = /* @__PURE__ */ new Set();
    for (const id of s.panelOrder) {
      if (s.enabledPanels[id] === false) continue;
      const a = s.tabAssignments[id];
      if ((a && s.tabs.some((t) => t.id === a) ? a : def) === tabId) set.add(id);
    }
    return set;
  }
  renderTabBar(root, s) {
    const bar = root.createDiv({ cls: "dash-tabbar" });
    for (const tab of s.tabs) {
      const b = bar.createEl("button", { cls: "dash-tab", text: tab.name || "Tab" });
      b.toggleClass("is-active", tab.id === this.activeTabId);
      b.addEventListener("click", () => {
        if (this.activeTabId === tab.id) return;
        this.activeTabId = tab.id;
        void this.build();
      });
    }
  }
  renderChrome(root) {
    const header = root.createDiv({ cls: "dash-topbar" });
    const brand = header.createDiv({ cls: "dash-brand" });
    brand.appendChild(dashMark());
    brand.createDiv({ cls: "dash-brand-name", text: "Daily Dashboard" });
    const refresh = header.createEl("button", { cls: "dash-icon-btn", attr: { "aria-label": "Refresh" } });
    (0, import_obsidian42.setIcon)(refresh, "refresh-cw");
    refresh.addEventListener("click", () => void this.refreshPanels("manual"));
  }
  async mountPanel(panel, host, ctx) {
    host.empty();
    const body = host.createDiv({ cls: "dash-panel-body" });
    try {
      await panel.mount(body, ctx);
    } catch (e) {
      this.renderErrorCard(host, panel, e);
    }
  }
  /** Plain-language failure card — tells the user what happened and that the
   * rest of the dashboard still works. The detail goes to the console. */
  renderErrorCard(host, panel, err) {
    console.error(`Daily Dashboard: panel "${panel.id}" failed`, err);
    host.empty();
    host.addClass("dash-panel-error");
    const card = host.createDiv({ cls: "dash-error-card" });
    card.createDiv({ cls: "dash-placard", text: panel.title });
    card.createDiv({
      cls: "dash-error-note",
      text: "This panel couldn't load right now. The rest of your dashboard is fine \u2014 try the refresh button, or reopen the dashboard."
    });
  }
  async refreshPanels(reason) {
    var _a, _b;
    for (const m of this.mounted) {
      try {
        await ((_b = (_a = m.panel).refresh) == null ? void 0 : _b.call(_a, reason));
      } catch (e) {
        this.renderErrorCard(m.host, m.panel, e);
      }
    }
  }
};
function dashMark() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 32 32");
  svg.setAttribute("class", "dash-mark");
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  const frame = document.createElementNS(ns, "rect");
  frame.setAttribute("x", "3");
  frame.setAttribute("y", "3");
  frame.setAttribute("width", "26");
  frame.setAttribute("height", "26");
  frame.setAttribute("rx", "6");
  frame.setAttribute("class", "dash-mark-frame");
  svg.appendChild(frame);
  const rows = [
    [9, 14],
    [15, 20],
    [21, 12]
  ];
  for (const [y, w] of rows) {
    const bar = document.createElementNS(ns, "rect");
    bar.setAttribute("x", "8");
    bar.setAttribute("y", String(y));
    bar.setAttribute("width", String(w));
    bar.setAttribute("height", "2.5");
    bar.setAttribute("rx", "1.25");
    bar.setAttribute("class", "dash-mark-bar");
    svg.appendChild(bar);
  }
  return svg;
}

// src/agenda-log.ts
var import_obsidian43 = require("obsidian");
var AGENDA_HEADING = "Agenda";
var AGENDA_MARKER = "%% agenda-log %%";
async function logAgendaToDailyNote(plugin) {
  const s = plugin.settings;
  const today3 = (0, import_obsidian43.moment)().format("YYYY-MM-DD");
  const items = [];
  for (const cal of s.agendaUrls) {
    const cache = plugin.agendaCache[cal.url];
    if (cache == null ? void 0 : cache.text) {
      try {
        items.push(...eventsOnDate(parseICS(cache.text), today3));
      } catch (e) {
      }
    }
  }
  for (const ev of plugin.localEvents.filter((e) => e.date === today3)) {
    items.push(localEventToAgendaItem(ev));
  }
  if (items.length === 0) {
    new import_obsidian43.Notice("Nothing on today's agenda.");
    return;
  }
  items.sort((a, b) => a.sortKey - b.sortKey);
  for (const it of items) {
    const time = it.allDay ? "00:00" : (0, import_obsidian43.moment)(it.startMs).format("HH:mm");
    const when = it.allDay ? "all-day" : it.timeLabel || time;
    const loc = it.location ? ` @ ${it.location}` : "";
    const line = `- ${time} ${it.summary}${loc}${it.allDay ? " (all-day)" : ` (${when})`}`;
    await appendDailyLogLine(plugin.app, line, { heading: AGENDA_HEADING, marker: AGENDA_MARKER, time });
  }
  new import_obsidian43.Notice(`Logged ${items.length} agenda item${items.length === 1 ? "" : "s"} to today's note.`);
}

// src/main.ts
var LEGACY_PANELS = ["clock", "verse", "todo", "agenda", "journal", "meals", "search", "calendar", "secondbrain", "places"];
var DIRECTIVES_SYNC_GRACE_MS = 3e4;
var DailyDashPlugin = class extends import_obsidian44.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.runtime = { sessionStart: Date.now(), previousAccess: 0, typingUntil: 0, textFocused: false };
    this.refreshTimer = null;
    this.midnightTimer = null;
    /**
     * Tiny read/write API for companion plugins. Recipe Manager can call
     * `importGroceryMarkdown` to send a generated grocery list straight into the
     * Shopping panel's store. A Markdown string in, a count of new items out.
     */
    this.api = {
      version: 1,
      importGroceryMarkdown: async (markdown, listName = "Groceries") => {
        const list = (listName || "Groceries").trim() || "Groceries";
        const parsed = parseGroceryNote(markdown, list);
        if (parsed.length === 0) return 0;
        const store = await loadShopping(this);
        if (!store.lists.includes(list)) store.lists.push(list);
        const existing = new Set(itemsFor(store, list).map((i) => i.name.toLowerCase()));
        let added = 0;
        for (const it of parsed) {
          if (existing.has(it.name.toLowerCase())) continue;
          existing.add(it.name.toLowerCase());
          store.items.push(it);
          added++;
        }
        if (added > 0) await saveShopping(this, store);
        this.refreshOpenViews("manual");
        return added;
      }
    };
  }
  async onload() {
    this.registerView(VIEW_TYPE_DASH, (leaf) => new DashView(leaf, this));
    this.bridge = new Bridge(this.app);
    this.secondBrain = new LibraryStore(this.app, () => ({
      root: this.settings.secondBrainPath,
      categoriesSubfolder: "Categories",
      archiveSubfolder: this.settings.secondBrainArchiveSubfolder,
      listHeading: "Notes"
    }));
    this.knowledgeBase = new LibraryStore(this.app, () => ({
      root: this.settings.kbRootPath,
      notesSubfolder: this.settings.kbNotesSubfolder,
      categoriesSubfolder: this.settings.kbCategoriesSubfolder,
      archiveSubfolder: this.settings.kbArchiveSubfolder,
      listHeading: this.settings.kbListHeading
    }));
    this.directives = new DirectivesStore(this.app, () => this.settings.directivesPath, {
      header: "%% Daily Dashboard \u2014 your saved to-do list. This file is managed automatically; add and edit your to-dos in the dashboard, not here. %%",
      defaultPath: "Daily Dashboard/To-dos.md",
      hasSeenFile: () => {
        var _a;
        return ((_a = this.data) == null ? void 0 : _a.directivesFileSeen) === true;
      },
      markSeenFile: () => {
        if (this.data && !this.data.directivesFileSeen) {
          this.data.directivesFileSeen = true;
          void this.saveData_();
        }
      },
      getBackup: () => {
        var _a, _b;
        return (_b = (_a = this.data) == null ? void 0 : _a.directivesBackup) != null ? _b : [];
      },
      setBackup: (items) => {
        if (!this.data) return;
        this.data.directivesBackup = items;
        void this.saveData_();
      }
    });
    this.localEventsStore = new LocalEventsFileStore(this.app, () => this.settings.localEventsPath, {
      defaultPath: "Daily Dashboard/Local Events.md"
    });
    this.layoutStore = new LayoutStore(this.app, () => this.settings.layoutPath, {
      defaultPath: "Daily Dashboard/Dashboard Layout.md"
    });
    this.aiCreds = new AICredsStore(this.app, () => this.settings.aiCredentialsPath, {
      defaultPath: "Daily Dashboard/AI Credentials.md"
    });
    this.todos = new TodoStore(
      this.app,
      () => this.directives.getItems(),
      (items) => this.directives.setItems(items),
      () => this.directives.save(),
      () => ({
        marker: this.settings.completedTasksMarker,
        heading: this.settings.completedTasksHeading
      })
    );
    await this.load_();
    this.addRibbonIcon("layout-dashboard", "Open Daily Dashboard", () => void this.openDashboard());
    this.addCommand({
      id: "open-dashboard",
      name: "Open dashboard",
      callback: () => void this.openDashboard()
    });
    this.registerCommands();
    this.registerObsidianProtocolHandler("daily-dash", (params) => void this.handleUri(params));
    this.addSettingTab(new DashSettingTab(this.app, this));
    this.registerEvent(this.app.metadataCache.on("changed", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("modify", (file) => this.onVaultChange(file.path)));
    this.registerEvent(this.app.vault.on("create", (file) => this.onVaultChange(file.path)));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRefresh()));
    this.app.workspace.onLayoutReady(() => {
      this.rebuildOpenViews();
      void Promise.all([this.loadDirectives(), this.localEventsStore.load(), this.loadLayout(), this.loadAICreds()]).then(
        () => this.refreshOpenViews("vault")
      );
      this.scheduleMidnight();
      this.registerEvent(
        this.app.workspace.on("active-leaf-change", (leaf) => {
          var _a;
          this.maybeReplaceEmptyLeaf(leaf);
          if (((_a = leaf == null ? void 0 : leaf.view) == null ? void 0 : _a.getViewType()) === VIEW_TYPE_DASH) this.refreshOpenViews("open");
        })
      );
      this.registerDomEvent(document, "visibilitychange", () => {
        if (document.visibilityState === "visible") this.refreshOpenViews("open");
      });
      if (this.settings.replaceNewTab) this.replaceActiveEmptyLeaf();
      if (this.settings.openOnStartup) void this.openDashboard(false);
    });
  }
  /** If enabled, swap an empty New Tab leaf for the dashboard. */
  maybeReplaceEmptyLeaf(leaf) {
    var _a;
    if (!this.settings.replaceNewTab || !leaf) return;
    if (((_a = leaf.view) == null ? void 0 : _a.getViewType()) === "empty") {
      void leaf.setViewState({ type: VIEW_TYPE_DASH });
    }
  }
  /** Replace the currently-active leaf if it's an empty New Tab. */
  replaceActiveEmptyLeaf() {
    var _a;
    this.maybeReplaceEmptyLeaf((_a = this.app.workspace.activeLeaf) != null ? _a : null);
  }
  onunload() {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    if (this.midnightTimer !== null) window.clearTimeout(this.midnightTimer);
  }
  // ----------------------------------------------- commands + URI
  /** Everything the dashboard does, reachable from the command palette, a phone
   * shortcut, or a hotkey — each works whether or not the dashboard is open. */
  registerCommands() {
    const done = () => this.refreshOpenViews("vault");
    this.addCommand({
      id: "add-todo",
      name: "Add a to-do",
      callback: () => new TodoEditModal2(this.app, this.todos, void 0, done).open()
    });
    this.addCommand({
      id: "complete-next-todo",
      name: "Complete the next to-do",
      callback: () => void this.completeNextTodo()
    });
    for (const field of Object.keys(JOURNAL_FIELDS)) {
      this.addCommand({
        id: `log-${field}`,
        name: `Write in ${JOURNAL_FIELDS[field].label}`,
        callback: () => this.promptJournal(field)
      });
    }
    this.addCommand({
      id: "add-event",
      name: "Add an event to today's agenda",
      callback: () => new LocalEventModal(this.app, friendlyLocalEvents(this), void 0, done).open()
    });
    this.addCommand({
      id: "log-agenda",
      name: "Copy today's agenda into today's note",
      callback: () => void logAgendaToDailyNote(this)
    });
    this.addCommand({
      id: "weekly-review",
      name: "Week in review",
      callback: () => new WeekReviewModal(this.app, friendlyWeekReviewConfig(this)).open()
    });
    this.addCommand({
      id: "weekly-goals",
      name: "Set this week's goals",
      callback: () => new WeeklyGoalsModal(this.app, friendlyWeeklyGoals(this), this.todos, currentWeekKey(), done, FRIENDLY_WEEKLYGOALS_COPY).open()
    });
    this.addCommand({
      id: "shopping-list",
      name: "Open the shopping list",
      callback: () => new ShoppingManagerModal(this.app, this, void 0, done).open()
    });
    this.addCommand({
      id: "add-shopping-item",
      name: "Add a shopping item",
      callback: () => new ShoppingItemModal(this.app, this, "Groceries", null, done).open()
    });
    this.addCommand({
      id: "add-quote",
      name: "Add a quote",
      callback: () => new QuoteEditModal(this.app, this, null, done).open()
    });
    this.addCommand({
      id: "quotes-catalogue",
      name: "Browse quotes",
      callback: () => new QuoteCatalogueModal(this.app, this, done).open()
    });
    this.addCommand({
      id: "generate-daily-brief",
      name: "Write today's brief (AI)",
      callback: async () => {
        await generateMorningBrief(this, true);
        this.refreshOpenViews("manual");
      }
    });
    this.addCommand({
      id: "end-the-day",
      name: "End the day \u2014 add a recap to today's note (AI)",
      callback: () => void generateEndOfDay(this)
    });
    this.addCommand({
      id: "refresh",
      name: "Refresh dashboard",
      callback: () => this.refreshOpenViews("manual")
    });
    this.addCommand({
      id: "todo-status",
      name: "Show to-do list status (troubleshooting)",
      callback: async () => {
        var _a;
        const path = this.directives.path();
        const f = this.app.vault.getAbstractFileByPath(path);
        const lines = [
          `File: ${path}`,
          `On disk: ${f instanceof import_obsidian44.TFile ? `yes (${(await this.app.vault.read(f).catch(() => "")).length} bytes)` : "no"}`,
          `In memory: ${this.directives.getItems().length} to-dos`,
          `Backup on this device: ${((_a = this.data.directivesBackup) != null ? _a : []).length}`,
          `Last load: ${this.directives.lastStatus}`
        ];
        new import_obsidian44.Notice(lines.join("\n"), 15e3);
      }
    });
    this.addCommand({
      id: "restore-todo-backup",
      name: "Restore the to-do list from this device's backup",
      callback: async () => {
        var _a;
        const backup = (_a = this.data.directivesBackup) != null ? _a : [];
        if (backup.length === 0) {
          new import_obsidian44.Notice("There's no to-do backup on this device to restore from.");
          return;
        }
        this.directives.setItems(backup.map((t) => ({ ...t })));
        await this.directives.save();
        this.refreshOpenViews("manual");
        new import_obsidian44.Notice(`Restored ${backup.length} to-do${backup.length === 1 ? "" : "s"}.`);
      }
    });
  }
  /** Complete the top to-do still open today — the same path as ticking it. */
  async completeNextTodo() {
    const inst = this.todos.firstPending();
    if (!inst) {
      new import_obsidian44.Notice("Nothing left to do today. \u{1F389}");
      return;
    }
    await this.todos.toggleComplete(inst.item.id);
    this.refreshOpenViews("vault");
    new import_obsidian44.Notice(`Done: ${inst.item.text}`);
  }
  promptJournal(field) {
    new PromptModal(
      this.app,
      { title: JOURNAL_FIELDS[field].label, placeholder: "What's on your mind?", cta: "Save", multiline: true },
      (text) => void this.writeJournal(field, text)
    ).open();
  }
  /** Append `text` to a journal section of today's note (creating it if needed). */
  async writeJournal(field, text) {
    const { label, spec } = JOURNAL_FIELDS[field];
    try {
      const wrote = await appendToDailyField(this.app, spec, text, label);
      if (wrote) {
        this.refreshOpenViews("vault");
        new import_obsidian44.Notice(`Saved to ${label}.`);
      } else {
        new import_obsidian44.Notice(`Nothing was saved \u2014 there's no text, or today's note couldn't be found.`);
      }
    } catch (e) {
      console.error("Daily Dashboard: journal write failed", e);
      new import_obsidian44.Notice("That couldn't be saved. Please try again.");
    }
  }
  /** `obsidian://daily-dash?action=…` — headless with `text`, falls back to the
   * matching window without it. */
  async handleUri(params) {
    var _a, _b, _c, _d, _e, _f, _g;
    const action = ((_a = params.action) != null ? _a : "").toLowerCase();
    const done = () => this.refreshOpenViews("vault");
    switch (action) {
      case "":
      case "open":
        await this.openDashboard();
        return;
      case "complete-next":
        await this.completeNextTodo();
        return;
      case "add-todo": {
        const text = ((_b = params.text) != null ? _b : "").trim();
        if (text) {
          await this.todos.add({ text });
          done();
          new import_obsidian44.Notice(`Added to-do: ${text}`);
        } else {
          new TodoEditModal2(this.app, this.todos, void 0, done).open();
        }
        return;
      }
      case "log": {
        const field = ((_c = params.field) != null ? _c : "").toLowerCase();
        if (!isJournalField(field)) {
          new import_obsidian44.Notice("Unknown journal section. Use braindump, journal, or tomorrow.");
          return;
        }
        const text = ((_d = params.text) != null ? _d : "").trim();
        if (text) await this.writeJournal(field, text);
        else this.promptJournal(field);
        return;
      }
      case "add-event": {
        const summary = ((_f = (_e = params.summary) != null ? _e : params.text) != null ? _f : "").trim();
        if (summary) {
          const date = /^\d{4}-\d{2}-\d{2}$/.test((_g = params.date) != null ? _g : "") ? params.date : (0, import_obsidian44.moment)().format("YYYY-MM-DD");
          const start = params.start || void 0;
          await this.addLocalEvent({ summary, date, start, end: start && params.end ? params.end : void 0 });
          new import_obsidian44.Notice(`Added event: ${summary}`);
        } else {
          new LocalEventModal(this.app, friendlyLocalEvents(this), void 0, done).open();
        }
        return;
      }
      default:
        new import_obsidian44.Notice("Daily Dashboard didn't recognise that link.");
    }
  }
  // ------------------------------------------------------------- data
  async load_() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const raw = await this.loadData();
    this.settings = mergeSettings(raw == null ? void 0 : raw.settings);
    this.data = {
      settings: this.settings,
      todos: (_a = raw == null ? void 0 : raw.todos) != null ? _a : [],
      seeded: (_b = raw == null ? void 0 : raw.seeded) != null ? _b : false,
      agendaCache: (_c = raw == null ? void 0 : raw.agendaCache) != null ? _c : {},
      weeklyGoals: (_d = raw == null ? void 0 : raw.weeklyGoals) != null ? _d : {},
      directivesFileSeen: (_e = raw == null ? void 0 : raw.directivesFileSeen) != null ? _e : false,
      directivesBackup: (_f = raw == null ? void 0 : raw.directivesBackup) != null ? _f : [],
      briefDate: (_g = raw == null ? void 0 : raw.briefDate) != null ? _g : "",
      briefText: (_h = raw == null ? void 0 : raw.briefText) != null ? _h : "",
      // A fresh install knows every panel; an upgrade knows only the old set.
      knownPanels: (_i = raw == null ? void 0 : raw.knownPanels) != null ? _i : (raw == null ? void 0 : raw.settings) ? LEGACY_PANELS : [...PANEL_ORDER]
    };
    this.placeNewPanels();
    await this.saveData_();
  }
  /** Slot panels added by an update next to their default neighbour (instead of
   * at the very bottom), once. Their on/off state comes from the defaults. */
  placeNewPanels() {
    var _a;
    const known = new Set((_a = this.data.knownPanels) != null ? _a : []);
    const order = this.settings.panelOrder;
    for (const id of PANEL_ORDER) {
      if (known.has(id)) continue;
      const at = order.indexOf(id);
      if (at >= 0) order.splice(at, 1);
      const prev = PANEL_ORDER.slice(0, PANEL_ORDER.indexOf(id)).reverse().find((p) => order.includes(p));
      order.splice(prev ? order.indexOf(prev) + 1 : 0, 0, id);
      this.settings.enabledPanels[id] = DEFAULT_SETTINGS.enabledPanels[id];
      known.add(id);
    }
    this.data.knownPanels = [...known];
  }
  /** Load the to-do list from its vault file. Sync-safe: a missing file may just
   * mean Obsidian Sync hasn't delivered it yet, so nothing is written until the
   * real copy has had time to arrive (or there's genuine legacy data to move). */
  async loadDirectives() {
    var _a;
    const existed = await this.directives.load();
    if (existed) {
      this.data.seeded = true;
      return;
    }
    const legacy = (_a = this.data.todos) != null ? _a : [];
    if (legacy.length > 0) {
      this.directives.setItems(legacy);
      this.data.seeded = true;
      this.data.todos = [];
      await this.directives.save();
      await this.saveData_();
      return;
    }
    this.directives.deferCreateFor(DIRECTIVES_SYNC_GRACE_MS);
    const poll = async () => {
      if (this.directives.hasLoaded()) return;
      const arrived = await this.directives.load();
      if (arrived && !this.directives.isUnreadable()) this.refreshOpenViews("vault");
    };
    for (const ms of [2e3, 5e3, 1e4, 2e4, DIRECTIVES_SYNC_GRACE_MS]) {
      this.registerTimeout(window.setTimeout(() => void poll(), ms));
    }
    this.registerTimeout(
      window.setTimeout(async () => {
        const recreated = await this.directives.ensureFromBackup();
        if (!recreated) await this.directives.save();
        this.refreshOpenViews("vault");
      }, DIRECTIVES_SYNC_GRACE_MS + 1500)
    );
  }
  registerTimeout(id) {
    this.register(() => window.clearTimeout(id));
  }
  /** The synced layout file wins when present; otherwise seed it from this
   * device so it starts following you around. */
  async loadLayout() {
    if (await this.layoutStore.load()) {
      applyLayout(this.settings, this.layoutStore.get());
      await this.saveData_();
      this.rebuildOpenViews();
    } else {
      await this.layoutStore.seedFrom(layoutFromSettings(this.settings));
    }
  }
  /** Save a layout edit to both data.json and the synced layout file. */
  async persistLayout() {
    await this.saveData_();
    await this.layoutStore.setFromSettings(layoutFromSettings(this.settings));
  }
  /** The synced credentials file wins when it has a key; otherwise seed it from
   * this device's key (if any) so the other devices get it. */
  async loadAICreds() {
    await this.aiCreds.load();
    const fileKey = this.aiCreds.getApiKey();
    if (fileKey) {
      this.settings.aiApiKey = fileKey;
      const base = this.aiCreds.getBaseUrl();
      if (base) this.settings.aiBaseUrl = base;
      await this.saveData_();
    } else if (this.settings.aiApiKey) {
      await this.aiCreds.seedFrom(this.settings.aiApiKey, this.settings.aiBaseUrl);
    }
  }
  /** Mirror the API key into the synced credentials file after a settings edit. */
  async persistAICreds() {
    await this.aiCreds.setFromSettings(this.settings.aiApiKey, this.settings.aiBaseUrl);
  }
  /** Vault create/modify router: reload a synced store when its file changes on
   * another device (Obsidian Sync), otherwise a plain debounced refresh. */
  onVaultChange(path) {
    if (this.directives.isDirectivesPath(path)) {
      void this.directives.onExternalChange(path).then((changed) => {
        if (changed) this.refreshOpenViews("vault");
      });
      return;
    }
    if (this.localEventsStore.isLocalEventsPath(path)) {
      void this.localEventsStore.onExternalChange(path).then((changed) => {
        if (changed) this.refreshOpenViews("vault");
      });
      return;
    }
    if (this.layoutStore.isLayoutPath(path)) {
      void this.layoutStore.onExternalChange(path).then((changed) => {
        if (changed) {
          applyLayout(this.settings, this.layoutStore.get());
          void this.saveData_();
          this.rebuildOpenViews();
        }
      });
      return;
    }
    if (this.aiCreds.isCredsPath(path)) {
      void this.aiCreds.onExternalChange(path).then((changed) => {
        if (changed) {
          this.settings.aiApiKey = this.aiCreds.getApiKey();
          const base = this.aiCreds.getBaseUrl();
          if (base) this.settings.aiBaseUrl = base;
          this.refreshOpenViews("vault");
        }
      });
      return;
    }
    this.scheduleRefresh();
  }
  async saveData_() {
    this.data.settings = this.settings;
    await this.saveData(this.data);
  }
  get agendaCache() {
    return this.data.agendaCache;
  }
  // ------------------------------------------------------- local events
  /** The dashboard-only local events, read live from the synced Markdown file. */
  get localEvents() {
    return this.localEventsStore.getEvents();
  }
  async addLocalEvent(ev) {
    await this.localEventsStore.add(ev);
    this.refreshOpenViews("vault");
  }
  async updateLocalEvent(id, patch) {
    await this.localEventsStore.update(id, patch);
    this.refreshOpenViews("vault");
  }
  async removeLocalEvent(id) {
    await this.localEventsStore.remove(id);
    this.refreshOpenViews("vault");
  }
  // ------------------------------------------------------- weekly goals
  weeklyGoalsFor(weekKey) {
    var _a;
    return (_a = this.data.weeklyGoals[weekKey]) != null ? _a : [];
  }
  async addWeeklyGoal(weekKey, text) {
    var _a;
    const trimmed = text.trim();
    if (!trimmed) return;
    const list = (_a = this.data.weeklyGoals[weekKey]) != null ? _a : this.data.weeklyGoals[weekKey] = [];
    list.push({ id: localId(), text: trimmed });
    await this.saveData_();
  }
  async removeWeeklyGoal(weekKey, id) {
    const list = this.data.weeklyGoals[weekKey];
    if (!list) return;
    this.data.weeklyGoals[weekKey] = list.filter((g) => g.id !== id);
    if (this.data.weeklyGoals[weekKey].length === 0) delete this.data.weeklyGoals[weekKey];
    await this.saveData_();
  }
  // ------------------------------------------------------- daily brief cache
  getBriefDate() {
    var _a;
    return (_a = this.data.briefDate) != null ? _a : "";
  }
  getBriefText() {
    var _a;
    return (_a = this.data.briefText) != null ? _a : "";
  }
  async setBrief(date, text) {
    this.data.briefDate = date;
    this.data.briefText = text;
    await this.saveData_();
  }
  // ------------------------------------------------------------- view
  async openDashboard(reveal = true) {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_DASH);
    let leaf;
    if (existing.length > 0) {
      leaf = existing[0];
    } else {
      leaf = reveal ? this.app.workspace.getLeaf(true) : this.app.workspace.getLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_DASH, active: reveal });
    }
    if (reveal) this.app.workspace.revealLeaf(leaf);
  }
  refreshOpenViews(reason = "manual") {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DASH)) {
      const view = leaf.view;
      if (view instanceof DashView) void view.refreshPanels(reason);
    }
  }
  /** Re-mount panels in every open view — for panel enable/reorder changes. */
  rebuildOpenViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DASH)) {
      const view = leaf.view;
      if (view instanceof DashView) void view.rebuild();
    }
  }
  /** Apply the current theme to every open view without a rebuild (live switch). */
  applyThemeToViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DASH)) {
      const view = leaf.view;
      if (view instanceof DashView) view.applyTheme();
    }
  }
  /** Re-arm a one-shot timer for just after local midnight, so "today" rolls
   * over on a dashboard left open overnight. */
  scheduleMidnight() {
    if (this.midnightTimer !== null) window.clearTimeout(this.midnightTimer);
    const msToMidnight = (0, import_obsidian44.moment)().endOf("day").valueOf() - Date.now() + 2e3;
    this.midnightTimer = window.setTimeout(() => {
      this.midnightTimer = null;
      this.refreshOpenViews("vault");
      this.scheduleMidnight();
    }, Math.max(1e3, msToMidnight));
  }
  scheduleRefresh() {
    if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      if (this.runtime.textFocused || Date.now() < this.runtime.typingUntil) {
        this.scheduleRefresh();
        return;
      }
      this.refreshOpenViews("vault");
    }, 300);
  }
};
function localId() {
  const c = globalThis.crypto;
  if (c == null ? void 0 : c.randomUUID) return c.randomUUID();
  return "g-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
