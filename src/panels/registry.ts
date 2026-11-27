import { Panel } from "./types";
import type DailyDashPlugin from "../main";
import { SearchPanel, SecondBrainPanel, PlacesPanel, JournalPanel, MealsPanel, WeekReviewModal } from "dash-core";
import { ClockPanel } from "./clock";
import { TodoPanel } from "./todo";
import { AgendaPanel } from "./agenda";
import { CalendarPanel } from "./calendar";
import { ShoppingPanel } from "./shopping";
import { ActionsPanel } from "./actions";
import { ContactsPanel } from "./contacts";
import { BriefPanel } from "./brief";
import { WordsPanel } from "./words";
import { FlightsPanel } from "./companions/flights";
import { DisciplinePanel } from "./companions/discipline";
import { MusicPanel } from "./companions/music";
import { WardrobePanel } from "./companions/wardrobe";
import { FoodPanel } from "./companions/food";
import { CommonsPanel } from "./companions/commons";
import { TreasuryPanel } from "./companions/treasury";
import { CompanionGate } from "../companions/gate";
import { COMPANION_BY_PANEL } from "../companions/registry";
import { friendlyWeekReviewConfig } from "../weekreview";
export { PANEL_SUCCESSORS, remapPanelIds } from "../core/panelmigrate";
import {
	FRIENDLY_SEARCH_COPY,
	FRIENDLY_SECOND_BRAIN_COPY,
	FRIENDLY_CATEGORY_COPY,
	FRIENDLY_PLACES_COPY,
	FRIENDLY_JOURNAL_COPY,
	FRIENDLY_MEALS_COPY,
} from "../copy";

/** The core dashboard, in default order. */
export const CORE_PANELS = ["brief", "clock", "words", "todo", "agenda", "journal", "calendar", "search", "secondbrain", "actions", "shopping"];

/** Cards for companion plugins — each appears only while its plugin is installed and on. */
export const COMPANION_PANELS = ["flights", "meals", "contacts", "discipline", "music", "wardrobe", "food", "commons", "treasury"];

/**
 * Retired modules (0.7.0): no longer offered on a fresh install, but kept working
 * — and listed in settings — for anyone who still has them switched on, so an
 * update never hides something you were using. Their data (your shortcuts) is
 * untouched either way.
 */
export const RETIRED_PANELS = ["places"];

/** Every panel id this version knows, in default order. Layout maps keep
 * entries for all of them. */
export const PANEL_ORDER: string[] = [...CORE_PANELS, ...COMPANION_PANELS, ...RETIRED_PANELS];

export const PANEL_TITLES: Record<string, string> = {
	clock: "Clock",
	words: "Daily words",
	todo: "To-do",
	agenda: "Today's Agenda",
	journal: "Journal",
	calendar: "Calendar",
	search: "Knowledge base",
	secondbrain: "Second Brain",
	actions: "Quick Actions",
	shopping: "Shopping",
	flights: "Flights",
	meals: "Meals",
	contacts: "Contacts",
	discipline: "Meditation",
	music: "Music",
	wardrobe: "Wardrobe",
	food: "Food log",
	commons: "Commons",
	treasury: "Budget",
	brief: "Daily Brief",
	places: "Places (retired)",
};

/** One line per module for the settings list — what it does and what it needs. */
export const PANEL_DESCRIPTIONS: Record<string, string> = {
	clock: "The time and date.",
	words: "A quote or a verse each day — choose which under “Daily words” below.",
	todo: "Your persistent to-do list, with a weekly review.",
	agenda: "Today's calendar events, a “what's next” countdown, weekly goals and a printable week.",
	journal: "Writes into today's daily note.",
	calendar: "A month grid of your daily notes, plus a search inside them.",
	search: "Search your notes; make notes and categories.",
	secondbrain: "Your active projects.",
	actions: "One-tap buttons for the dashboard and any companion plugins you have installed.",
	shopping: "Shopping lists grouped by aisle, store and who's paying. Imports Recipe Manager grocery lists.",
	brief: "An AI-written summary of your day. Off until you turn it on here and add your own API key under “Daily brief” below.",
	places: "No longer offered to new installs. Still works while it's on; turn it off and it leaves this list. Your shortcuts are kept.",
};

/** Off on a fresh install: the Daily Brief (needs your own API key) and the
 * retired modules. Companion cards default on — they only appear once their
 * plugin is installed. */
export const DEFAULT_OFF = new Set(["brief", ...RETIRED_PANELS]);

type PanelFactory = () => Panel;

/** Build the enabled panels in the configured order. Companion cards are wrapped
 * so they only exist while their plugin is installed and on. */
export function createPanels(order: string[], enabled: Record<string, boolean>, plugin: DailyDashPlugin): Panel[] {
	const factories: Record<string, PanelFactory> = {
		clock: () => new ClockPanel(),
		words: () => new WordsPanel(),
		todo: () => new TodoPanel(() => new WeekReviewModal(plugin.app, friendlyWeekReviewConfig(plugin)).open()),
		agenda: () => new AgendaPanel(),
		journal: () => new JournalPanel(FRIENDLY_JOURNAL_COPY),
		calendar: () => new CalendarPanel(),
		search: () => new SearchPanel(plugin.knowledgeBase, FRIENDLY_SEARCH_COPY, FRIENDLY_CATEGORY_COPY),
		secondbrain: () => new SecondBrainPanel(plugin.secondBrain, FRIENDLY_SECOND_BRAIN_COPY),
		actions: () => new ActionsPanel(),
		shopping: () => new ShoppingPanel(),
		flights: () => new FlightsPanel(),
		meals: () => new MealsPanel(FRIENDLY_MEALS_COPY),
		contacts: () => new ContactsPanel(),
		discipline: () => new DisciplinePanel(),
		music: () => new MusicPanel(),
		wardrobe: () => new WardrobePanel(),
		food: () => new FoodPanel(),
		commons: () => new CommonsPanel(),
		treasury: () => new TreasuryPanel(),
		brief: () => new BriefPanel(),
		places: () => new PlacesPanel(FRIENDLY_PLACES_COPY),
	};

	const seen = new Set<string>();
	const panels: Panel[] = [];
	for (const id of order) {
		if (seen.has(id)) continue;
		seen.add(id);
		if (enabled[id] === false) continue;
		const factory = factories[id];
		if (!factory) continue;
		const companion = COMPANION_BY_PANEL.get(id);
		panels.push(companion ? new CompanionGate(companion.pluginId, factory()) : factory());
	}
	return panels;
}
