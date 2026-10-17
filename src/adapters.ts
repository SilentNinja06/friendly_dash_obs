import type { LocalEventsStore, WeeklyGoalsCopy, WeeklyGoalsStore } from "dash-core";
import type DailyDashPlugin from "./main";

/** Adapts the plugin's local-event CRUD to core's LocalEventsStore. */
export function friendlyLocalEvents(plugin: DailyDashPlugin): LocalEventsStore {
	return {
		add: (patch) => plugin.addLocalEvent(patch),
		update: (id, patch) => plugin.updateLocalEvent(id, patch),
		remove: (id) => plugin.removeLocalEvent(id),
	};
}

/** Adapts the plugin's weekly-goal storage to core's WeeklyGoalsStore. */
export function friendlyWeeklyGoals(plugin: DailyDashPlugin): WeeklyGoalsStore {
	return {
		forWeek: (weekKey) => plugin.weeklyGoalsFor(weekKey),
		add: (weekKey, text) => plugin.addWeeklyGoal(weekKey, text),
		remove: (weekKey, id) => plugin.removeWeeklyGoal(weekKey, id),
	};
}

export const FRIENDLY_WEEKLYGOALS_COPY: WeeklyGoalsCopy = {
	titleTemplate: "This week's goals · {week}",
	empty: "No goals for this week yet. What would make it a good week?",
	toItem: "→ To-do",
	removeGoal: "Remove goal",
	addName: "Add a goal",
	addPlaceholder: "Something you'd like to get done this week",
	addButton: "Add",
	done: "Done",
	addedNotice: "Added to your to-do list, due at the end of the week.",
};
