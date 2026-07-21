import { headingField } from "dash-core";
import type { SearchCopy, SecondBrainCopy, CategoryModalsCopy, PlacesCopy, JournalCopy, MealsCopy } from "dash-core";

/**
 * Friendly, plain-language copy for the core library panels this dashboard
 * mounts. The core panels carry no wording of their own — every user-facing
 * string comes from here — so this dashboard reads warmly and never inherits the
 * sibling dashboard's voice. `{n}`/`{name}`/`{note}`/`{category}` are substituted
 * by the panels.
 */

/** Note/category creation + filing modals (shared by the Search card). */
export const FRIENDLY_CATEGORY_COPY: CategoryModalsCopy = {
	newNoteTitle: "New note",
	titleLabel: "Title",
	titlePlaceholder: "Note title",
	categoryLabel: "Category",
	categoryDesc: "Optional — file it under a category as you create it.",
	orNewCategoryLabel: "Or a new category",
	orNewCategoryDesc: "Creates the category and files this note under it.",
	newCategoryPlaceholder: "New category name",
	noneOption: "(none)",
	cancel: "Cancel",
	create: "Create",
	noteNeedsTitle: "Please give the note a title.",
	newCategoryTitle: "New category",
	nameLabel: "Name",
	namePlaceholder: "Category name",
	categoryNeedsName: "Please give the category a name.",
	noNotesToAssign: "There are no notes to file yet. Make one first.",
	pickNotePlaceholder: "Pick a note to file…",
	assignTitle: "File under a category",
	existingCategoryLabel: "Existing category",
	orUseCategoryDesc: "Leave blank to use the one above.",
	assign: "File it",
	pickOrNameCategory: "Pick or name a category.",
	assignedNotice: "Filed “{note}” under “{category}”.",
};

/** The Search card. */
export const FRIENDLY_SEARCH_COPY: SearchCopy = {
	title: "Search",
	newNote: "+ Note",
	newCategory: "+ Category",
	assign: "File under category",
	searchPlaceholder: "Search your notes…",
	categoriesHeading: "Categories · {n}",
	noCategories: "No categories yet. Make one to start grouping your notes.",
	categoryEmpty: "Empty.",
	recentHeading: "Recently edited · {n}",
	noNotesInScope: "No notes to search here yet.",
	noMatches: "No matching notes.",
};

/** The Journal card — three free-text sections of today's daily note, plus a
 * read-only carry of yesterday's "Reference tomorrow". */
export const FRIENDLY_JOURNAL_COPY: JournalCopy = {
	title: "Journal",
	carryHeading: "Reference tomorrow",
	carryLabel: "From yesterday — to reference today",
	fields: [
		{ label: "Brain dump", spec: headingField("Brain dump"), placeholder: "Write in “Brain dump”…" },
		{ label: "Journal", spec: headingField("Journal"), placeholder: "Write in “Journal”…" },
		{ label: "Reference tomorrow", spec: headingField("Reference tomorrow"), placeholder: "Write in “Reference tomorrow”…" },
	],
};

/** The Meals + grocery card (reads Recipe Manager through the bridge). The
 * grocery list is read-only here — checking happens in Recipe Manager. */
export const FRIENDLY_MEALS_COPY: MealsCopy = {
	title: "Meals",
	offline:
		"This panel works with the Recipe Manager plugin. Once it's installed and turned on, your planned meals and grocery list show up here. You can also hide this panel in the plugin settings.",
	plannedHeading: "Planned today",
	noMeals: "No meals planned for today.",
	openRecipe: "Open recipe →",
	groceryHeading: "Grocery list",
	noGroceryAt: "No grocery list yet. Use “Build grocery list” below to make one.",
	groceryEmpty: "Your grocery list is empty.",
	remaining: "{remaining} of {total} still to get",
	commandOffline: "This button needs its plugin. Enable the matching plugin to turn it on.",
	commands: [
		{ id: "recipe-manager:meal-plan", label: "Plan a meal", cls: "dash-btn-primary" },
		{ id: "recipe-manager:grocery-list", label: "Build grocery list" },
		{ id: "recipe-manager:open-recipe", label: "Open a recipe" },
		{ id: "recipe-manager:new-recipe", label: "New recipe" },
		{ id: "recipe-manager:recipe-index", label: "All recipes" },
	],
};

/** The Places / navigation card. */
export const FRIENDLY_PLACES_COPY: PlacesCopy = {
	title: "Places",
	empty: "No places yet. Add shortcuts to your favourite notes and folders in the plugin settings.",
	commandOffline: "This button needs its plugin. Enable the matching plugin to turn it on.",
};

/** The Second Brain (ongoing-projects) card. */
export const FRIENDLY_SECOND_BRAIN_COPY: SecondBrainCopy = {
	title: "Second Brain",
	activeBadge: "{n} active",
	newNote: "+ New project",
	searchPlaceholder: "Search your projects…",
	noMatches: "No matching projects.",
	noActiveNotes: "No active projects yet. Tap “+ New project” to start one.",
	moreHint: "+{n} more — type to search.",
	archiveTooltip: "Archive (project finished)",
	deleteTooltip: "Delete",
	unarchiveTooltip: "Move back to active",
	archivedHeading: "Archived · {n}",
	restoredNotice: "Moved “{name}” back to active projects.",
	archivedNotice: "Archived “{name}”.",
	deletedNotice: "Deleted “{name}”.",
	deleteHeading: "Delete “{name}”?",
	deleteBody: "It goes to your configured trash. This can’t be undone from here.",
	cancel: "Cancel",
	deleteConfirm: "Delete",
	newNoteTitle: "New project",
	noteTitleLabel: "Project name",
	noteTitlePlaceholder: "What is this project called?",
	create: "Create",
	noteNeedsTitle: "Please give the project a name.",
};
