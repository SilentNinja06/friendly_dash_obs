import { App, FuzzySuggestModal, Modal, Notice, Setting, TFile, moment } from "obsidian";
import { appendDailyLogLine, commandButton } from "dash-core";
import { BasePanel, placard } from "./types";
import type { CrmRow } from "../core/bridge";
import { COMMAND_OFFLINE } from "../copy";

/**
 * Contacts — who's due (or overdue) for a catch-up, from the Simple Contact
 * Manager plugin. Overdue first, then by priority. Each row has a one-tap “Log”.
 * Without the plugin the card explains what it needs instead of erroring.
 */
export class ContactsPanel extends BasePanel {
	id = "contacts";
	title = "Contacts";
	private reconciled = false;

	protected async setup(): Promise<void> {
		if (this.reconciled || !this.ctx.bridge.crmAvailable()) return;
		this.reconciled = true;
		await this.reconcile();
	}

	protected renderBody(): void {
		const { bridge, app } = this.ctx;
		placard(this.el, "Contacts");

		if (!bridge.crmAvailable()) {
			this.el.createDiv({
				cls: "dash-empty",
				text: "This panel works with the Simple Contact Manager plugin. Once it's installed and turned on, the people you're due to catch up with show up here. You can also hide this panel in the plugin settings.",
			});
			return;
		}

		const contacts = bridge.crmContacts();
		const due = contacts.filter((c) => c.overdue || c.dueToday);

		const actions = this.el.createDiv({ cls: "dash-btn-row" });
		commandButton(actions, app, "simple-contact-manager:log-interaction", "Log a catch-up", { cls: "dash-btn-primary", offlineText: COMMAND_OFFLINE });
		const find = actions.createEl("button", { cls: "dash-btn", text: "Find someone" });
		find.addEventListener("click", () => new ContactSearchModal(app, contacts).open());
		commandButton(actions, app, "simple-contact-manager:new-contact", "New contact", { offlineText: COMMAND_OFFLINE });

		const list = this.el.createDiv({ cls: "dash-crm-list" });
		if (due.length === 0) {
			list.createDiv({ cls: "dash-empty", text: "No one is due for a catch-up today." });
			return;
		}
		for (const c of due) this.renderRow(list, c);
	}

	private renderRow(parent: HTMLElement, c: CrmRow): void {
		const row = parent.createDiv({ cls: "dash-crm-row" });
		if (c.overdue) row.addClass("is-overdue");
		const main = row.createDiv({ cls: "dash-crm-main" });
		const name = main.createEl("a", { cls: "dash-crm-name", text: c.name });
		name.addEventListener("click", (e) => {
			e.preventDefault();
			const file = this.ctx.app.vault.getAbstractFileByPath(c.path);
			if (file instanceof TFile) void this.ctx.app.workspace.getLeaf(false).openFile(file);
		});
		const meta = main.createDiv({ cls: "dash-crm-meta" });
		if (c.priority) meta.createSpan({ cls: "dash-chip", text: c.priority });
		meta.createSpan({ cls: c.overdue ? "dash-chip dash-chip-warn" : "dash-chip", text: c.overdue ? "overdue" : "due today" });
		if (c.daysSince !== null) meta.createSpan({ cls: "dash-chip dash-chip-cold", text: `${c.daysSince} days since` });

		const log = row.createEl("button", { cls: "dash-btn dash-btn-sm", text: "Log" });
		log.addEventListener("click", () => {
			// Prefer the plugin's own window (newer versions); otherwise log it here.
			if (this.ctx.bridge.crmLogViaApi(c.path)) return;
			new InteractionModal(this.ctx.app, c.name, async (text) => {
				const ok = await this.ctx.bridge.crmWriteInteraction(c.path, text);
				new Notice(ok ? `Logged a catch-up with ${c.name}.` : "That couldn't be logged.");
				if (ok) this.ctx.requestRefresh("manual");
			}).open();
		});
	}

	/** Backfill any of today's interactions (logged in a contact note) that aren't
	 * in today's daily note yet. Best-effort. */
	private async reconcile(): Promise<void> {
		try {
			const tails = await this.ctx.bridge.crmReconcileLines();
			if (tails.length === 0) return;
			const { marker, heading } = this.ctx.bridge.crmLogTarget();
			const time = moment().format("HH:mm");
			for (const tail of tails) await appendDailyLogLine(this.ctx.app, `- ${time} ${tail}`, { marker, heading, time });
		} catch (e) {
			console.error("Daily Dashboard: contacts reconcile failed", e);
		}
	}
}

/** Fuzzy-search every contact and open the chosen note. */
class ContactSearchModal extends FuzzySuggestModal<CrmRow> {
	constructor(app: App, private contacts: CrmRow[]) {
		super(app);
		this.setPlaceholder("Search contacts…");
	}
	getItems(): CrmRow[] {
		return [...this.contacts].sort((a, b) => a.name.localeCompare(b.name));
	}
	getItemText(c: CrmRow): string {
		return c.name;
	}
	onChooseItem(c: CrmRow): void {
		const file = this.app.vault.getAbstractFileByPath(c.path);
		if (file instanceof TFile) void this.app.workspace.getLeaf(false).openFile(file);
		else new Notice("That contact's note couldn't be found.");
	}
}

/** A one-line note about the catch-up, used when the contacts plugin's own
 * window isn't available. */
class InteractionModal extends Modal {
	private note = "";
	constructor(app: App, private contactName: string, private onSubmit: (note: string) => void) {
		super(app);
	}
	onOpen(): void {
		this.titleEl.setText(`Catch-up with ${this.contactName}`);
		new Setting(this.contentEl).setName("What did you talk about?").addText((t) => {
			t.setPlaceholder("e.g. Called about the weekend").onChange((v) => (this.note = v));
			t.inputEl.classList.add("dash-modal-wide");
			t.inputEl.focus();
			t.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					this.submit();
				}
			});
		});
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
			.addButton((b) => b.setButtonText("Log it").setCta().onClick(() => this.submit()));
	}
	private submit(): void {
		const note = this.note.trim();
		if (!note) {
			new Notice("Add a few words about the catch-up first.");
			return;
		}
		this.onSubmit(note);
		this.close();
	}
	onClose(): void {
		this.contentEl.empty();
	}
}
