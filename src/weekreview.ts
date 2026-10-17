import { moment } from "obsidian";
import type DailyDashPlugin from "./main";
import { WeekReviewBlock, WeekReviewConfig, WeekReviewData, headingField, readDailyNoteRaw, readField, readHeadingSection, readMarkerLogLines } from "dash-core";
import { JOURNAL_FIELDS } from "./core/journalfields";

/**
 * The week in review: a gentle look back over the last seven daily notes —
 * to-dos finished, days journaled, meals planned and (if you use Simple Contact
 * Manager) people you caught up with. Counts only; no judgement.
 */
export function friendlyWeekReviewConfig(plugin: DailyDashPlugin): WeekReviewConfig {
	return {
		title: "Week in review",
		compilingText: "Looking back over your week…",
		compile: () => compile(plugin),
	};
}

async function compile(plugin: DailyDashPlugin): Promise<WeekReviewData> {
	const s = plugin.settings;
	const days: string[] = [];
	for (let i = 6; i >= 0; i--) days.push(moment().subtract(i, "days").format("YYYY-MM-DD"));

	const perDay: Array<{ date: string; completed: number }> = [];
	let totalCompleted = 0;
	let journalDays = 0;
	let mealsDays = 0;
	let contactLines = 0;
	const contacts = new Set<string>();
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
				if (m) contacts.add((m[2] ?? m[1]).trim());
			}
		}
	}

	const blocks: WeekReviewBlock[] = [
		{
			head: "To-dos finished",
			figure: String(totalCompleted),
			bars: perDay.map((d) => ({ label: moment(d.date, "YYYY-MM-DD").format("dd")[0], count: d.completed })),
		},
		{ head: "Journal", line: `You wrote on ${journalDays} of 7 ${plural(journalDays, "day", "days")}.` },
	];
	if (plugin.bridge.recipesAvailable()) {
		blocks.push({ head: "Meals planned", line: `${mealsDays} of 7 ${plural(mealsDays, "day", "days")}.` });
	}
	if (crm) {
		const names = [...contacts].sort((a, b) => a.localeCompare(b));
		blocks.push({
			head: "Caught up with",
			line: `${contactLines} ${plural(contactLines, "catch-up", "catch-ups")} · ${names.length} ${plural(names.length, "person", "people")}.`,
			chips: names.length > 0 ? names : undefined,
		});
	}

	return { header: "Your last seven days, at a glance.", blocks };
}

function countBullets(body: string): number {
	return body.split("\n").filter((l) => /^\s*-\s+\S/.test(l)).length;
}

function plural(n: number, one: string, many: string): string {
	return n === 1 ? one : many;
}
