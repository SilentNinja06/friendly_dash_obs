import { App, TFile, moment } from "obsidian";
import { readDailyNoteRaw, readHeadingSection } from "dash-core";

/**
 * The one place that reaches into a sibling plugin — here, Recipe Manager. Reads
 * prefer the plugin's read-only `api` (checked by `version`), and fall back to
 * parsing the vault directly when the API is absent or an older version, so the
 * dashboard never hard-crashes on a stale upstream plugin. If Recipe Manager
 * isn't installed at all, callers ask `recipesAvailable()` first and show a
 * plain-language "not installed" message instead of an error.
 */

const RECIPES_ID = "recipe-manager";

export interface Meal {
	name: string;
	link: string;
}

export interface GroceryItem {
	name: string;
	checked: boolean;
}

export interface GroceryList {
	path: string;
	items: GroceryItem[];
	exists: boolean;
}

export class Bridge {
	constructor(private app: App) {}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private plugin(id: string): any {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (this.app as any).plugins?.plugins?.[id];
	}

	private enabled(id: string): boolean {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return !!(this.app as any).plugins?.enabledPlugins?.has?.(id) || !!this.plugin(id);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private api(id: string): any {
		const api = this.plugin(id)?.api;
		return api && typeof api.version === "number" ? api : null;
	}

	commandExists(fullId: string): boolean {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const commands = (this.app as any).commands?.commands ?? {};
		return !!commands[fullId];
	}

	runCommand(fullId: string): void {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(this.app as any).commands?.executeCommandById?.(fullId);
	}

	// ------------------------------------------------------------- Recipes

	recipesAvailable(): boolean {
		return this.enabled(RECIPES_ID);
	}

	private recipeSetting(key: string, fallback: string): string {
		const v = this.plugin(RECIPES_ID)?.settings?.[key];
		return typeof v === "string" && v.trim() ? v.trim() : fallback;
	}

	async plannedMeals(date = today()): Promise<Meal[]> {
		const api = this.api(RECIPES_ID);
		if (api?.getPlannedMeals) {
			try {
				const res = api.getPlannedMeals(date);
				const meals = (res && typeof res.then === "function" ? await res : res) ?? [];
				return meals.map((m: { name?: string; link?: string; basename?: string }) => ({
					name: m.name ?? m.basename ?? "",
					link: m.link ?? m.basename ?? m.name ?? "",
				}));
			} catch (e) {
				console.error("Daily Dashboard: recipes api read failed, falling back", e);
			}
		}
		const raw = await readDailyNoteRaw(this.app, date);
		const heading = this.recipeSetting("mealHeading", "Meals");
		const body = readHeadingSection(raw, heading);
		const meals: Meal[] = [];
		for (const line of body.split("\n")) {
			const m = line.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
			if (m) meals.push({ name: (m[2] ?? m[1]).trim(), link: m[1].trim() });
		}
		return meals;
	}

	/** The grocery-list path — read from Recipe Manager's own setting, never
	 * hardcoded. */
	groceryListPath(): string {
		let path = this.recipeSetting("groceryListPath", "Grocery List.md");
		if (!path.toLowerCase().endsWith(".md")) path += ".md";
		return path;
	}

	/** Read the grocery list (read-only). The checkboxes reflect the file's
	 * current state; editing happens in Recipe Manager or the note itself. */
	async groceryList(): Promise<GroceryList> {
		const path = this.groceryListPath();
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return { path, items: [], exists: false };
		const content = await this.app.vault.cachedRead(file);
		const items: GroceryItem[] = [];
		for (const line of content.split("\n")) {
			const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
			if (m) items.push({ name: stripFormatting(m[2]), checked: m[1].toLowerCase() === "x" });
		}
		return { path, items, exists: true };
	}
}

// ------------------------------------------------------------- helpers

function today(): string {
	return moment().format("YYYY-MM-DD");
}

function stripFormatting(s: string): string {
	return s
		.replace(/\*\*/g, "")
		.replace(/\*(?!\*)/g, "")
		.replace(/\s+\*\([^)]*\)\s*$/, "") // trailing "*(sources)*"
		.trim();
}
