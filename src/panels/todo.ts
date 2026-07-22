import { App, Modal, Notice, Setting, moment } from "obsidian";
import { BasePanel, placard } from "./types";
import {
	Recurrence,
	RecurrenceType,
	TodoInstance,
	TodoItem,
	TodoStore,
	describeRecurrence,
} from "../core/todostore";
import { allSubItemsDone, subItemDone, subItemsDoneCount } from "../core/subitems";

/**
 * Persistent to-do panel (§5.2). The list is authoritative; nothing resets
 * overnight. Add / remove / edit / complete, recurring items, future
 * scheduling, per-occurrence dismiss, and roll-and-flag for slipped items.
 * Completing a task logs a line under the completed-tasks heading in today's
 * note. Ships with no items — the empty state explains how to add the first one.
 */
export class TodoPanel extends BasePanel {
	id = "todo";
	title = "To-do";
	/** Which rows are expanded to show their sub-tasks / note — survives re-render. */
	private expanded = new Set<string>();

	protected renderBody(): void {
		const store = this.ctx.todos;
		const instances = store.instancesFor();
		const active = instances.filter((i) => !i.done && !i.skipped).sort(activeSort);
		const postponed = instances.filter((i) => i.skipped);
		const done = instances.filter((i) => i.done);

		const head = placard(this.el, "To-do");
		const overdue = active.filter((i) => i.flagged).length;
		if (overdue > 0) head.createSpan({ cls: "dash-chip dash-chip-warn", text: `${overdue} overdue` });
		head.createSpan({ cls: "dash-chip", text: `${active.length} to do` });

		const addBtn = this.el.createEl("button", { cls: "dash-btn dash-btn-primary dash-todo-add", text: "+ Add a to-do" });
		addBtn.addEventListener("click", () =>
			new TodoEditModal(this.ctx.app, store, undefined, () => this.after()).open()
		);

		const list = this.el.createDiv({ cls: "dash-todo-list" });
		if (active.length === 0) {
			list.createDiv({
				cls: "dash-empty",
				text: "Nothing to do yet. Tap “+ Add a to-do” to add your first one. You can make it repeat daily, weekly, or on any schedule you like.",
			});
		}
		active.forEach((inst, idx) => this.renderRow(list, inst, idx, active.length));

		if (postponed.length > 0) {
			const details = this.el.createEl("details", { cls: "dash-todo-done" });
			details.createEl("summary", { text: `Postponed for today · ${postponed.length}` });
			const pList = details.createDiv({ cls: "dash-todo-list" });
			for (const inst of postponed) this.renderRow(pList, inst, -1, 0);
		}

		if (done.length > 0) {
			const details = this.el.createEl("details", { cls: "dash-todo-done" });
			details.createEl("summary", { text: `Done today · ${done.length}` });
			const doneList = details.createDiv({ cls: "dash-todo-list" });
			for (const inst of done) this.renderRow(doneList, inst, -1, 0);
		}
	}

	private renderRow(parent: HTMLElement, inst: TodoInstance, idx: number, count: number): void {
		const store = this.ctx.todos;
		const item = inst.item;
		const today = moment().format("YYYY-MM-DD");
		const wrap = parent.createDiv({ cls: "dash-todo-item" });
		const row = wrap.createDiv({ cls: "dash-todo-row" });
		if (inst.flagged) row.addClass("is-flagged");
		if (inst.done || inst.skipped) row.addClass("is-done");

		const box = row.createEl("button", { cls: "dash-todo-check", attr: { "aria-label": inst.done ? "Mark not done" : "Mark done" } });
		box.setText(inst.done ? "✓" : "");
		box.addEventListener("click", async () => {
			await store.toggleComplete(item.id);
			this.after();
		});

		const main = row.createDiv({ cls: "dash-todo-main" });
		main.createDiv({ cls: "dash-todo-text", text: item.text });
		const meta = main.createDiv({ cls: "dash-todo-meta" });
		if (item.recurrence.type !== "none") meta.createSpan({ cls: "dash-chip dash-chip-cold", text: describeRecurrence(item.recurrence) });
		if (item.scheduledTime) meta.createSpan({ cls: "dash-chip", text: item.scheduledTime });
		if (item.dueDate) {
			const overdue = !inst.done && item.dueDate < today;
			meta.createSpan({ cls: overdue ? "dash-chip dash-chip-warn" : "dash-chip", text: dueLabel(item.dueDate, today) });
		}
		if (item.showOnWeekPrint) meta.createSpan({ cls: "dash-chip dash-chip-cold", text: "on planner" });
		if (inst.flagged) meta.createSpan({ cls: "dash-chip dash-chip-warn", text: inst.flagLabel });
		const subs = item.subItems ?? [];
		if (subs.length > 0) {
			const doneN = subItemsDoneCount(item, today);
			const chip = meta.createSpan({ cls: "dash-chip dash-chip-cold", text: `sub-tasks ${doneN}/${subs.length}` });
			if (allSubItemsDone(item, today)) chip.addClass("dash-chip-warn");
		}

		const actions = row.createDiv({ cls: "dash-todo-actions" });
		const hasDetail = subs.length > 0 || !!item.note;
		const isOpen = this.expanded.has(item.id);
		// The chevron always expands — a collapsed row still offers a caret so a
		// fresh to-do can be given its first sub-task or note.
		this.iconBtn(actions, isOpen ? "▾" : "▸", hasDetail ? "Sub-tasks & note" : "Add sub-tasks or a note", false, () => {
			if (isOpen) this.expanded.delete(item.id);
			else this.expanded.add(item.id);
			this.rerender();
		});
		if (!inst.done && count > 1 && idx >= 0) {
			this.iconBtn(actions, "↑", "Move up", idx === 0, async () => {
				await this.move(idx, -1);
			});
			this.iconBtn(actions, "↓", "Move down", idx === count - 1, async () => {
				await this.move(idx, 1);
			});
		}
		this.iconBtn(actions, "✎", "Edit", false, () => {
			new TodoEditModal(this.ctx.app, store, item, () => this.after()).open();
		});
		if (inst.skipped) {
			this.iconBtn(actions, "↩", "Bring back", false, async () => {
				await store.unskipInstance(item.id);
				this.after();
			});
		} else if (inst.recurring && !inst.done) {
			this.iconBtn(actions, "⤼", "Skip just for today", false, async () => {
				await store.skipInstance(item.id);
				new Notice("Skipped for today. It comes back on the next occurrence.");
				this.after();
			});
		}
		this.iconBtn(actions, "🗑", "Delete", false, async () => {
			await store.remove(item.id);
			this.after();
		});

		if (isOpen) this.renderDetail(wrap, inst, today);
	}

	/** Expanded region under a row: an inline note line and the sub-task checklist,
	 * with per-occurrence completion for repeating to-dos. */
	private renderDetail(wrap: HTMLElement, inst: TodoInstance, today: string): void {
		const store = this.ctx.todos;
		const item = inst.item;
		const detail = wrap.createDiv({ cls: "dash-todo-detail" });

		// --- note ---
		const noteInput = detail.createEl("input", {
			cls: "dash-todo-note-input",
			attr: { type: "text", placeholder: "Add a note…", value: item.note ?? "" },
		});
		this.bindTextFocus(noteInput);
		const saveNote = () => {
			if ((item.note ?? "") === noteInput.value.trim()) return;
			void store.setNote(item.id, noteInput.value).then(() => this.after());
		};
		noteInput.addEventListener("blur", saveNote);
		noteInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				noteInput.blur();
			}
		});

		// --- sub-tasks ---
		const subList = detail.createDiv({ cls: "dash-subtask-list" });
		for (const sub of item.subItems ?? []) {
			const srow = subList.createDiv({ cls: "dash-subtask-row" });
			const done = subItemDone(item, sub.id, today);
			if (done) srow.addClass("is-done");
			const cb = srow.createEl("button", {
				cls: "dash-subtask-check",
				attr: { "aria-label": done ? "Mark sub-task not done" : "Mark sub-task done" },
			});
			cb.setText(done ? "✓" : "");
			cb.addEventListener("click", async () => {
				await store.toggleSubItem(item.id, sub.id, today);
				this.after();
			});
			srow.createSpan({ cls: "dash-subtask-text", text: sub.text });
			this.iconBtn(srow, "🗑", "Remove sub-task", false, async () => {
				await store.removeSubItem(item.id, sub.id);
				this.after();
			});
		}

		// --- add a sub-task ---
		const addRow = detail.createDiv({ cls: "dash-subtask-add" });
		const addInput = addRow.createEl("input", {
			cls: "dash-subtask-input",
			attr: { type: "text", placeholder: "Add a sub-task…" },
		});
		this.bindTextFocus(addInput);
		const addSub = () => {
			const text = addInput.value.trim();
			if (!text) return;
			void store.addSubItem(item.id, text).then(() => this.after());
		};
		addInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				addSub();
			}
		});
		const addBtn = addRow.createEl("button", { cls: "dash-btn dash-btn-sm", text: "Add" });
		addBtn.addEventListener("click", addSub);
	}

	private iconBtn(parent: HTMLElement, glyph: string, label: string, disabled: boolean, onClick: () => void): void {
		const b = parent.createEl("button", { cls: "dash-icon-btn dash-todo-icon", text: glyph, attr: { "aria-label": label, title: label } });
		if (disabled) b.setAttr("disabled", "true");
		else b.addEventListener("click", onClick);
	}

	private async move(idx: number, delta: number): Promise<void> {
		const active = this.ctx.todos.instancesFor().filter((i) => !i.done && !i.skipped).sort(activeSort);
		const ids = active.map((i) => i.item.id);
		const j = idx + delta;
		if (j < 0 || j >= ids.length) return;
		[ids[idx], ids[j]] = [ids[j], ids[idx]];
		await this.ctx.todos.reorder(ids);
		this.after();
	}

	private after(): void {
		this.ctx.requestRefresh("manual");
	}
}

function dueLabel(due: string, today: string): string {
	if (due < today) return `overdue · ${moment(due, "YYYY-MM-DD").format("MMM D")}`;
	if (due === today) return "due today";
	return `due ${moment(due, "YYYY-MM-DD").format("MMM D")}`;
}

function activeSort(a: TodoInstance, b: TodoInstance): number {
	// Overdue first, then scheduled-time, then stored order.
	if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
	const at = a.item.scheduledTime ?? "99:99";
	const bt = b.item.scheduledTime ?? "99:99";
	if (at !== bt) return at.localeCompare(bt);
	return a.item.order - b.item.order;
}

// ------------------------------------------------------------- edit modal

const WEEKDAYS: Array<{ v: number; label: string }> = [
	{ v: 1, label: "Mon" },
	{ v: 2, label: "Tue" },
	{ v: 3, label: "Wed" },
	{ v: 4, label: "Thu" },
	{ v: 5, label: "Fri" },
	{ v: 6, label: "Sat" },
	{ v: 0, label: "Sun" },
];

class TodoEditModal extends Modal {
	private text: string;
	private recType: RecurrenceType;
	private weeklyDays: Set<number>;
	private monthlyDate: number;
	private everyN: number;
	private scheduledDate: string;
	private scheduledTime: string;
	private dueDate: string;
	private showOnWeekPrint: boolean;

	constructor(
		app: App,
		private store: TodoStore,
		private existing: TodoItem | undefined,
		private onDone: () => void
	) {
		super(app);
		const e = existing;
		this.text = e?.text ?? "";
		this.recType = e?.recurrence.type ?? "none";
		this.weeklyDays = new Set(e?.recurrence.days ?? [moment().day()]);
		this.monthlyDate = e?.recurrence.date ?? moment().date();
		this.everyN = e?.recurrence.n ?? 2;
		this.scheduledDate = e?.scheduledDate ?? "";
		this.scheduledTime = e?.scheduledTime ?? "";
		this.dueDate = e?.dueDate ?? "";
		this.showOnWeekPrint = e?.showOnWeekPrint ?? false;
	}

	onOpen(): void {
		this.titleEl.setText(this.existing ? "Edit to-do" : "New to-do");
		const { contentEl } = this;

		new Setting(contentEl).setName("To-do").addText((t) => {
			t.setPlaceholder("What needs doing?").setValue(this.text).onChange((v) => (this.text = v));
			t.inputEl.classList.add("dash-modal-wide");
			t.inputEl.focus();
			t.inputEl.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					void this.submit();
				}
			});
		});

		const dynamic = contentEl.createDiv();
		new Setting(contentEl)
			.setName("Repeat")
			.addDropdown((dd) => {
				dd.addOptions({
					none: "Just once",
					daily: "Every day",
					weekdays: "Weekdays (Mon–Fri)",
					weekly: "Weekly",
					monthly: "Monthly",
					everyNDays: "Every N days",
				});
				dd.setValue(this.recType).onChange((v) => {
					this.recType = v as RecurrenceType;
					this.renderDynamic(dynamic);
				});
			});
		contentEl.appendChild(dynamic);
		this.renderDynamic(dynamic);

		new Setting(contentEl)
			.setName("Start on")
			.setDesc("Optional. Hide this until a date (and time). For repeats, this is the start date.")
			.addText((t) => {
				t.inputEl.type = "date";
				t.setValue(this.scheduledDate).onChange((v) => (this.scheduledDate = v));
			})
			.addText((t) => {
				t.inputEl.type = "time";
				t.setValue(this.scheduledTime).onChange((v) => (this.scheduledTime = v));
			});

		new Setting(contentEl)
			.setName("Due by")
			.setDesc("Optional soft deadline. Shown as a chip; once it's past, it reads “overdue”.")
			.addText((t) => {
				t.inputEl.type = "date";
				t.setValue(this.dueDate).onChange((v) => (this.dueDate = v));
			});

		new Setting(contentEl)
			.setName("Show on the printed week")
			.setDesc("Draw this to-do on the printable week-at-a-glance planner on its scheduled or due day.")
			.addToggle((t) => t.setValue(this.showOnWeekPrint).onChange((v) => (this.showOnWeekPrint = v)));

		new Setting(contentEl)
			.addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
			.addButton((b) => b.setButtonText(this.existing ? "Save" : "Add").setCta().onClick(() => void this.submit()));
	}

	private renderDynamic(host: HTMLElement): void {
		host.empty();
		if (this.recType === "weekly") {
			const s = new Setting(host).setName("On these days");
			for (const d of WEEKDAYS) {
				const btn = s.controlEl.createEl("button", { cls: "dash-day-toggle", text: d.label });
				if (this.weeklyDays.has(d.v)) btn.addClass("is-on");
				btn.addEventListener("click", () => {
					if (this.weeklyDays.has(d.v)) this.weeklyDays.delete(d.v);
					else this.weeklyDays.add(d.v);
					btn.toggleClass("is-on", this.weeklyDays.has(d.v));
				});
			}
		} else if (this.recType === "monthly") {
			new Setting(host).setName("Day of the month").addText((t) => {
				t.inputEl.type = "number";
				t.inputEl.min = "1";
				t.inputEl.max = "31";
				t.setValue(String(this.monthlyDate)).onChange((v) => (this.monthlyDate = clamp(Number(v), 1, 31)));
			});
		} else if (this.recType === "everyNDays") {
			new Setting(host).setName("Every").setDesc("days").addText((t) => {
				t.inputEl.type = "number";
				t.inputEl.min = "1";
				t.setValue(String(this.everyN)).onChange((v) => (this.everyN = Math.max(1, Number(v) || 1)));
			});
		}
	}

	private buildRecurrence(): Recurrence {
		switch (this.recType) {
			case "weekly":
				return { type: "weekly", days: [...this.weeklyDays].sort((a, b) => a - b) };
			case "monthly":
				return { type: "monthly", date: this.monthlyDate };
			case "everyNDays":
				return { type: "everyNDays", n: this.everyN };
			default:
				return { type: this.recType };
		}
	}

	private async submit(): Promise<void> {
		const text = this.text.trim();
		if (!text) {
			new Notice("Please type what the to-do is.");
			return;
		}
		const patch = {
			text,
			recurrence: this.buildRecurrence(),
			scheduledDate: this.scheduledDate || undefined,
			scheduledTime: this.scheduledTime || undefined,
			dueDate: this.dueDate || undefined,
			showOnWeekPrint: this.showOnWeekPrint,
		};
		if (this.existing) await this.store.update(this.existing.id, patch);
		else await this.store.add(patch);
		this.close();
		this.onDone();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

function clamp(n: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}
