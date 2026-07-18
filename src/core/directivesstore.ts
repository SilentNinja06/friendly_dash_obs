import { App, TFile, TFolder, normalizePath } from "obsidian";
import { TodoItem } from "./todostore";

/**
 * Persistence for the to-do list as a **Markdown vault file**.
 *
 * Why Markdown specifically: the to-do list is the one piece of dashboard state
 * the user edits on both the phone and the desktop, so it must sync. Obsidian
 * Sync always syncs Markdown; a plugin's `data.json` only syncs with "installed
 * community plugins" enabled, and a plain `.json` vault file only syncs with
 * "Sync all other file types" enabled (off by default). Storing the list as
 * JSON inside a `.md` file removes that dependency entirely. We reload it live
 * when the other device's copy lands.
 */
interface TodoFile {
	version: number;
	todos: TodoItem[];
}

const DEFAULT_PATH = "Daily Dashboard/To-dos.md";

const HEADER =
	"%% Daily Dashboard — your saved to-do list. This file is managed " +
	"automatically; add and edit your to-dos in the dashboard, not here. %%";

export class DirectivesStore {
	private items: TodoItem[] = [];
	/** The exact text we last read from / wrote to disk, so a modify event
	 * caused by our own write reloads to identical content and is ignored. */
	private lastSerialized = "";

	constructor(private app: App, private getPath: () => string) {}

	getItems(): TodoItem[] {
		return this.items;
	}

	setItems(items: TodoItem[]): void {
		this.items = items;
	}

	/** The Markdown file the list lives in. Any configured extension is coerced
	 * to `.md` so the file always syncs. */
	path(): string {
		const raw = (this.getPath() || DEFAULT_PATH).trim();
		return normalizePath(raw.replace(/\.[^./]+$/, "") + ".md");
	}

	isDirectivesPath(path: string): boolean {
		return normalizePath(path) === this.path();
	}

	/** Load from the Markdown file. Returns true if the file existed. */
	async load(): Promise<boolean> {
		const file = this.app.vault.getAbstractFileByPath(this.path());
		if (!(file instanceof TFile)) return false;
		try {
			const raw = await this.app.vault.read(file);
			this.lastSerialized = raw;
			this.items = parseTodos(raw);
		} catch (e) {
			console.error("Daily Dashboard: could not read the to-do file", e);
		}
		return true;
	}

	/** Write the current list to the Markdown file (creating it and its folder if
	 * needed). No-op when the content is unchanged. */
	async save(): Promise<void> {
		const body = buildMarkdown(this.items);
		if (body === this.lastSerialized) return;
		this.lastSerialized = body;
		const path = this.path();
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) {
			await this.app.vault.modify(existing, body);
		} else {
			await this.ensureFolder(path);
			await this.app.vault.create(path, body);
		}
	}

	/** React to a vault change on the to-do file (e.g. Obsidian Sync landing the
	 * other device's edit). Returns true if the in-memory list actually changed —
	 * our own writes reload to identical content and return false. */
	async onExternalChange(path: string): Promise<boolean> {
		if (!this.isDirectivesPath(path)) return false;
		const before = this.lastSerialized;
		await this.load();
		return this.lastSerialized !== before;
	}

	private async ensureFolder(path: string): Promise<void> {
		const dir = path.split("/").slice(0, -1).join("/");
		if (!dir) return;
		if (this.app.vault.getAbstractFileByPath(dir) instanceof TFolder) return;
		await this.app.vault.createFolder(dir).catch(() => {});
	}
}

/** JSON payload wrapped in a fenced block inside a Markdown file. */
function buildMarkdown(items: TodoItem[]): string {
	const json = JSON.stringify({ version: 1, todos: items } as TodoFile, null, 2);
	return `${HEADER}\n\n\`\`\`json\n${json}\n\`\`\`\n`;
}

/** Extract the todo list from a file. Tolerates a fenced ```json block (current
 * format) and a raw-JSON body. */
function parseTodos(raw: string): TodoItem[] {
	const fenced = raw.match(/```json\s*([\s\S]*?)```/);
	const candidate = fenced ? fenced[1] : raw;
	try {
		const parsed = JSON.parse(candidate) as TodoFile;
		return Array.isArray(parsed?.todos) ? parsed.todos : [];
	} catch {
		return [];
	}
}
