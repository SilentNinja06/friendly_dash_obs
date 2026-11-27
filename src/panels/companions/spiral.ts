import { BasePanel, placard } from "../types";
import { companionPlugin, runCompanionCommand } from "../../companions/registry";
import { stat } from "./discipline";

const PLUGIN_ID = "spiral-shutdown-logger";

/** The Spiral & Shutdown Logger's read-only API. Mirrored, not imported.
 * Counts only: kinds, triggers and notes never reach the dashboard. */
interface SpiralApi {
	version: number;
	getTodaySummary?(): { count: number };
	getCounts?(): { today: number; last7: number };
	onChange?(cb: () => void): () => void;
	openCapture?(): void;
	openDashboard?(): void;
}

/** Spiral log — how many entries today and this week, and a Log button. */
export class SpiralPanel extends BasePanel {
	id = "spiral";
	title = "Spiral log";
	private unsub: (() => void) | null = null;
	private subscribed: SpiralApi | null = null;

	protected async setup(): Promise<void> {
		this.onCleanup(() => this.unsub?.());
	}

	protected renderBody(): void {
		const api = companionPlugin(this.ctx.app, PLUGIN_ID)?.api as SpiralApi | undefined;
		const head = placard(this.el, "Spiral log");
		const open = () => (api?.openDashboard ? api.openDashboard() : runCompanionCommand(this.ctx.app, `${PLUGIN_ID}:open-dashboard`));
		const log = () => (api?.openCapture ? api.openCapture() : runCompanionCommand(this.ctx.app, `${PLUGIN_ID}:quick-capture`));
		head.createDiv({ cls: "dash-qotd-tools" })
			.createEl("button", { cls: "dash-qotd-add", text: "↗", attr: { "aria-label": "Open the spiral log dashboard" } })
			.addEventListener("click", open);

		if (api && api.onChange && this.subscribed !== api) {
			this.unsub?.();
			this.subscribed = api;
			this.unsub = api.onChange(() => this.rerender());
		}

		const card = this.el.createDiv({ cls: "cmp-card" });
		let counts: { today: number; last7?: number } | null = null;
		try {
			if (api?.getCounts) counts = api.getCounts();
			else if (api?.getTodaySummary) counts = { today: api.getTodaySummary().count };
		} catch {
			counts = null;
		}
		if (counts) {
			const stats = card.createDiv({ cls: "cmp-stats" });
			stat(stats, String(counts.today), "today");
			if (counts.last7 !== undefined) stat(stats, String(counts.last7), "last 7 days");
		}
		card.createDiv({ cls: "dash-btn-row" })
			.createEl("button", { cls: "dash-btn dash-btn-primary", text: "Log an entry" })
			.addEventListener("click", log);
	}
}
