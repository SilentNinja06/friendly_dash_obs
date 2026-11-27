import { BasePanel, placard } from "../types";
import { companionPlugin, runCompanionCommand } from "../../companions/registry";

const PLUGIN_ID = "meridian-meditations";
const DAY = 86_400_000;

interface Session {
	date: string;
}

/** Local yyyy-mm-dd. */
export function dayKey(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Consecutive days ending today (or yesterday, if today isn't done yet) with a session. */
export function sittingStreak(sessions: Session[], today: Date): number {
	const days = new Set(sessions.map((s) => Date.parse(s.date)).filter((t) => !Number.isNaN(t)).map((t) => dayKey(new Date(t))));
	let cursor = startOfDay(today);
	if (!days.has(dayKey(cursor))) {
		cursor = new Date(cursor.getTime() - DAY);
		if (!days.has(dayKey(cursor))) return 0;
	}
	let n = 0;
	while (days.has(dayKey(cursor))) {
		n++;
		cursor = new Date(cursor.getTime() - DAY);
	}
	return n;
}

/** Sessions since Monday. */
export function sessionsThisWeek(sessions: Session[], today: Date): number {
	const s = startOfDay(today);
	const monday = new Date(s.getTime() - ((s.getDay() + 6) % 7) * DAY).getTime();
	return sessions.filter((x) => {
		const t = Date.parse(x.date);
		return !Number.isNaN(t) && t >= monday && t < monday + 7 * DAY;
	}).length;
}

/** Discipline — your meditation streak and a button to sit. */
export class DisciplinePanel extends BasePanel {
	id = "discipline";
	title = "Meditation";

	protected renderBody(): void {
		const head = placard(this.el, "Meditation");
		head.createDiv({ cls: "dash-qotd-tools" })
			.createEl("button", { cls: "dash-qotd-add", text: "↗", attr: { "aria-label": "Open Discipline" } })
			.addEventListener("click", () => runCompanionCommand(this.ctx.app, `${PLUGIN_ID}:open-discipline`));

		const data = companionPlugin(this.ctx.app, PLUGIN_ID)?.data as { sessions?: unknown } | undefined;
		const sessions: Session[] = Array.isArray(data?.sessions) ? (data!.sessions as unknown[]).filter((s): s is Session => !!s && typeof (s as Session).date === "string") : [];
		const now = new Date();
		const done = sessions.some((s) => dayKey(new Date(Date.parse(s.date))) === dayKey(now));
		const card = this.el.createDiv({ cls: "cmp-card" });
		const stats = card.createDiv({ cls: "cmp-stats" });
		stat(stats, String(sittingStreak(sessions, now)), "day streak");
		stat(stats, String(sessionsThisWeek(sessions, now)), "this week");
		card.createDiv({ cls: "cmp-line" + (done ? "" : " dash-muted"), text: done ? "✓ You've sat today." : "Not yet today." });
		card.createDiv({ cls: "dash-btn-row" })
			.createEl("button", { cls: "dash-btn dash-btn-primary", text: done ? "Sit again" : "Begin a session" })
			.addEventListener("click", () => runCompanionCommand(this.ctx.app, `${PLUGIN_ID}:begin-session`));
	}
}

export function stat(parent: HTMLElement, value: string, label: string): void {
	const s = parent.createDiv({ cls: "cmp-stat" });
	s.createDiv({ cls: "cmp-big", text: value });
	s.createDiv({ cls: "cmp-label", text: label });
}
