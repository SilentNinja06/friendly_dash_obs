import { TFile, prepareFuzzySearch } from "obsidian";
import { BasePanel, placard } from "./types";
import { NewCategoryModal, NewNoteModal, runAssignFlow } from "./categorymodals";

/**
 * Knowledge-base search + light organisation (§5.5). Fuzzy search scoped to a
 * configurable list of folders (by default `Knowledge base/Notes` and
 * `Second brain` — two roots), matching filenames and headings. Enter opens the
 * top hit; arrow keys navigate.
 *
 * The card also carries the note/category management from the sibling dashboard:
 * make a note, make a category, and file a note under a category. Membership is
 * tracked both ways (a wikilink in the category note and a `categories:`
 * frontmatter entry), handled by the shared library store.
 */
interface Candidate {
	file: TFile;
	basename: string;
	headings: string[];
}

interface Hit {
	file: TFile;
	title: string;
	context: string;
	score: number;
}

export class SearchPanel extends BasePanel {
	id = "search";
	title = "Search";
	private index: Candidate[] = [];
	private selected = 0;
	private hits: Hit[] = [];
	private resultsEl?: HTMLElement;
	private inputEl?: HTMLInputElement;

	private buildIndex(): void {
		const roots = this.searchRoots();
		this.index = [];
		for (const file of this.ctx.app.vault.getMarkdownFiles()) {
			if (roots.length && !roots.some((r) => inFolder(file.path, r))) continue;
			const cache = this.ctx.app.metadataCache.getFileCache(file);
			const headings = (cache?.headings ?? []).map((h) => h.heading);
			this.index.push({ file, basename: file.basename, headings });
		}
	}

	private searchRoots(): string[] {
		return this.ctx
			.settings()
			.kbSearchPaths.map((p) => p.trim().replace(/^\/+/, "").replace(/\/+$/, ""))
			.filter(Boolean);
	}

	protected renderBody(): void {
		this.buildIndex();
		placard(this.el, "Search");

		// Note + category management (operates on the Knowledge base library).
		const store = this.ctx.plugin.knowledgeBase;
		const actions = this.el.createDiv({ cls: "dash-btn-row" });
		const note = actions.createEl("button", { cls: "dash-btn dash-btn-primary", text: "+ Note" });
		note.addEventListener("click", () => new NewNoteModal(this.ctx.app, store, () => this.rerender()).open());
		const cat = actions.createEl("button", { cls: "dash-btn", text: "+ Category" });
		cat.addEventListener("click", () => new NewCategoryModal(this.ctx.app, store, () => this.rerender()).open());
		const assign = actions.createEl("button", { cls: "dash-btn", text: "File under category" });
		assign.addEventListener("click", () => runAssignFlow(this.ctx.app, store, () => this.rerender()));

		const input = this.el.createEl("input", {
			cls: "dash-search-input",
			attr: { type: "search", placeholder: "Search your notes…", enterkeyhint: "search" },
		});
		this.inputEl = input;
		this.bindTextFocus(input);
		this.resultsEl = this.el.createDiv({ cls: "dash-search-results" });

		input.addEventListener("input", () => this.runQuery(input.value));
		input.addEventListener("keydown", (e) => this.onKey(e));
		this.runQuery("");

		this.renderCategories();
	}

	private renderCategories(): void {
		const store = this.ctx.plugin.knowledgeBase;
		const cats = store.listCategories();
		const section = this.el.createDiv({ cls: "dash-sb-cats" });
		section.createDiv({ cls: "dash-subhead", text: `Categories · ${cats.length}` });
		if (cats.length === 0) {
			section.createDiv({ cls: "dash-muted", text: "No categories yet. Make one to start grouping your notes." });
			return;
		}
		const listEl = section.createDiv();
		// Read every category's members up front so the counts show immediately.
		void (async () => {
			const withMembers = await Promise.all(
				cats.map(async (c) => ({ cat: c, members: await store.categoryMembers(c.file) }))
			);
			if (!listEl.isConnected) return;
			for (const { cat, members } of withMembers) {
				const details = listEl.createEl("details", { cls: "dash-sb-cat" });
				const summary = details.createEl("summary");
				summary.createSpan({ cls: "dash-sb-cat-name", text: cat.name });
				summary.createSpan({ cls: "dash-chip dash-chip-cold", text: String(members.length) });
				const body = details.createDiv({ cls: "dash-sb-cat-body" });
				if (members.length === 0) body.createDiv({ cls: "dash-muted", text: "Empty." });
				for (const m of members) {
					const row = body.createDiv({ cls: "dash-sb-member" });
					const link = row.createEl("a", { cls: "dash-sb-link", text: m });
					link.addEventListener("click", (e) => {
						e.preventDefault();
						void this.ctx.app.workspace.openLinkText(m, cat.file.path, false);
					});
				}
			}
		})();
	}

	private runQuery(query: string): void {
		const q = query.trim();
		this.hits = [];
		this.selected = 0;
		if (q) {
			const search = prepareFuzzySearch(q);
			for (const cand of this.index) {
				let best = search(cand.basename);
				let context = "";
				for (const h of cand.headings) {
					const r = search(h);
					if (r && (!best || r.score > best.score)) {
						best = r;
						context = h;
					}
				}
				if (best) this.hits.push({ file: cand.file, title: cand.basename, context, score: best.score });
			}
			this.hits.sort((a, b) => b.score - a.score);
			this.hits = this.hits.slice(0, 20);
		}
		this.renderResults();
	}

	private renderResults(): void {
		const el = this.resultsEl;
		if (!el) return;
		el.empty();
		if (!this.inputEl?.value.trim()) {
			const roots = this.searchRoots();
			const where = roots.length ? roots.join(", ") : "your vault";
			el.createDiv({ cls: "dash-muted", text: `${this.index.length} notes ready to search in ${where}. Start typing.` });
			return;
		}
		if (this.hits.length === 0) {
			el.createDiv({ cls: "dash-muted", text: "No matching notes." });
			return;
		}
		this.hits.forEach((hit, i) => {
			const row = el.createDiv({ cls: "dash-search-row" });
			if (i === this.selected) row.addClass("is-selected");
			row.createDiv({ cls: "dash-search-title", text: hit.title });
			if (hit.context && hit.context !== hit.title) row.createDiv({ cls: "dash-search-context", text: hit.context });
			row.addEventListener("click", () => this.open(hit.file));
		});
	}

	private onKey(e: KeyboardEvent): void {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			this.selected = Math.min(this.hits.length - 1, this.selected + 1);
			this.renderResults();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			this.selected = Math.max(0, this.selected - 1);
			this.renderResults();
		} else if (e.key === "Enter") {
			e.preventDefault();
			const hit = this.hits[this.selected];
			if (hit) this.open(hit.file);
		}
	}

	private open(file: TFile): void {
		void this.ctx.app.workspace.getLeaf(false).openFile(file);
	}
}

function inFolder(path: string, folder: string): boolean {
	return path === folder || path.startsWith(folder + "/");
}
