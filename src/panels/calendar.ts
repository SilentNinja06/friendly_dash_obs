import { Notice, TFile, moment } from "obsidian";
import { BasePanel, placard } from "./types";
import { ensureDailyNote, getDailyNoteFile } from "../core/dailynote";
import { DailyBodyHit, ensureDailyNotesBase, searchDailyNoteBodies } from "../core/dailynotes";

/**
 * Calendar card (§5.9). A month grid (not for scheduling) — clicking a day opens
 * that day's daily note, creating it from the template if it doesn't exist yet.
 * Days that already have a note are marked. A button opens a Bases view of all
 * daily notes (created the first time it's pressed). And a search box looks
 * through the *contents* of every daily note, ignoring the shared section
 * headings, so you find the day you wrote something on.
 */
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export class CalendarPanel extends BasePanel {
	id = "calendar";
	title = "Calendar";
	/** First day of the month being viewed. */
	private cursor = startOfMonth(new Date());
	private searchQuery = "";
	private searchTimer: number | null = null;
	private searchResultsEl?: HTMLElement;

	protected renderBody(): void {
		placard(this.el, "Calendar");
		this.renderMonthNav();
		this.renderGrid();
		this.renderBaseButton();
		this.renderSearch();
	}

	// ------------------------------------------------------------- month grid

	private renderMonthNav(): void {
		const nav = this.el.createDiv({ cls: "dash-cal-nav" });
		const prev = nav.createEl("button", { cls: "dash-icon-btn", text: "‹", attr: { "aria-label": "Previous month" } });
		prev.addEventListener("click", () => {
			this.cursor = addMonths(this.cursor, -1);
			this.rerender();
		});
		const label = nav.createSpan({ cls: "dash-cal-month", text: moment(this.cursor).format("MMMM YYYY") });
		label.addEventListener("click", () => {
			this.cursor = startOfMonth(new Date());
			this.rerender();
		});
		const next = nav.createEl("button", { cls: "dash-icon-btn", text: "›", attr: { "aria-label": "Next month" } });
		next.addEventListener("click", () => {
			this.cursor = addMonths(this.cursor, 1);
			this.rerender();
		});
	}

	private renderGrid(): void {
		const grid = this.el.createDiv({ cls: "dash-cal-grid" });
		for (const w of WEEKDAY_LABELS) grid.createDiv({ cls: "dash-cal-dow", text: w });

		const year = this.cursor.getFullYear();
		const month = this.cursor.getMonth();
		const first = new Date(year, month, 1);
		const leading = first.getDay(); // 0=Sun
		const start = new Date(year, month, 1 - leading);
		const todayStr = moment().format("YYYY-MM-DD");

		for (let i = 0; i < 42; i++) {
			const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
			const dateStr = fmt(d);
			const cell = grid.createEl("button", { cls: "dash-cal-day", text: String(d.getDate()) });
			if (d.getMonth() !== month) cell.addClass("is-outside");
			if (dateStr === todayStr) cell.addClass("is-today");
			if (getDailyNoteFile(this.ctx.app, dateStr)) cell.addClass("has-note");
			cell.setAttr("aria-label", moment(d).format("dddd, MMMM D, YYYY"));
			cell.addEventListener("click", () => void this.openDay(dateStr));
		}
	}

	private async openDay(dateStr: string): Promise<void> {
		try {
			const file = await ensureDailyNote(this.ctx.app, dateStr);
			await this.ctx.app.workspace.getLeaf(false).openFile(file);
		} catch (e) {
			console.error("Daily Dashboard: could not open the daily note", e);
			new Notice("Couldn't open that day's note.");
		}
	}

	// -------------------------------------------------------------- base button

	private renderBaseButton(): void {
		const row = this.el.createDiv({ cls: "dash-btn-row" });
		const btn = row.createEl("button", { cls: "dash-btn", text: "Open all-days table" });
		btn.addEventListener("click", async () => {
			try {
				const path = this.ctx.settings().calendarBasePath;
				const file = await ensureDailyNotesBase(this.ctx.app, path);
				await this.ctx.app.workspace.getLeaf(false).openFile(file);
			} catch (e) {
				console.error("Daily Dashboard: could not open the daily-notes base", e);
				new Notice("Couldn't open the daily-notes table. Check the base file path in settings.");
			}
		});
	}

	// ------------------------------------------------------------------ search

	private renderSearch(): void {
		this.el.createDiv({ cls: "dash-subhead", text: "Search all daily notes" });
		const input = this.el.createEl("input", {
			cls: "dash-search-input",
			attr: { type: "search", placeholder: "Find words inside your daily notes…", enterkeyhint: "search" },
		});
		input.value = this.searchQuery;
		this.bindTextFocus(input);
		this.searchResultsEl = this.el.createDiv({ cls: "dash-search-results" });
		input.addEventListener("input", () => {
			this.searchQuery = input.value;
			if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
			this.searchTimer = window.setTimeout(() => void this.runSearch(), 250);
		});
		this.onCleanup(() => {
			if (this.searchTimer !== null) window.clearTimeout(this.searchTimer);
		});
		if (this.searchQuery.trim()) void this.runSearch();
	}

	private async runSearch(): Promise<void> {
		const el = this.searchResultsEl;
		if (!el) return;
		const q = this.searchQuery.trim();
		el.empty();
		if (!q) return;
		const hits = await searchDailyNoteBodies(this.ctx.app, q);
		if (!el.isConnected) return;
		if (hits.length === 0) {
			el.createDiv({ cls: "dash-muted", text: "Nothing found in your daily notes." });
			return;
		}
		for (const hit of hits) this.renderHit(el, hit);
	}

	private renderHit(el: HTMLElement, hit: DailyBodyHit): void {
		const row = el.createDiv({ cls: "dash-search-row" });
		row.createDiv({ cls: "dash-search-title", text: hit.file.basename });
		row.createDiv({ cls: "dash-search-context", text: hit.snippet });
		row.addEventListener("click", () => this.open(hit.file));
	}

	private open(file: TFile): void {
		void this.ctx.app.workspace.getLeaf(false).openFile(file);
	}
}

// ------------------------------------------------------------- date helpers

function startOfMonth(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number): Date {
	return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function fmt(d: Date): string {
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
