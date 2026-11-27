import { commandButton, getDailyNoteFile, readMarkerLogLines } from "dash-core";
import { BasePanel, placard } from "../types";
import { companionPlugin } from "../../companions/registry";
import { COMMAND_OFFLINE } from "../../copy";

const PLUGIN_ID = "arfid-tracker";

interface Entry {
	time: string;
	label: string;
	aside: boolean;
}

interface ArfidApi {
	getEntriesForDate?(date: string): { time?: string; food?: string; label?: string; kind?: string }[];
	getSymptomsForDate?(date: string): { time?: string; symptoms?: string[] }[];
}

function today(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Food log — what's been logged today in ARFID Tracker. Read-only. */
export class FoodPanel extends BasePanel {
	id = "food";
	title = "Food log";

	protected async renderBody(): Promise<void> {
		const { app } = this.ctx;
		placard(this.el, "Food log");
		const entries = await this.read();
		const card = this.el.createDiv({ cls: "cmp-card" });
		if (!entries.length) {
			card.createDiv({ cls: "dash-muted", text: "Nothing logged yet today." });
		} else {
			for (const e of entries.slice(-6)) {
				const row = card.createDiv({ cls: "cmp-row" + (e.aside ? " is-aside" : "") });
				row.createSpan({ cls: "cmp-row-time", text: e.time });
				row.createSpan({ cls: "cmp-row-title", text: e.label });
			}
		}
		const actions = card.createDiv({ cls: "dash-btn-row" });
		commandButton(actions, app, `${PLUGIN_ID}:quick-log`, "Log a food", { cls: "dash-btn-primary", offlineText: COMMAND_OFFLINE });
		commandButton(actions, app, `${PLUGIN_ID}:struggling`, "I'm struggling", { offlineText: COMMAND_OFFLINE });
	}

	private async read(): Promise<Entry[]> {
		const api = companionPlugin(this.ctx.app, PLUGIN_ID)?.api as ArfidApi | undefined;
		const date = today();
		if (api?.getEntriesForDate) {
			try {
				const foods = (api.getEntriesForDate(date) ?? []).map((e) => ({
					time: e.time ?? "",
					label: e.food ?? e.label ?? "",
					aside: !!e.kind && e.kind !== "meal" && e.kind !== "exposure",
				}));
				const symptoms = (api.getSymptomsForDate?.(date) ?? []).map((s) => ({ time: s.time ?? "", label: (s.symptoms ?? []).join(", ") || "symptoms", aside: true }));
				return [...foods, ...symptoms].sort((a, b) => a.time.localeCompare(b.time));
			} catch (e) {
				console.warn("Daily Dashboard: ARFID Tracker read failed", e);
			}
		}
		// Older versions without an API: read the log lines it writes into today's note.
		const file = getDailyNoteFile(this.ctx.app, date);
		if (!file) return [];
		const raw = await this.ctx.app.vault.cachedRead(file);
		return readMarkerLogLines(raw, "%% arfid-log %%", "Miscellaneous notes").map((l) => {
			const m = /^\s*[-*]?\s*(\d{1,2}:\d{2})\s*[-–—:]?\s*(.*)$/.exec(l);
			const label = m ? m[2] : l.replace(/^\s*[-*]\s*/, "");
			return { time: m ? m[1] : "", label, aside: /^(status|symptoms?):/i.test(label) };
		});
	}
}
