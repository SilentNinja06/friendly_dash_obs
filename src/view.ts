import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type DailyDashPlugin from "./main";
import { DEFAULT_STREAK } from "dash-core";
import { Panel, PanelContext, RefreshReason } from "./panels/types";
import { createPanels } from "./panels/registry";
import { friendlyCompanion } from "./companion";

export const VIEW_TYPE_DASH = "daily-dashboard";

interface Mounted {
	panel: Panel;
	host: HTMLElement;
}

/**
 * The shell: an ItemView that hosts registered panel modules in a responsive
 * layout. It owns the refresh bus, stamps the active theme onto the view root as
 * a `data-theme` attribute (scoped so it never fights the user's Obsidian
 * theme), and guarantees that a throwing panel renders a calm error card without
 * taking down the dashboard.
 */
export class DashView extends ItemView {
	private mounted: Mounted[] = [];
	private grid!: HTMLElement;

	constructor(leaf: WorkspaceLeaf, private plugin: DailyDashPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_DASH;
	}

	getDisplayText(): string {
		return "Daily Dashboard";
	}

	getIcon(): string {
		return "layout-dashboard";
	}

	private ctx(): PanelContext {
		return {
			app: this.app,
			plugin: this.plugin,
			bridge: this.plugin.bridge,
			todos: this.plugin.todos,
			// This dashboard has no observation-streak concept; a zeroed snapshot
			// satisfies the core panel surface without introducing the notion.
			streak: DEFAULT_STREAK,
			// Recipe Manager, adapted to the generic companion surface (read-only).
			companion: friendlyCompanion(this.plugin.bridge),
			runtime: this.plugin.runtime,
			// Core library panels take their copy via their constructors; nothing
			// reads context copy on this dashboard yet.
			copy: {},
			settings: () => this.plugin.settings,
			agendaCache: this.plugin.agendaCache,
			localEvents: [],
			persist: () => this.plugin.saveData_(),
			requestRefresh: (reason: RefreshReason = "manual") => void this.refreshPanels(reason),
			markFoodFocus: () => {},
		};
	}

	async onOpen(): Promise<void> {
		await this.build();
	}

	/** Re-mount all panels — used when the panel set or order changes. */
	async rebuild(): Promise<void> {
		await this.build();
	}

	/** Live theme switch: restamp the root attribute, no rebuild. */
	applyTheme(): void {
		this.contentEl.dataset.theme = this.plugin.settings.theme;
	}

	async onClose(): Promise<void> {
		this.teardown();
		this.contentEl.empty();
	}

	private teardown(): void {
		for (const m of this.mounted) {
			try {
				m.panel.unmount?.();
			} catch {
				/* ignore */
			}
		}
		this.mounted = [];
	}

	private async build(): Promise<void> {
		this.teardown();
		const root = this.contentEl;
		root.empty();
		root.addClass("dash-root");
		root.dataset.theme = this.plugin.settings.theme;

		this.renderChrome(root);

		this.grid = root.createDiv({ cls: "dash-grid" });
		const s = this.plugin.settings;
		const panels = createPanels(s.panelOrder, s.enabledPanels, this.plugin);
		const ctx = this.ctx();

		for (const panel of panels) {
			const host = this.grid.createDiv({ cls: "dash-panel" });
			host.dataset.panel = panel.id;
			this.mounted.push({ panel, host });
			await this.mountPanel(panel, host, ctx);
		}
	}

	private renderChrome(root: HTMLElement): void {
		const header = root.createDiv({ cls: "dash-topbar" });
		const brand = header.createDiv({ cls: "dash-brand" });
		brand.appendChild(dashMark());
		brand.createDiv({ cls: "dash-brand-name", text: "Daily Dashboard" });

		const refresh = header.createEl("button", { cls: "dash-icon-btn", attr: { "aria-label": "Refresh" } });
		setIcon(refresh, "refresh-cw");
		refresh.addEventListener("click", () => void this.refreshPanels("manual"));
	}

	private async mountPanel(panel: Panel, host: HTMLElement, ctx: PanelContext): Promise<void> {
		host.empty();
		const body = host.createDiv({ cls: "dash-panel-body" });
		try {
			await panel.mount(body, ctx);
		} catch (e) {
			this.renderErrorCard(host, panel, e);
		}
	}

	/** Plain-language failure card — tells the user what happened and that the
	 * rest of the dashboard still works. The detail goes to the console. */
	private renderErrorCard(host: HTMLElement, panel: Panel, err: unknown): void {
		console.error(`Daily Dashboard: panel "${panel.id}" failed`, err);
		host.empty();
		host.addClass("dash-panel-error");
		const card = host.createDiv({ cls: "dash-error-card" });
		card.createDiv({ cls: "dash-placard", text: panel.title });
		card.createDiv({
			cls: "dash-error-note",
			text: "This panel couldn't load right now. The rest of your dashboard is fine — try the refresh button, or reopen the dashboard.",
		});
	}

	async refreshPanels(reason: RefreshReason): Promise<void> {
		for (const m of this.mounted) {
			try {
				await m.panel.refresh?.(reason);
			} catch (e) {
				this.renderErrorCard(m.host, m.panel, e);
			}
		}
	}
}

/** A simple, theme-neutral mark: three stacked rows in a rounded square,
 * suggesting a dashboard/board. No lore, no motif — just a friendly glyph. */
function dashMark(): SVGElement {
	const ns = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(ns, "svg");
	svg.setAttribute("viewBox", "0 0 32 32");
	svg.setAttribute("class", "dash-mark");
	svg.setAttribute("width", "24");
	svg.setAttribute("height", "24");
	const frame = document.createElementNS(ns, "rect");
	frame.setAttribute("x", "3");
	frame.setAttribute("y", "3");
	frame.setAttribute("width", "26");
	frame.setAttribute("height", "26");
	frame.setAttribute("rx", "6");
	frame.setAttribute("class", "dash-mark-frame");
	svg.appendChild(frame);
	const rows: Array<[number, number]> = [
		[9, 14],
		[15, 20],
		[21, 12],
	];
	for (const [y, w] of rows) {
		const bar = document.createElementNS(ns, "rect");
		bar.setAttribute("x", "8");
		bar.setAttribute("y", String(y));
		bar.setAttribute("width", String(w));
		bar.setAttribute("height", "2.5");
		bar.setAttribute("rx", "1.25");
		bar.setAttribute("class", "dash-mark-bar");
		svg.appendChild(bar);
	}
	return svg;
}
