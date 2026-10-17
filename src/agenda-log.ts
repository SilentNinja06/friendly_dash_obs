import { Notice, moment } from "obsidian";
import { AgendaItem, appendDailyLogLine, eventsOnDate, localEventToAgendaItem, parseICS } from "dash-core";
import type DailyDashPlugin from "./main";

const AGENDA_HEADING = "Agenda";
const AGENDA_MARKER = "%% agenda-log %%";

/**
 * Snapshot today's agenda — calendar events (from the cached ICS feeds) plus
 * dashboard-local events — into today's daily note under an "Agenda" section, so
 * the day's plan is preserved to look back on. Idempotent per line: re-running
 * won't duplicate an item already written.
 */
export async function logAgendaToDailyNote(plugin: DailyDashPlugin): Promise<void> {
	const s = plugin.settings;
	const today = moment().format("YYYY-MM-DD");
	const items: AgendaItem[] = [];

	for (const cal of s.agendaUrls) {
		const cache = plugin.agendaCache[cal.url];
		if (cache?.text) {
			try {
				items.push(...eventsOnDate(parseICS(cache.text), today));
			} catch {
				/* a malformed feed shouldn't block the rest */
			}
		}
	}
	for (const ev of plugin.localEvents.filter((e) => e.date === today)) {
		items.push(localEventToAgendaItem(ev));
	}

	if (items.length === 0) {
		new Notice("Nothing on today's agenda.");
		return;
	}

	items.sort((a, b) => a.sortKey - b.sortKey);
	for (const it of items) {
		const time = it.allDay ? "00:00" : moment(it.startMs).format("HH:mm");
		const when = it.allDay ? "all-day" : it.timeLabel || time;
		const loc = it.location ? ` @ ${it.location}` : "";
		// `- HH:MM …` so the daily-note writer can order it among log lines.
		const line = `- ${time} ${it.summary}${loc}${it.allDay ? " (all-day)" : ` (${when})`}`;
		await appendDailyLogLine(plugin.app, line, { heading: AGENDA_HEADING, marker: AGENDA_MARKER, time });
	}
	new Notice(`Logged ${items.length} agenda item${items.length === 1 ? "" : "s"} to today's note.`);
}
