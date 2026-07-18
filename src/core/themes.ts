/**
 * Theme catalogue (§3). Four themes, switched by a `data-theme` attribute on the
 * view root over a single `--dash-*` custom-property contract defined in
 * styles.css. **Panels never branch on the theme** — if a panel needs a colour,
 * it uses a token, never a conditional. So this module carries no hexes; it only
 * names the themes for the settings picker and maps calendar swatches to tokens.
 */

export type ThemeMode = "light" | "dark";

export interface ThemeDef {
	id: string;
	label: string;
	mode: ThemeMode;
	blurb: string;
}

export const THEMES: ThemeDef[] = [
	{
		id: "sleek",
		label: "Sleek Modern",
		mode: "light",
		blurb: "Clean and near-monochrome, with a single deep-green accent. A calm, neutral place to start.",
	},
	{
		id: "pastel",
		label: "Pastel / Floral",
		mode: "light",
		blurb: "Soft and warm — dusty rose, sage, and lavender on a cream page, with gentle rounded corners.",
	},
	{
		id: "mellow",
		label: "Mellow",
		mode: "dark",
		blurb: "A quiet dark dusk in muted violet, orange, and dusty blue. Easy on the eyes at night.",
	},
	{
		id: "geometric",
		label: "Geometric",
		mode: "dark",
		blurb: "Bold and graphic — vermilion, ochre, and cobalt blocks with sharp edges and thick rules.",
	},
];

export const DEFAULT_THEME = "sleek";

export function isThemeId(id: string): boolean {
	return THEMES.some((t) => t.id === id);
}

/** Number of distinct calendar swatch tokens defined per theme in styles.css. */
export const CALENDAR_TOKEN_COUNT = 8;

/** The CSS value for calendar `index`'s swatch — a theme token, so the colour
 * always belongs to the active theme (no JS colour literals in panels). */
export function calendarColorVar(index: number): string {
	return `var(--dash-cal-${(index % CALENDAR_TOKEN_COUNT) + 1})`;
}
