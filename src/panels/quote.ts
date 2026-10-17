import { BasePanel, placard } from "./types";
import { loadQuotes, quoteForDay } from "../quotes";
import { QuoteEditModal, QuoteCatalogueModal } from "../quote-catalogue";

/**
 * Quote of the Day — one quote per day from the user's collection of memorable
 * things people have said. A quote dated today takes over as the day's quote;
 * otherwise the collection rotates, cycling fully before any repeat. The card
 * carries a ＋ to add a quote and a catalogue button (search/edit/delete).
 */
export class QuotePanel extends BasePanel {
	id = "quote";
	title = "Quote of the Day";

	protected async renderBody(): Promise<void> {
		const head = placard(this.el, "Quote of the Day");
		const tools = head.createDiv({ cls: "dash-qotd-tools" });
		tools.createEl("button", { cls: "dash-qotd-add", text: "＋", attr: { "aria-label": "Add a quote" } }).addEventListener("click", () => this.openAdd());
		tools.createEl("button", { cls: "dash-qotd-add", text: "☰", attr: { "aria-label": "Open the quotes catalogue" } }).addEventListener("click", () => this.openCatalogue());

		const card = this.el.createDiv({ cls: "dash-qotd" });
		const quotes = await loadQuotes(this.ctx.plugin);
		if (quotes.length === 0) {
			card.createDiv({ cls: "dash-muted", text: "No quotes yet. Add things people have said that made you smile, and one will show up here each day." });
			card.createEl("button", { cls: "dash-qotd-addbig", text: "Add a quote" }).addEventListener("click", () => this.openAdd());
			return;
		}

		const q = quoteForDay(quotes)!;
		const mark = card.createDiv({ cls: "dash-qotd-mark", text: "“" });
		mark.setAttribute("aria-hidden", "true");
		card.createDiv({ cls: "dash-qotd-text", text: q.text });
		const attribution: string[] = [];
		if (q.author) attribution.push(q.author);
		if (q.date) attribution.push(q.date);
		if (attribution.length) card.createDiv({ cls: "dash-qotd-author", text: `— ${attribution.join(", ")}` });
	}

	private openAdd(): void {
		new QuoteEditModal(this.ctx.app, this.ctx.plugin, null, () => this.ctx.requestRefresh("manual")).open();
	}

	private openCatalogue(): void {
		new QuoteCatalogueModal(this.ctx.app, this.ctx.plugin, () => this.ctx.requestRefresh("manual")).open();
	}
}
