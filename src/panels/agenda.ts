import { moment } from "obsidian";
import { BasePanel, placard } from "./types";
import { AgendaItem, eventsOnDate, fetchICS, parseICS } from "../core/ics";
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
}

function humanizeFetchError(e: unknown): string {
	const msg = String((e as Error)?.message ?? e);
	if (/HTTP\s*4\d\d/.test(msg)) return "the link was refused";
	if (/HTTP\s*5\d\d/.test(msg)) return "the calendar server had an error";
	if (/network|fetch|ENOTFOUND|timeout/i.test(msg)) return "no connection";
	return msg;
}
