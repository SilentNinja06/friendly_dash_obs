import { TFile } from "obsidian";
import { BasePanel, placard } from "./types";
import { commandButton } from "./util";

/**
 * Meals + grocery panel (§5.7). Shows today's planned recipes as cards and the
 * current grocery list (path read from Recipe Manager's own setting, never
 * hardcoded), plus the Recipe Manager command buttons. The grocery list is
 * read-only here — checking items happens in Recipe Manager or the note itself.
 *
 * If Recipe Manager isn't installed, the panel self-disables with a
 * plain-language message — not an error, not a crash.
 */
export class MealsPanel extends BasePanel {
	id = "meals";
	title = "Meals";

	protected async renderBody(): Promise<void> {
		const { bridge } = this.ctx;
		placard(this.el, "Meals");

		if (!bridge.recipesAvailable()) {
			this.el.createDiv({
				cls: "dash-empty",
				text: "This panel works with the Recipe Manager plugin. Once it's installed and turned on, your planned meals and grocery list show up here. You can also hide this panel in the plugin settings.",
			});
			return;
		}

		// --- today's meals ---
		const meals = await bridge.plannedMeals();
		const mealsWrap = this.el.createDiv({ cls: "dash-meals" });
		mealsWrap.createDiv({ cls: "dash-subhead", text: "Planned today" });
		if (meals.length === 0) {
			mealsWrap.createDiv({ cls: "dash-muted", text: "No meals planned for today." });
		} else {
			const cards = mealsWrap.createDiv({ cls: "dash-meal-cards" });
			for (const meal of meals) {
				const card = cards.createDiv({ cls: "dash-meal-card" });
				card.createDiv({ cls: "dash-meal-name", text: meal.name });
				card.createDiv({ cls: "dash-meal-open", text: "Open recipe →" });
				card.addEventListener("click", () => {
					const dest = this.ctx.app.metadataCache.getFirstLinkpathDest(meal.link, "");
					if (dest instanceof TFile) void this.ctx.app.workspace.getLeaf(false).openFile(dest);
				});
			}
		}

		// --- grocery list (read-only) ---
		const grocery = await bridge.groceryList();
		const gWrap = this.el.createDiv({ cls: "dash-grocery" });
		gWrap.createDiv({ cls: "dash-subhead", text: "Grocery list" });
		if (!grocery.exists) {
			gWrap.createDiv({ cls: "dash-muted", text: `No grocery list yet. Use “Build grocery list” below to make one.` });
		} else if (grocery.items.length === 0) {
			gWrap.createDiv({ cls: "dash-muted", text: "Your grocery list is empty." });
		} else {
			const remaining = grocery.items.filter((i) => !i.checked).length;
			gWrap.createDiv({ cls: "dash-grocery-count", text: `${remaining} of ${grocery.items.length} still to get` });
			const list = gWrap.createDiv({ cls: "dash-grocery-list" });
			for (const item of grocery.items) {
				const row = list.createDiv({ cls: "dash-grocery-row" });
				if (item.checked) row.addClass("is-checked");
				row.createSpan({ cls: "dash-grocery-box", text: item.checked ? "☑" : "☐" });
				row.createSpan({ cls: "dash-grocery-name", text: item.name });
			}
		}

		// --- actions ---
		const actions = this.el.createDiv({ cls: "dash-btn-row" });
		commandButton(actions, bridge, "recipe-manager:meal-plan", "Plan a meal", { cls: "dash-btn-primary" });
		commandButton(actions, bridge, "recipe-manager:grocery-list", "Build grocery list");
		commandButton(actions, bridge, "recipe-manager:open-recipe", "Open a recipe");
		commandButton(actions, bridge, "recipe-manager:new-recipe", "New recipe");
		commandButton(actions, bridge, "recipe-manager:recipe-index", "All recipes");
	}
}
