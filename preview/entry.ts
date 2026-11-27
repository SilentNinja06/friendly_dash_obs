// @ts-nocheck
import { TFile, TFolder } from "obsidian";
import DailyDashPlugin from "../src/main";
import { DashView } from "../src/view";

const files = new Map<string, string>();
const today = new Date();
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
for (const n of [1, 2, 4, 5, 6, 9, 12]) { const d0 = new Date(today); d0.setDate(today.getDate() - n); files.set(`${ymd(d0)}.md`, "# Journal\nPlaceholder.\n"); }
files.set(`${ymd(today)}.md`, "# Brain dump\n\n# Journal\nA calm morning. Placeholder journal text.\n\n# Reference tomorrow\n");
files.set("Second brain/Garden redesign.md", "---\nstatus: active\n---\n");
files.set("Second brain/Learn piano.md", "");
files.set("Knowledge base/Notes/Sourdough.md", "");
files.set("Daily Dashboard/Quotes.md", '%% quotes %%\n\n```json\n{\n  "version": 1,\n  "records": [\n    {"id":"q1","text":"Done is better than perfect.","who":"A friend","date":"2026-01-02"}\n  ]\n}\n```\n');

function fileObj(path: string) {
	const f = new TFile(); f.path = path; f.name = path.split("/").pop()!; return f;
}
function folderObj(path: string) {
	const f = new TFolder(); f.path = path; f.name = path.split("/").pop()!;
	f.children = [...files.keys()].filter((p) => p.startsWith(path + "/") && !p.slice(path.length + 1).includes("/")).map(fileObj);
	return f;
}
const vault = {
	getName: () => "Preview",
	getAbstractFileByPath: (p: string) => (files.has(p) ? fileObj(p) : [...files.keys()].some((k) => k.startsWith(p + "/")) ? folderObj(p) : null),
	read: async (f) => files.get(f.path) ?? "",
	cachedRead: async (f) => files.get(f.path) ?? "",
	create: async (p, d) => { files.set(p, d); return fileObj(p); },
	modify: async (f, d) => { files.set(f.path, d); },
	process: async (f, fn) => { const n = fn(files.get(f.path) ?? ""); files.set(f.path, n); return n; },
	createFolder: async () => {},
	getMarkdownFiles: () => [...files.keys()].filter((p) => p.endsWith(".md")).map(fileObj),
	getFiles: () => [...files.keys()].map(fileObj),
	getRoot: () => folderObj(""),
	on: () => ({}),
	adapter: { exists: async () => false },
};
const params = new URLSearchParams(location.search);
const companions = params.get("companions") === "1";
const now = Date.now();
const app = {
	vault,
	metadataCache: { getFileCache: (f) => (f.path.startsWith("Second brain/") ? { frontmatter: { status: "active" } } : f.path.startsWith("Music/") ? { frontmatter: { music: "work", status: f.path.includes("Hook") ? "sketch" : "in-progress", title: f.path.includes("Hook") ? "Morning hook" : "Rainy Sunday" } } : {}), on: () => ({}), getFirstLinkpathDest: () => null },
	workspace: { onLayoutReady: (cb) => cb(), on: () => ({}), getLeaf: () => ({ openFile: async () => {} }), getLeavesOfType: () => [], revealLeaf: () => {}, activeLeaf: null, openLinkText: async () => {} },
	fileManager: { processFrontMatter: async () => {}, renameFile: async () => {} },
	commands: { commands: {}, executeCommandById: () => true },
	internalPlugins: { getPluginById: () => ({ enabled: true, instance: { options: { folder: "", format: "YYYY-MM-DD" } } }) },
	plugins: { enabledPlugins: new Set<string>(), plugins: {} as Record<string, unknown> },
	loadLocalStorage: () => null,
	saveLocalStorage: () => {},
};
if (companions) {
	files.set("Music/Rainy Sunday.md", ""); files.set("Music/Morning hook.md", "");
	const add = (id: string, p: unknown) => { app.plugins.enabledPlugins.add(id); app.plugins.plugins[id] = p; };
	add("brainstormer", { api: { version: 1, activeFlight: () => ({ from: { iata: "BLI", city: "Bellingham" }, to: { iata: "PHX", city: "Phoenix" }, task: "Finish the chapter draft", dueAt: now + 98 * 60000, remainingMs: 98 * 60000, progress: 0.4, paused: false, phase: "cruise" }), location: () => ({ iata: "PHX", city: "Phoenix" }), onChange: () => () => {}, openBook() {}, openDeck() {} } });
	add("meridian-meditations", { data: { sessions: [0, 1, 2, 4].map((d) => ({ date: new Date(now - d * 86400000).toISOString() })) } });
	add("meridian-music", {});
	add("treasury", {});
}
const plugin = new DailyDashPlugin(app, { id: "daily-dash", version: "dev" });
(async () => {
	await plugin.onload();
	if (params.get("theme")) plugin.settings.theme = params.get("theme");
	if (params.get("words")) plugin.settings.dailyWords = params.get("words");
	const leaf = { app };
	const view = new DashView(leaf, plugin);
	document.body.className = "theme-" + (params.get("mode") ?? "dark");
	document.body.appendChild(view.containerEl);
	await view.onOpen();
	document.body.dataset.ready = "1";
})().catch((e) => { console.error(e); document.body.dataset.ready = "1"; document.body.append("ERR " + e?.stack); });
