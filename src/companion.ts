import type { CompanionData, GroceryList } from "dash-core";
import type { Bridge } from "./core/bridge";

/**
 * Adapt the Recipe Manager bridge to the generic core companion surface the
 * meals panel reads. The bridge is read-only, so `toggleGroceryItem` is
 * deliberately omitted — the meals panel then renders the grocery list read-only
 * (a static checkbox glyph, editing happens in Recipe Manager or the note).
 */
export function friendlyCompanion(bridge: Bridge): CompanionData {
	return {
		recipesAvailable: () => bridge.recipesAvailable(),
		plannedMeals: (date?: string) => bridge.plannedMeals(date),
		groceryList: async (): Promise<GroceryList> => {
			const g = await bridge.groceryList();
			return {
				path: g.path,
				exists: g.exists,
				items: g.items.map((it, i) => ({ name: it.name, checked: it.checked, line: i })),
			};
		},
	};
}
