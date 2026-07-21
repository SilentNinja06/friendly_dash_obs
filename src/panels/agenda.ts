import { moment } from "obsidian";
import { BasePanel, placard } from "./types";
import { AgendaItem, eventsOnDate, fetchICS, parseICS } from "dash-core";
import { calendarColorVar } from "../core/themes";

/**
 * Today's agenda (§5.3). Today only — no month view. Up to 20 calendars, fetched
 * concurrently but rate-limited so one dead share link never blocks the others,
 * with per-calendar error isolation. The last successful fetch is cached in
 * plugin data so it renders offline, and fetch failures are surfaced *visibly*
 * in plain language (a stale calendar must be noticeable — Proton stops feeding
 * third-party subscribers silently, and can take up to eight hours to
 * propagate a change).
 *
 * The list lives in a fixed-height, internally-scrolling container. It
 * auto-scrolls to the current time of day on open and on refresh — but it never
 * fights a manual scroll: once the user scrolls, we stop snapping to "now" for
 * the session and offer an unobtrusive "back to now" button instead.
 */
const FETCH_CONCURRENCY = 4;

export class AgendaPanel extends BasePanel {
	id = "agenda";
	title = "Today's Agenda";
	private errors = new Map<string, string>();
	private fetching = false;
	/** Set once the user scrolls the list; suppresses auto-scroll-to-now until
	 * they press "back to now". Persists across re-renders (per session). */
	private userScrolled = false;
	private lastScrollTop = 0;
	private suppressScrollHandler = false;

	protected async setup(): Promise<void> {
		const minutes = Math.max(1, this.ctx.settings().agendaRefreshMinutes || 30);
		this.setInterval(() => void this.fetchAll(), minutes * 60 * 1000);
		void this.fetchAll();
	}

	protected renderBody(): void {
		const s = this.ctx.settings();
		const head = placard(this.el, "Today's Agenda");
		head.createSpan({ cls: "dash-placard-badge", text: moment().format("ddd, MMM D") });

		const toolbar = this.el.createDiv({ cls: "dash-agenda-toolbar" });
		const printBtn = toolbar.createEl("button", { cls: "dash-btn", text: "🖨 Print week" });
		printBtn.setAttr("title", "Open a printable week-at-a-glance planner for this week");
		printBtn.addEventListener("click", () => this.printWeek());

		if (s.agendaUrls.length === 0) {
			this.el.createDiv({
				cls: "dash-empty",
				text: "No calendars yet. Add your calendar share links in the plugin settings (Settings → Daily Dashboard → Today's agenda) and today's events will appear here.",
			});
			return;
		}

		const today = moment().format("YYYY-MM-DD");
		const rows: Array<{ item: AgendaItem; colorIndex: number; label: string }> = [];
		let anyCache = false;
		let oldest = Infinity;

		s.agendaUrls.forEach((cal, i) => {
			const cache = this.ctx.plugin.agendaCache[cal.url];
			if (cache) {
				anyCache = true;
				oldest = Math.min(oldest, cache.fetchedAt);
				try {
					for (const item of eventsOnDate(parseICS(cache.text), today)) {
						rows.push({ item, colorIndex: i, label: cal.label });
					}
				} catch {
					this.errors.set(cal.url, "couldn't be read");
				}
			}
		});

		// Failure notices — always visible, in plain language, per calendar.
		const failed = s.agendaUrls.filter((c) => this.errors.has(c.url));
		if (failed.length) {
			const box = this.el.createDiv({ cls: "dash-agenda-alert" });
			for (const c of failed) {
				box.createDiv({
					cls: "dash-agenda-alert-line",
					text: `“${c.label}” couldn't be reached (${this.errors.get(c.url)}). A share link can quietly stop working on the calendar's side — this one may need to be renewed and re-added.`,
				});
			}
		}

		rows.sort((a, b) => a.item.sortKey - b.item.sortKey || a.item.summary.localeCompare(b.item.summary));

		// Fixed-height, internally scrolling container.
		const list = this.el.createDiv({ cls: "dash-agenda-list" });
		list.style.height = `${Math.max(120, s.agendaHeight || 320)}px`;

		if (rows.length === 0 && !failed.length) {
			list.createDiv({ cls: "dash-empty", text: "Nothing on the calendar today." });
		}

		const nowMinutes = moment().hour() * 60 + moment().minute();
		let nowMarker: HTMLElement | null = null;
		let markerPlaced = false;

		const placeMarkerBefore = (): HTMLElement => {
			const m = list.createDiv({ cls: "dash-agenda-now" });
			m.createSpan({ cls: "dash-agenda-now-label", text: `now · ${moment().format(this.ctx.settings().clock24h ? "H:mm" : "h:mm A")}` });
			return m;
		};

		for (const r of rows) {
			// Drop the "now" line in just before the first event still to come.
			if (!markerPlaced && !r.item.allDay && r.item.sortKey >= nowMinutes) {
				nowMarker = placeMarkerBefore();
				markerPlaced = true;
			}
			const row = list.createDiv({ cls: "dash-agenda-row" });
			const swatch = row.createSpan({ cls: "dash-agenda-swatch" });
			swatch.style.background = calendarColorVar(r.colorIndex);
			const time = row.createSpan({ cls: "dash-agenda-time" });
			time.setText(r.item.allDay ? "all day" : r.item.timeLabel);
			const body = row.createDiv({ cls: "dash-agenda-body" });
			body.createDiv({ cls: "dash-agenda-title", text: r.item.summary });
			const sub = [r.label, r.item.location].filter(Boolean).join(" · ");
			if (sub) body.createDiv({ cls: "dash-agenda-sub", text: sub });
		}
		// If every remaining event is already past, the "now" line goes at the end.
		if (!markerPlaced && rows.some((r) => !r.item.allDay)) {
			nowMarker = placeMarkerBefore();
		}

		// "Back to now" — unobtrusive, only useful once scrolled away.
		const backToNow = this.el.createEl("button", { cls: "dash-agenda-backtonow", text: "↕ Back to now" });
		backToNow.addEventListener("click", () => {
			this.userScrolled = false;
			this.scrollToNow(list, nowMarker);
		});

		// Track manual scroll so we stop snapping to "now" (no snap-back).
		list.addEventListener("scroll", () => {
			if (this.suppressScrollHandler) return;
			this.userScrolled = true;
			this.lastScrollTop = list.scrollTop;
		});

		// Auto-scroll to now on open/refresh — unless the user has scrolled, in
		// which case preserve their position rather than yanking it back.
		window.requestAnimationFrame(() => {
			if (!list.isConnected) return;
			if (this.userScrolled) this.setScrollTop(list, this.lastScrollTop);
			else this.scrollToNow(list, nowMarker);
		});

		// Staleness footer.
		if (anyCache && oldest !== Infinity) {
			const age = Date.now() - oldest;
			if (age > 90 * 1000) {
				this.el.createDiv({
					cls: "dash-agenda-age",
					text: `Showing the last update from ${moment(oldest).fromNow()}. Calendars can take up to eight hours to show a change; a fresh check is on its way.`,
				});
			}
		}
	}

	private scrollToNow(list: HTMLElement, marker: HTMLElement | null): void {
		if (!marker) {
			this.setScrollTop(list, 0);
			return;
		}
		// Center the "now" line within the visible window.
		const target = Math.max(0, marker.offsetTop - list.clientHeight / 2);
		this.setScrollTop(list, target);
	}

	private setScrollTop(list: HTMLElement, top: number): void {
		this.suppressScrollHandler = true;
		list.scrollTop = top;
		this.lastScrollTop = top;
		// Release after the scroll event has fired.
		window.setTimeout(() => (this.suppressScrollHandler = false), 50);
	}

	private async fetchAll(): Promise<void> {
		if (this.fetching) return;
		const urls = this.ctx.settings().agendaUrls;
		if (urls.length === 0) return;
		this.fetching = true;
		let changed = false;
		try {
			// Rate-limited concurrency: work through the list a few at a time, so 20
			// calendars don't fire 20 simultaneous requests. Each fetch is isolated —
			// one failure records a per-calendar error and never blocks the rest.
			const queue = urls.slice();
			const worker = async (): Promise<void> => {
				for (;;) {
					const cal = queue.shift();
					if (!cal) return;
					try {
						const text = await fetchICS(cal.url);
						this.ctx.plugin.agendaCache[cal.url] = { text, fetchedAt: Date.now() };
						this.errors.delete(cal.url);
						changed = true;
					} catch (e) {
						this.errors.set(cal.url, humanizeFetchError(e));
					}
				}
			};
			await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, urls.length) }, worker));
			if (changed) await this.ctx.plugin.saveData_();
		} finally {
			this.fetching = false;
		}
		if (this.el?.isConnected) this.rerender();
	}

	// ----------------------------------------------------- printable week

	/** Resolve the theme's calendar swatch colours to concrete hex, so the
	 * printout matches the on-screen colour-coding. Reads the computed
	 * `--dash-cal-N` custom properties from the live panel. */
	private resolveCalColors(): string[] {
		const cs = getComputedStyle(this.el);
		const out: string[] = [];
		for (let i = 1; i <= 8; i++) {
			const v = cs.getPropertyValue(`--dash-cal-${i}`).trim();
			out.push(v || FALLBACK_CAL_COLORS[i - 1]);
		}
		return out;
	}

	/** Build and print a week-at-a-glance planner for the current week, with
	 * events colour-coded by the calendar they came from and ruled blank space
	 * to write in. Opens in a hidden iframe so only the planner prints. */
	private printWeek(): void {
		const s = this.ctx.settings();
		const colors = this.resolveCalColors();

		// Parse each calendar once, then query all seven days.
		const calendars = s.agendaUrls.map((cal, i) => {
			const cache = this.ctx.plugin.agendaCache[cal.url];
			let events: ReturnType<typeof parseICS> = [];
			if (cache) {
				try {
					events = parseICS(cache.text);
				} catch {
					/* skip an unparseable calendar */
				}
			}
			return { events, color: colors[i % colors.length], label: cal.label };
		});

		const start = startOfWeek(new Date());
		const days: PrintDay[] = [];
		for (let d = 0; d < 7; d++) {
			const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + d);
			const dateStr = fmtLocal(date);
			const items: PrintItem[] = [];
			for (const cal of calendars) {
				for (const item of eventsOnDate(cal.events, dateStr)) {
					items.push({ item, color: cal.color, label: cal.label });
				}
			}
			items.sort((a, b) => a.item.sortKey - b.item.sortKey || a.item.summary.localeCompare(b.item.summary));
			days.push({ date, items });
		}

		const legend = calendars.map((c) => ({ label: c.label, color: c.color }));
		openPrintDocument(buildWeekHtml(days, legend, start));
	}
}

interface PrintItem {
	item: AgendaItem;
	color: string;
	label: string;
}
interface PrintDay {
	date: Date;
	items: PrintItem[];
}

function humanizeFetchError(e: unknown): string {
	const msg = String((e as Error)?.message ?? e);
	if (/HTTP\s*4\d\d/.test(msg)) return "the link was refused";
	if (/HTTP\s*5\d\d/.test(msg)) return "the calendar server had an error";
	if (/network|fetch|ENOTFOUND|timeout/i.test(msg)) return "no connection";
	return msg;
}

// ------------------------------------------------------- printable week helpers

/** Used only if a theme's --dash-cal-N can't be read (should not happen). */
const FALLBACK_CAL_COLORS = ["#186a5b", "#2f6f97", "#8a5a2b", "#6b6f2f", "#7a3f6b", "#2f7f7a", "#a6602b", "#4a4f8a"];

/** Sunday of the week containing `d` (matches the in-app calendar's week start). */
function startOfWeek(d: Date): Date {
	const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
	s.setDate(s.getDate() - s.getDay());
	return s;
}

function fmtLocal(d: Date): string {
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

interface Legend {
	label: string;
	color: string;
}

/** A self-contained, print-styled week-at-a-glance document. Calendar data is
 * untrusted, so every summary/location/label is HTML-escaped. */
function buildWeekHtml(days: PrintDay[], legend: Legend[], weekStart: Date): string {
	const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
	const title = `${moment(weekStart).format("MMMM D")} – ${moment(weekEnd).format("MMMM D, YYYY")}`;

	const legendHtml = legend.length
		? `<div class="legend">${legend
				.map((l) => `<span class="leg"><span class="dot" style="background:${l.color}"></span>${escapeHtml(l.label)}</span>`)
				.join("")}</div>`
		: "";

	const dayCells = days
		.map((day) => {
			const events = day.items
				.map((pi) => {
					const time = pi.item.allDay ? "all day" : escapeHtml(pi.item.timeLabel);
					const title = escapeHtml(pi.item.summary || "(untitled)");
					const loc = pi.item.location ? ` · ${escapeHtml(pi.item.location)}` : "";
					return `<div class="evt" style="border-left-color:${pi.color}">
						<span class="evt-dot" style="background:${pi.color}"></span>
						<span class="evt-time">${time}</span>
						<span class="evt-title">${title}<span class="evt-cal">${escapeHtml(pi.label)}${loc}</span></span>
					</div>`;
				})
				.join("");
			return `<section class="day">
				<header class="day-h">
					<span class="day-name">${moment(day.date).format("dddd")}</span>
					<span class="day-date">${moment(day.date).format("MMM D")}</span>
				</header>
				<div class="events">${events}</div>
				<div class="write"></div>
			</section>`;
		})
		.join("");

	// An 8th cell: free-form notes for the week.
	const notesCell = `<section class="day notes">
			<header class="day-h"><span class="day-name">Notes &amp; to-do</span></header>
			<div class="write tall"></div>
		</section>`;

	return `<!doctype html>
<html><head><meta charset="utf-8"><title>Week at a glance — ${escapeHtml(title)}</title>
<style>
	* { box-sizing: border-box; }
	html, body { margin: 0; padding: 0; }
	body {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
		color: #111; background: #fff; padding: 14px;
		-webkit-print-color-adjust: exact; print-color-adjust: exact;
	}
	h1 { font-size: 18px; margin: 0 0 2px; }
	.sub { color: #555; font-size: 12px; margin-bottom: 8px; }
	.legend { display: flex; flex-wrap: wrap; gap: 10px; margin: 6px 0 12px; font-size: 11px; }
	.leg { display: inline-flex; align-items: center; gap: 5px; }
	.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
	.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
	.day { border: 1px solid #bbb; border-radius: 6px; padding: 6px 8px; min-height: 56mm; display: flex; flex-direction: column; break-inside: avoid; }
	.day.notes { min-height: 56mm; }
	.day-h { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 4px; }
	.day-name { font-weight: 700; font-size: 13px; }
	.day-date { color: #666; font-size: 12px; }
	.events { display: flex; flex-direction: column; gap: 3px; margin-bottom: 4px; }
	.evt { display: flex; align-items: baseline; gap: 6px; border-left: 4px solid #999; padding: 1px 0 1px 6px; font-size: 11px; }
	.evt-dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 50%; align-self: center; }
	.evt-time { flex: 0 0 auto; color: #333; font-variant-numeric: tabular-nums; min-width: 66px; }
	.evt-title { font-weight: 600; }
	.evt-cal { display: block; font-weight: 400; color: #777; font-size: 10px; }
	.write { flex: 1 1 auto; min-height: 22mm; background-image: repeating-linear-gradient(to bottom, transparent, transparent 6mm, #e2e2e2 6mm, #e2e2e2 calc(6mm + 1px)); }
	.write.tall { min-height: 48mm; }
	@media print { body { padding: 0; } @page { margin: 12mm; } }
</style></head>
<body>
	<h1>Week at a glance</h1>
	<div class="sub">${escapeHtml(title)}</div>
	${legendHtml}
	<div class="grid">${dayCells}${notesCell}</div>
</body></html>`;
}

/** Print an HTML document via a throwaway hidden iframe, so only the planner
 * prints (not the whole Obsidian window). Desktop feature; on platforms without
 * printing this simply does nothing visible. */
function openPrintDocument(html: string): void {
	const iframe = document.createElement("iframe");
	iframe.setAttribute("aria-hidden", "true");
	iframe.style.position = "fixed";
	iframe.style.right = "0";
	iframe.style.bottom = "0";
	iframe.style.width = "0";
	iframe.style.height = "0";
	iframe.style.border = "0";
	document.body.appendChild(iframe);

	const win = iframe.contentWindow;
	const doc = win?.document;
	if (!win || !doc) {
		iframe.remove();
		return;
	}
	doc.open();
	doc.write(html);
	doc.close();

	let removed = false;
	const cleanup = () => {
		if (removed) return;
		removed = true;
		iframe.remove();
	};
	win.addEventListener("afterprint", () => window.setTimeout(cleanup, 500));
	// Fallback so the iframe never lingers if afterprint doesn't fire.
	window.setTimeout(cleanup, 5 * 60 * 1000);

	// Give the document a tick to lay out, then invoke print.
	window.setTimeout(() => {
		try {
			win.focus();
			win.print();
		} catch {
			cleanup();
		}
	}, 300);
}
