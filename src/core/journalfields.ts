import { FieldSpec, headingField } from "dash-core";

/**
 * The three journal sections of the daily note — shared by the Journal panel's
 * copy, the "Write in …" commands and the `log` link action, so they can never
 * drift apart. Keys are the short names used in `obsidian://daily-dash` links.
 */
export const JOURNAL_FIELDS = {
	braindump: { label: "Brain dump", spec: headingField("Brain dump") },
	journal: { label: "Journal", spec: headingField("Journal") },
	tomorrow: { label: "Reference tomorrow", spec: headingField("Reference tomorrow") },
} satisfies Record<string, { label: string; spec: FieldSpec }>;

export type JournalField = keyof typeof JOURNAL_FIELDS;

export function isJournalField(v: string): v is JournalField {
	return Object.prototype.hasOwnProperty.call(JOURNAL_FIELDS, v);
}
