/**
 * The vendored public-domain KJV book of Proverbs (§4). The text is bundled
 * from a reputable public-domain dataset (see `data/proverbs-kjv.json` and
 * `scripts/build-proverbs.mjs`) — never generated from memory. Only the King
 * James Version is bundled; it is public domain in the US. Do not swap in a
 * modern translation without confirming its licence (most are copyrighted and
 * can only be referenced, not bundled).
 *
 * Counts (915 verses, the per-chapter array, shortest chapter = 9) are derived
 * from the data at runtime and guarded by a test — never hardcoded here.
 */
import data from "../../data/proverbs-kjv.json";

interface ProverbsData {
	translation: string;
	translationName: string;
	book: string;
	license: string;
	chapters: Array<{ chapter: number; verses: string[] }>;
}

const PROVERBS = data as ProverbsData;

/** Chapters, ordered 1..N. */
export function chapters(): ProverbsData["chapters"] {
	return PROVERBS.chapters;
}

/** Per-chapter verse counts, index 0 = chapter 1. Derived, never hardcoded. */
export function verseCounts(): number[] {
	return PROVERBS.chapters.map((c) => c.verses.length);
}

/** Total number of verses across all chapters (derived). */
export function totalVerses(): number {
	return verseCounts().reduce((a, b) => a + b, 0);
}

export const TRANSLATION = PROVERBS.translation; // "KJV"
export const TRANSLATION_NAME = PROVERBS.translationName; // "King James Version"
export const BOOK = PROVERBS.book; // "Proverbs"

/** The verse text for chapter/verse (both 1-indexed), or "" if out of range. */
export function verseText(chapter: number, verse: number): string {
	const c = PROVERBS.chapters[chapter - 1];
	if (!c) return "";
	return c.verses[verse - 1] ?? "";
}

/** A human reference like "Proverbs 15:7". */
export function reference(chapter: number, verse: number): string {
	return `${BOOK} ${chapter}:${verse}`;
}
