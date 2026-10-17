import { WeekReviewModal, WeeklyGoalsModal, LocalEventModal, currentWeekKey, commandButton } from "dash-core";
import { BasePanel, placard } from "./types";
import { TodoEditModal } from "./todo";
import { friendlyLocalEvents, friendlyWeeklyGoals, FRIENDLY_WEEKLYGOALS_COPY } from "../adapters";
import { friendlyWeekReviewConfig } from "../weekreview";
import { ShoppingItemModal } from "../shopping-manager";
import { COMMAND_OFFLINE } from "../copy";

/**
 * Quick Actions — one-tap buttons. The dashboard's own actions are always here;
 * each companion plugin's group appears only while that plugin is installed and
 * turned on, so the card never shows buttons that can't work.
 */
interface Group {
	pluginId: string;
	title: string;
	commands: Array<[string, string]>; // [command id, label]
}

const GROUPS: Group[] = [
	{
		pluginId: "recipe-manager",
		title: "Recipes",
		commands: [
			["recipe-manager:meal-plan", "Plan a meal"],
			["recipe-manager:grocery-list", "Build grocery list"],
			["recipe-manager:new-recipe", "New recipe"],
			["recipe-manager:open-recipe", "Open a recipe"],
			["recipe-manager:recipe-index", "All recipes"],
		],
	},
	{
		pluginId: "simple-contact-manager",
		title: "Contacts",
		commands: [
			["simple-contact-manager:log-interaction", "Log a catch-up"],
			["simple-contact-manager:new-contact", "New contact"],
			["simple-contact-manager:open-dashboard", "All contacts"],
		],
	},
	{
		pluginId: "arfid-tracker",
		title: "Food log",
		commands: [
			["arfid-tracker:quick-log", "Log a food"],
			["arfid-tracker:add-food", "Add a food"],
			["arfid-tracker:open-dashboard", "Food dashboard"],
		],
	},
];

export class ActionsPanel extends BasePanel {
	id = "actions";
	title = "Quick Actions";

	protected renderBody(): void {
		const { app, plugin, bridge } = this.ctx;
		const refresh = () => this.ctx.requestRefresh("vault");
		placard(this.el, "Quick Actions");

		const mine = this.el.createDiv({ cls: "dash-btn-row" });
		this.button(mine, "+ To-do", "dash-btn-primary", () => new TodoEditModal(app, this.ctx.todos, undefined, refresh).open());
		this.button(mine, "+ Event", "", () => new LocalEventModal(app, friendlyLocalEvents(plugin), undefined, refresh).open());
		this.button(mine, "+ Shopping", "", () => new ShoppingItemModal(app, plugin, "Groceries", null, refresh).open());
		this.button(mine, "Week's goals", "", () =>
			new WeeklyGoalsModal(app, friendlyWeeklyGoals(plugin), this.ctx.todos, currentWeekKey(), refresh, FRIENDLY_WEEKLYGOALS_COPY).open()
		);
		this.button(mine, "Week in review", "", () => new WeekReviewModal(app, friendlyWeekReviewConfig(plugin)).open());

		for (const group of GROUPS) {
			if (!bridge.isPluginEnabled(group.pluginId)) continue;
			const block = this.el.createDiv({ cls: "dash-actions-group" });
			block.createDiv({ cls: "dash-subhead", text: group.title });
			const row = block.createDiv({ cls: "dash-btn-row" });
			for (const [id, label] of group.commands) commandButton(row, app, id, label, { cls: "dash-btn-sm", offlineText: COMMAND_OFFLINE });
		}
	}

	private button(parent: HTMLElement, text: string, cls: string, onClick: () => void): void {
		parent.createEl("button", { cls: `dash-btn dash-btn-sm ${cls}`.trim(), text }).addEventListener("click", onClick);
	}
}
