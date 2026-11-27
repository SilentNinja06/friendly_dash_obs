import type { Panel, PanelContext, RefreshReason } from "../panels/types";
import { companionEnabled } from "./registry";

/**
 * Wrap a companion's card so it only exists while that plugin is installed and
 * turned on. Otherwise its slot is hidden entirely (no empty box, no "install
 * me" message). Re-checked on every refresh, so turning the companion on or off
 * shows or hides the card without restarting.
 */
export class CompanionGate implements Panel {
	id: string;
	title: string;
	private el: HTMLElement | null = null;
	private ctx: PanelContext | null = null;
	private mounted = false;

	constructor(private pluginId: string, private inner: Panel) {
		this.id = inner.id;
		this.title = inner.title;
	}

	async mount(el: HTMLElement, ctx: PanelContext): Promise<void> {
		this.el = el;
		this.ctx = ctx;
		await this.sync();
	}

	async refresh(reason?: RefreshReason): Promise<void> {
		const wasMounted = this.mounted;
		await this.sync();
		if (wasMounted && this.mounted) await this.inner.refresh?.(reason);
	}

	unmount(): void {
		if (this.mounted) this.inner.unmount?.();
		this.mounted = false;
	}

	private async sync(): Promise<void> {
		const el = this.el;
		const ctx = this.ctx;
		if (!el || !ctx) return;
		const on = companionEnabled(ctx.app, this.pluginId);
		el.closest<HTMLElement>(".dash-panel")?.toggleClass("dash-panel-absent", !on);
		if (on && !this.mounted) {
			this.mounted = true;
			el.empty();
			await this.inner.mount(el, ctx);
		} else if (!on && this.mounted) {
			this.inner.unmount?.();
			this.mounted = false;
			el.empty();
		}
	}
}
