import type { Panel, PanelContext, RefreshReason } from "./types";
import { VersePanel } from "./verse";
import { QuotePanel } from "./quote";

export type DailyWords = "quote" | "verse" | "none";

export const DAILY_WORDS_LABELS: Record<DailyWords, string> = {
	quote: "Quote of the day (from your collection)",
	verse: "Verse of the day (Proverbs, KJV)",
	none: "Nothing",
};

/**
 * Daily words — one slot that shows the Quote of the Day, the Verse of the Day,
 * or nothing, per the "Daily words" setting. Replaces the separate Verse and
 * Quote panels; their layout positions carry over to this one.
 */
export class WordsPanel implements Panel {
	id = "words";
	title = "Daily words";
	private inner: Panel | null = null;
	private mode: DailyWords | null = null;
	private el: HTMLElement | null = null;
	private ctx: PanelContext | null = null;

	async mount(el: HTMLElement, ctx: PanelContext): Promise<void> {
		this.el = el;
		this.ctx = ctx;
		await this.sync();
	}

	async refresh(reason?: RefreshReason): Promise<void> {
		const before = this.mode;
		await this.sync();
		if (before === this.mode) await this.inner?.refresh?.(reason);
	}

	unmount(): void {
		this.inner?.unmount?.();
		this.inner = null;
		this.mode = null;
	}

	private async sync(): Promise<void> {
		if (!this.el || !this.ctx) return;
		const mode = this.ctx.settings().dailyWords;
		if (mode === this.mode) return;
		this.inner?.unmount?.();
		this.inner = null;
		this.mode = mode;
		this.el.empty();
		this.el.closest<HTMLElement>(".dash-panel")?.toggleClass("dash-panel-absent", mode === "none");
		if (mode === "none") return;
		this.inner = mode === "verse" ? new VersePanel() : new QuotePanel();
		await this.inner.mount(this.el, this.ctx);
	}
}
