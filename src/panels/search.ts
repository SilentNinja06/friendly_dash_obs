import { TFile, prepareFuzzySearch } from "obsidian";
import { BasePanel, placard } from "./types";

/**
 * Knowledge-base search (§5.5). Fuzzy search scoped to a configurable list of
 * folders (by default `Knowledge base/Notes` and `Second brain` — two roots).
 * Matches filenames and headings (read from the metadata cache, so it stays
 * instant on mobile). Enter opens the top hit; arrow keys navigate on desktop.
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

		const input = this.el.createEl("input", {
			cls: "dash-search-input",
			attr: { type: "search", placeholder: "Search your notes…", enterkeyhint: "search" },
		});
		this.inputEl = input;
		this.resultsEl = this.el.createDiv({ cls: "dash-search-results" });

		input.addEventListener("input", () => this.runQuery(input.value));
		input.addEventListener("keydown", (e) => this.onKey(e));
		this.runQuery("");
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
