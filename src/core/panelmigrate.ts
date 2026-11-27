/**
 * Pure (Obsidian-free) layout migration helpers, so they can be unit-tested.
 * Data-safety rule: remap known ids BEFORE filtering unknown ones, so a rename
 * never silently drops a panel's position, tab, column or on/off state.
 */

/** Ids replaced by another panel. Saved layouts are remapped BEFORE unknown ids
 * are dropped, so position, tab, column and on/off carry to the successor. */
export const PANEL_SUCCESSORS: Record<string, string> = {
	verse: "words",
	quote: "words",
};

/** Map retired/merged panel ids to their successors in every saved panel map.
 * The successor is on if either was on; it keeps its own position/tab/column if
 * it has one, otherwise inherits the first predecessor's. Never drops anything else. */
export function remapPanelIds<T extends { panelOrder?: string[]; enabledPanels?: Record<string, boolean>; tabAssignments?: Record<string, string>; panelColumns?: Record<string, number>; panelSpans?: Record<string, number> }>(l: T): T {
	const out: T = { ...l };
	const succ = (id: string) => PANEL_SUCCESSORS[id] ?? id;
	if (Array.isArray(l.panelOrder)) {
		const seen = new Set<string>();
		out.panelOrder = l.panelOrder.map(succ).filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
	}
	const inherit = <V>(map: Record<string, V> | undefined, combine?: (a: V, b: V) => V): Record<string, V> | undefined => {
		if (!map) return map;
		const m = { ...map };
		for (const [old, next] of Object.entries(PANEL_SUCCESSORS)) {
			if (!(old in map)) continue;
			if (!(next in m)) m[next] = map[old];
			else if (combine) m[next] = combine(m[next], map[old]);
		}
		return m;
	};
	out.enabledPanels = inherit(l.enabledPanels, (a, b) => a || b);
	out.tabAssignments = inherit(l.tabAssignments);
	out.panelColumns = inherit(l.panelColumns);
	out.panelSpans = inherit(l.panelSpans);
	return out;
}


/** What the Daily words panel should show for an install meeting the setting
 * for the first time: what it had switched on before (Quote over Verse if both
 * were on). A fresh install gets the Quote of the day. */
export function migrateDailyWords(loaded: { dailyWords?: unknown; enabledPanels?: Record<string, boolean> } | undefined): "quote" | "verse" | "none" {
	const v = loaded?.dailyWords;
	if (v === "quote" || v === "verse" || v === "none") return v;
	if (!loaded) return "quote";
	const en = loaded.enabledPanels ?? {};
	if (en.quote === true) return "quote";
	if (en.verse !== false) return "verse"; // Verse was on by default before 0.7.0
	return "none";
}
