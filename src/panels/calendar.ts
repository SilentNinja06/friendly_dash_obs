import { Notice, TFile, moment } from "obsidian";
import { BasePanel, placard } from "./types";
import { ensureDailyNote, getDailyNoteFile } from "dash-core";
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
		const head = placard(this.el, "Calendar");
		this.renderBaseButton(head);
		this.renderMonthNav();
		this.renderGrid();
		this.el.createDiv({ cls: "dash-cal-legend", text: "Days with a dot have a daily note. Tap any day to open it; an empty day is created from your daily-note template." });
		this.renderSearch();
	}

	// ------------------------------------------------------------- month grid

	private renderMonthNav(): void {
		const nav = this.el.createDiv({ cls: "dash-cal-nav" });
		const go = (to: Date) => {
			this.cursor = to;
			this.rerender();
		};
		const prev = nav.createEl("button", { cls: "dash-cal-navbtn", text: "‹", attr: { "aria-label": "Previous month" } });
		prev.addEventListener("click", () => go(addMonths(this.cursor, -1)));
		nav.createDiv({ cls: "dash-cal-month", text: moment(this.cursor).format("MMMM YYYY") });
		const next = nav.createEl("button", { cls: "dash-cal-navbtn", text: "›", attr: { "aria-label": "Next month" } });
		next.addEventListener("click", () => go(addMonths(this.cursor, 1)));
		const today = nav.createEl("button", { cls: "dash-cal-navbtn", text: "Today" });
		today.addEventListener("click", () => go(startOfMonth(new Date())));
	}

	private renderGrid(): void {
		const grid = this.el.createDiv({ cls: "dash-cal-grid" });
		for (const w of WEEKDAY_LABELS) grid.createDiv({ cls: "dash-cal-dow", text: w });
		// Day tiles are divs, not <button>s, so the Obsidian theme's button styling
		// can't repaint them; they're still keyboard-reachable and labelled.

		const year = this.cursor.getFullYear();
		const month = this.cursor.getMonth();
		const first = new Date(year, month, 1);
		const leading = first.getDay(); // 0=Sun
		const start = new Date(year, month, 1 - leading);
		const todayStr = moment().format("YYYY-MM-DD");

		for (let i = 0; i < 42; i++) {
			const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
			const dateStr = fmt(d);
			const cell = grid.createDiv({ cls: "dash-cal-day", attr: { role: "button", tabindex: "0" } });
			cell.createSpan({ cls: "dash-cal-num", text: String(d.getDate()) });
			if (d.getMonth() !== month) cell.addClass("is-outside");
			if (dateStr === todayStr) cell.addClass("is-today");
			if (getDailyNoteFile(this.ctx.app, dateStr)) {
				cell.addClass("has-note");
				cell.createSpan({ cls: "dash-cal-dot" });
			}
			cell.setAttr("aria-label", moment(d).format("dddd, MMMM D, YYYY"));
			cell.addEventListener("click", () => void this.openDay(dateStr));
			cell.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					void this.openDay(dateStr);
				}
			});
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

	private renderBaseButton(head: HTMLElement): void {
		const btn = head.createEl("button", { cls: "dash-btn dash-btn-sm dash-cal-basebtn", text: "All days", attr: { "aria-label": "Open the table of all daily notes" } });
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
