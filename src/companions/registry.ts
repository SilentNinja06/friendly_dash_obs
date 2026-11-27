import type { App } from "obsidian";

/**
 * Companion plugins: separate plugins the dashboard can show a card for. A
 * companion's card exists only while that plugin is installed AND turned on —
 * otherwise it isn't drawn at all, and nothing about it shows on the dashboard.
 *
 * Cards are read-only: they read the companion's own data or its public API and
 * open the companion's own screens for anything that writes. Nothing a card
 * reads ever leaves the device.
 *
 * Every companion listed here is scanned for personal details by the privacy
 * check (scripts/privacy-scan.mjs) before a dashboard release can ship.
 */
export interface Companion {
	/** Obsidian plugin id. */
	pluginId: string;
	/** Dashboard panel id of its card. */
	panelId: string;
	name: string;
	/** What the card shows, for the settings list. */
	blurb: string;
	/** GitHub repo users install it from with BRAT (owner/name). */
	repo: string;
}

export const COMPANIONS: Companion[] = [
	{ pluginId: "health", panelId: "health", name: "Health", blurb: "Today's doses with one-tap Log due, as-needed medications, and symptoms.", repo: "SilentNinja06/tracking.obs" },
	{ pluginId: "brainstormer", panelId: "flights", name: "Brainstormer", blurb: "Focus sessions as flights: the flight in progress, or where you are and a button to book the next one.", repo: "SilentNinja06/brainstormer.obs" },
	{ pluginId: "recipe-manager", panelId: "meals", name: "Recipe Manager", blurb: "Today's planned meals and your grocery list.", repo: "SilentNinja06/Recipes_obs" },
	{ pluginId: "simple-contact-manager", panelId: "contacts", name: "Simple Contact Manager", blurb: "Who you're due to catch up with, with a one-tap log.", repo: "SilentNinja06/simple_cm" },
	{ pluginId: "meridian-meditations", panelId: "discipline", name: "Discipline (meditation)", blurb: "Your sitting streak, this week's sessions, and a button to begin.", repo: "SilentNinja06/meditations.obs" },
	{ pluginId: "meridian-music", panelId: "music", name: "Music", blurb: "Songs still in progress, and a quick way to capture an idea.", repo: "SilentNinja06/music.obs" },
	{ pluginId: "meridian-wardrobe", panelId: "wardrobe", name: "Wardrobe", blurb: "Laundry to do, pieces to replace, and today's outfit.", repo: "SilentNinja06/outfit_obs" },
	{ pluginId: "arfid-tracker", panelId: "food", name: "Food log (ARFID Tracker)", blurb: "What you've logged today, and quick buttons to log more.", repo: "SilentNinja06/ARFID_obs" },
	{ pluginId: "commons", panelId: "commons", name: "Commons", blurb: "Notes left for whoever's next, and who's here.", repo: "SilentNinja06/commons" },
	{ pluginId: "treasury", panelId: "treasury", name: "Treasury (budget)", blurb: "A quick way into your budget.", repo: "SilentNinja06/treasury_obs" },
	{ pluginId: "spiral-shutdown-logger", panelId: "spiral", name: "Spiral & Shutdown Logger", blurb: "How many entries today and in the last 7 days (counts only), and a button to log one.", repo: "SilentNinja06/AHeatmap_obs" },
];

export const COMPANION_BY_PANEL = new Map(COMPANIONS.map((c) => [c.panelId, c] as const));

interface PluginRegistry {
	enabledPlugins?: Set<string>;
	plugins?: Record<string, { api?: unknown; data?: unknown } | undefined>;
}

function registry(app: App): PluginRegistry | undefined {
	// The plugin registry isn't in Obsidian's public typings; read it defensively.
	return (app as unknown as { plugins?: PluginRegistry }).plugins;
}

/** Installed and turned on (loaded). */
export function companionEnabled(app: App, pluginId: string): boolean {
	const r = registry(app);
	return !!(r?.enabledPlugins?.has?.(pluginId) && r.plugins?.[pluginId]);
}

/** The companion's loaded plugin instance, or null. */
export function companionPlugin(app: App, pluginId: string): { api?: unknown; data?: unknown } | null {
	if (!companionEnabled(app, pluginId)) return null;
	return registry(app)?.plugins?.[pluginId] ?? null;
}

/** Run one of the companion's commands; false if it isn't available. */
export function runCompanionCommand(app: App, fullId: string): boolean {
	const commands = (app as unknown as { commands?: { executeCommandById?: (id: string) => boolean } }).commands;
	try {
		return !!commands?.executeCommandById?.(fullId);
	} catch (e) {
		console.warn("Daily Dashboard: companion command failed", fullId, e);
		return false;
	}
}
