import { BasePanel, RefreshReason, placard } from "./types";
import { FieldSpec, headingField, readDailyField, writeDailyField } from "../core/dailynote";

/**
 * Journal / free-text panel (§5.4). Three editable fields, each an editor for a
 * section of today's daily note: Today, Journal, and Notes. Debounced autosave
 * (~800ms); textareas that grow. These are editors *for the note*, not a
 * separate store — the writes go through the safe daily-note writer
 * (`vault.process`, or a live-editor reconcile if today's note is open in
 * another pane). On an external refresh we reload values unless the user is
 * mid-edit, so we never yank text out from under them.
 */
interface FieldDef {
	key: string;
	label: string;
	spec: FieldSpec;
}

const FIELDS: FieldDef[] = [
	{ key: "today", label: "Today", spec: headingField("Today") },
	{ key: "journal", label: "Journal", spec: headingField("Journal") },
	{ key: "notes", label: "Notes", spec: headingField("Notes") },
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
		const wrap = this.el.createDiv({ cls: "dash-journal" });
		for (const field of FIELDS) {
			await this.renderField(wrap, field);
		}
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
			this.ctx.runtime.typingUntil = Date.now() + 2000;
		});
		ta.addEventListener("blur", () => {
			this.editing = false;
			this.ctx.runtime.typingUntil = 0;
			if (timer !== null) {
				window.clearTimeout(timer);
				timer = null;
			}
			save();
		});
		ta.addEventListener("input", () => {
			// Hold off the vault-refresh bus while typing so the layout doesn't jump.
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
