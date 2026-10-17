import { App, TFile, moment, normalizePath } from "obsidian";
import type DailyDashPlugin from "./main";

/**
 * Quote catalogue — memorable things people have said. A structured,
 * app-managed collection (no hand-editing needed): each quote has a stable id,
 * text, who said it, and an optional date it was spoken/recorded. Full CRUD and
 * search live in the catalogue UI (quote-catalogue.ts).
 *
 * Storage is JSON inside a Markdown file (default `Quotes.md`) so Obsidian Sync
 * carries it across devices, written through the Vault API so it registers and
 * syncs. A pre-existing hand-written Markdown list (the earlier format) is
 * migrated to the structured store on first load.
 *
 * Quote of the Day: if any quote is dated *today*, the first one recorded that
 * day is the quote of the day (a later same-day quote never displaces it);
 * otherwise the collection rotates one per day, cycling fully before repeats.
 */

export interface Quote {
	id: string;
	text: string;
	author: string;
	/** YYYY-MM-DD spoken/recorded, or "" if undated. */
	date: string;
}

interface QuoteStore {
	quotes: Quote[];
}

function genId(): string {
	const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
	if (c?.randomUUID) return c.randomUUID();
	return "q-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export function quotesPath(plugin: DailyDashPlugin): string {
	let p = (plugin.settings.quotesPath || "Quotes.md").trim();
	if (!/\.md$/i.test(p)) p += ".md";
	return normalizePath(p);
}

function normalize(q: unknown): Quote | null {
	if (!q || typeof q !== "object") return null;
	const o = q as Record<string, unknown>;
	const text = String(o.text ?? "").trim();
	if (!text) return null;
	return {
		id: String(o.id ?? "") || genId(),
		text,
		author: String(o.author ?? "").trim(),
		date: /^\d{4}-\d{2}-\d{2}$/.test(String(o.date ?? "")) ? String(o.date) : "",
	};
}

/** Legacy: parse the earlier `- "text" — author (date)` Markdown list format so
 * quotes added before the catalogue existed are carried over. */
function parseLegacyMarkdown(content: string): Quote[] {
	const out: Quote[] = [];
	for (const rawLine of content.split("\n")) {
		const line = rawLine.trim();
		if (!line.startsWith("-")) continue;
		let body = line.replace(/^-\s*/, "").trim();
		if (!body) continue;
		let date = "";
		const dm = body.match(/\s*\((\d{4}-\d{2}-\d{2})\)\s*$/);
		if (dm) {
			date = dm[1];
			body = body.slice(0, dm.index).trim();
		}
		let text = "";
		let author = "";
		let m = body.match(/^[“"](.+)[”"]\s*(?:[—–-]\s*(.+))?$/);
		if (m) {
			text = m[1].trim();
			author = (m[2] ?? "").trim();
		} else {
			m = body.match(/^(.+?)\s+[—–]\s+(.+)$/);
			if (m) {
				text = m[1].trim();
				author = m[2].trim();
			} else {
				text = body;
			}
		}
		if (text) out.push({ id: genId(), text, author, date });
	}
	return out;
}

function tryParseStore(raw: string): QuoteStore | null {
	try {
		const p = JSON.parse(raw) as unknown;
		if (Array.isArray(p)) return { quotes: p.map(normalize).filter((q): q is Quote => !!q) };
		if (p && typeof p === "object" && Array.isArray((p as { quotes?: unknown }).quotes)) {
			return { quotes: (p as { quotes: unknown[] }).quotes.map(normalize).filter((q): q is Quote => !!q) };
		}
	} catch {
		/* not JSON */
	}
	return null;
}

async function loadStore(plugin: DailyDashPlugin): Promise<QuoteStore> {
	const app = plugin.app;
	const f = app.vault.getAbstractFileByPath(quotesPath(plugin));
	if (!(f instanceof TFile)) return { quotes: [] };
	const raw = await app.vault.read(f);
	const parsed = tryParseStore(raw);
	if (parsed) return parsed;
	// Legacy Markdown list → migrate to the structured store once.
	const migrated: QuoteStore = { quotes: parseLegacyMarkdown(raw) };
	await saveStore(plugin, migrated);
	return migrated;
}

async function saveStore(plugin: DailyDashPlugin, store: QuoteStore): Promise<void> {
	const app = plugin.app;
	const path = quotesPath(plugin);
	const dir = path.split("/").slice(0, -1).join("/");
	if (dir && !app.vault.getAbstractFileByPath(dir)) await app.vault.createFolder(dir).catch(() => {});
	const content = JSON.stringify(store, null, 2);
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) await app.vault.modify(existing, content);
	else await app.vault.create(path, content);
}

export async function loadQuotes(plugin: DailyDashPlugin): Promise<Quote[]> {
	return (await loadStore(plugin)).quotes;
}

export async function addQuote(plugin: DailyDashPlugin, q: { text: string; author: string; date: string }): Promise<void> {
	const store = await loadStore(plugin);
	store.quotes.push({ id: genId(), text: q.text.trim(), author: q.author.trim(), date: q.date.trim() });
	await saveStore(plugin, store);
}

export async function updateQuote(plugin: DailyDashPlugin, id: string, patch: { text: string; author: string; date: string }): Promise<void> {
	const store = await loadStore(plugin);
	const found = store.quotes.find((x) => x.id === id);
	if (!found) return;
	found.text = patch.text.trim();
	found.author = patch.author.trim();
	found.date = patch.date.trim();
	await saveStore(plugin, store);
}

export async function deleteQuote(plugin: DailyDashPlugin, id: string): Promise<void> {
	const store = await loadStore(plugin);
	store.quotes = store.quotes.filter((x) => x.id !== id);
	await saveStore(plugin, store);
}

/**
 * The quote to show for `date` (default today): a quote dated that day wins
 * (the first one recorded for the day — insertion order — so a later same-day
 * quote never displaces the one already chosen); otherwise the sequential daily
 * rotation over the whole collection.
 */
export function quoteForDay(quotes: Quote[], date?: string): Quote | null {
	const n = quotes.length;
	if (n === 0) return null;
	const day = date ?? moment().format("YYYY-MM-DD");
	const sameDay = quotes.find((q) => q.date === day);
	if (sameDay) return sameDay;
	const m = moment(day, "YYYY-MM-DD");
	const dayNumber = Math.floor(m.valueOf() / 86400000);
	const idx = ((dayNumber % n) + n) % n;
	return quotes[idx];
}
