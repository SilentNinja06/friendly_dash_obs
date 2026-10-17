import { BasePanel, placard } from "./types";
import { loadShopping, itemsFor, groupBySection, toggleItem, ShoppingStore } from "../shopping";
import { ShoppingManagerModal, ShoppingItemModal } from "../shopping-manager";

/**
 * Shopping — a glanceable card for the active list: check items off in place
 * (grouped by aisle), see per-list counts, and open the full manager (add/edit,
 * filters by store & payer, import recipe groceries).
 */
export class ShoppingPanel extends BasePanel {
	id = "shopping";
	title = "Shopping";

	protected async renderBody(): Promise<void> {
		const head = placard(this.el, "Shopping");
		const tools = head.createDiv({ cls: "dash-qotd-tools" });
		tools.createEl("button", { cls: "dash-qotd-add", text: "＋", attr: { "aria-label": "Add an item" } }).addEventListener("click", () => this.add());
		tools.createEl("button", { cls: "dash-qotd-add", text: "☰", attr: { "aria-label": "Open the shopping list" } }).addEventListener("click", () => this.open());

		const store = await loadShopping(this.ctx.plugin);
		const card = this.el.createDiv({ cls: "shopping-card" });

		// Per-list chips with the number still to get.
		const withItems = store.lists.filter((l) => itemsFor(store, l).length > 0);
		if (withItems.length === 0) {
			card.createDiv({ cls: "dash-muted", text: "Nothing on your lists yet. Add an item, or bring in a Recipe Manager grocery list from “Open list”." });
			card.createEl("button", { cls: "dash-qotd-addbig", text: "Add an item" }).addEventListener("click", () => this.add());
			return;
		}

		const chips = card.createDiv({ cls: "shopping-card-lists" });
		for (const l of withItems) {
			const items = itemsFor(store, l);
			const left = items.filter((i) => !i.checked).length;
			const chip = chips.createEl("button", { cls: "shopping-card-chip", text: `${l} · ${left} left` });
			chip.addEventListener("click", () => this.open(l));
		}

		// Preview the first list that still has items to get.
		const active = withItems.find((l) => itemsFor(store, l).some((i) => !i.checked)) ?? withItems[0];
		this.preview(card, store, active);
	}

	private preview(card: HTMLElement, store: ShoppingStore, list: string): void {
		const unchecked = itemsFor(store, list).filter((i) => !i.checked);
		if (unchecked.length === 0) {
			card.createDiv({ cls: "dash-muted", text: `${list}: all got. Nice.` });
			return;
		}
		const wrap = card.createDiv({ cls: "shopping-card-preview" });
		const groups = groupBySection(unchecked);
		let shown = 0;
		const LIMIT = 8;
		outer: for (const [section, group] of groups) {
			wrap.createDiv({ cls: "shopping-card-section", text: section });
			for (const it of group) {
				if (shown >= LIMIT) break outer;
				shown++;
				const row = wrap.createDiv({ cls: "shopping-card-item" });
				const box = row.createEl("input", { type: "checkbox" });
				box.addEventListener("change", () => void toggleItem(this.ctx.plugin, it.id).then(() => this.ctx.requestRefresh("manual")));
				const amount = [it.qty, it.unit].filter(Boolean).join(" ");
				row.createSpan({ cls: "shopping-card-item-text", text: (amount ? amount + " " : "") + it.name });
				if (it.payer) row.createSpan({ cls: "dash-chip dash-chip-cold", text: it.payer });
			}
		}
		const remaining = unchecked.length - shown;
		const foot = card.createDiv({ cls: "shopping-card-foot" });
		if (remaining > 0) foot.createSpan({ cls: "dash-muted", text: `+${remaining} more` });
		foot.createEl("button", { cls: "dash-qotd-addbig", text: "Open list" }).addEventListener("click", () => this.open(list));
	}

	private add(): void {
		new ShoppingItemModal(this.ctx.app, this.ctx.plugin, "Groceries", null, () => this.ctx.requestRefresh("manual")).open();
	}

	private open(list?: string): void {
		new ShoppingManagerModal(this.ctx.app, this.ctx.plugin, list, () => this.ctx.requestRefresh("manual")).open();
	}
}
