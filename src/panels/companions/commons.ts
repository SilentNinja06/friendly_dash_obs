import { BasePanel, placard } from "../types";
import { companionPlugin } from "../../companions/registry";

interface CommonsApi {
	version: number;
	arrival(): Promise<{ key: string; label: string; text: string; handoffId?: string; held: boolean }[]>;
	members(): { id: string; name: string; color: string; here?: boolean }[];
	setHere(who: string[]): Promise<void>;
	ack(id: string): Promise<void>;
	openView(): Promise<void>;
	openHere(): void;
	openHandoff(): void;
	logGap(): Promise<void>;
}

/** Commons — notes left for whoever's next, and who's here. Commons owns every
 * write; this card only calls its actions. */
export class CommonsPanel extends BasePanel {
	id = "commons";
	title = "Commons";

	protected async renderBody(): Promise<void> {
		const api = companionPlugin(this.ctx.app, "commons")?.api as CommonsApi | undefined;
		const head = placard(this.el, "Commons");
		if (!api || typeof api.version !== "number") {
			this.el.createDiv({ cls: "dash-muted", text: "Update Commons to see it here." });
			return;
		}
		head.createDiv({ cls: "dash-qotd-tools" }).createEl("button", { cls: "dash-qotd-add", text: "↗", attr: { "aria-label": "Open Commons" } }).addEventListener("click", () => void api.openView());

		const card = this.el.createDiv({ cls: "cmp-card" });
		try {
			for (const l of await api.arrival()) {
				const row = card.createDiv({ cls: "cmp-row" });
				row.createSpan({ cls: "cmp-row-time", text: l.label });
				row.createSpan({ cls: "cmp-row-title", text: l.text });
				if (l.handoffId) {
					const b = row.createEl("button", { cls: "dash-btn", text: l.held ? "Read" : "Got it" });
					b.addEventListener("click", (ev) => {
						ev.stopPropagation();
						void (l.held ? api.openView() : api.ack(l.handoffId!));
					});
				}
			}
		} catch (e) {
			console.warn("Daily Dashboard: Commons unavailable", e);
			card.createDiv({ cls: "dash-muted", text: "Commons couldn't load just now. Open it directly." });
			return;
		}
		const chips = card.createDiv({ cls: "cmp-chips" });
		for (const m of api.members()) {
			const b = chips.createEl("button", { cls: "cmp-chip" + (m.here ? " is-on" : ""), text: m.name || "Unnamed", attr: { "aria-pressed": String(!!m.here) } });
			if (m.color) b.style.setProperty("--cmp-chip", m.color);
			b.addEventListener("click", () => void api.setHere([m.id]));
		}
		chips.createEl("button", { cls: "cmp-chip", text: "Other…" }).addEventListener("click", () => api.openHere());
		const row = card.createDiv({ cls: "dash-btn-row" });
		row.createEl("button", { cls: "dash-btn", text: "Leave a note" }).addEventListener("click", () => api.openHandoff());
		row.createEl("button", { cls: "dash-btn", text: "Log a gap" }).addEventListener("click", () => void api.logGap());
	}
}
