import { App, TFile, normalizePath } from "obsidian";
import { dailyNotesFolder } from "./dailynote";

/**
 * Helpers for the Calendar card (§5.9): enumerating daily-note files, searching
 * their *bodies* (heading lines excluded), and creating the Bases file the
 * card's button opens.
 */

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;

function inFolder(path: string, folder: string): boolean {
	return path === folder || path.startsWith(folder + "/");
}

/** Markdown files that are daily notes: those inside the configured Daily Notes
 * folder, or — if none is configured — those whose name looks like a date. */
export function listDailyNoteFiles(app: App): TFile[] {
	const folder = dailyNotesFolder(app);
	return app.vault.getMarkdownFiles().filter((f) => {
		if (folder) return inFolder(f.path, folder);
		return DATE_LIKE.test(f.basename);
	});
}

export interface DailyBodyHit {
	file: TFile;
	snippet: string;
}

/**
 * Search across daily-note *bodies* for `query`, most-recent first. Heading
 * lines (`# …`) are stripped before matching, so words that only appear in a
 * heading (the section titles every note shares) don't produce hits. Case-
 * insensitive substring match; returns a short surrounding snippet.
 */
export async function searchDailyNoteBodies(
	app: App,
	query: string,
	limit = 30
): Promise<DailyBodyHit[]> {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const files = listDailyNoteFiles(app).sort((a, b) => b.stat.mtime - a.stat.mtime);
	const out: DailyBodyHit[] = [];
	for (const file of files) {
		let content: string;
		try {
			content = await app.vault.cachedRead(file);
		} catch {
			continue;
		}
		const body = content
			.split("\n")
			.filter((l) => !/^#{1,6}\s/.test(l))
			.join("\n");
		const idx = body.toLowerCase().indexOf(q);
		if (idx !== -1) {
			out.push({ file, snippet: makeSnippet(body, idx, q.length) });
			if (out.length >= limit) break;
		}
	}
	return out;
}

function makeSnippet(body: string, idx: number, len: number): string {
	const pad = 48;
	const start = Math.max(0, idx - pad);
	const end = Math.min(body.length, idx + len + pad);
	let s = body.slice(start, end).replace(/\s+/g, " ").trim();
	if (start > 0) s = "… " + s;
	if (end < body.length) s = s + " …";
	return s;
}

/**
 * The Bases (.base) file the Calendar button opens — a simple table of the daily
 * notes. Created on demand if it doesn't exist yet, then returned.
 */
export async function ensureDailyNotesBase(app: App, basePath: string): Promise<TFile> {
	const path = normalizePath(basePath.endsWith(".base") ? basePath : basePath + ".base");
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) return existing;
	const dir = path.split("/").slice(0, -1).join("/");
	if (dir && !app.vault.getAbstractFileByPath(dir)) {
		await app.vault.createFolder(dir).catch(() => {});
	}
	const folder = dailyNotesFolder(app);
	return app.vault.create(path, baseContent(folder));
}

/** A minimal, standard Bases table over the daily-notes folder. */
function baseContent(folder: string): string {
	const filter = folder ? `    - file.inFolder("${folder}")` : `    - file.ext == "md"`;
	return [
		"filters:",
		"  and:",
		filter,
		"views:",
		"  - type: table",
		"    name: Daily notes",
		"    order:",
		"      - file.name",
		"      - file.mtime",
		"",
	].join("\n");
}
