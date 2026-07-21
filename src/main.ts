import { Plugin, WorkspaceLeaf } from "obsidian";
import {
	DEFAULT_SETTINGS,
	DashData,
	DashSettings,
	DashSettingTab,
	mergeSettings,
} from "./settings";
import { Bridge } from "./core/bridge";
import { TodoStore } from "dash-core";
import { DirectivesStore } from "dash-core";
import { LibraryStore } from "dash-core";
import { DashRuntime, RefreshReason } from "./panels/types";
import { DashView, VIEW_TYPE_DASH } from "./view";

export default class DailyDashPlugin extends Plugin {
	settings: DashSettings = DEFAULT_SETTINGS;
	bridge!: Bridge;
	todos!: TodoStore;
	directives!: DirectivesStore;
	secondBrain!: LibraryStore;
	knowledgeBase!: LibraryStore;
	runtime: DashRuntime = { sessionStart: Date.now(), previousAccess: 0, typingUntil: 0, textFocused: false };

	private data!: DashData;
	private refreshTimer: number | null = null;

	async onload(): Promise<void> {
		// Register the view synchronously, *before any await*, so a dashboard leaf
		// saved in the workspace can be deserialized on startup.
		this.registerView(VIEW_TYPE_DASH, (leaf) => new DashView(leaf, this));

		// Stores read settings lazily via closures, so they can be constructed
		// before settings finish loading — a restored view always finds them ready.
		this.bridge = new Bridge(this.app);
		this.secondBrain = new LibraryStore(this.app, () => ({
			root: this.settings.secondBrainPath,
			categoriesSubfolder: "Categories",
			archiveSubfolder: this.settings.secondBrainArchiveSubfolder,
			listHeading: "Notes",
		}));
		this.knowledgeBase = new LibraryStore(this.app, () => ({
			root: this.settings.kbRootPath,
			notesSubfolder: this.settings.kbNotesSubfolder,
			categoriesSubfolder: this.settings.kbCategoriesSubfolder,
			archiveSubfolder: this.settings.kbArchiveSubfolder,
			listHeading: this.settings.kbListHeading,
		}));
		this.directives = new DirectivesStore(this.app, () => this.settings.directivesPath, {
			header:
				"%% Daily Dashboard — your saved to-do list. This file is managed " +
				"automatically; add and edit your to-dos in the dashboard, not here. %%",
			defaultPath: "Daily Dashboard/To-dos.md",
		});
		this.todos = new TodoStore(
			this.app,
			() => this.directives.getItems(),
			(items) => this.directives.setItems(items),
			() => this.directives.save(),
			() => ({
				marker: this.settings.completedTasksMarker,
				heading: this.settings.completedTasksHeading,
			})
		);

		// Plugin data only (no vault access) — safe during onload.
		await this.load_();

		this.addRibbonIcon("layout-dashboard", "Open Daily Dashboard", () => void this.openDashboard());
		this.addCommand({
			id: "open-dashboard",
			name: "Open dashboard",
			callback: () => void this.openDashboard(),
		});
		this.addSettingTab(new DashSettingTab(this.app, this));

		// Refresh bus source: vault/metadata changes, debounced ~300ms.
		this.registerEvent(this.app.metadataCache.on("changed", () => this.scheduleRefresh()));
		this.registerEvent(this.app.vault.on("modify", (file) => this.onVaultChange(file.path)));
		this.registerEvent(this.app.vault.on("create", (file) => this.onVaultChange(file.path)));
		this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh()));
		this.registerEvent(this.app.vault.on("rename", () => this.scheduleRefresh()));

		// Everything that reads/writes the vault or touches the workspace waits
		// until it is ready.
		this.app.workspace.onLayoutReady(() => {
			// A dashboard leaf can be re-created during `registerView` (above) —
			// which runs before settings finish loading, so a plugin hot-reload (a
			// BRAT update, or toggling the plugin) can build the view from DEFAULT
			// settings, showing panels the user had hidden. Now that settings are
			// loaded, rebuild any open view so its panel set matches the saved
			// show/hide state.
			this.rebuildOpenViews();
			void this.loadDirectives().then(() => this.refreshOpenViews("vault"));
			this.registerEvent(
				this.app.workspace.on("active-leaf-change", (leaf) => this.maybeReplaceEmptyLeaf(leaf))
			);
			if (this.settings.replaceNewTab) this.replaceActiveEmptyLeaf();
			if (this.settings.openOnStartup) void this.openDashboard(false);
		});
	}

	/** If enabled, swap an empty New Tab leaf for the dashboard. */
	private maybeReplaceEmptyLeaf(leaf: WorkspaceLeaf | null): void {
		if (!this.settings.replaceNewTab || !leaf) return;
		if (leaf.view?.getViewType() === "empty") {
			void leaf.setViewState({ type: VIEW_TYPE_DASH });
		}
	}

	/** Replace the currently-active leaf if it's an empty New Tab. */
	replaceActiveEmptyLeaf(): void {
		this.maybeReplaceEmptyLeaf(this.app.workspace.activeLeaf ?? null);
	}

	onunload(): void {
		if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
	}

	// ------------------------------------------------------------- data

	private async load_(): Promise<void> {
		const raw = (await this.loadData()) as Partial<DashData> | null;
		this.settings = mergeSettings(raw?.settings);
		this.data = {
			settings: this.settings,
			todos: raw?.todos ?? [],
			seeded: raw?.seeded ?? false,
			agendaCache: raw?.agendaCache ?? {},
		};
		await this.saveData_();
	}

	/** Load the to-do list from its vault file the first time; nothing is seeded
	 * (a fresh install starts with an empty list — the user's list is their own). */
	private async loadDirectives(): Promise<void> {
		const existed = await this.directives.load();
		if (existed) {
			this.data.seeded = true;
			return;
		}
		const legacy = this.data.todos ?? [];
		if (legacy.length > 0) this.directives.setItems(legacy);
		this.data.seeded = true;
		this.data.todos = [];
		await this.directives.save();
		await this.saveData_();
	}

	/** Vault create/modify router: reload the to-do list when its file changes on
	 * another device (Obsidian Sync), otherwise a plain debounced refresh. */
	private onVaultChange(path: string): void {
		if (this.directives.isDirectivesPath(path)) {
			void this.directives.onExternalChange(path).then((changed) => {
				if (changed) this.refreshOpenViews("vault");
			});
			return;
		}
		this.scheduleRefresh();
	}

	async saveData_(): Promise<void> {
		this.data.settings = this.settings;
		await this.saveData(this.data);
	}

	get agendaCache(): Record<string, { text: string; fetchedAt: number }> {
		return this.data.agendaCache;
	}

	// ------------------------------------------------------------- view

	async openDashboard(reveal = true): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_DASH);
		let leaf: WorkspaceLeaf;
		if (existing.length > 0) {
			leaf = existing[0];
		} else {
			leaf = reveal ? this.app.workspace.getLeaf(true) : this.app.workspace.getLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE_DASH, active: reveal });
		}
		if (reveal) this.app.workspace.revealLeaf(leaf);
	}

	refreshOpenViews(reason: RefreshReason = "manual"): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DASH)) {
			const view = leaf.view;
			if (view instanceof DashView) void view.refreshPanels(reason);
		}
	}

	/** Re-mount panels in every open view — for panel enable/reorder changes. */
	rebuildOpenViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DASH)) {
			const view = leaf.view;
			if (view instanceof DashView) void view.rebuild();
		}
	}

	/** Apply the current theme to every open view without a rebuild (live switch). */
	applyThemeToViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DASH)) {
			const view = leaf.view;
			if (view instanceof DashView) view.applyTheme();
		}
	}

	private scheduleRefresh(): void {
		if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			// Don't re-render (and reflow the grid) while the user is in a free-text
			// field — defer while one is focused, or shortly after a keystroke.
			if (this.runtime.textFocused || Date.now() < this.runtime.typingUntil) {
				this.scheduleRefresh();
				return;
			}
			this.refreshOpenViews("vault");
		}, 300);
	}
}
