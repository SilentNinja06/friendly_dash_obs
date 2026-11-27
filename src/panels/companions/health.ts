import { BasePanel, placard } from "../types";
import { companionPlugin } from "../../companions/registry";

/** The Health plugin's read-only status API (version 1). Mirrored, not imported. */
interface HealthApi {
	version: number;
	live(): boolean;
	today(): {
		due: { med: string; time: string; amount: string; overdue: boolean }[];
		taken: number;
		total: number;
		asNeeded: { med: string; takenToday: number; limit?: number }[];
		bestStreak: number;
	};
	onChange(cb: () => void): () => void;
	openView(): void;
	openLogDue(): void;
	openAsNeeded(): void;
	openSymptoms(): void;
	openImport?(): void;
}

/** Health — today's doses with a one-tap Log due, as-needed counts, and symptoms. */
export class HealthPanel extends BasePanel {
	id = "health";
	title = "Health";
	private unsub: (() => void) | null = null;
	private subscribed: HealthApi | null = null;

	protected async setup(): Promise<void> {
		this.onCleanup(() => this.unsub?.());
	}

	private api(): HealthApi | null {
		const api = companionPlugin(this.ctx.app, "health")?.api as Partial<HealthApi> | undefined;
		return api && api.version === 1 && typeof api.today === "function" ? (api as HealthApi) : null;
	}

	protected renderBody(): void {
		const api = this.api();
		const head = placard(this.el, "Health");
		if (!api) {
			this.el.createDiv({ cls: "dash-muted", text: "Update Health to see it here." });
			return;
		}
		if (this.subscribed !== api) {
			this.unsub?.();
			this.subscribed = api;
			this.unsub = api.onChange(() => this.rerender());
		}
		head.createDiv({ cls: "dash-qotd-tools" }).createEl("button", { cls: "dash-qotd-add", text: "↗", attr: { "aria-label": "Open Health" } }).addEventListener("click", () => api.openView());
		const card = this.el.createDiv({ cls: "cmp-card" });
		let live = false;
		try {
			live = api.live();
		} catch {
			live = false;
		}
		if (!live) {
			card.createDiv({ cls: "dash-muted", text: "Health is waiting to import your medications. Open it to review the import." });
			card.createDiv({ cls: "dash-btn-row" }).createEl("button", { cls: "dash-btn dash-btn-primary", text: "Open Health" }).addEventListener("click", () => (api.openImport ? api.openImport() : api.openView()));
			return;
		}
		const t = api.today();
		const due = t.due.filter((d) => d.overdue);
		const stats = card.createDiv({ cls: "cmp-stats" });
		const stat = (v: string, l: string, warn = false) => {
			const s = stats.createDiv({ cls: "cmp-stat" + (warn ? " is-warn" : "") });
			s.createDiv({ cls: "cmp-big", text: v });
			s.createDiv({ cls: "cmp-label", text: l });
		};
		if (t.total) stat(`${t.taken}/${t.total}`, "doses today");
		if (due.length) stat(String(due.length), "due now", true);
		if (t.bestStreak) stat(String(t.bestStreak), "day streak");
		if (!t.total) card.createDiv({ cls: "dash-muted", text: "No scheduled medications today." });
		for (const d of t.due.slice(0, 4)) {
			const row = card.createDiv({ cls: "cmp-row" });
			row.createSpan({ cls: "cmp-row-time", text: d.time || "any" });
			row.createSpan({ cls: "cmp-row-title", text: `${d.med}${d.amount ? ` · ${d.amount}` : ""}` });
			row.createSpan({ cls: "cmp-tag" + (d.overdue ? " is-warn" : ""), text: d.overdue ? "due" : "later" });
		}
		for (const a of t.asNeeded.filter((x) => x.takenToday > 0)) card.createDiv({ cls: "cmp-line dash-muted", text: `${a.med}: ${a.takenToday}${a.limit ? ` of ${a.limit}` : ""} today` });
		const row = card.createDiv({ cls: "dash-btn-row" });
		if (t.due.length) row.createEl("button", { cls: "dash-btn dash-btn-primary", text: "Log due" }).addEventListener("click", () => api.openLogDue());
		row.createEl("button", { cls: "dash-btn", text: "As needed" }).addEventListener("click", () => api.openAsNeeded());
		row.createEl("button", { cls: "dash-btn", text: "Symptoms" }).addEventListener("click", () => api.openSymptoms());
	}
}
