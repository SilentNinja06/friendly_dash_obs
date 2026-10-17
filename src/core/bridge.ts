import { App, TFile, getAllTags, moment } from "obsidian";
import { appendDailyLogLine, readDailyNoteRaw, readHeadingSection, readMarkerLogLines } from "dash-core";

/**
 * The one place that reaches into sibling plugins — Recipe Manager and Simple
 * Contact Manager. Reads
 * prefer the plugin's read-only `api` (checked by `version`), and fall back to
 * parsing the vault directly when the API is absent or an older version, so the
 * dashboard never hard-crashes on a stale upstream plugin. If Recipe Manager
 * isn't installed at all, callers ask `recipesAvailable()` first and show a
 * plain-language "not installed" message instead of an error.
 */

const RECIPES_ID = "recipe-manager";
const CRM_ID = "simple-contact-manager";

export interface CrmRow {
	name: string;
	path: string;
	priority: "high" | "medium" | "low" | "";
	daysSince: number | null;
	nextFollowup: string;
	overdue: boolean;
	dueToday: boolean;
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2, "": 3 };

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

	/** Whether a plugin is installed and turned on — optional modules ask this so
	 * they can hide politely when their companion plugin isn't there. */
	isPluginEnabled(id: string): boolean {
		return this.enabled(id);
	}

	// ---------------------------------------------------------------- Contacts

	crmAvailable(): boolean {
		return this.enabled(CRM_ID);
	}

	/** Try to log a specific contact through the plugin's own modal (API v2+).
	 * Returns true if it handled it. */
	crmLogViaApi(pathOrName: string): boolean {
		const api = this.api(CRM_ID);
		if (api?.logInteraction && api.version >= 2) {
			try {
				return !!api.logInteraction(pathOrName);
			} catch (e) {
				console.error("Daily Dashboard: contacts api logInteraction failed, falling back", e);
			}
		}
		return false;
	}

	private crmFolder(): string {
		return (this.plugin(CRM_ID)?.settings?.contactsFolder ?? "Contacts").trim();
	}

	private resolveContact(pathOrName: string): TFile | null {
		const byPath = this.app.vault.getAbstractFileByPath(pathOrName);
		if (byPath instanceof TFile) return byPath;
		const folder = this.crmFolder();
		return (
			this.app.vault
				.getMarkdownFiles()
				.find((f) => (!folder || f.path.startsWith(folder + "/")) && f.basename === pathOrName) ?? null
		);
	}

	/** Log an interaction for a specific contact ourselves, when the plugin's API
	 * isn't available (older Simple Contact Manager). Mirrors the plugin's write:
	 * update the contact note's Interaction Log, advance the follow-up date in
	 * frontmatter, and write the daily-note line. Returns true on success. */
	async crmWriteInteraction(pathOrName: string, noteText: string): Promise<boolean> {
		const file = this.resolveContact(pathOrName);
		if (!file) return false;
		const text = noteText.trim();
		if (!text) return false;
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		const followupDays = Number(fm.contact?.followup_days ?? fm.followup_days) || 30;
		const todayStr = today();
		const next = moment().add(followupDays, "days").format("YYYY-MM-DD");
		const name = String(fm.name ?? file.basename);

		await this.app.fileManager.processFrontMatter(file, (f) => {
			const c = f.contact && typeof f.contact === "object" ? f.contact : (f.contact = {});
			c.last_contacted = todayStr;
			c.next_followup = next;
			f.updated = todayStr;
		});
		await this.app.vault.process(file, (content) => insertInteraction(content, todayStr, text));

		const { marker, heading } = this.crmLogTarget();
		const time = moment().format("HH:mm");
		try {
			await appendDailyLogLine(this.app, `- ${time} [[${name}|${name}]] — ${text}`, { marker, heading, time });
		} catch (e) {
			console.error("Daily Dashboard: contacts daily-note write failed", e);
		}
		return true;
	}

	/** Where Simple Contact Manager writes its daily-note lines (its own settings). */
	crmLogTarget(): { marker: string; heading: string } {
		const s = this.plugin(CRM_ID)?.settings ?? {};
		return {
			marker: String(s.dailyNoteMarker ?? "%% crm-log %%").trim(),
			heading: String(s.dailyNoteHeading ?? "Contacts reached").trim(),
		};
	}

	crmContacts(): CrmRow[] {
		const api = this.api(CRM_ID);
		if (api?.getContactsSummary) {
			try {
				const rows = api.getContactsSummary() ?? [];
				return rows.map(normalizeCrmRow).sort(sortCrm);
			} catch (e) {
				console.error("Daily Dashboard: contacts api read failed, falling back", e);
			}
		}
		return this.crmContactsFallback().sort(sortCrm);
	}

	private crmContactsFallback(): CrmRow[] {
		const folder = this.crmFolder();
		const todayStr = today();
		const rows: CrmRow[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			if (folder && !file.path.startsWith(folder + "/")) continue;
			const cache = this.app.metadataCache.getFileCache(file);
			const fm = cache?.frontmatter;
			if (!fm) continue;
			const tags = cache ? getAllTags(cache) ?? [] : [];
			const isContact = tags.includes("#contact") || fm.tags === "contact" || (Array.isArray(fm.tags) && fm.tags.includes("contact"));
			if (!isContact || fm.is_template === true) continue;
			const c = fm.contact ?? {};
			const last = String(c.last_contacted ?? fm.last_contacted ?? "").slice(0, 10);
			const next = String(c.next_followup ?? fm.next_followup ?? "").slice(0, 10);
			rows.push({
				name: String(fm.name ?? file.basename),
				path: file.path,
				priority: normalizePriority(c.priority ?? fm.priority),
				daysSince: last ? moment(todayStr).diff(moment(last, "YYYY-MM-DD"), "days") : null,
				nextFollowup: next,
				overdue: !!next && next < todayStr,
				dueToday: !!next && next === todayStr,
			});
		}
		return rows;
	}

	/** Safety-net reconcile: scan contact notes for a `### <today>` block under
	 * `## Interaction Log` and return `[[Name|Name]] — <descriptor>` tails missing
	 * from today's note, so the Contacts card can backfill them. */
	async crmReconcileLines(date = today()): Promise<string[]> {
		const folder = this.crmFolder();
		const { marker, heading } = this.crmLogTarget();
		const raw = await readDailyNoteRaw(this.app, date);
		const existing = new Set(
			readMarkerLogLines(raw, marker, heading).map((l) => l.replace(/^- \d{2}:\d{2}\s*/, "").trim())
		);
		const out: string[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			if (folder && !file.path.startsWith(folder + "/")) continue;
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) continue;
			const tags = getAllTags(cache) ?? [];
			if (!tags.includes("#contact")) continue;
			const name = String(cache.frontmatter.name ?? file.basename);
			const content = await this.app.vault.cachedRead(file);
			for (const descriptor of interactionsForDate(content, date)) {
				const tail = `[[${name}|${name}]] — ${descriptor}`;
				if (!existing.has(tail)) out.push(tail);
			}
		}
		return out;
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

function normalizeCrmRow(r: {
	name?: string;
	path?: string;
	priority?: string;
	daysSince?: number | null;
	nextFollowup?: string;
	overdue?: boolean;
	dueToday?: boolean;
}): CrmRow {
	return {
		name: r.name ?? "",
		path: r.path ?? "",
		priority: normalizePriority(r.priority),
		daysSince: r.daysSince ?? null,
		nextFollowup: r.nextFollowup ?? "",
		overdue: !!r.overdue,
		dueToday: !!r.dueToday,
	};
}

function normalizePriority(v: unknown): CrmRow["priority"] {
	const s = String(v ?? "").trim().toLowerCase();
	return s === "high" || s === "medium" || s === "low" ? s : "";
}

function sortCrm(a: CrmRow, b: CrmRow): number {
	// Overdue first, then due today, then by priority, then most-stale first.
	const bucket = (r: CrmRow) => (r.overdue ? 0 : r.dueToday ? 1 : 2);
	return (
		bucket(a) - bucket(b) ||
		PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
		(b.daysSince ?? -1) - (a.daysSince ?? -1)
	);
}

/** Insert `- noteText` under a contact note's `## Interaction Log` → `### date`,
 * matching Simple Contact Manager's own placement. */
function insertInteraction(content: string, date: string, noteText: string): string {
	const logHeading = /^## Interaction Log\s*$/m;
	const todayHeading = `### ${date}`;
	if (!logHeading.test(content)) {
		return `${content.replace(/\s+$/, "")}\n\n## Interaction Log\n\n${todayHeading}\n- ${noteText}\n`;
	}
	const todayAtTop = new RegExp(`^## Interaction Log\\n+${todayHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m");
	if (todayAtTop.test(content)) {
		return content.replace(todayAtTop, (match) => `${match}\n- ${noteText}`);
	}
	return content.replace(logHeading, (match) => `${match}\n\n${todayHeading}\n- ${noteText}\n`);
}

/** Descriptors logged under `### <date>` in a contact's `## Interaction Log`. */
function interactionsForDate(content: string, date: string): string[] {
	const lines = content.split("\n");
	const logIdx = lines.findIndex((l) => /^##\s+Interaction Log\s*$/i.test(l));
	if (logIdx === -1) return [];
	const dateIdx = lines.findIndex((l, i) => i > logIdx && l.trim() === `### ${date}`);
	if (dateIdx === -1) return [];
	const out: string[] = [];
	for (let i = dateIdx + 1; i < lines.length; i++) {
		if (/^#{1,3}\s/.test(lines[i])) break;
		const m = lines[i].match(/^-\s+(.*)$/);
		if (m) {
			const descriptor = m[1].trim();
			if (descriptor && descriptor.toLowerCase() !== "contact created") out.push(descriptor);
		}
	}
	return out;
}
