import { moment } from "obsidian";
import { BasePanel, placard } from "./types";

/**
 * Clock (§5.1). Ordinary time-of-day with the date beneath it. Twelve-hour with
 * a separator by default (2:32 PM); a settings toggle switches to 24-hour
 * (14:32). No four-digit format, no time-since-last-access.
 */
export class ClockPanel extends BasePanel {
	id = "clock";
	title = "Clock";
	private timeEl?: HTMLElement;
	private dateEl?: HTMLElement;

	protected async setup(): Promise<void> {
		this.setInterval(() => this.tick(), 1000);
	}

	protected renderBody(): void {
		placard(this.el, "Clock");
		const wrap = this.el.createDiv({ cls: "dash-clock" });
		this.timeEl = wrap.createDiv({ cls: "dash-clock-time" });
		this.dateEl = wrap.createDiv({ cls: "dash-clock-date" });
		this.tick();
	}

	private tick(): void {
		const now = moment();
		const format = this.ctx.settings().clock24h ? "H:mm" : "h:mm A";
		if (this.timeEl) this.timeEl.setText(now.format(format));
		if (this.dateEl) this.dateEl.setText(now.format("dddd, MMMM D, YYYY"));
	}
}
