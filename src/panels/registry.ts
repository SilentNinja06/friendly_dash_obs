import { Panel } from "./types";
import { ClockPanel } from "./clock";
import { VersePanel } from "./verse";
import { TodoPanel } from "./todo";
import { AgendaPanel } from "./agenda";
import { JournalPanel } from "./journal";
import { MealsPanel } from "./meals";
import { SearchPanel } from "./search";
import { SecondBrainPanel } from "./secondbrain";
import { PlacesPanel } from "./places";

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
	secondbrain: "Second Brain",
	places: "Places",
};

type PanelFactory = () => Panel;

const FACTORIES: Record<string, PanelFactory> = {
	clock: () => new ClockPanel(),
	verse: () => new VersePanel(),
	todo: () => new TodoPanel(),
	agenda: () => new AgendaPanel(),
	journal: () => new JournalPanel(),
	meals: () => new MealsPanel(),
	search: () => new SearchPanel(),
	secondbrain: () => new SecondBrainPanel(),
	places: () => new PlacesPanel(),
};

/** Build the enabled panels in the configured order. */
export function createPanels(order: string[], enabled: Record<string, boolean>): Panel[] {
	const seen = new Set<string>();
	const panels: Panel[] = [];
	for (const id of order) {
		if (seen.has(id)) continue;
		seen.add(id);
		if (enabled[id] === false) continue;
		const factory = FACTORIES[id];
		if (factory) panels.push(factory());
	}
	return panels;
}
