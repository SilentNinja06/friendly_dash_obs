import { App, PluginSettingTab, Setting } from "obsidian";
import type DailyDashPlugin from "./main";
import { TodoItem } from "dash-core";
import { PANEL_ORDER, PANEL_TITLES } from "./panels/registry";
import { THEMES, DEFAULT_THEME, isThemeId } from "./core/themes";

export interface CalendarLink {
	label: string;
	url: string;
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
	/** Where completed to-dos are archived in today's note. */
	completedTasksMarker: string;
	completedTasksHeading: string;
}

export interface DashData {
	settings: DashSettings;
	/** Legacy home of the list; kept only for one-time migration. */
	todos: TodoItem[];
	seeded: boolean;
	/** Per-URL last successful ICS fetch (offline cache). */
	agendaCache: Record<string, { text: string; fetchedAt: number }>;
}

export const DEFAULT_SETTINGS: DashSettings = {
	theme: DEFAULT_THEME,
	openOnStartup: false,
	replaceNewTab: false,
	panelOrder: [...PANEL_ORDER],
	enabledPanels: Object.fromEntries(PANEL_ORDER.map((id) => [id, true])),
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
	completedTasksMarker: "",
	completedTasksHeading: "Completed tasks",
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
	// Don't share default array/object instances.
	s.agendaUrls = (loaded?.agendaUrls ?? DEFAULT_SETTINGS.agendaUrls).map((c) => ({ ...c }));
	s.kbSearchPaths = (loaded?.kbSearchPaths ?? DEFAULT_SETTINGS.kbSearchPaths).slice();
	s.places = (loaded?.places ?? DEFAULT_SETTINGS.places).map(normalizePlace);
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
		await this.plugin.saveData_();
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

		// -------- panels: enable + reorder --------
		new Setting(containerEl)
			.setName("Panels")
			.setDesc("Turn panels on or off, and reorder them. Everything is on by default; the layout stacks to one column on a phone and spreads to a grid on the desktop.")
			.setHeading();

		const list = containerEl.createDiv({ cls: "dash-settings-panel-list" });
		const renderList = () => {
			list.empty();
			s.panelOrder.forEach((id, index) => {
				const row = new Setting(list).setName(PANEL_TITLES[id] ?? id);
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
				row.addToggle((t) =>
					t.setValue(s.enabledPanels[id] !== false).onChange(async (v) => {
						s.enabledPanels[id] = v;
						await this.saveLayout();
					})
				);
			});
		};
		renderList();

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
			.setDesc("Up to 20 calendars. One per line, as `Label | https://…` (a public Proton Calendar / ICS share link). Today only — there is no month view.")
			.addTextArea((t) => {
				t.setValue(s.agendaUrls.map((c) => `${c.label} | ${c.url}`).join("\n"));
				t.inputEl.rows = 8;
				t.onChange(async (v) => {
					s.agendaUrls = v
						.split("\n")
						.map((line) => line.trim())
						.filter(Boolean)
						.slice(0, 20)
						.map((line) => {
							const bar = line.indexOf("|");
							if (bar === -1) return { label: "Calendar", url: line };
							return { label: line.slice(0, bar).trim() || "Calendar", url: line.slice(bar + 1).trim() };
						});
					await this.save();
				});
			});

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
		this.addText(containerEl, "Completed-tasks heading", "Completed to-dos are logged under this heading in today's note.", s.completedTasksHeading, (v) => (s.completedTasksHeading = v || "Completed tasks"));
		this.addText(containerEl, "Completed-tasks marker", "Optional. If set, completed tasks go after this marker instead of the heading.", s.completedTasksMarker, (v) => (s.completedTasksMarker = v), true);
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
