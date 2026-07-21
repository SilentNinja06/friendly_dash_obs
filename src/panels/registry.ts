import { Panel } from "./types";
import type DailyDashPlugin from "../main";
import { SearchPanel, SecondBrainPanel, PlacesPanel } from "dash-core";
import { ClockPanel } from "./clock";
import { VersePanel } from "./verse";
import { TodoPanel } from "./todo";
import { AgendaPanel } from "./agenda";
import { JournalPanel } from "./journal";
import { MealsPanel } from "./meals";
import { CalendarPanel } from "./calendar";
import {
	FRIENDLY_SEARCH_COPY,
	FRIENDLY_SECOND_BRAIN_COPY,
	FRIENDLY_CATEGORY_COPY,
	FRIENDLY_PLACES_COPY,
} from "../copy";

/** Registration order = default panel order. Everything ships enabled; the
 * layout is responsive (one column on a phone, a grid on the desktop), and every
 * panel is toggleable/reorderable in settings. */
export const PANEL_ORDER: string[] = [
	"clock",
	"verse",
	"todo",
	"agenda",
	"journal",
	"meals",
	"search",
	"calendar",
	"secondbrain",
	"places",
];

export const PANEL_TITLES: Record<string, string> = {
	clock: "Clock",
	verse: "Verse of the Day",
	todo: "To-do",
	agenda: "Today's Agenda",
	journal: "Journal",
	meals: "Meals",
	search: "Search",
	calendar: "Calendar",
	secondbrain: "Second Brain",
	places: "Places",
};

type PanelFactory = () => Panel;

/** Build the enabled panels in the configured order. Factories close over the
 * plugin so core panels can be constructed with the host stores/copy they need. */
export function createPanels(order: string[], enabled: Record<string, boolean>, plugin: DailyDashPlugin): Panel[] {
	const factories: Record<string, PanelFactory> = {
		clock: () => new ClockPanel(),
		verse: () => new VersePanel(),
		todo: () => new TodoPanel(),
		agenda: () => new AgendaPanel(),
		journal: () => new JournalPanel(),
		meals: () => new MealsPanel(),
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
