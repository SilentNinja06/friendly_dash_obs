import { App } from "obsidian";
import type DailyDashPlugin from "../main";
import type { Bridge } from "../core/bridge";
import type {
	TodoStore,
	StreakData,
	CompanionData,
	DashCopy,
	LocalEvent,
	AgendaCacheEntry,
} from "dash-core";
import type { DashSettings } from "../settings";

export type RefreshReason = "open" | "interval" | "vault" | "manual";

/** Cross-panel runtime hints (not persisted). A superset of the core
 * `DashRuntime` capability so core panels can read `sessionStart`/`previousAccess`
 * (the clock's "since last visit" line) and defer refresh via `typingUntil`. */
export interface DashRuntime {
	/** ms timestamp the current view session started. */
	sessionStart: number;
	/** ms timestamp of the previous session's last access (for "since last visit"). */
	previousAccess: number;
	/** While `Date.now() < typingUntil`, the user is typing in a free-text field;
	 * the vault-refresh bus is deferred so the layout doesn't jump under them. */
	typingUntil: number;
	/** True while a free-text field anywhere on the dashboard has focus. The
	 * refresh bus is fully suspended while this holds, so the page never
	 * re-renders (and jumps) under the cursor — it resumes on blur. */
	textFocused: boolean;
}

/**
 * The dashboard's panel context. This is a structural superset of the core
 * `PanelContext` capability surface, so any core panel can be mounted with this
 * object, while friendly's own panels additionally reach `plugin`/`bridge`.
 * Members core panels never use on this dashboard (streak, some companion
 * readers, local events) are supplied with neutral defaults by the view.
 */
export interface PanelContext {
	app: App;
	plugin: DailyDashPlugin;
	bridge: Bridge;
	todos: TodoStore;
	/** Observation-streak snapshot. This dashboard has no streak concept, so the
	 * view supplies a zeroed default; kept only to satisfy the core surface. */
	streak: StreakData;
	/** Companion-plugin data (Recipe Manager, via the bridge adapter). */
	companion: CompanionData;
	runtime: DashRuntime;
	/** Host-injected chrome/status copy for core panels that read it from context. */
	copy: DashCopy;
	settings(): DashSettings;
	/** Per-calendar ICS cache (raw text + fetch time), keyed by url. */
	agendaCache: Record<string, AgendaCacheEntry>;
	/** Dashboard-only local events. This dashboard has none yet → empty. */
	localEvents: LocalEvent[];
	/** Persist plugin data (e.g. after refreshing the agenda cache). */
	persist(): Promise<void>;
	/** Re-render all mounted panels. */
	requestRefresh(reason?: RefreshReason): void;
	/** No-op here: this dashboard has no food-focus concept. */
	markFoodFocus(): void;
}

/** A dashboard panel module. */
export interface Panel {
	id: string;
	title: string;
	mount(el: HTMLElement, ctx: PanelContext): void | Promise<void>;
	refresh?(reason?: RefreshReason): void | Promise<void>;
	unmount?(): void;
}

/**
 * Base class handling the mount/draw/refresh/cleanup lifecycle. Long-lived
 * timers and subscriptions go in `setup()` (run once on mount); `renderBody()`
 * draws into a cleared element and may run on every refresh.
 */
export abstract class BasePanel implements Panel {
	abstract id: string;
	abstract title: string;
	protected el!: HTMLElement;
	protected ctx!: PanelContext;
	private cleanups: Array<() => void> = [];

	async mount(el: HTMLElement, ctx: PanelContext): Promise<void> {
		this.el = el;
		this.ctx = ctx;
		await this.setup();
		await this.draw();
	}

	async refresh(reason?: RefreshReason): Promise<void> {
		if (this.el?.isConnected) await this.draw(reason);
	}

	unmount(): void {
		for (const c of this.cleanups) {
			try {
				c();
			} catch {
				/* ignore */
			}
		}
		this.cleanups = [];
	}

	protected onCleanup(fn: () => void): void {
		this.cleanups.push(fn);
	}

	/** One-time setup (intervals, event subscriptions). Optional. */
	protected async setup(): Promise<void> {
		/* override as needed */
	}

	/** Re-run the body render from within the panel (after a local change). */
	protected rerender(): void {
		void this.draw("manual");
	}

	private async draw(reason?: RefreshReason): Promise<void> {
		this.el.empty();
		await this.renderBody(reason);
	}

	protected abstract renderBody(reason?: RefreshReason): void | Promise<void>;

	protected setInterval(fn: () => void, ms: number): void {
		const id = window.setInterval(fn, ms);
		this.onCleanup(() => window.clearInterval(id));
	}

	/** Wire a text input/textarea so the whole dashboard stops refreshing while
	 * it is focused (no jumpy re-render under the cursor), resuming on blur. */
	protected bindTextFocus(el: HTMLElement): void {
		el.addEventListener("focus", () => {
			this.ctx.runtime.textFocused = true;
		});
		el.addEventListener("blur", () => {
			this.ctx.runtime.textFocused = false;
		});
	}
}

// ------------------------------------------------------- small DOM helpers

/** A panel header. Returns the header element so panels can append status chips
 * on the right. Casing is left to CSS (some themes uppercase, most don't). */
export function placard(el: HTMLElement, title: string): HTMLElement {
	const head = el.createDiv({ cls: "dash-placard" });
	head.createSpan({ cls: "dash-placard-title", text: title });
	return head;
}
