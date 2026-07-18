import { moment } from "obsidian";
import { BasePanel, RefreshReason, placard } from "./types";
import {
	FieldSpec,
	headingField,
	readDailyField,
	readDailyNoteRaw,
	readField,
	writeDailyField,
} from "../core/dailynote";

/**
 * Journal / free-text panel (§5.4). Three editable fields, each an editor for a
 * section of today's daily note:
 *   - Brain dump         (`# Brain dump`)
 *   - Journal            (`# Journal`)
 *   - Reference tomorrow (`# Reference tomorrow`) — things to carry to the next day
 *
 * Yesterday's "Reference tomorrow" is shown read-only at the very top, so the
 * things put there for "the next day" greet you today. Debounced autosave
 * (~800ms); textareas grow. Writes go through the safe daily-note writer
 * (`vault.process`, or a live-editor reconcile if today's note is open
 * elsewhere). While a field is focused the whole dashboard stops refreshing, so
 * nothing jumps under the cursor.
 */
interface FieldDef {
	key: string;
	label: string;
	spec: FieldSpec;
}

const FIELDS: FieldDef[] = [
	{ key: "braindump", label: "Brain dump", spec: headingField("Brain dump") },
	{ key: "journal", label: "Journal", spec: headingField("Journal") },
	{ key: "reference", label: "Reference tomorrow", spec: headingField("Reference tomorrow") },
];

export class JournalPanel extends BasePanel {
	id = "journal";
	title = "Journal";
	private editing = false;

	async refresh(reason?: RefreshReason): Promise<void> {
		// Don't reload the text out from under the user mid-sentence.
		if (reason === "vault" && this.editing) return;
		if (this.el?.isConnected) {
			this.el.empty();
			await this.renderBody();
		}
	}

	protected async renderBody(): Promise<void> {
		placard(this.el, "Journal");
		await this.renderYesterdayReference();
		const wrap = this.el.createDiv({ cls: "dash-journal" });
		for (const field of FIELDS) {
			await this.renderField(wrap, field);
		}
	}

	/** Read-only carry-over of yesterday's "Reference tomorrow" onto today. */
	private async renderYesterdayReference(): Promise<void> {
		const yesterday = moment().subtract(1, "day").format("YYYY-MM-DD");
		let text = "";
		try {
			const raw = await readDailyNoteRaw(this.ctx.app, yesterday);
			text = readField(raw, headingField("Reference tomorrow")).trim();
		} catch (e) {
			console.error("Daily Dashboard: could not read yesterday's reference note", e);
		}
		if (!text) return; // nothing to carry — stay quiet
		const block = this.el.createDiv({ cls: "dash-carry" });
		block.createDiv({ cls: "dash-carry-label", text: "From yesterday — to reference today" });
		block.createDiv({ cls: "dash-carry-body", text });
	}

	private async renderField(parent: HTMLElement, field: FieldDef): Promise<void> {
		const block = parent.createDiv({ cls: "dash-journal-field" });
		block.createDiv({ cls: "dash-journal-label", text: field.label });
		const ta = block.createEl("textarea", { cls: "dash-journal-input", attr: { placeholder: `Write in “${field.label}”…` } });
		ta.value = await readDailyField(this.ctx.app, field.spec);
		autosize(ta);

		let timer: number | null = null;
		const save = () => {
			void writeDailyField(this.ctx.app, field.spec, ta.value).catch((e) =>
				console.error("Daily Dashboard: journal save failed", e)
			);
		};
		ta.addEventListener("focus", () => {
			this.editing = true;
			this.ctx.runtime.textFocused = true;
			this.ctx.runtime.typingUntil = Date.now() + 2000;
		});
		ta.addEventListener("blur", () => {
			this.editing = false;
			this.ctx.runtime.textFocused = false;
			this.ctx.runtime.typingUntil = 0;
			if (timer !== null) {
				window.clearTimeout(timer);
				timer = null;
			}
			save();
		});
		ta.addEventListener("input", () => {
			this.ctx.runtime.typingUntil = Date.now() + 2000;
			autosize(ta);
			if (timer !== null) window.clearTimeout(timer);
			timer = window.setTimeout(() => {
				timer = null;
				save();
			}, 800);
		});
		this.onCleanup(() => {
			if (timer !== null) window.clearTimeout(timer);
		});
	}
}

function autosize(ta: HTMLTextAreaElement): void {
	ta.style.height = "auto";
	ta.style.height = Math.max(48, ta.scrollHeight) + "px";
}
