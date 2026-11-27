import { App, TFile } from "obsidian";
import { BasePanel, placard } from "../types";
import { runCompanionCommand } from "../../companions/registry";

const PLUGIN_ID = "meridian-music";
const STATUS: Record<string, string> = { spark: "Spark", sketch: "Sketch", "in-progress": "In progress", done: "Done" };

interface Work {
	file: TFile;
	title: string;
	status: string;
	modified: number;
}

/** Notes the Music plugin manages (frontmatter `music: work`), read-only. */
function works(app: App): Work[] {
	const out: Work[] = [];
	for (const f of app.vault.getMarkdownFiles()) {
		const fm = app.metadataCache.getFileCache(f)?.frontmatter as Record<string, unknown> | undefined;
		if (!fm || fm.music !== "work") continue;
		out.push({
			file: f,
			title: typeof fm.title === "string" && fm.title ? fm.title : f.basename,
			status: typeof fm.status === "string" ? fm.status : "spark",
			modified: f.stat.mtime,
		});
	}
	return out;
}

/** Music — songs still in progress, newest first. */
export class MusicPanel extends BasePanel {
	id = "music";
	title = "Music";

	protected renderBody(): void {
		const { app } = this.ctx;
		const head = placard(this.el, "Music");
		const tools = head.createDiv({ cls: "dash-qotd-tools" });
		tools.createEl("button", { cls: "dash-qotd-add", text: "＋", attr: { "aria-label": "Capture an idea" } }).addEventListener("click", () => runCompanionCommand(app, `${PLUGIN_ID}:capture`));
		tools.createEl("button", { cls: "dash-qotd-add", text: "↗", attr: { "aria-label": "Open the catalog" } }).addEventListener("click", () => runCompanionCommand(app, `${PLUGIN_ID}:open-catalog`));

		const open = works(app).filter((w) => w.status !== "done").sort((a, b) => b.modified - a.modified);
		const card = this.el.createDiv({ cls: "cmp-card" });
		if (!open.length) {
			card.createDiv({ cls: "dash-muted", text: "Nothing in progress. Capture an idea whenever one turns up." });
		} else {
			card.createDiv({ cls: "cmp-line", text: `${open.length} song${open.length === 1 ? "" : "s"} in progress` });
			for (const w of open.slice(0, 4)) {
				const row = card.createDiv({ cls: "cmp-row" });
				row.createSpan({ cls: "cmp-row-title", text: w.title });
				row.createSpan({ cls: "cmp-tag", text: STATUS[w.status] ?? w.status });
				row.addEventListener("click", () => void app.workspace.getLeaf(false).openFile(w.file));
			}
		}
		card.createDiv({ cls: "dash-btn-row" })
			.createEl("button", { cls: "dash-btn", text: "Capture an idea" })
			.addEventListener("click", () => runCompanionCommand(app, `${PLUGIN_ID}:capture`));
	}
}
