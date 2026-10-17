import { App, TFile, normalizePath } from "obsidian";
import type DailyDashPlugin from "./main";

/**
 * Shopping lists — grocery runs and anything else you buy. A structured,
 * app-managed store (no hand-editing): each item carries a quantity, a measure/
 * unit, a store-section (aisle), which store, and who's paying — so one list can
 * be filtered for a specific trip, grouped by aisle to shop efficiently, and
 * split by payer (e.g. when shopping for parents). Multiple named lists coexist
 * (a grocery list, a general shopping list, per-store lists).
 *
 * Storage is JSON inside a Markdown file (default `Shopping.md`), written through
 * the Vault API so Obsidian Sync carries it across devices.
 */

export interface ShoppingItem {
	id: string;
	/** Which named list this belongs to (e.g. "Groceries", "Shopping"). */
	list: string;
	name: string;
	/** Free text so "2", "1.5", "a dozen" all work. */
	qty: string;
	/** Measure/unit: "cups", "lb", "box". */
	unit: string;
	/** Store section / aisle: "Produce", "Dairy". Groups the shopping view. */
	section: string;
	/** Which store: "Kroger", "Target". */
	store: string;
	/** Who's paying: "Me", "Parents". */
	payer: string;
	note: string;
	checked: boolean;
}

export interface ShoppingStore {
	items: ShoppingItem[];
	/** Named lists, preserved (and ordered) even when empty. */
	lists: string[];
}

export const DEFAULT_LISTS = ["Groceries", "Shopping"];

function genId(): string {
	const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
	if (c?.randomUUID) return c.randomUUID();
	return "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function shoppingPath(plugin: DailyDashPlugin): string {
	let p = (plugin.settings.shoppingPath || "Shopping.md").trim();
	if (!/\.md$/i.test(p)) p += ".md";
	return normalizePath(p);
}

function normItem(raw: unknown): ShoppingItem | null {
	if (!raw || typeof raw !== "object") return null;
	const o = raw as Record<string, unknown>;
	const name = String(o.name ?? "").trim();
	if (!name) return null;
	return {
		id: String(o.id ?? "") || genId(),
		list: String(o.list ?? "").trim() || DEFAULT_LISTS[0],
		name,
		qty: String(o.qty ?? "").trim(),
		unit: String(o.unit ?? "").trim(),
		section: String(o.section ?? "").trim(),
		store: String(o.store ?? "").trim(),
		payer: String(o.payer ?? "").trim(),
		note: String(o.note ?? "").trim(),
		checked: !!o.checked,
	};
}

export function defaultStore(): ShoppingStore {
	return { items: [], lists: [...DEFAULT_LISTS] };
}

export async function loadShopping(plugin: DailyDashPlugin): Promise<ShoppingStore> {
	const app = plugin.app;
	const f = app.vault.getAbstractFileByPath(shoppingPath(plugin));
	if (!(f instanceof TFile)) return defaultStore();
	try {
		const parsed = JSON.parse(await app.vault.read(f)) as Partial<ShoppingStore>;
		const items = Array.isArray(parsed.items) ? parsed.items.map(normItem).filter((x): x is ShoppingItem => !!x) : [];
		const listSet = new Set<string>(Array.isArray(parsed.lists) ? parsed.lists.map((l) => String(l).trim()).filter(Boolean) : []);
		for (const l of DEFAULT_LISTS) listSet.add(l);
		for (const it of items) listSet.add(it.list);
		return { items, lists: [...listSet] };
	} catch {
		return defaultStore();
	}
}

export async function saveShopping(plugin: DailyDashPlugin, store: ShoppingStore): Promise<void> {
	const app = plugin.app;
	const path = shoppingPath(plugin);
	const dir = path.split("/").slice(0, -1).join("/");
	if (dir && !app.vault.getAbstractFileByPath(dir)) await app.vault.createFolder(dir).catch(() => {});
	const content = JSON.stringify(store, null, 2);
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) await app.vault.modify(existing, content);
	else await app.vault.create(path, content);
}

export function blankItem(list: string, p: Partial<ShoppingItem> = {}): ShoppingItem {
	return { id: genId(), list, name: "", qty: "", unit: "", section: "", store: "", payer: "", note: "", checked: false, ...p };
}

export async function addItem(plugin: DailyDashPlugin, item: ShoppingItem): Promise<void> {
	const store = await loadShopping(plugin);
	if (!store.lists.includes(item.list)) store.lists.push(item.list);
	store.items.push(item);
	await saveShopping(plugin, store);
}

export async function updateItem(plugin: DailyDashPlugin, id: string, patch: Partial<ShoppingItem>): Promise<void> {
	const store = await loadShopping(plugin);
	const it = store.items.find((x) => x.id === id);
	if (!it) return;
	Object.assign(it, patch);
	if (patch.list && !store.lists.includes(patch.list)) store.lists.push(patch.list);
	await saveShopping(plugin, store);
}

export async function deleteItem(plugin: DailyDashPlugin, id: string): Promise<void> {
	const store = await loadShopping(plugin);
	store.items = store.items.filter((x) => x.id !== id);
	await saveShopping(plugin, store);
}

export async function toggleItem(plugin: DailyDashPlugin, id: string): Promise<void> {
	const store = await loadShopping(plugin);
	const it = store.items.find((x) => x.id === id);
	if (!it) return;
	it.checked = !it.checked;
	await saveShopping(plugin, store);
}

/** Remove all checked items in `list` (a "clear the got items" after a trip). */
export async function clearChecked(plugin: DailyDashPlugin, list: string): Promise<number> {
	const store = await loadShopping(plugin);
	const before = store.items.length;
	store.items = store.items.filter((x) => !(x.list === list && x.checked));
	const removed = before - store.items.length;
	if (removed) await saveShopping(plugin, store);
	return removed;
}

export async function addList(plugin: DailyDashPlugin, name: string): Promise<void> {
	const n = name.trim();
	if (!n) return;
	const store = await loadShopping(plugin);
	if (!store.lists.includes(n)) {
		store.lists.push(n);
		await saveShopping(plugin, store);
	}
}

export function itemsFor(store: ShoppingStore, list: string): ShoppingItem[] {
	return store.items.filter((x) => x.list === list);
}

/** Group items by section (blank section → "Uncategorised"), sorted; within a
 * section, unchecked first then by name. Section order is alphabetical. */
export function groupBySection(items: ShoppingItem[]): [string, ShoppingItem[]][] {
	return groupBy(items, (i) => i.section.trim() || "Uncategorised");
}

export function groupByStore(items: ShoppingItem[]): [string, ShoppingItem[]][] {
	return groupBy(items, (i) => i.store.trim() || "Any store");
}

function groupBy(items: ShoppingItem[], key: (i: ShoppingItem) => string): [string, ShoppingItem[]][] {
	const map = new Map<string, ShoppingItem[]>();
	for (const it of items) {
		const k = key(it);
		(map.get(k) ?? map.set(k, []).get(k)!).push(it);
	}
	const groups = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
	for (const [, list] of groups) {
		list.sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name));
	}
	return groups;
}

/** A "5 got · 8 left" style progress + a per-payer count, for a list. */
export function listSummary(items: ShoppingItem[]): { total: number; checked: number; byPayer: [string, number][] } {
	const total = items.length;
	const checked = items.filter((i) => i.checked).length;
	const payers = new Map<string, number>();
	for (const i of items) {
		const p = i.payer.trim() || "—";
		payers.set(p, (payers.get(p) ?? 0) + 1);
	}
	const byPayer = [...payers.entries()].filter(([p]) => p !== "—").sort((a, b) => b[1] - a[1]);
	return { total, checked, byPayer };
}

/**
 * Parse the recipe plugin's generated grocery note into structured items for a
 * list. Lines look like `- [ ] **2 cups** flour — to taste *(sources)*`; we pull
 * the checkbox, the bold amount (split into qty + unit), and the name. Best
 * effort — anything unparsed becomes a plain named item.
 */
export function parseGroceryNote(content: string, list: string): ShoppingItem[] {
	const out: ShoppingItem[] = [];
	for (const raw of content.split("\n")) {
		const m = raw.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
		if (!m) continue;
		const checked = m[1].toLowerCase() === "x";
		let body = m[2].trim();
		if (/already stocked/i.test(body)) continue;
		let qty = "";
		let unit = "";
		const amt = body.match(/^\*\*(.+?)\*\*\s*(.*)$/);
		if (amt) {
			const amount = amt[1].trim();
			body = amt[2].trim();
			const qm = amount.match(/^([\d./\s-]+)\s*(.*)$/);
			if (qm && qm[1].trim()) {
				qty = qm[1].trim();
				unit = qm[2].trim();
			} else {
				unit = amount;
			}
		}
		body = body
			.replace(/\s*—\s*to taste\s*$/i, "")
			.replace(/\s*\*\([^)]*\)\*\s*$/, "")
			.replace(/^\*\*|\*\*$/g, "")
			.trim();
		if (!body) continue;
		out.push(blankItem(list, { name: body, qty, unit, checked, section: "", store: "", payer: "" }));
	}
	return out;
}
