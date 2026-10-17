import { App, Notice, Setting, TFile } from "obsidian";
import { SheetModal } from "./ui/sheet";
import type DailyDashPlugin from "./main";
import {
	ShoppingItem,
	ShoppingStore,
	addItem,
	addList,
	blankItem,
	clearChecked,
	deleteItem,
	groupBySection,
	groupByStore,
	itemsFor,
	listSummary,
	loadShopping,
	parseGroceryNote,
	saveShopping,
	toggleItem,
	updateItem,
} from "./shopping";

/** Distinct non-empty values of a field across the store — for quick-entry
 * datalists so sections/stores/payers stay consistent. */
function distinct(store: ShoppingStore, key: keyof ShoppingItem): string[] {
	const set = new Set<string>();
	for (const i of store.items) {
		const v = String(i[key] ?? "").trim();
		if (v) set.add(v);
	}
	return [...set].sort();
}

/**
 * The shopping list — its own dashboard. Pick a list (grocery, general shopping,
 * per-store…), add richly-categorised items, filter by store or payer for a
 * specific trip, group by aisle to shop, check things off, clear what you got,
 * and import a recipe-generated grocery list.
 */
export class ShoppingManagerModal extends SheetModal {
	private store!: ShoppingStore;
	private list: string;
	private groupMode: "section" | "store" = "section";
	private storeFilter = "";
	private payerFilter = "";
	private body!: HTMLElement;

	constructor(app: App, private plugin: DailyDashPlugin, list?: string, private onChange?: () => void) {
		super(app);
		this.list = list ?? "Groceries";
	}

	protected renderBody(root: HTMLElement): void {
		root.addClass("shopping");
		this.titleEl.setText("Shopping");
		this.body = root.createDiv();
		void this.refresh();
	}

	private async refresh(): Promise<void> {
		this.store = await loadShopping(this.plugin);
		if (!this.store.lists.includes(this.list)) this.list = this.store.lists[0] ?? "Groceries";
		this.paint();
		this.onChange?.();
	}

	private async mutate(fn: () => Promise<void>): Promise<void> {
		await fn();
		await this.refresh();
	}

	private paint(): void {
		const c = this.body;
		c.empty();

		// ---- List selector + new list ----------------------------------------
		const top = c.createDiv({ cls: "shopping-top" });
		const sel = top.createEl("select", { cls: "shopping-select" });
		for (const l of this.store.lists) {
			const opt = sel.createEl("option", { text: l });
			if (l === this.list) opt.selected = true;
		}
		sel.addEventListener("change", () => {
			this.list = sel.value;
			this.storeFilter = "";
			this.payerFilter = "";
			this.paint();
		});
		top.createEl("button", { cls: "dash-btn", text: "New list" }).addEventListener("click", () => this.promptNewList());
		top.createEl("button", { cls: "dash-btn dash-btn-primary", text: "＋ Item" }).addEventListener("click", () =>
			new ShoppingItemModal(this.app, this.plugin, this.list, null, () => void this.refresh()).open(),
		);

		const items = itemsFor(this.store, this.list);

		// ---- Filters + group toggle ------------------------------------------
		const stores = [...new Set(items.map((i) => i.store.trim()).filter(Boolean))].sort();
		const payers = [...new Set(items.map((i) => i.payer.trim()).filter(Boolean))].sort();
		const filters = c.createDiv({ cls: "shopping-filters" });
		if (stores.length) this.filterSelect(filters, "Store", stores, this.storeFilter, (v) => { this.storeFilter = v; this.paint(); });
		if (payers.length) this.filterSelect(filters, "Payer", payers, this.payerFilter, (v) => { this.payerFilter = v; this.paint(); });
		const grp = filters.createDiv({ cls: "shopping-group-toggle" });
		this.groupBtn(grp, "Aisle", "section");
		this.groupBtn(grp, "Store", "store");

		// ---- Filtered, grouped list ------------------------------------------
		let shown = items;
		if (this.storeFilter) shown = shown.filter((i) => i.store.trim() === this.storeFilter);
		if (this.payerFilter) shown = shown.filter((i) => i.payer.trim() === this.payerFilter);

		const listEl = c.createDiv({ cls: "shopping-list" });
		if (items.length === 0) {
			listEl.createDiv({ cls: "dash-empty", text: "This list is empty. Add an item, or import a recipe grocery list below." });
		} else if (shown.length === 0) {
			listEl.createDiv({ cls: "dash-empty", text: "Nothing matches those filters." });
		} else {
			const groups = this.groupMode === "section" ? groupBySection(shown) : groupByStore(shown);
			for (const [heading, group] of groups) {
				listEl.createDiv({ cls: "shopping-section", text: heading });
				for (const it of group) this.itemRow(listEl, it);
			}
		}

		// ---- Footer: summary + actions ---------------------------------------
		const sum = listSummary(items);
		const footer = c.createDiv({ cls: "shopping-footer" });
		const status = footer.createDiv({ cls: "shopping-status" });
		status.createSpan({ text: `${sum.checked} of ${sum.total} got` });
		if (sum.byPayer.length) status.createSpan({ cls: "shopping-payers", text: "  ·  " + sum.byPayer.map(([p, n]) => `${p}: ${n}`).join(", ") });

		const actions = footer.createDiv({ cls: "shopping-actions" });
		if (sum.checked > 0) actions.createEl("button", { cls: "dash-btn", text: "Clear got items" }).addEventListener("click", () =>
			void this.mutate(async () => {
				const n = await clearChecked(this.plugin, this.list);
				new Notice(`Removed ${n} item${n === 1 ? "" : "s"}.`);
			}),
		);
		actions.createEl("button", { cls: "dash-btn", text: "Import recipe groceries" }).addEventListener("click", () => void this.importGroceries());
	}

	private filterSelect(parent: HTMLElement, label: string, options: string[], value: string, onChange: (v: string) => void): void {
		const wrap = parent.createDiv({ cls: "shopping-filter" });
		wrap.createSpan({ cls: "shopping-filter-label", text: label });
		const sel = wrap.createEl("select");
		const all = sel.createEl("option", { text: `All`, value: "" });
		if (!value) all.selected = true;
		for (const o of options) {
			const opt = sel.createEl("option", { text: o, value: o });
			if (o === value) opt.selected = true;
		}
		sel.addEventListener("change", () => onChange(sel.value));
	}

	private groupBtn(parent: HTMLElement, label: string, mode: "section" | "store"): void {
		const b = parent.createEl("button", { cls: "dash-btn shopping-grp" + (this.groupMode === mode ? " is-on" : ""), text: label });
		b.addEventListener("click", () => {
			this.groupMode = mode;
			this.paint();
		});
	}

	private itemRow(parent: HTMLElement, it: ShoppingItem): void {
		const row = parent.createDiv({ cls: "shopping-item" + (it.checked ? " is-checked" : "") });
		const box = row.createEl("input", { type: "checkbox" });
		box.checked = it.checked;
		box.addEventListener("change", () => void this.mutate(() => toggleItem(this.plugin, it.id)));

		const main = row.createDiv({ cls: "shopping-item-main" });
		const amount = [it.qty, it.unit].filter(Boolean).join(" ");
		const label = main.createDiv({ cls: "shopping-item-name" });
		if (amount) label.createSpan({ cls: "shopping-item-qty", text: amount + " " });
		label.createSpan({ text: it.name });
		const chips = main.createDiv({ cls: "shopping-item-chips" });
		if (this.groupMode !== "store" && it.store) chips.createSpan({ cls: "dash-chip", text: it.store });
		if (it.payer) chips.createSpan({ cls: "dash-chip dash-chip-cold", text: it.payer });
		if (it.note) chips.createSpan({ cls: "shopping-item-note", text: it.note });

		const acts = row.createDiv({ cls: "shopping-item-actions" });
		acts.createEl("button", { cls: "shopping-icon", text: "✎", attr: { "aria-label": "Edit" } }).addEventListener("click", () =>
			new ShoppingItemModal(this.app, this.plugin, this.list, it, () => void this.refresh()).open(),
		);
		acts.createEl("button", { cls: "shopping-icon", text: "🗑", attr: { "aria-label": "Delete" } }).addEventListener("click", () =>
			void this.mutate(() => deleteItem(this.plugin, it.id)),
		);
	}

	private promptNewList(): void {
		const modal = new SheetPrompt(this.app, "New list", "e.g. Hardware store", async (name) => {
			if (!name.trim()) return;
			await addList(this.plugin, name.trim());
			this.list = name.trim();
			await this.refresh();
		});
		modal.open();
	}

	private async importGroceries(): Promise<void> {
		const path = this.plugin.bridge.groceryListPath();
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			new Notice(`No grocery note found at "${path}". Generate one from the recipe manager first.`);
			return;
		}
		const parsed = parseGroceryNote(await this.app.vault.read(file), this.list);
		if (parsed.length === 0) {
			new Notice("No grocery items found to import.");
			return;
		}
		await this.mutate(async () => {
			const store = await loadShopping(this.plugin);
			const existing = new Set(itemsFor(store, this.list).map((i) => i.name.toLowerCase()));
			let added = 0;
			for (const it of parsed) {
				if (existing.has(it.name.toLowerCase())) continue;
				store.items.push(it);
				added++;
			}
			await saveShopping(this.plugin, store);
			new Notice(`Imported ${added} item${added === 1 ? "" : "s"} into ${this.list}.`);
		});
	}
}

/** Add or edit one shopping item, with datalist suggestions from existing values. */
export class ShoppingItemModal extends SheetModal {
	private draft: ShoppingItem;
	private readonly isNew: boolean;

	constructor(app: App, private plugin: DailyDashPlugin, list: string, private existing: ShoppingItem | null, private onDone: () => void) {
		super(app);
		this.isNew = existing === null;
		this.draft = existing ? { ...existing } : blankItem(list);
	}

	protected renderBody(root: HTMLElement): void {
		root.addClass("shopping-item-edit");
		this.titleEl.setText(this.isNew ? "Add item" : "Edit item");
		void this.build(root);
	}

	private async build(root: HTMLElement): Promise<void> {
		const store = await loadShopping(this.plugin);

		new Setting(root).setName("Item").addText((t) => t.setValue(this.draft.name).setPlaceholder("e.g. milk").onChange((v) => (this.draft.name = v)));

		const amount = root.createDiv({ cls: "shopping-amount-row" });
		new Setting(amount).setName("Qty").addText((t) => t.setValue(this.draft.qty).setPlaceholder("2").onChange((v) => (this.draft.qty = v)));
		this.datalistField(amount, "Measure", "unit", store, this.draft.unit, "gal, lb, box", (v) => (this.draft.unit = v));

		this.datalistField(root, "Section (aisle)", "section", store, this.draft.section, "Produce, Dairy…", (v) => (this.draft.section = v));
		this.datalistField(root, "Store", "store", store, this.draft.store, "Kroger, Target…", (v) => (this.draft.store = v));
		this.datalistField(root, "Who's paying", "payer", store, this.draft.payer, "Me, Parents…", (v) => (this.draft.payer = v));

		new Setting(root).setName("List").addDropdown((d) => {
			for (const l of store.lists) d.addOption(l, l);
			d.setValue(store.lists.includes(this.draft.list) ? this.draft.list : store.lists[0] ?? this.draft.list);
			d.onChange((v) => (this.draft.list = v));
		});
		new Setting(root).setName("Note").addText((t) => t.setValue(this.draft.note).setPlaceholder("optional").onChange((v) => (this.draft.note = v)));

		const btns = root.createDiv({ cls: "shopping-edit-buttons" });
		btns.createEl("button", { cls: "dash-btn dash-btn-primary", text: this.isNew ? "Add item" : "Save" }).addEventListener("click", () => void this.save());
	}

	private datalistField(parent: HTMLElement, label: string, key: keyof ShoppingItem, store: ShoppingStore, value: string, placeholder: string, onChange: (v: string) => void): void {
		new Setting(parent).setName(label).addText((t) => {
			t.setValue(value).setPlaceholder(placeholder).onChange((v) => onChange(v));
			const id = `sl-${String(key)}-${Math.random().toString(36).slice(2, 7)}`;
			const dl = t.inputEl.ownerDocument.createElement("datalist");
			dl.id = id;
			for (const v of distinct(store, key)) {
				const opt = dl.ownerDocument.createElement("option");
				opt.value = v;
				dl.appendChild(opt);
			}
			t.inputEl.setAttribute("list", id);
			t.inputEl.after(dl);
		});
	}

	private async save(): Promise<void> {
		if (!this.draft.name.trim()) {
			new Notice("Give the item a name.");
			return;
		}
		this.draft.name = this.draft.name.trim();
		if (this.isNew) await addItem(this.plugin, this.draft);
		else await updateItem(this.plugin, this.existing!.id, this.draft);
		new Notice(this.isNew ? "Item added." : "Item updated.");
		this.onDone();
		this.close();
	}
}

/** Tiny single-field prompt (for naming a new list). */
class SheetPrompt extends SheetModal {
	private value = "";
	constructor(app: App, private heading: string, private placeholder: string, private onSubmit: (v: string) => void | Promise<void>) {
		super(app);
	}
	protected renderBody(root: HTMLElement): void {
		this.titleEl.setText(this.heading);
		new Setting(root).addText((t) => {
			t.setPlaceholder(this.placeholder).onChange((v) => (this.value = v));
			t.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					void this.submit();
				}
			});
		});
		root.createEl("button", { cls: "dash-btn dash-btn-primary", text: "Create" }).addEventListener("click", () => void this.submit());
	}
	private async submit(): Promise<void> {
		await this.onSubmit(this.value);
		this.close();
	}
}
