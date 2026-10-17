import { App, PluginSettingTab, Setting } from "obsidian";
import type DailyDashPlugin from "./main";
import { TodoItem } from "dash-core";
import type { DashLayout } from "dash-core";
import { DEFAULT_OFF, PANEL_DESCRIPTIONS, PANEL_ORDER, PANEL_TITLES } from "./panels/registry";
import { THEMES, DEFAULT_THEME, isThemeId } from "./core/themes";

export interface CalendarLink {
	label: string;
	url: string;
	/** Whether this calendar feeds the "what's next" countdown. It still shows on
	 * the agenda regardless. Undefined counts as included. */
	countdown?: boolean;
	/** Optional swatch colour (hex). Undefined uses the theme's colour for this
	 * calendar's position. */
	color?: string;
}

/** A mobile dashboard tab: a named group of panels. */
export interface DashTab {
	id: string;
	name: string;
}

export interface PlaceLink {
	label: string;
	/** A note/base link target (e.g. "Knowledge base") or a command id (when
	 * `type` is "command"). */
	target: string;
	type: "note" | "command";
}

export interface DashSettings {
	/** Active theme id (see core/themes.ts). */
	theme: string;
	openOnStartup: boolean;
	/** Replace the empty New Tab page with the dashboard. */
	replaceNewTab: boolean;
	panelOrder: string[];
	enabledPanels: Record<string, boolean>;
	/** Per-panel desktop grid column (1..3). Absent/1 = default. A phone always
	 * stacks panels in `panelOrder`. */
	panelColumns: Record<string, number>;
	/** Per-panel desktop column span (1..3). Absent/1 = single column. */
	panelSpans: Record<string, number>;
	/** Mobile-only tabbed layout: when on AND at least one tab exists, the phone
	 * shows a tab bar and only the active tab's panels. Desktop is unaffected. */
	mobileTabs: boolean;
	tabs: DashTab[];
	/** panelId → tabId. Unassigned panels fall into the default tab. */
	tabAssignments: Record<string, string>;
	/** Tab shown when the dashboard opens; falls back to the first tab. */
	defaultTabId: string | null;
	/** Markdown file the layout (tabs, order, columns) is mirrored to, so it syncs
	 * across devices and survives plugin updates. Authoritative on load. */
	layoutPath: string;
	/** Clock: false = 12-hour with a separator (2:32 PM); true = 24-hour. */
	clock24h: boolean;
	agendaRefreshMinutes: number;
	/** Fixed height of the agenda's internal scroll area, in pixels. */
	agendaHeight: number;
	/** Up to 20 public ICS (.ics) calendar share links. */
	agendaUrls: CalendarLink[];
	/** Folders the knowledge-base search is scoped to (two roots by default). */
	kbSearchPaths: string[];
	/** Knowledge Base library — root + subfolders + category list heading, for
	 * the note/category management on the Search card. */
	kbRootPath: string;
	kbNotesSubfolder: string;
	kbCategoriesSubfolder: string;
	kbArchiveSubfolder: string;
	kbListHeading: string;
	/** Second Brain (ongoing-project) folder + archive subfolder. */
	secondBrainPath: string;
	secondBrainArchiveSubfolder: string;
	/** Vault path of the Bases file the Calendar card's button opens (created on
	 * demand if missing). */
	calendarBasePath: string;
	places: PlaceLink[];
	/** Vault file the persistent to-do list lives in (Markdown, so it syncs). */
	directivesPath: string;
	/** Vault file the dashboard-only local events live in (Markdown, so they sync
	 * across devices — same rationale as directivesPath). */
	localEventsPath: string;
	/** Where completed to-dos are archived in today's note. */
	completedTasksMarker: string;
	completedTasksHeading: string;
	/** Markdown note the shopping lists live in (JSON inside, app-managed). */
	shoppingPath: string;
	/** Markdown note the Quote of the Day collection lives in (app-managed). */
	quotesPath: string;

	// ---- Daily brief (optional AI module) — off until a key is added.
	aiProvider: "anthropic" | "openai";
	/** The API key. Kept in data.json and mirrored to a synced Markdown file
	 * (aiCredentialsPath) so it reaches the other devices; that file wins on load. */
	aiApiKey: string;
	/** Base URL for an OpenAI-compatible provider (ignored for Anthropic). */
	aiBaseUrl: string;
	aiCredentialsPath: string;
	aiModel: string;
	aiDailyBriefEnabled: boolean;
	/** The reader's name and pronouns, so the brief addresses them correctly. */
	aiUserName: string;
	aiUserPronouns: string;
	/** Free-text context the brief should keep in mind. */
	aiAboutMe: string;
	/** Per-category privacy gates — an unchecked category never leaves the device. */
	aiBriefIncludeSchedule: boolean;
	aiBriefIncludeTasks: boolean;
	aiBriefIncludePeople: boolean;
	/** Daily-note heading the end-of-day summary is written under. */
	aiEndOfDayHeading: string;
}

export interface WeeklyGoal {
	id: string;
	text: string;
}

export interface DashData {
	settings: DashSettings;
	/** Legacy home of the list; kept only for one-time migration. */
	todos: TodoItem[];
	seeded: boolean;
	/** Per-URL last successful ICS fetch (offline cache). */
	agendaCache: Record<string, { text: string; fetchedAt: number }>;
	/** Weekly goals, keyed by the week-start date (YYYY-MM-DD). */
	weeklyGoals: Record<string, WeeklyGoal[]>;
	/** Has this DEVICE ever read the to-do file? Guards against a sync-lagged
	 * cold start writing over the real file before it arrives. */
	directivesFileSeen?: boolean;
	/** Per-device backup of the last non-empty to-do list, used to heal the file
	 * if it's ever found empty. */
	directivesBackup?: TodoItem[];
	/** Cached daily brief (date + text), re-shown until a new day / refresh. */
	briefDate?: string;
	briefText?: string;
	/** Panel ids this install has already been offered, so a module added in an
	 * update is placed (and switched on/off by its default) exactly once. */
	knownPanels?: string[];
}

export const DEFAULT_SETTINGS: DashSettings = {
	theme: DEFAULT_THEME,
	openOnStartup: false,
	replaceNewTab: false,
	panelOrder: [...PANEL_ORDER],
	enabledPanels: Object.fromEntries(PANEL_ORDER.map((id) => [id, !DEFAULT_OFF.has(id)])),
	panelColumns: {},
	panelSpans: {},
	mobileTabs: true,
	tabs: [],
	tabAssignments: {},
	defaultTabId: null,
	layoutPath: "Daily Dashboard/Dashboard Layout.md",
	clock24h: false,
	agendaRefreshMinutes: 30,
	agendaHeight: 320,
	agendaUrls: [],
	kbSearchPaths: ["Knowledge base/Notes", "Second brain"],
	kbRootPath: "Knowledge base",
	kbNotesSubfolder: "Notes",
	kbCategoriesSubfolder: "Categories",
	kbArchiveSubfolder: "Archive",
	kbListHeading: "Notes",
	secondBrainPath: "Second brain",
	secondBrainArchiveSubfolder: "Archive",
	calendarBasePath: "Logs/Daily notes.base",
	places: [
		{ label: "Knowledge base", target: "Knowledge base", type: "note" },
		{ label: "Second brain", target: "Second brain", type: "note" },
		{ label: "Today's note", target: "daily-notes", type: "command" },
		{ label: "Recipe index", target: "recipe-manager:recipe-index", type: "command" },
	],
	directivesPath: "Daily Dashboard/To-dos.md",
	localEventsPath: "Daily Dashboard/Local Events.md",
	completedTasksMarker: "",
	completedTasksHeading: "Completed tasks",
	shoppingPath: "Daily Dashboard/Shopping.md",
	quotesPath: "Daily Dashboard/Quotes.md",
	aiProvider: "anthropic",
	aiApiKey: "",
	aiBaseUrl: "https://api.openai.com/v1",
	aiCredentialsPath: "Daily Dashboard/AI Credentials.md",
	aiModel: "claude-opus-5-5",
	aiDailyBriefEnabled: false,
	aiUserName: "",
	aiUserPronouns: "",
	aiAboutMe: "",
	aiBriefIncludeSchedule: true,
	aiBriefIncludeTasks: true,
	aiBriefIncludePeople: true,
	aiEndOfDayHeading: "End of day",
};

// The places default stores command targets with the `cmd:` prefix inline so the
// same "Label | target" text format round-trips; normalize on load.
function normalizePlace(p: PlaceLink): PlaceLink {
	if (p.type === "note" && p.target.startsWith("cmd:")) {
		return { label: p.label, target: p.target.slice(4), type: "command" };
	}
	return { ...p };
}

export function mergeSettings(loaded: Partial<DashSettings> | undefined): DashSettings {
	const s: DashSettings = { ...DEFAULT_SETTINGS, ...(loaded ?? {}) };
	if (!isThemeId(s.theme)) s.theme = DEFAULT_THEME;
	// Keep panel order/enable maps whole even as panels are added in future versions.
	const order = (loaded?.panelOrder ?? []).filter((id) => PANEL_ORDER.includes(id));
	for (const id of PANEL_ORDER) if (!order.includes(id)) order.push(id);
	s.panelOrder = order;
	s.enabledPanels = { ...DEFAULT_SETTINGS.enabledPanels, ...(loaded?.enabledPanels ?? {}) };
	s.panelColumns = pickKnown(loaded?.panelColumns);
	s.panelSpans = pickKnown(loaded?.panelSpans);
	// Don't share default array/object instances.
	s.agendaUrls = (loaded?.agendaUrls ?? DEFAULT_SETTINGS.agendaUrls).map((c) => ({ ...c }));
	s.kbSearchPaths = (loaded?.kbSearchPaths ?? DEFAULT_SETTINGS.kbSearchPaths).slice();
	s.places = (loaded?.places ?? DEFAULT_SETTINGS.places).map(normalizePlace);
	s.tabs = [];
	s.tabAssignments = {};
	s.defaultTabId = null;
	applyTabs(s, loaded?.tabs ?? [], loaded?.tabAssignments ?? {}, loaded?.defaultTabId);
	return s;
}

/** Copy a saved panel→number map, dropping unknown panel ids. */
function pickKnown(map: Record<string, number> | undefined): Record<string, number> {
	const out: Record<string, number> = {};
	for (const id of PANEL_ORDER) {
		const v = map?.[id];
		if (typeof v === "number" && Number.isFinite(v)) out[id] = v;
	}
	return out;
}

/** Validate and apply tabs + assignments + default tab onto live settings. */
function applyTabs(
	s: DashSettings,
	tabs: DashTab[],
	assignments: Record<string, string>,
	defaultTabId: string | null | undefined
): void {
	s.tabs = tabs.filter((t) => t && typeof t.id === "string" && typeof t.name === "string").map((t) => ({ id: t.id, name: t.name }));
	const tabIds = new Set(s.tabs.map((t) => t.id));
	s.tabAssignments = {};
	for (const [pid, tid] of Object.entries(assignments)) {
		if (PANEL_ORDER.includes(pid) && tabIds.has(tid)) s.tabAssignments[pid] = tid;
	}
	s.defaultTabId = defaultTabId && tabIds.has(defaultTabId) ? defaultTabId : s.tabs[0]?.id ?? null;
}

/** The layout cluster mirrored to the synced Markdown layout file. */
export function layoutFromSettings(s: DashSettings): DashLayout {
	return {
		mobileTabs: s.mobileTabs,
		tabs: s.tabs.map((t) => ({ id: t.id, name: t.name })),
		tabAssignments: { ...s.tabAssignments },
		defaultTabId: s.defaultTabId,
		panelOrder: [...s.panelOrder],
		enabledPanels: { ...s.enabledPanels },
		panelColumns: { ...s.panelColumns },
		panelSpans: { ...s.panelSpans },
	};
}

/** Apply a layout loaded from the synced file onto live settings, re-validating
 * against the current panel set so a file from another version can't corrupt
 * it. Only fields present in the layout are touched. */
export function applyLayout(s: DashSettings, layout: DashLayout): DashSettings {
	if (typeof layout.mobileTabs === "boolean") s.mobileTabs = layout.mobileTabs;
	applyTabs(
		s,
		layout.tabs ?? s.tabs,
		layout.tabAssignments ?? s.tabAssignments,
		layout.defaultTabId !== undefined ? layout.defaultTabId : s.defaultTabId
	);
	if (layout.panelOrder) {
		const order = layout.panelOrder.filter((id) => PANEL_ORDER.includes(id));
		for (const id of PANEL_ORDER) if (!order.includes(id)) order.push(id);
		s.panelOrder = order;
	}
	if (layout.enabledPanels) s.enabledPanels = { ...DEFAULT_SETTINGS.enabledPanels, ...layout.enabledPanels };
	if (layout.panelColumns) s.panelColumns = pickKnown(layout.panelColumns);
	if (layout.panelSpans) s.panelSpans = pickKnown(layout.panelSpans);
	return s;
}

export class DashSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: DailyDashPlugin) {
		super(app, plugin);
	}

	private async save(): Promise<void> {
		await this.plugin.saveData_();
		this.plugin.refreshOpenViews();
	}

	/** Persist and re-mount open views — for panel enable/reorder changes. */
	private async saveLayout(): Promise<void> {
		await this.plugin.persistLayout();
		this.plugin.rebuildOpenViews();
	}

	display(): void {
		const { containerEl } = this;
		const s = this.plugin.settings;
		containerEl.empty();

		// -------- appearance / theme --------
		new Setting(containerEl).setName("Appearance").setHeading();
		new Setting(containerEl)
			.setName("Theme")
			.setDesc(`${this.themeBlurb(s.theme)} Each theme follows your Obsidian light/dark setting automatically.`)
			.addDropdown((dd) => {
				for (const t of THEMES) dd.addOption(t.id, t.label);
				dd.setValue(s.theme).onChange(async (v) => {
					s.theme = isThemeId(v) ? v : DEFAULT_THEME;
					await this.plugin.saveData_();
					this.plugin.applyThemeToViews();
					this.display(); // refresh the blurb
				});
			});

		new Setting(containerEl)
			.setName("Open on startup")
			.setDesc("Open the dashboard automatically when Obsidian starts.")
			.addToggle((t) =>
				t.setValue(s.openOnStartup).onChange(async (v) => {
					s.openOnStartup = v;
					await this.save();
				})
			);

		new Setting(containerEl)
			.setName("Use as the New Tab page")
			.setDesc("Turn every empty New Tab into the dashboard, so it becomes your landing view.")
			.addToggle((t) =>
				t.setValue(s.replaceNewTab).onChange(async (v) => {
					s.replaceNewTab = v;
					await this.save();
					if (v) this.plugin.replaceActiveEmptyLeaf();
				})
			);

		new Setting(containerEl)
			.setName("24-hour clock")
			.setDesc("Off shows the time as 2:32 PM. On shows it as 14:32.")
			.addToggle((t) =>
				t.setValue(s.clock24h).onChange(async (v) => {
					s.clock24h = v;
					await this.save();
				})
			);

		// -------- panels: enable + reorder + desktop grid + mobile tab --------
		new Setting(containerEl)
			.setName("Panels")
			.setDesc(
				"Every panel is a separate module — turn on only the ones you want, and reorder them. On the desktop you can also put each panel in a column (1–3) and give it a span; leave everything at column 1 for the default packed layout. A phone always stacks panels in this order."
			)
			.setHeading();

		const list = containerEl.createDiv({ cls: "dash-settings-panel-list" });
		const renderList = () => {
			list.empty();
			s.panelOrder.forEach((id, index) => {
				const row = new Setting(list).setName(PANEL_TITLES[id] ?? id).setDesc(PANEL_DESCRIPTIONS[id] ?? "");
				row.addExtraButton((b) =>
					b
						.setIcon("arrow-up")
						.setTooltip("Move up")
						.setDisabled(index === 0)
						.onClick(async () => {
							[s.panelOrder[index - 1], s.panelOrder[index]] = [s.panelOrder[index], s.panelOrder[index - 1]];
							await this.saveLayout();
							renderList();
						})
				);
				row.addExtraButton((b) =>
					b
						.setIcon("arrow-down")
						.setTooltip("Move down")
						.setDisabled(index === s.panelOrder.length - 1)
						.onClick(async () => {
							[s.panelOrder[index + 1], s.panelOrder[index]] = [s.panelOrder[index], s.panelOrder[index + 1]];
							await this.saveLayout();
							renderList();
						})
				);
				row.addDropdown((dd) => {
					dd.addOptions({ "1": "Col 1", "2": "Col 2", "3": "Col 3" });
					dd.setValue(String(s.panelColumns[id] ?? 1)).onChange(async (v) => {
						s.panelColumns[id] = Number(v);
						await this.saveLayout();
					});
				});
				row.addDropdown((dd) => {
					dd.addOptions({ "1": "Span 1", "2": "Span 2", "3": "Span 3" });
					dd.setValue(String(s.panelSpans[id] ?? 1)).onChange(async (v) => {
						s.panelSpans[id] = Number(v);
						await this.saveLayout();
					});
				});
				// Which mobile tab this panel belongs to (only when tabs exist).
				if (s.tabs.length > 0) {
					row.addDropdown((dd) => {
						dd.addOption("", "▸ Default tab");
						for (const tab of s.tabs) dd.addOption(tab.id, tab.name);
						dd.setValue(s.tabAssignments[id] ?? "").onChange(async (v) => {
							if (v) s.tabAssignments[id] = v;
							else delete s.tabAssignments[id];
							await this.saveLayout();
						});
					});
				}
				row.addToggle((t) =>
					t.setValue(s.enabledPanels[id] !== false).onChange(async (v) => {
						s.enabledPanels[id] = v;
						await this.saveLayout();
					})
				);
			});
		};
		renderList();

		// -------- mobile tabs --------
		new Setting(containerEl)
			.setName("Phone tabs")
			.setDesc(
				"On a phone, group panels into tabs instead of one long scroll (the desktop always shows everything). Add tabs here, star the one that opens first, then pick a tab for each panel in the list above — panels without a tab go to the starred one."
			)
			.setHeading();

		new Setting(containerEl)
			.setName("Use tabs on a phone")
			.setDesc("When on and at least one tab exists, the phone dashboard shows a tab bar.")
			.addToggle((t) =>
				t.setValue(s.mobileTabs).onChange(async (v) => {
					s.mobileTabs = v;
					await this.saveLayout();
				})
			);

		const tabsList = containerEl.createDiv({ cls: "dash-settings-tab-list" });
		const renderTabs = () => {
			tabsList.empty();
			s.tabs.forEach((tab, i) => {
				const row = new Setting(tabsList);
				row.addText((txt) =>
					txt
						.setPlaceholder("Tab name")
						.setValue(tab.name)
						.onChange(async (v) => {
							tab.name = v;
							await this.saveLayout();
						})
				);
				row.addExtraButton((b) =>
					b
						.setIcon(s.defaultTabId === tab.id ? "star" : "star-off")
						.setTooltip(s.defaultTabId === tab.id ? "Opens first" : "Open this tab first")
						.onClick(async () => {
							s.defaultTabId = tab.id;
							await this.saveLayout();
							renderTabs();
						})
				);
				row.addExtraButton((b) =>
					b
						.setIcon("arrow-up")
						.setTooltip("Move up")
						.setDisabled(i === 0)
						.onClick(async () => {
							[s.tabs[i - 1], s.tabs[i]] = [s.tabs[i], s.tabs[i - 1]];
							await this.saveLayout();
							renderTabs();
						})
				);
				row.addExtraButton((b) =>
					b
						.setIcon("arrow-down")
						.setTooltip("Move down")
						.setDisabled(i === s.tabs.length - 1)
						.onClick(async () => {
							[s.tabs[i + 1], s.tabs[i]] = [s.tabs[i], s.tabs[i + 1]];
							await this.saveLayout();
							renderTabs();
						})
				);
				row.addExtraButton((b) =>
					b
						.setIcon("trash-2")
						.setTooltip("Delete tab")
						.onClick(async () => {
							s.tabs.splice(i, 1);
							for (const k of Object.keys(s.tabAssignments)) if (s.tabAssignments[k] === tab.id) delete s.tabAssignments[k];
							if (s.defaultTabId === tab.id) s.defaultTabId = s.tabs[0]?.id ?? null;
							await this.saveLayout();
							this.display(); // the panel tab dropdowns depend on the tab set
						})
				);
			});
			new Setting(tabsList).addButton((b) =>
				b.setButtonText("+ Add tab").onClick(async () => {
					const id = `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
					s.tabs.push({ id, name: `Tab ${s.tabs.length + 1}` });
					if (!s.defaultTabId) s.defaultTabId = id;
					await this.saveLayout();
					this.display();
				})
			);
		};
		renderTabs();

		// -------- agenda --------
		new Setting(containerEl).setName("Today's agenda").setHeading();
		new Setting(containerEl)
			.setName("Refresh interval (minutes)")
			.setDesc("How often your calendars are re-fetched while the dashboard is open.")
			.addText((t) =>
				t.setValue(String(s.agendaRefreshMinutes)).onChange(async (v) => {
					const n = Number(v);
					if (Number.isFinite(n) && n > 0) {
						s.agendaRefreshMinutes = n;
						await this.save();
					}
				})
			);
		new Setting(containerEl)
			.setName("Agenda height (pixels)")
			.setDesc("The agenda scrolls inside a fixed height so it never takes over the screen. This sets that height.")
			.addText((t) =>
				t.setValue(String(s.agendaHeight)).onChange(async (v) => {
					const n = Number(v);
					if (Number.isFinite(n) && n >= 120) {
						s.agendaHeight = Math.round(n);
						await this.save();
					}
				})
			);
		new Setting(containerEl)
			.setName("Calendar share links")
			.setDesc("Up to 20 public Proton Calendar / ICS share links (.ics). Each has a label, its address, a colour (the circle-arrow resets it to the theme's), and a switch for whether it counts toward the “what's next” countdown at the top of the agenda.");
		const calList = containerEl.createDiv({ cls: "dash-settings-cal-list" });
		const renderCals = () => {
			calList.empty();
			s.agendaUrls.forEach((cal, i) => {
				const row = new Setting(calList).setName(`Calendar ${i + 1}`);
				row.addText((t) =>
					t.setPlaceholder("Label").setValue(cal.label).onChange(async (v) => {
						cal.label = v.trim() || "Calendar";
						await this.save();
					})
				);
				row.addText((t) => {
					t.setPlaceholder("https://…/basic.ics").setValue(cal.url).onChange(async (v) => {
						cal.url = v.trim();
						await this.save();
					});
					t.inputEl.classList.add("dash-settings-cal-url");
				});
				row.addColorPicker((cp) =>
					cp.setValue(cal.color ?? "#888888").onChange(async (v) => {
						cal.color = v;
						await this.save();
					})
				);
				row.addExtraButton((b) =>
					b
						.setIcon("rotate-ccw")
						.setTooltip("Use the theme's colour")
						.onClick(async () => {
							delete cal.color;
							await this.save();
							renderCals();
						})
				);
				row.addToggle((t) =>
					t
						.setTooltip("Count this calendar in “what's next”")
						.setValue(cal.countdown !== false)
						.onChange(async (v) => {
							cal.countdown = v;
							await this.save();
						})
				);
				row.addExtraButton((b) =>
					b
						.setIcon("trash")
						.setTooltip("Remove this calendar")
						.onClick(async () => {
							s.agendaUrls.splice(i, 1);
							await this.save();
							renderCals();
						})
				);
			});
			const addRow = new Setting(calList);
			addRow.addButton((b) =>
				b
					.setButtonText("+ Add calendar")
					.setDisabled(s.agendaUrls.length >= 20)
					.onClick(async () => {
						if (s.agendaUrls.length >= 20) return;
						s.agendaUrls.push({ label: "Calendar", url: "" });
						await this.save();
						renderCals();
					})
			);
		};
		renderCals();

		// -------- search --------
		new Setting(containerEl).setName("Search").setHeading();
		new Setting(containerEl)
			.setName("Folders to search")
			.setDesc("The knowledge-base search looks only inside these folders. One folder per line.")
			.addTextArea((t) => {
				t.setValue(s.kbSearchPaths.join("\n"));
				t.inputEl.rows = 3;
				t.onChange(async (v) => {
					const paths = v.split("\n").map((l) => l.trim()).filter(Boolean);
					s.kbSearchPaths = paths.length ? paths : [...DEFAULT_SETTINGS.kbSearchPaths];
					await this.save();
				});
			});
		this.addText(containerEl, "Knowledge base folder", "The folder the Search card creates notes and categories in.", s.kbRootPath, (v) => (s.kbRootPath = v || "Knowledge base"));
		this.addText(containerEl, "Notes subfolder", "Where new notes go, inside the knowledge-base folder.", s.kbNotesSubfolder, (v) => (s.kbNotesSubfolder = v), true);
		this.addText(containerEl, "Categories subfolder", "Where category notes go, inside the knowledge-base folder.", s.kbCategoriesSubfolder, (v) => (s.kbCategoriesSubfolder = v || "Categories"));
		this.addText(containerEl, "Category list heading", "The heading in a category note under which its notes are listed.", s.kbListHeading, (v) => (s.kbListHeading = v || "Notes"));

		// -------- calendar --------
		new Setting(containerEl).setName("Calendar").setHeading();
		this.addText(
			containerEl,
			"Daily-notes base file",
			"The Bases (.base) file the Calendar card's button opens. It's created for you the first time you press the button if it doesn't exist yet.",
			s.calendarBasePath,
			(v) => (s.calendarBasePath = v || "Logs/Daily notes.base")
		);

		// -------- second brain --------
		new Setting(containerEl).setName("Second brain").setHeading();
		this.addText(containerEl, "Second brain folder", "The ongoing-project folder the Second brain panel manages.", s.secondBrainPath, (v) => (s.secondBrainPath = v || "Second brain"));
		this.addText(containerEl, "Archive subfolder", "Where a completed project is moved, inside the Second brain folder.", s.secondBrainArchiveSubfolder, (v) => (s.secondBrainArchiveSubfolder = v || "Archive"));

		// -------- places --------
		new Setting(containerEl).setName("Places / navigation").setHeading();
		new Setting(containerEl)
			.setName("Destinations")
			.setDesc("One per line as `Label | target`. A target is a note or folder name (e.g. `Knowledge base`) or, prefixed with `cmd:`, a command id (e.g. `cmd:recipe-manager:recipe-index`).")
			.addTextArea((t) => {
				t.setValue(
					s.places.map((p) => `${p.label} | ${p.type === "command" ? "cmd:" + p.target : p.target}`).join("\n")
				);
				t.inputEl.rows = 6;
				t.onChange(async (v) => {
					s.places = v
						.split("\n")
						.map((line) => line.trim())
						.filter(Boolean)
						.map((line) => {
							const bar = line.indexOf("|");
							const label = bar === -1 ? line : line.slice(0, bar).trim();
							let target = bar === -1 ? line : line.slice(bar + 1).trim();
							const type: PlaceLink["type"] = target.startsWith("cmd:") ? "command" : "note";
							if (type === "command") target = target.slice(4).trim();
							return { label, target, type };
						});
					await this.save();
				});
			});

		// -------- to-do storage --------
		new Setting(containerEl).setName("To-dos").setHeading();
		this.addText(
			containerEl,
			"To-do list file",
			"The Markdown file your to-do list is saved in. Markdown always syncs via Obsidian Sync, so the list follows you across devices. Any extension you type becomes .md.",
			s.directivesPath,
			(v) => (s.directivesPath = v || "Daily Dashboard/To-dos.md")
		);
		this.addText(
			containerEl,
			"Local events file",
			"The Markdown file your dashboard-only agenda events are saved in. Markdown always syncs via Obsidian Sync, so events you add on one device show up on the others. Any extension you type becomes .md.",
			s.localEventsPath,
			(v) => (s.localEventsPath = v || "Daily Dashboard/Local Events.md")
		);
		this.addText(containerEl, "Completed-tasks heading", "Completed to-dos are logged under this heading in today's note.", s.completedTasksHeading, (v) => (s.completedTasksHeading = v || "Completed tasks"));
		this.addText(containerEl, "Completed-tasks marker", "Optional. If set, completed tasks go after this marker instead of the heading.", s.completedTasksMarker, (v) => (s.completedTasksMarker = v), true);
		this.addText(
			containerEl,
			"Layout file",
			"Your panel layout and phone tabs are also saved in this Markdown file, so they follow you across devices and survive plugin updates.",
			s.layoutPath,
			(v) => (s.layoutPath = v || "Daily Dashboard/Dashboard Layout.md")
		);

		// -------- shopping + quotes --------
		new Setting(containerEl).setName("Shopping & quotes").setHeading();
		this.addText(containerEl, "Shopping list file", "Where the Shopping panel saves your lists (managed for you — edit lists on the dashboard).", s.shoppingPath, (v) => (s.shoppingPath = v || "Daily Dashboard/Shopping.md"));
		this.addText(containerEl, "Quotes file", "Where the Quote of the Day panel saves your quotes (managed for you).", s.quotesPath, (v) => (s.quotesPath = v || "Daily Dashboard/Quotes.md"));

		this.renderBriefSettings(containerEl);
	}

	/** The optional AI daily-brief module. Nothing is sent anywhere until a key is
	 * added AND the brief is switched on. */
	private renderBriefSettings(containerEl: HTMLElement): void {
		const s = this.plugin.settings;
		new Setting(containerEl)
			.setName("Daily brief (optional)")
			.setDesc(
				"An AI-written morning summary of your day, plus an “End the day” recap written into your daily note. It uses your own API key and only sends the categories you allow below (“End the day” also sends what you wrote in today's journal). Also turn on the Daily Brief panel in the list above."
			)
			.setHeading();
		new Setting(containerEl)
			.setName("Turn on the daily brief")
			.addToggle((t) =>
				t.setValue(s.aiDailyBriefEnabled).onChange(async (v) => {
					s.aiDailyBriefEnabled = v;
					await this.save();
				})
			);
		new Setting(containerEl)
			.setName("Provider")
			.setDesc("Anthropic (Claude), or any OpenAI-compatible service.")
			.addDropdown((dd) => {
				dd.addOptions({ anthropic: "Anthropic (Claude)", openai: "OpenAI-compatible" });
				dd.setValue(s.aiProvider).onChange(async (v) => {
					s.aiProvider = v === "openai" ? "openai" : "anthropic";
					if (s.aiProvider === "openai" && s.aiModel.startsWith("claude")) s.aiModel = "gpt-4o-mini";
					if (s.aiProvider === "anthropic" && !s.aiModel.startsWith("claude")) s.aiModel = DEFAULT_SETTINGS.aiModel;
					await this.save();
					this.display();
				});
			});
		new Setting(containerEl)
			.setName("API key")
			.setDesc("Stored in this plugin's data and in the AI credentials file below so it reaches your other devices. Keep that file out of anything you share.")
			.addText((t) => {
				t.inputEl.type = "password";
				t.setPlaceholder("sk-…").setValue(s.aiApiKey).onChange(async (v) => {
					s.aiApiKey = v.trim();
					await this.plugin.persistAICreds();
					await this.save();
				});
			});
		if (s.aiProvider === "openai") {
			this.addText(containerEl, "Base URL", "The service's API address.", s.aiBaseUrl, (v) => {
				s.aiBaseUrl = v || DEFAULT_SETTINGS.aiBaseUrl;
				void this.plugin.persistAICreds();
			});
		}
		this.addText(containerEl, "Model", "The model to use. The default works well; change it only if you know you want another.", s.aiModel, (v) => (s.aiModel = v));
		this.addText(containerEl, "Your name", "So the brief can talk to you by name.", s.aiUserName, (v) => (s.aiUserName = v), true);
		this.addText(containerEl, "Your pronouns", "Optional, e.g. she/her.", s.aiUserPronouns, (v) => (s.aiUserPronouns = v), true);
		new Setting(containerEl)
			.setName("About you")
			.setDesc("Optional. Anything the brief should keep in mind.")
			.addTextArea((t) => {
				t.setValue(s.aiAboutMe);
				t.inputEl.rows = 3;
				t.onChange(async (v) => {
					s.aiAboutMe = v.trim();
					await this.save();
				});
			});
		const gates: Array<[string, "aiBriefIncludeSchedule" | "aiBriefIncludeTasks" | "aiBriefIncludePeople"]> = [
			["Send today's schedule", "aiBriefIncludeSchedule"],
			["Send your to-do list", "aiBriefIncludeTasks"],
			["Send who's due a catch-up (Contacts)", "aiBriefIncludePeople"],
		];
		for (const [label, key] of gates) {
			new Setting(containerEl).setName(label).addToggle((t) =>
				t.setValue(s[key]).onChange(async (v) => {
					s[key] = v;
					await this.save();
				})
			);
		}
		this.addText(containerEl, "End-of-day heading", "The heading in today's note the end-of-day recap is written under.", s.aiEndOfDayHeading, (v) => (s.aiEndOfDayHeading = v || "End of day"));
		this.addText(containerEl, "AI credentials file", "The Markdown file the API key is synced through.", s.aiCredentialsPath, (v) => (s.aiCredentialsPath = v || "Daily Dashboard/AI Credentials.md"));
	}

	private themeBlurb(id: string): string {
		return THEMES.find((t) => t.id === id)?.blurb ?? "";
	}

	private addText(
		el: HTMLElement,
		name: string,
		desc: string,
		value: string,
		set: (v: string) => void,
		allowEmpty = false
	): void {
		new Setting(el)
			.setName(name)
			.setDesc(desc)
			.addText((t) =>
				t.setValue(value).onChange(async (v) => {
					const trimmed = v.trim();
					if (!trimmed && !allowEmpty) return;
					set(trimmed);
					await this.save();
				})
			);
	}
}
