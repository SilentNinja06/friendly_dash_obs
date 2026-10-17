import { App, Notice, Setting, moment } from "obsidian";
import { SheetModal } from "./ui/sheet";
import type DailyDashPlugin from "./main";
import { Quote, loadQuotes, addQuote, updateQuote, deleteQuote } from "./quotes";

/**
 * Add or edit a single quote — text, who said it, and an optional date it was
 * spoken/recorded (a "Today" shortcut, since a quote dated today becomes the
 * Quote of the Day).
 */
export class QuoteEditModal extends SheetModal {
	private text: string;
	private author: string;
	private date: string;
	private readonly isNew: boolean;

	constructor(app: App, private plugin: DailyDashPlugin, private existing: Quote | null, private onDone?: () => void) {
		super(app);
		this.isNew = existing === null;
		this.text = existing?.text ?? "";
		this.author = existing?.author ?? "";
		this.date = existing?.date ?? "";
	}

	protected renderBody(root: HTMLElement): void {
		root.addClass("quote-edit");
		this.titleEl.setText(this.isNew ? "Add a quote" : "Edit quote");
		if (this.isNew) root.createDiv({ cls: "dash-empty", text: "Something someone said that you want to remember. Date it today to make it today's Quote of the Day." });

		new Setting(root).setName("Quote").addTextArea((t) => t.setValue(this.text).setPlaceholder("What they said").onChange((v) => (this.text = v)));
		new Setting(root).setName("Who said it").addText((t) => t.setValue(this.author).setPlaceholder("e.g. Alex (optional)").onChange((v) => (this.author = v)));

		let dateInput: HTMLInputElement;
		new Setting(root)
			.setName("Date spoken / recorded")
			.setDesc("Optional. A quote dated today becomes the Quote of the Day.")
			.addText((t) => {
				t.inputEl.type = "date";
				dateInput = t.inputEl;
				t.setValue(this.date).onChange((v) => (this.date = v));
			})
			.addExtraButton((b) =>
				b.setIcon("calendar-clock").setTooltip("Today").onClick(() => {
					this.date = moment().format("YYYY-MM-DD");
					dateInput.value = this.date;
				}),
			);

		const btns = root.createDiv({ cls: "quote-edit-buttons" });
		btns.createEl("button", { cls: "dash-btn dash-btn-primary", text: this.isNew ? "Add quote" : "Save" }).addEventListener("click", () => void this.save());
	}

	private async save(): Promise<void> {
		if (!this.text.trim()) {
			new Notice("Type the quote first.");
			return;
		}
		const payload = { text: this.text, author: this.author, date: this.date };
		if (this.isNew) await addQuote(this.plugin, payload);
		else await updateQuote(this.plugin, this.existing!.id, payload);
		new Notice(this.isNew ? "Quote added." : "Quote updated.");
		this.onDone?.();
		this.close();
	}
}

/**
 * The quotes catalogue — its own dashboard: search, add, edit, and delete
 * quotes, all in-app (no raw-note editing). Opened from a button on the Quote of
 * the Day card or the "Quotes catalogue" command.
 */
export class QuoteCatalogueModal extends SheetModal {
	private container!: HTMLElement;
	private query = "";
	private quotes: Quote[] = [];

	constructor(app: App, private plugin: DailyDashPlugin, private onChange?: () => void) {
		super(app);
	}

	protected renderBody(root: HTMLElement): void {
		root.addClass("quote-catalogue");
		this.titleEl.setText("Quotes");

		const bar = root.createDiv({ cls: "quote-bar" });
		bar.createEl("button", { cls: "dash-btn dash-btn-primary", text: "＋ Add quote" }).addEventListener("click", () =>
			new QuoteEditModal(this.app, this.plugin, null, () => void this.refresh()).open(),
		);
		const search = bar.createEl("input", { cls: "quote-search", attr: { type: "search", placeholder: "Search quotes or people…" } });
		search.addEventListener("input", () => {
			this.query = search.value.trim().toLowerCase();
			this.paint();
		});

		this.container = root.createDiv({ cls: "quote-list" });
		void this.refresh();
	}

	private async refresh(): Promise<void> {
		this.quotes = await loadQuotes(this.plugin);
		this.paint();
		this.onChange?.();
	}

	private paint(): void {
		const c = this.container;
		c.empty();
		const q = this.query;
		const list = q
			? this.quotes.filter((x) => x.text.toLowerCase().includes(q) || x.author.toLowerCase().includes(q) || x.date.includes(q))
			: this.quotes;

		if (this.quotes.length === 0) {
			c.createDiv({ cls: "dash-empty", text: "No quotes yet. Add things people have said — they'll show up as the Quote of the Day." });
			return;
		}
		if (list.length === 0) {
			c.createDiv({ cls: "dash-empty", text: `No quotes match “${this.query}”.` });
			return;
		}

		c.createDiv({ cls: "quote-count", text: `${list.length} of ${this.quotes.length} quote${this.quotes.length === 1 ? "" : "s"}` });
		for (const quote of list) this.row(c, quote);
	}

	private row(parent: HTMLElement, quote: Quote): void {
		const row = parent.createDiv({ cls: "quote-item" });
		row.createDiv({ cls: "quote-item-text", text: `“${quote.text}”` });
		const meta: string[] = [];
		if (quote.author) meta.push(quote.author);
		if (quote.date) meta.push(quote.date);
		if (meta.length) row.createDiv({ cls: "quote-item-meta", text: meta.join(" · ") });

		const actions = row.createDiv({ cls: "quote-item-actions" });
		actions.createEl("button", { cls: "dash-btn", text: "Edit" }).addEventListener("click", () =>
			new QuoteEditModal(this.app, this.plugin, quote, () => void this.refresh()).open(),
		);
		actions.createEl("button", { cls: "dash-btn quote-danger", text: "Delete" }).addEventListener("click", () => void this.remove(quote));
	}

	private async remove(quote: Quote): Promise<void> {
		await deleteQuote(this.plugin, quote.id);
		new Notice("Quote deleted.");
		await this.refresh();
	}
}
