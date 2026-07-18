import { App } from "obsidian";
import type DailyDashPlugin from "../main";
import type { Bridge } from "../core/bridge";
import type { TodoStore } from "../core/todostore";
import type { DashSettings } from "../settings";

export type RefreshReason = "open" | "interval" | "vault" | "manual";

/** Cross-panel runtime hints (not persisted). */
export interface DashRuntime {
	/** While `Date.now() < typingUntil`, the user is typing in a free-text field;
	 * the vault-refresh bus is deferred so the layout doesn't jump under them. */
	typingUntil: number;
}

export interface PanelContext {
	app: App;
	plugin: DailyDashPlugin;
	bridge: Bridge;
	todos: TodoStore;
	runtime: DashRuntime;
	settings(): DashSettings;
	/** Re-render all mounted panels. */
	requestRefresh(reason?: RefreshReason): void;
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
}

// ------------------------------------------------------- small DOM helpers

/** A panel header. Returns the header element so panels can append status chips
 * on the right. Casing is left to CSS (some themes uppercase, most don't). */
export function placard(el: HTMLElement, title: string): HTMLElement {
	const head = el.createDiv({ cls: "dash-placard" });
	head.createSpan({ cls: "dash-placard-title", text: title });
	return head;
}
