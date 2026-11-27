import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateDailyWords, remapPanelIds } from "../core/panelmigrate";

// A 0.6.0 layout as it sits in data.json / the synced layout file (placeholder values).
const OLD = {
	panelOrder: ["brief", "clock", "verse", "todo", "agenda", "journal", "meals", "shopping", "actions", "contacts", "quote", "search", "calendar", "secondbrain", "places"],
	enabledPanels: { brief: false, verse: true, quote: false, contacts: false, places: true } as Record<string, boolean>,
	tabAssignments: { verse: "tab-a", quote: "tab-b", todo: "tab-a" } as Record<string, string>,
	panelColumns: { verse: 2, agenda: 3 } as Record<string, number>,
	panelSpans: { quote: 2 } as Record<string, number>,
};

test("verse and quote merge into Daily words at verse's position", () => {
	const r = remapPanelIds(OLD);
	assert.deepEqual(r.panelOrder, ["brief", "clock", "words", "todo", "agenda", "journal", "meals", "shopping", "actions", "contacts", "search", "calendar", "secondbrain", "places"]);
});

test("tab, column and span carry over; the first predecessor wins a clash", () => {
	const r = remapPanelIds(OLD);
	assert.equal(r.tabAssignments!.words, "tab-a");
	assert.equal(r.panelColumns!.words, 2);
	assert.equal(r.panelSpans!.words, 2);
	assert.equal(r.tabAssignments!.todo, "tab-a");
	assert.equal(r.panelColumns!.agenda, 3);
});

test("Daily words is on if either old panel was on", () => {
	assert.equal(remapPanelIds(OLD).enabledPanels!.words, true);
	const off = remapPanelIds({ ...OLD, enabledPanels: { verse: false, quote: false } as Record<string, boolean> });
	assert.equal(off.enabledPanels!.words, false);
});

test("nothing else is dropped or changed, and the input isn't mutated", () => {
	const before = JSON.stringify(OLD);
	const r = remapPanelIds(OLD);
	assert.equal(JSON.stringify(OLD), before);
	for (const id of ["brief", "places", "contacts", "meals"]) assert.ok(r.panelOrder!.includes(id), id);
	assert.equal(r.enabledPanels!.places, true);
	assert.equal(r.enabledPanels!.brief, false);
});

test("remapping twice changes nothing more (idempotent)", () => {
	const once = remapPanelIds(OLD);
	assert.deepEqual(remapPanelIds(once), once);
});

test("daily words: fresh install gets the quote; upgrades keep what they had", () => {
	assert.equal(migrateDailyWords(undefined), "quote");
	assert.equal(migrateDailyWords({ enabledPanels: {} }), "verse"); // verse was on by default
	assert.equal(migrateDailyWords({ enabledPanels: { verse: true, quote: true } }), "quote");
	assert.equal(migrateDailyWords({ enabledPanels: { verse: false, quote: false } }), "none");
	assert.equal(migrateDailyWords({ dailyWords: "verse", enabledPanels: { quote: true } }), "verse");
});
