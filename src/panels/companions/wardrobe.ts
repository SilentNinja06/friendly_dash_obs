import { App, TFile } from "obsidian";
import { tryParseList } from "dash-core";
import { BasePanel, placard } from "../types";
import { runCompanionCommand } from "../../companions/registry";

const CLOTHING = "Wardrobe/Clothing.md";
const OUTFITS = "Wardrobe/Outfits.md";
const SCHEDULE = "Wardrobe/Outfit Schedule.md";

interface Unit {
	washState?: string;
	condition?: string;
	retired?: boolean;
}
interface Item {
	id: string;
	units?: Unit[];
}
interface Outfit {
	id: string;
	name?: string;
	retired?: boolean;
}
interface Scheduled {
	id: string;
	date?: string;
	outfitId?: string;
	note?: string;
}

async function readList<T extends { id: string }>(app: App, path: string): Promise<T[]> {
	const f = app.vault.getAbstractFileByPath(path);
	if (!(f instanceof TFile)) return [];
	try {
		return tryParseList<T>(await app.vault.read(f)).records;
	} catch {
		return [];
	}
}

export function laundry(items: Item[]): { toWash: number; replace: number } {
	let toWash = 0;
	let replace = 0;
	for (const it of items) {
		for (const u of it.units ?? []) {
			if (u.retired) continue;
			if (u.washState === "dirty" || u.washState === "in-laundry") toWash++;
			if (u.condition === "needs-replacement") replace++;
		}
	}
	return { toWash, replace };
}

function todayISO(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Wardrobe — laundry, replacements and today's outfit. Read-only. */
export class WardrobePanel extends BasePanel {
	id = "wardrobe";
	title = "Wardrobe";

	protected async renderBody(): Promise<void> {
		const { app } = this.ctx;
		const open = () => runCompanionCommand(app, "meridian-wardrobe:open-wardrobe");
		const head = placard(this.el, "Wardrobe");
		head.createDiv({ cls: "dash-qotd-tools" }).createEl("button", { cls: "dash-qotd-add", text: "↗", attr: { "aria-label": "Open Wardrobe" } }).addEventListener("click", open);

		const items = (await readList<Item>(app, CLOTHING)).filter((i) => Array.isArray(i.units));
		const card = this.el.createDiv({ cls: "cmp-card" });
		if (!items.length) {
			card.createDiv({ cls: "dash-muted", text: "No clothes added yet." });
		} else {
			const l = laundry(items);
			const stats = card.createDiv({ cls: "cmp-stats" });
			const s1 = stats.createDiv({ cls: "cmp-stat" });
			s1.createDiv({ cls: "cmp-big", text: String(l.toWash) });
			s1.createDiv({ cls: "cmp-label", text: "to wash" });
			if (l.replace) {
				const s2 = stats.createDiv({ cls: "cmp-stat is-warn" });
				s2.createDiv({ cls: "cmp-big", text: String(l.replace) });
				s2.createDiv({ cls: "cmp-label", text: "to replace" });
			}
			const outfits = new Map((await readList<Outfit>(app, OUTFITS)).filter((o) => !o.retired).map((o) => [o.id, o] as const));
			const today = (await readList<Scheduled>(app, SCHEDULE)).find((s) => s.date === todayISO() && s.outfitId && outfits.has(s.outfitId));
			if (today) {
				const line = card.createDiv({ cls: "cmp-line" });
				line.createSpan({ cls: "dash-muted", text: "Today: " });
				line.createSpan({ text: outfits.get(today.outfitId!)?.name ?? "Outfit" });
				if (today.note) line.createSpan({ cls: "dash-muted", text: ` · ${today.note}` });
			}
		}
		card.createDiv({ cls: "dash-btn-row" }).createEl("button", { cls: "dash-btn", text: "Open Wardrobe" }).addEventListener("click", open);
	}
}
