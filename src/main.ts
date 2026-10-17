import { Notice, ObsidianProtocolData, Plugin, TFile, WorkspaceLeaf, moment } from "obsidian";
import {
	DEFAULT_SETTINGS,
	DashData,
	DashSettings,
	DashSettingTab,
	WeeklyGoal,
	applyLayout,
	layoutFromSettings,
	mergeSettings,
} from "./settings";
import { Bridge } from "./core/bridge";
import {
	AICredsStore,
	DirectivesStore,
	LayoutStore,
	LibraryStore,
	LocalEvent,
	LocalEventModal,
	LocalEventsFileStore,
	PromptModal,
	TodoStore,
	WeekReviewModal,
	WeeklyGoalsModal,
	appendToDailyField,
	currentWeekKey,
} from "dash-core";
import { DashRuntime, RefreshReason } from "./panels/types";
import { DashView, VIEW_TYPE_DASH } from "./view";
import { PANEL_ORDER } from "./panels/registry";
import { TodoEditModal } from "./panels/todo";
import { JOURNAL_FIELDS, JournalField, isJournalField } from "./core/journalfields";
import { friendlyLocalEvents, friendlyWeeklyGoals, FRIENDLY_WEEKLYGOALS_COPY } from "./adapters";
import { friendlyWeekReviewConfig } from "./weekreview";
import { logAgendaToDailyNote } from "./agenda-log";
import { itemsFor, loadShopping, parseGroceryNote, saveShopping } from "./shopping";
import { ShoppingItemModal, ShoppingManagerModal } from "./shopping-manager";
import { QuoteCatalogueModal, QuoteEditModal } from "./quote-catalogue";
import { generateEndOfDay, generateMorningBrief } from "./ai/brief";

/** The panels a pre-0.6 install already knew about. Anything newer is placed
 * (and switched on or off by its default) once, on first load after updating. */
const LEGACY_PANELS = ["clock", "verse", "todo", "agenda", "journal", "meals", "search", "calendar", "secondbrain", "places"];

/** After a start where the to-do file wasn't there, how long to hold off creating
 * a new one so Obsidian Sync can deliver the real copy first. */
const DIRECTIVES_SYNC_GRACE_MS = 30000;

export default class DailyDashPlugin extends Plugin {
	settings: DashSettings = DEFAULT_SETTINGS;
	bridge!: Bridge;
	todos!: TodoStore;
	directives!: DirectivesStore;
	localEventsStore!: LocalEventsFileStore;
	layoutStore!: LayoutStore;
	aiCreds!: AICredsStore;
	secondBrain!: LibraryStore;
	knowledgeBase!: LibraryStore;
	runtime: DashRuntime = { sessionStart: Date.now(), previousAccess: 0, typingUntil: 0, textFocused: false };

	private data!: DashData;
	private refreshTimer: number | null = null;
	private midnightTimer: number | null = null;

	/**
	 * Tiny read/write API for companion plugins. Recipe Manager can call
	 * `importGroceryMarkdown` to send a generated grocery list straight into the
	 * Shopping panel's store. A Markdown string in, a count of new items out.
	 */
	public api = {
		version: 1,
		importGroceryMarkdown: async (markdown: string, listName = "Groceries"): Promise<number> => {
			const list = (listName || "Groceries").trim() || "Groceries";
			const parsed = parseGroceryNote(markdown, list);
			if (parsed.length === 0) return 0;
			const store = await loadShopping(this);
			if (!store.lists.includes(list)) store.lists.push(list);
			const existing = new Set(itemsFor(store, list).map((i) => i.name.toLowerCase()));
			let added = 0;
			for (const it of parsed) {
				if (existing.has(it.name.toLowerCase())) continue;
				existing.add(it.name.toLowerCase());
				store.items.push(it);
				added++;
			}
			if (added > 0) await saveShopping(this, store);
			this.refreshOpenViews("manual");
			return added;
		},
	};

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
			hasSeenFile: () => this.data?.directivesFileSeen === true,
			markSeenFile: () => {
				if (this.data && !this.data.directivesFileSeen) {
					this.data.directivesFileSeen = true;
					void this.saveData_();
				}
			},
			getBackup: () => this.data?.directivesBackup ?? [],
			setBackup: (items) => {
				if (!this.data) return;
				this.data.directivesBackup = items;
				void this.saveData_();
			},
		});
		this.localEventsStore = new LocalEventsFileStore(this.app, () => this.settings.localEventsPath, {
			defaultPath: "Daily Dashboard/Local Events.md",
		});
		this.layoutStore = new LayoutStore(this.app, () => this.settings.layoutPath, {
			defaultPath: "Daily Dashboard/Dashboard Layout.md",
		});
		this.aiCreds = new AICredsStore(this.app, () => this.settings.aiCredentialsPath, {
			defaultPath: "Daily Dashboard/AI Credentials.md",
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
		this.registerCommands();
		this.registerObsidianProtocolHandler("daily-dash", (params) => void this.handleUri(params));
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
			// before settings finish loading — so rebuild any open view now that the
			// saved show/hide state is known.
			this.rebuildOpenViews();
			void Promise.all([this.loadDirectives(), this.localEventsStore.load(), this.loadLayout(), this.loadAICreds()]).then(() =>
				this.refreshOpenViews("vault")
			);
			this.scheduleMidnight();
			this.registerEvent(
				this.app.workspace.on("active-leaf-change", (leaf) => {
					this.maybeReplaceEmptyLeaf(leaf);
					// Mobile doesn't re-render a backgrounded tab; re-read on return.
					if (leaf?.view?.getViewType() === VIEW_TYPE_DASH) this.refreshOpenViews("open");
				})
			);
			// Coming back to the app (especially on a phone) picks up anything that
			// synced in while it was in the background.
			this.registerDomEvent(document, "visibilitychange", () => {
				if (document.visibilityState === "visible") this.refreshOpenViews("open");
			});
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
		if (this.midnightTimer !== null) window.clearTimeout(this.midnightTimer);
	}

	// ----------------------------------------------- commands + URI

	/** Everything the dashboard does, reachable from the command palette, a phone
	 * shortcut, or a hotkey — each works whether or not the dashboard is open. */
	private registerCommands(): void {
		const done = () => this.refreshOpenViews("vault");
		this.addCommand({
			id: "add-todo",
			name: "Add a to-do",
			callback: () => new TodoEditModal(this.app, this.todos, undefined, done).open(),
		});
		this.addCommand({
			id: "complete-next-todo",
			name: "Complete the next to-do",
			callback: () => void this.completeNextTodo(),
		});
		for (const field of Object.keys(JOURNAL_FIELDS) as JournalField[]) {
			this.addCommand({
				id: `log-${field}`,
				name: `Write in ${JOURNAL_FIELDS[field].label}`,
				callback: () => this.promptJournal(field),
			});
		}
		this.addCommand({
			id: "add-event",
			name: "Add an event to today's agenda",
			callback: () => new LocalEventModal(this.app, friendlyLocalEvents(this), undefined, done).open(),
		});
		this.addCommand({
			id: "log-agenda",
			name: "Copy today's agenda into today's note",
			callback: () => void logAgendaToDailyNote(this),
		});
		this.addCommand({
			id: "weekly-review",
			name: "Week in review",
			callback: () => new WeekReviewModal(this.app, friendlyWeekReviewConfig(this)).open(),
		});
		this.addCommand({
			id: "weekly-goals",
			name: "Set this week's goals",
			callback: () =>
				new WeeklyGoalsModal(this.app, friendlyWeeklyGoals(this), this.todos, currentWeekKey(), done, FRIENDLY_WEEKLYGOALS_COPY).open(),
		});
		this.addCommand({
			id: "shopping-list",
			name: "Open the shopping list",
			callback: () => new ShoppingManagerModal(this.app, this, undefined, done).open(),
		});
		this.addCommand({
			id: "add-shopping-item",
			name: "Add a shopping item",
			callback: () => new ShoppingItemModal(this.app, this, "Groceries", null, done).open(),
		});
		this.addCommand({
			id: "add-quote",
			name: "Add a quote",
			callback: () => new QuoteEditModal(this.app, this, null, done).open(),
		});
		this.addCommand({
			id: "quotes-catalogue",
			name: "Browse quotes",
			callback: () => new QuoteCatalogueModal(this.app, this, done).open(),
		});
		this.addCommand({
			id: "generate-daily-brief",
			name: "Write today's brief (AI)",
			callback: async () => {
				await generateMorningBrief(this, true);
				this.refreshOpenViews("manual");
			},
		});
		this.addCommand({
			id: "end-the-day",
			name: "End the day — add a recap to today's note (AI)",
			callback: () => void generateEndOfDay(this),
		});
		this.addCommand({
			id: "refresh",
			name: "Refresh dashboard",
			callback: () => this.refreshOpenViews("manual"),
		});
		this.addCommand({
			id: "todo-status",
			name: "Show to-do list status (troubleshooting)",
			callback: async () => {
				const path = this.directives.path();
				const f = this.app.vault.getAbstractFileByPath(path);
				const lines = [
					`File: ${path}`,
					`On disk: ${f instanceof TFile ? `yes (${(await this.app.vault.read(f).catch(() => "")).length} bytes)` : "no"}`,
					`In memory: ${this.directives.getItems().length} to-dos`,
					`Backup on this device: ${(this.data.directivesBackup ?? []).length}`,
					`Last load: ${this.directives.lastStatus}`,
				];
				new Notice(lines.join("\n"), 15000);
			},
		});
		this.addCommand({
			id: "restore-todo-backup",
			name: "Restore the to-do list from this device's backup",
			callback: async () => {
				const backup = this.data.directivesBackup ?? [];
				if (backup.length === 0) {
					new Notice("There's no to-do backup on this device to restore from.");
					return;
				}
				this.directives.setItems(backup.map((t) => ({ ...t })));
				await this.directives.save();
				this.refreshOpenViews("manual");
				new Notice(`Restored ${backup.length} to-do${backup.length === 1 ? "" : "s"}.`);
			},
		});
	}

	/** Complete the top to-do still open today — the same path as ticking it. */
	private async completeNextTodo(): Promise<void> {
		const inst = this.todos.firstPending();
		if (!inst) {
			new Notice("Nothing left to do today. 🎉");
			return;
		}
		await this.todos.toggleComplete(inst.item.id);
		this.refreshOpenViews("vault");
		new Notice(`Done: ${inst.item.text}`);
	}

	private promptJournal(field: JournalField): void {
		new PromptModal(
			this.app,
			{ title: JOURNAL_FIELDS[field].label, placeholder: "What's on your mind?", cta: "Save", multiline: true },
			(text) => void this.writeJournal(field, text)
		).open();
	}

	/** Append `text` to a journal section of today's note (creating it if needed). */
	private async writeJournal(field: JournalField, text: string): Promise<void> {
		const { label, spec } = JOURNAL_FIELDS[field];
		try {
			const wrote = await appendToDailyField(this.app, spec, text, label);
			if (wrote) {
				this.refreshOpenViews("vault");
				new Notice(`Saved to ${label}.`);
			} else {
				new Notice(`Nothing was saved — there's no text, or today's note couldn't be found.`);
			}
		} catch (e) {
			console.error("Daily Dashboard: journal write failed", e);
			new Notice("That couldn't be saved. Please try again.");
		}
	}

	/** `obsidian://daily-dash?action=…` — headless with `text`, falls back to the
	 * matching window without it. */
	private async handleUri(params: ObsidianProtocolData): Promise<void> {
		const action = (params.action ?? "").toLowerCase();
		const done = () => this.refreshOpenViews("vault");
		switch (action) {
			case "":
			case "open":
				await this.openDashboard();
				return;
			case "complete-next":
				await this.completeNextTodo();
				return;
			case "add-todo": {
				const text = (params.text ?? "").trim();
				if (text) {
					await this.todos.add({ text });
					done();
					new Notice(`Added to-do: ${text}`);
				} else {
					new TodoEditModal(this.app, this.todos, undefined, done).open();
				}
				return;
			}
			case "log": {
				const field = (params.field ?? "").toLowerCase();
				if (!isJournalField(field)) {
					new Notice("Unknown journal section. Use braindump, journal, or tomorrow.");
					return;
				}
				const text = (params.text ?? "").trim();
				if (text) await this.writeJournal(field, text);
				else this.promptJournal(field);
				return;
			}
			case "add-event": {
				const summary = (params.summary ?? params.text ?? "").trim();
				if (summary) {
					const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date : moment().format("YYYY-MM-DD");
					const start = params.start || undefined;
					await this.addLocalEvent({ summary, date, start, end: start && params.end ? params.end : undefined });
					new Notice(`Added event: ${summary}`);
				} else {
					new LocalEventModal(this.app, friendlyLocalEvents(this), undefined, done).open();
				}
				return;
			}
			default:
				new Notice("Daily Dashboard didn't recognise that link.");
		}
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
			weeklyGoals: raw?.weeklyGoals ?? {},
			directivesFileSeen: raw?.directivesFileSeen ?? false,
			directivesBackup: raw?.directivesBackup ?? [],
			briefDate: raw?.briefDate ?? "",
			briefText: raw?.briefText ?? "",
			// A fresh install knows every panel; an upgrade knows only the old set.
			knownPanels: raw?.knownPanels ?? (raw?.settings ? LEGACY_PANELS : [...PANEL_ORDER]),
		};
		this.placeNewPanels();
		await this.saveData_();
	}

	/** Slot panels added by an update next to their default neighbour (instead of
	 * at the very bottom), once. Their on/off state comes from the defaults. */
	private placeNewPanels(): void {
		const known = new Set(this.data.knownPanels ?? []);
		const order = this.settings.panelOrder;
		for (const id of PANEL_ORDER) {
			if (known.has(id)) continue;
			const at = order.indexOf(id);
			if (at >= 0) order.splice(at, 1);
			const prev = PANEL_ORDER.slice(0, PANEL_ORDER.indexOf(id)).reverse().find((p) => order.includes(p));
			order.splice(prev ? order.indexOf(prev) + 1 : 0, 0, id);
			this.settings.enabledPanels[id] = DEFAULT_SETTINGS.enabledPanels[id];
			known.add(id);
		}
		this.data.knownPanels = [...known];
	}

	/** Load the to-do list from its vault file. Sync-safe: a missing file may just
	 * mean Obsidian Sync hasn't delivered it yet, so nothing is written until the
	 * real copy has had time to arrive (or there's genuine legacy data to move). */
	private async loadDirectives(): Promise<void> {
		const existed = await this.directives.load();
		if (existed) {
			this.data.seeded = true;
			return;
		}
		const legacy = this.data.todos ?? [];
		if (legacy.length > 0) {
			this.directives.setItems(legacy);
			this.data.seeded = true;
			this.data.todos = [];
			await this.directives.save();
			await this.saveData_();
			return;
		}
		this.directives.deferCreateFor(DIRECTIVES_SYNC_GRACE_MS);
		const poll = async () => {
			if (this.directives.hasLoaded()) return;
			const arrived = await this.directives.load();
			if (arrived && !this.directives.isUnreadable()) this.refreshOpenViews("vault");
		};
		for (const ms of [2000, 5000, 10000, 20000, DIRECTIVES_SYNC_GRACE_MS]) {
			this.registerTimeout(window.setTimeout(() => void poll(), ms));
		}
		this.registerTimeout(
			window.setTimeout(async () => {
				const recreated = await this.directives.ensureFromBackup();
				if (!recreated) await this.directives.save();
				this.refreshOpenViews("vault");
			}, DIRECTIVES_SYNC_GRACE_MS + 1500)
		);
	}

	private registerTimeout(id: number): void {
		this.register(() => window.clearTimeout(id));
	}

	/** The synced layout file wins when present; otherwise seed it from this
	 * device so it starts following you around. */
	private async loadLayout(): Promise<void> {
		if (await this.layoutStore.load()) {
			applyLayout(this.settings, this.layoutStore.get());
			await this.saveData_();
			this.rebuildOpenViews();
		} else {
			await this.layoutStore.seedFrom(layoutFromSettings(this.settings));
		}
	}

	/** Save a layout edit to both data.json and the synced layout file. */
	async persistLayout(): Promise<void> {
		await this.saveData_();
		await this.layoutStore.setFromSettings(layoutFromSettings(this.settings));
	}

	/** The synced credentials file wins when it has a key; otherwise seed it from
	 * this device's key (if any) so the other devices get it. */
	private async loadAICreds(): Promise<void> {
		await this.aiCreds.load();
		const fileKey = this.aiCreds.getApiKey();
		if (fileKey) {
			this.settings.aiApiKey = fileKey;
			const base = this.aiCreds.getBaseUrl();
			if (base) this.settings.aiBaseUrl = base;
			await this.saveData_();
		} else if (this.settings.aiApiKey) {
			await this.aiCreds.seedFrom(this.settings.aiApiKey, this.settings.aiBaseUrl);
		}
	}

	/** Mirror the API key into the synced credentials file after a settings edit. */
	async persistAICreds(): Promise<void> {
		await this.aiCreds.setFromSettings(this.settings.aiApiKey, this.settings.aiBaseUrl);
	}

	/** Vault create/modify router: reload a synced store when its file changes on
	 * another device (Obsidian Sync), otherwise a plain debounced refresh. */
	private onVaultChange(path: string): void {
		if (this.directives.isDirectivesPath(path)) {
			void this.directives.onExternalChange(path).then((changed) => {
				if (changed) this.refreshOpenViews("vault");
			});
			return;
		}
		if (this.localEventsStore.isLocalEventsPath(path)) {
			void this.localEventsStore.onExternalChange(path).then((changed) => {
				if (changed) this.refreshOpenViews("vault");
			});
			return;
		}
		if (this.layoutStore.isLayoutPath(path)) {
			void this.layoutStore.onExternalChange(path).then((changed) => {
				if (changed) {
					applyLayout(this.settings, this.layoutStore.get());
					void this.saveData_();
					this.rebuildOpenViews();
				}
			});
			return;
		}
		if (this.aiCreds.isCredsPath(path)) {
			void this.aiCreds.onExternalChange(path).then((changed) => {
				if (changed) {
					this.settings.aiApiKey = this.aiCreds.getApiKey();
					const base = this.aiCreds.getBaseUrl();
					if (base) this.settings.aiBaseUrl = base;
					this.refreshOpenViews("vault");
				}
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

	// ------------------------------------------------------- local events

	/** The dashboard-only local events, read live from the synced Markdown file. */
	get localEvents(): LocalEvent[] {
		return this.localEventsStore.getEvents();
	}

	async addLocalEvent(ev: Omit<LocalEvent, "id">): Promise<void> {
		await this.localEventsStore.add(ev);
		this.refreshOpenViews("vault");
	}

	async updateLocalEvent(id: string, patch: Omit<LocalEvent, "id">): Promise<void> {
		await this.localEventsStore.update(id, patch);
		this.refreshOpenViews("vault");
	}

	async removeLocalEvent(id: string): Promise<void> {
		await this.localEventsStore.remove(id);
		this.refreshOpenViews("vault");
	}

	// ------------------------------------------------------- weekly goals

	weeklyGoalsFor(weekKey: string): WeeklyGoal[] {
		return this.data.weeklyGoals[weekKey] ?? [];
	}

	async addWeeklyGoal(weekKey: string, text: string): Promise<void> {
		const trimmed = text.trim();
		if (!trimmed) return;
		const list = this.data.weeklyGoals[weekKey] ?? (this.data.weeklyGoals[weekKey] = []);
		list.push({ id: localId(), text: trimmed });
		await this.saveData_();
	}

	async removeWeeklyGoal(weekKey: string, id: string): Promise<void> {
		const list = this.data.weeklyGoals[weekKey];
		if (!list) return;
		this.data.weeklyGoals[weekKey] = list.filter((g) => g.id !== id);
		if (this.data.weeklyGoals[weekKey].length === 0) delete this.data.weeklyGoals[weekKey];
		await this.saveData_();
	}

	// ------------------------------------------------------- daily brief cache

	getBriefDate(): string {
		return this.data.briefDate ?? "";
	}

	getBriefText(): string {
		return this.data.briefText ?? "";
	}

	async setBrief(date: string, text: string): Promise<void> {
		this.data.briefDate = date;
		this.data.briefText = text;
		await this.saveData_();
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

	/** Re-arm a one-shot timer for just after local midnight, so "today" rolls
	 * over on a dashboard left open overnight. */
	private scheduleMidnight(): void {
		if (this.midnightTimer !== null) window.clearTimeout(this.midnightTimer);
		const msToMidnight = moment().endOf("day").valueOf() - Date.now() + 2000;
		this.midnightTimer = window.setTimeout(() => {
			this.midnightTimer = null;
			this.refreshOpenViews("vault");
			this.scheduleMidnight();
		}, Math.max(1000, msToMidnight));
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

function localId(): string {
	const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
	if (c?.randomUUID) return c.randomUUID();
	return "g-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
