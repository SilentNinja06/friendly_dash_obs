import { MarkdownRenderer } from "obsidian";
import { BasePanel, placard } from "./types";
import { briefConfigured, generateMorningBrief, generateEndOfDay } from "../ai/brief";

/**
 * AI Daily Brief — an at-a-glance card the first time the dashboard is opened
 * each day. It generates once (cached per date), then simply re-shows the text.
 * A refresh regenerates on demand; "End the day" writes a short summary into
 * today's daily note. The whole card is inert until the user configures a key
 * and enables it in settings.
 */
export class BriefPanel extends BasePanel {
	id = "brief";
	title = "Daily Brief";

	protected async renderBody(): Promise<void> {
		const plugin = this.ctx.plugin;
		const head = placard(this.el, "Daily Brief");
		const tools = head.createDiv({ cls: "dash-qotd-tools" });

		if (!briefConfigured(plugin)) {
			this.el.createDiv({
				cls: "dash-muted",
				text: plugin.settings.aiApiKey.trim()
					? "The daily brief is off. Turn it on in Settings → Daily Dashboard → Daily brief."
					: "This optional panel writes a short summary of your day using an AI service. To use it, add an API key in Settings → Daily Dashboard → Daily brief — or hide this panel.",
			});
			return;
		}

		const refresh = tools.createEl("button", { cls: "dash-qotd-add", text: "↻", attr: { "aria-label": "Regenerate the brief" } });
		refresh.addEventListener("click", () => void this.run(true));

		const body = this.el.createDiv({ cls: "dash-brief" });
		const cached = plugin.getBriefDate() === todayISO() ? plugin.getBriefText() : "";
		if (cached) {
			await this.renderMarkdown(body, cached);
		} else {
			body.createDiv({ cls: "dash-muted", text: "Writing today's brief…" });
			void this.run(false, body);
		}

		const foot = this.el.createDiv({ cls: "dash-brief-foot" });
		const endBtn = foot.createEl("button", { cls: "dash-btn dash-btn-sm dash-brief-endday", text: "End the day" });
		endBtn.addEventListener("click", async () => {
			endBtn.disabled = true;
			endBtn.setText("Writing…");
			await generateEndOfDay(plugin);
			endBtn.disabled = false;
			endBtn.setText("End the day");
		});
	}

	/** Generate (or regenerate) and re-render the panel. */
	private async run(force: boolean, body?: HTMLElement): Promise<void> {
		const target = body ?? this.el.querySelector<HTMLElement>(".dash-brief");
		if (target && force) {
			target.empty();
			target.createDiv({ cls: "dash-muted", text: "Regenerating…" });
		}
		const text = await generateMorningBrief(this.ctx.plugin, force);
		if (text && target) {
			target.empty();
			await this.renderMarkdown(target, text);
		} else if (!text && target) {
			target.empty();
			target.createDiv({ cls: "dash-muted", text: "The brief couldn't be written. Check the settings and try ↻." });
		}
	}

	private async renderMarkdown(el: HTMLElement, md: string): Promise<void> {
		try {
			await MarkdownRenderer.render(this.ctx.app, md, el, "", this.ctx.plugin);
		} catch {
			el.createDiv({ text: md });
		}
	}
}

function todayISO(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
