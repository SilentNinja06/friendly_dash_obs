import { Panel } from "./types";
import type DailyDashPlugin from "../main";
import { SearchPanel, SecondBrainPanel, PlacesPanel, JournalPanel, MealsPanel, WeekReviewModal } from "dash-core";
import { ClockPanel } from "./clock";
import { VersePanel } from "./verse";
import { TodoPanel } from "./todo";
import { AgendaPanel } from "./agenda";
import { CalendarPanel } from "./calendar";
import { ShoppingPanel } from "./shopping";
import { QuotePanel } from "./quote";
import { ActionsPanel } from "./actions";
import { ContactsPanel } from "./contacts";
import { BriefPanel } from "./brief";
import { friendlyWeekReviewConfig } from "../weekreview";
import {
	FRIENDLY_SEARCH_COPY,
	FRIENDLY_SECOND_BRAIN_COPY,
	FRIENDLY_CATEGORY_COPY,
	FRIENDLY_PLACES_COPY,
	FRIENDLY_JOURNAL_COPY,
	FRIENDLY_MEALS_COPY,
} from "../copy";

/** Registration order = default panel order. Every panel is a self-contained
 * module: toggleable, reorderable, placeable on the desktop grid and assignable
 * to a mobile tab in settings. Optional modules ship off (see DEFAULT_OFF). */
export const PANEL_ORDER: string[] = [
	"brief",
	"clock",
	"verse",
	"todo",
	"agenda",
	"journal",
	"meals",
	"shopping",
	"actions",
	"contacts",
	"quote",
	"search",
	"calendar",
	"secondbrain",
	"places",
];

export const PANEL_TITLES: Record<string, string> = {
	brief: "Daily Brief",
	clock: "Clock",
	verse: "Verse of the Day",
	todo: "To-do",
	agenda: "Today's Agenda",
	journal: "Journal",
	meals: "Meals",
	shopping: "Shopping",
	actions: "Quick Actions",
	contacts: "Contacts",
	quote: "Quote of the Day",
	search: "Search",
	calendar: "Calendar",
	secondbrain: "Second Brain",
	places: "Places",
};

/** One line per module for the settings list — what it does and what it needs. */
export const PANEL_DESCRIPTIONS: Record<string, string> = {
	brief: "An AI-written summary of your day. Optional — needs your own API key (see “Daily brief” below).",
	clock: "The time and date.",
	verse: "One verse of Proverbs a day (KJV).",
	todo: "Your persistent to-do list, with a weekly review.",
	agenda: "Today's calendar events, a “what's next” countdown, weekly goals and a printable week.",
	journal: "Writes into today's daily note.",
	meals: "Planned meals and groceries. Needs the Recipe Manager plugin.",
	shopping: "Shopping lists grouped by aisle, store and who's paying. Imports Recipe Manager grocery lists.",
	actions: "One-tap buttons for the dashboard and any companion plugins you have installed.",
	contacts: "Who's due for a catch-up. Needs the Simple Contact Manager plugin.",
	quote: "A quote a day from your own collection of things people have said.",
	search: "Search your notes; make notes and categories.",
	calendar: "A month grid of your daily notes, plus a search inside them.",
	secondbrain: "Your active projects.",
	places: "Shortcut buttons to favourite notes and commands.",
};

/** Optional modules that start switched off on a fresh install. */
export const DEFAULT_OFF = new Set(["brief", "contacts", "quote"]);

type PanelFactory = () => Panel;

/** Build the enabled panels in the configured order. Factories close over the
 * plugin so core panels can be constructed with the host stores/copy they need. */
export function createPanels(order: string[], enabled: Record<string, boolean>, plugin: DailyDashPlugin): Panel[] {
	const factories: Record<string, PanelFactory> = {
		brief: () => new BriefPanel(),
		clock: () => new ClockPanel(),
		verse: () => new VersePanel(),
		todo: () => new TodoPanel(() => new WeekReviewModal(plugin.app, friendlyWeekReviewConfig(plugin)).open()),
		agenda: () => new AgendaPanel(),
		journal: () => new JournalPanel(FRIENDLY_JOURNAL_COPY),
		meals: () => new MealsPanel(FRIENDLY_MEALS_COPY),
		shopping: () => new ShoppingPanel(),
		actions: () => new ActionsPanel(),
		contacts: () => new ContactsPanel(),
		quote: () => new QuotePanel(),
		search: () => new SearchPanel(plugin.knowledgeBase, FRIENDLY_SEARCH_COPY, FRIENDLY_CATEGORY_COPY),
		calendar: () => new CalendarPanel(),
		secondbrain: () => new SecondBrainPanel(plugin.secondBrain, FRIENDLY_SECOND_BRAIN_COPY),
		places: () => new PlacesPanel(FRIENDLY_PLACES_COPY),
	};

	const seen = new Set<string>();
	const panels: Panel[] = [];
	for (const id of order) {
		if (seen.has(id)) continue;
		seen.add(id);
		if (enabled[id] === false) continue;
		const factory = factories[id];
		if (factory) panels.push(factory());
	}
	return panels;
}
