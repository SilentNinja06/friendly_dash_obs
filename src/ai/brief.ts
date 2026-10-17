import { Notice, moment } from "obsidian";
import { AgendaItem, ensureDailyNote, eventsOnDate, headingField, localEventToAgendaItem, parseICS, readDailyField, replaceField } from "dash-core";
import type DailyDashPlugin from "../main";
import { JOURNAL_FIELDS } from "../core/journalfields";
import { aiComplete, AiConfig } from "./client";

/**
 * The optional AI daily brief and end-of-day recap.
 *
 * Context comes from what the dashboard already shows (calendars, local events,
 * to-dos, planned meals, contacts due), gated by per-category privacy switches —
 * nothing in an unchecked category leaves the device. The brief is cached per
 * date, so it's written once on the first open of the day and re-shown after.
 */

function today(): string {
	return moment().format("YYYY-MM-DD");
}

export function aiConfig(plugin: DailyDashPlugin): AiConfig {
	const s = plugin.settings;
	return { provider: s.aiProvider, apiKey: s.aiApiKey, baseUrl: s.aiBaseUrl, model: s.aiModel };
}

/** Whether the brief can run: switched on, and a key is present. */
export function briefConfigured(plugin: DailyDashPlugin): boolean {
	return plugin.settings.aiDailyBriefEnabled && !!plugin.settings.aiApiKey.trim();
}

// ------------------------------------------------------------- context

/** The day's plan: calendar + local events (as the agenda shows them), timed
 * to-dos, and planned meals. */
async function scheduleLines(plugin: DailyDashPlugin, date: string): Promise<string[]> {
	const lines: string[] = [];
	const items: AgendaItem[] = [];
	for (const cal of plugin.settings.agendaUrls) {
		const cache = plugin.agendaCache[cal.url];
		if (!cache?.text) continue;
		try {
			items.push(...eventsOnDate(parseICS(cache.text), date));
		} catch {
			/* a malformed feed shouldn't drop the rest */
		}
	}
	for (const ev of plugin.localEvents.filter((e) => e.date === date)) items.push(localEventToAgendaItem(ev));
	items.sort((a, b) => a.sortKey - b.sortKey);
	for (const it of items) {
		const when = it.allDay ? "all-day" : it.timeLabel || moment(it.startMs).format("HH:mm");
		lines.push(`- ${when}: ${it.summary}${it.location ? ` @ ${it.location}` : ""}`);
	}
	for (const i of plugin.todos.instancesFor(date).filter((i) => i.item.scheduledTime && !i.done && !i.skipped)) {
		lines.push(`- ${i.item.scheduledTime}: ${i.item.text}`);
	}
	if (plugin.bridge.recipesAvailable()) {
		try {
			for (const m of await plugin.bridge.plannedMeals(date)) lines.push(`- Meal: ${m.name}`);
		} catch {
			/* recipes not readable */
		}
	}
	return lines;
}

async function collectContext(plugin: DailyDashPlugin, date: string): Promise<string> {
	const s = plugin.settings;
	const sections: string[] = [];
	if (s.aiBriefIncludeSchedule) {
		const lines = await scheduleLines(plugin, date);
		sections.push(`SCHEDULE — things happening at set times (not to-dos):\n${lines.length ? lines.join("\n") : "- nothing scheduled"}`);
	}
	if (s.aiBriefIncludeTasks) {
		const pending = plugin.todos.instancesFor(date).filter((i) => !i.done && !i.skipped);
		const lines = pending.map((i) => `- ${i.item.text}${i.flagged && i.flagLabel ? ` (${i.flagLabel})` : ""}`);
		sections.push(`TO-DO LIST:\n${lines.length ? lines.join("\n") : "- nothing pending"}`);
	}
	if (s.aiBriefIncludePeople && plugin.bridge.crmAvailable()) {
		const self = s.aiUserName.trim().toLowerCase();
		const due = plugin.bridge
			.crmContacts()
			.filter((c) => (c.overdue || c.dueToday) && c.name.trim().toLowerCase() !== self)
			.map((c) => `- ${c.name}${c.overdue ? " (overdue)" : " (due today)"}`);
		sections.push(`PEOPLE TO CATCH UP WITH (other people, never the reader):\n${due.length ? due.join("\n") : "- no one due"}`);
	}
	return sections.join("\n\n");
}

/** Today's journal sections, so the recap is grounded in the reader's own words. */
async function journalText(plugin: DailyDashPlugin): Promise<string> {
	const parts: string[] = [];
	for (const f of Object.values(JOURNAL_FIELDS)) {
		try {
			const body = (await readDailyField(plugin.app, f.spec)).trim();
			if (body) parts.push(body);
		} catch {
			/* field/note absent */
		}
	}
	return parts.join("\n").trim();
}

// ------------------------------------------------------------- prompts

const GROUND_RULES =
	"Use only the facts in the data below. Never invent dates, durations, counts, streaks or history that the data " +
	"doesn't state. When unsure, say less.";

function persona(plugin: DailyDashPlugin): string {
	const s = plugin.settings;
	const name = s.aiUserName.trim();
	const pron = s.aiUserPronouns.trim();
	const about = s.aiAboutMe.trim();
	const who = name
		? `You are writing for ${name}${pron ? ` (${pron})` : ""}, who is reading this. Address them as "you". If "${name}" appears in the data, that's the reader, not a contact.`
		: `Write to the reader directly as "you".`;
	return about ? `${who} What they've shared about themselves (use only what it says): ${about}` : who;
}

function briefSystem(plugin: DailyDashPlugin): string {
	return [
		persona(plugin),
		GROUND_RULES,
		"Write a short, friendly morning brief (about 120 words) for their notes app.",
		"Open with one line about the shape of the day, then short sections for the schedule, who to catch up with, and what to get done. Skip empty sections.",
		"Present schedule items as a schedule, never as checkboxes; only the to-do list is a to-do list.",
		"Tone: warm, calm and practical — no hype. No preamble or sign-off. Plain Markdown.",
	].join(" ");
}

function eodSystem(plugin: DailyDashPlugin): string {
	return [
		persona(plugin),
		GROUND_RULES,
		"Write a short, balanced end-of-day recap (about 100 words) to add to their journal.",
		"Assume scheduled events happened unless the journal says otherwise. Mention what got done, what's still open on the to-do list, and one kind, practical note for tomorrow.",
		"Tone: warm and genuine, not over-the-top. Plain Markdown, no heading.",
	].join(" ");
}

// ------------------------------------------------------------- morning brief

/** Coalesces concurrent generations (the dashboard can re-render several times
 * on open), so the first brief of the day only calls the API once. */
let inFlight: Promise<string | null> | null = null;

/** Write today's brief and cache it. `force` rewrites even if today's is cached. */
export async function generateMorningBrief(plugin: DailyDashPlugin, force = false): Promise<string | null> {
	if (!briefConfigured(plugin)) {
		if (force) new Notice("Turn on the daily brief and add an API key in Settings → Daily Dashboard first.");
		return null;
	}
	const date = today();
	if (!force && plugin.getBriefDate() === date && plugin.getBriefText()) return plugin.getBriefText();
	if (inFlight) return inFlight;

	inFlight = (async () => {
		const context = await collectContext(plugin, date);
		const nice = moment(date, "YYYY-MM-DD").format("dddd, MMMM D");
		const res = await aiComplete(aiConfig(plugin), briefSystem(plugin), `Today is ${nice}.\n\n${context}`);
		if (!res.ok) {
			new Notice(res.error ?? "Couldn't write the brief.");
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

// ------------------------------------------------------------- end of day

/** Write an end-of-day recap under its heading in today's note. */
export async function generateEndOfDay(plugin: DailyDashPlugin): Promise<string | null> {
	if (!plugin.settings.aiApiKey.trim()) {
		new Notice("Add an API key in Settings → Daily Dashboard first.");
		return null;
	}
	const date = today();
	const instances = plugin.todos.instancesFor(date);
	const parts: string[] = [];
	if (plugin.settings.aiBriefIncludeSchedule) {
		const sched = await scheduleLines(plugin, date);
		if (sched.length) parts.push(`ON TODAY'S SCHEDULE:\n${sched.join("\n")}`);
	}
	if (plugin.settings.aiBriefIncludeTasks) {
		const done = instances.filter((i) => i.done).map((i) => `- ${i.item.text}`);
		const open = instances.filter((i) => !i.done && !i.skipped).map((i) => `- ${i.item.text}`);
		parts.push(`DONE TODAY:\n${done.length ? done.join("\n") : "- (none recorded)"}`);
		parts.push(`STILL OPEN:\n${open.length ? open.join("\n") : "- (none)"}`);
	}
	const journal = await journalText(plugin);
	if (journal) parts.push(`TODAY'S JOURNAL (their own words — the source of truth):\n${journal}`);

	const nice = moment(date, "YYYY-MM-DD").format("dddd, MMMM D");
	const res = await aiComplete(aiConfig(plugin), eodSystem(plugin), `End of ${nice}.\n\n${parts.join("\n\n")}`);
	if (!res.ok) {
		new Notice(res.error ?? "Couldn't write the recap.");
		return null;
	}
	const heading = plugin.settings.aiEndOfDayHeading.trim() || "End of day";
	const file = await ensureDailyNote(plugin.app);
	await plugin.app.vault.process(file, (content) => {
		const spec = headingField(heading);
		if (spec.anchor.test(content)) return replaceField(content, spec, res.text);
		return `${content.replace(/\s+$/, "")}\n\n## ${heading}\n\n${res.text.trim()}\n`;
	});
	new Notice("Added an end-of-day recap to today's note.");
	return res.text;
}
