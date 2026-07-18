import { App, Modal, Notice, Setting, TFile, prepareFuzzySearch } from "obsidian";
import { BasePanel, placard } from "./types";
import { LibraryStore } from "../core/library";

/**
 * Second Brain panel (§5.6) — the ongoing-project folder. Active projects live
 * directly under the Second Brain folder; a finished project is moved into the
 * Archive subfolder. Active vs archived is purely folder location.
 *
 * Archiving moves the note with `app.fileManager.renameFile()` so every inbound
 * link is repointed (never `adapter.rename`, which would break links). Both
 * archiving and deleting ask for confirmation first.
 */
export class SecondBrainPanel extends BasePanel {
	id = "secondbrain";
	title = "Second Brain";
	private query = "";
	private showArchived = false;

	private get store(): LibraryStore {
		return this.ctx.plugin.secondBrain;
	}

	protected renderBody(): void {
		const head = placard(this.el, "Second Brain");
		const notes = this.store.listNotes();
		head.createSpan({ cls: "dash-placard-badge", text: `${notes.length} active` });

		const actions = this.el.createDiv({ cls: "dash-btn-row" });
		const add = actions.createEl("button", { cls: "dash-btn dash-btn-primary", text: "+ New project" });
		add.addEventListener("click", () => new NewNoteModal(this.ctx.app, this.store, () => this.rerender()).open());

		const input = this.el.createEl("input", {
			cls: "dash-search-input",
			attr: { type: "search", placeholder: "Search your projects…" },
		});
		input.value = this.query;
		this.bindTextFocus(input);
		const results = this.el.createDiv({ cls: "dash-sb-results" });
		const render = () => {
			results.empty();
			const q = this.query.trim();
			const list = q ? this.fuzzy(notes, q) : notes.slice(0, 12);
			if (list.length === 0) {
				results.createDiv({
					cls: "dash-empty",
					text: q ? "No matching projects." : "No active projects yet. Tap “+ New project” to start one.",
				});
				return;
			}
			for (const file of list) this.renderNoteRow(results, file);
			if (!q && notes.length > 12) {
				results.createDiv({ cls: "dash-muted", text: `+${notes.length - 12} more — type to search.` });
			}
		};
		input.addEventListener("input", () => {
			this.query = input.value;
			render();
		});
		render();

		const archived = this.store.listArchived();
		if (archived.length > 0) {
			const arch = this.el.createEl("details", { cls: "dash-sb-archived" });
			arch.open = this.showArchived;
			arch.createEl("summary", { text: `Archived · ${archived.length}` });
			arch.addEventListener("toggle", () => (this.showArchived = arch.open));
			const list = arch.createDiv();
			for (const file of archived) {
				const row = list.createDiv({ cls: "dash-sb-member" });
				const link = row.createEl("a", { cls: "dash-sb-link", text: file.basename });
				link.addEventListener("click", (e) => {
					e.preventDefault();
					void this.ctx.app.workspace.getLeaf(false).openFile(file);
				});
				this.iconBtn(row, "⤺", "Move back to active", async () => {
					await this.store.restoreNote(file);
					new Notice(`Moved “${file.basename}” back to active projects.`);
					this.rerender();
				});
			}
		}
	}

	private renderNoteRow(parent: HTMLElement, file: TFile): void {
		const row = parent.createDiv({ cls: "dash-sb-row" });
		const link = row.createEl("a", { cls: "dash-sb-link", text: file.basename });
		link.addEventListener("click", (e) => {
			e.preventDefault();
			void this.ctx.app.workspace.getLeaf(false).openFile(file);
		});
		this.iconBtn(row, "🗄", "Archive (project finished)", () => {
			new ConfirmModal(
				this.ctx.app,
				`Archive “${file.basename}”?`,
				"It moves into your Archive folder. Any links to it are updated automatically, and you can move it back any time.",
				"Archive",
				async () => {
					await this.store.archiveNote(file);
					new Notice(`Archived “${file.basename}”.`);
					this.showArchived = true;
					this.rerender();
				}
			).open();
		});
		this.iconBtn(row, "🗑", "Delete", () => {
			new ConfirmModal(
				this.ctx.app,
				`Delete “${file.basename}”?`,
				"It goes to your configured trash. This can't be undone from here.",
				"Delete",
				async () => {
					await this.store.deleteNote(file);
					new Notice(`Deleted “${file.basename}”.`);
					this.rerender();
				}
			).open();
		});
	}

	private iconBtn(parent: HTMLElement, glyph: string, label: string, onClick: () => void): void {
		const b = parent.createEl("button", { cls: "dash-icon-btn dash-sb-icon", text: glyph, attr: { title: label, "aria-label": label } });
		b.addEventListener("click", onClick);
	}

	private fuzzy(files: TFile[], query: string): TFile[] {
		const search = prepareFuzzySearch(query);
		const scored: Array<{ file: TFile; score: number }> = [];
		for (const file of files) {
			let best = search(file.basename);
			const cache = this.ctx.app.metadataCache.getFileCache(file);
			for (const h of cache?.headings ?? []) {
				const r = search(h.heading);
				if (r && (!best || r.score > best.score)) best = r;
			}
			if (best) scored.push({ file, score: best.score });
		}
		return scored.sort((a, b) => b.score - a.score).slice(0, 20).map((s) => s.file);
	}
}

// --------------------------------------------------------------- modals

class NewNoteModal extends Modal {
	private title = "";
	constructor(app: App, private store: LibraryStore, private onDone: () => void) {
		super(app);
	}
	onOpen(): void {
		this.titleEl.setText("New project");
		new Setting(this.contentEl).setName("Project name").addText((t) => {
			t.setPlaceholder("What is this project called?").onChange((v) => (this.title = v));
			t.inputEl.focus();
			t.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					void this.submit();
				}
			});
		});
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
			.addButton((b) => b.setButtonText("Create").setCta().onClick(() => void this.submit()));
	}
	private async submit(): Promise<void> {
		const title = this.title.trim();
		if (!title) {
			new Notice("Please give the project a name.");
			return;
		}
		const file = await this.store.createNote(title);
		this.close();
		this.onDone();
		await this.app.workspace.getLeaf(false).openFile(file);
	}
	onClose(): void {
		this.contentEl.empty();
	}
}

export class ConfirmModal extends Modal {
	constructor(
		app: App,
		private heading: string,
		private body: string,
		private confirmLabel: string,
		private onConfirm: () => void
	) {
		super(app);
	}
	onOpen(): void {
		this.titleEl.setText(this.heading);
		this.contentEl.createEl("p", { text: this.body });
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
			.addButton((b) =>
				b
					.setButtonText(this.confirmLabel)
					.setWarning()
					.onClick(() => {
						this.close();
						this.onConfirm();
					})
			);
	}
	onClose(): void {
		this.contentEl.empty();
	}
}
