/**
 * Verse of the Day — deterministic Proverbs selector (§4).
 *
 * The whole rule: **chapter = day of month.** Day 15 → Proverbs 15. The
 * "skips" (no chapter 29–31 in February, no 31 in 30-day months) are *emergent*
 * from that rule, never coded — do not add February special-casing.
 *
 * The verse advances with a **per-chapter independent pointer**: each chapter
 * moves forward one verse every time it is actually read (i.e. every month that
 * is long enough to contain that day-of-month), wrapping within its own verse
 * count. Nothing is ever skipped; chapters just advance at different rates. The
 * result is fully deterministic from the date — no stored state, no drift.
 *
 * This module is intentionally free of any Obsidian import so it stays a pure,
 * testable function of the calendar. The caller derives (y, m, d) from the
 * *local* calendar (never a floored UTC timestamp — LANDMINE §4) and passes it
 * in via {@link localYMD}.
 */

export const EPOCH_YEAR = 2026;
export const EPOCH_MONTH = 1; // 2026-01 = the first read of every chapter.

export interface Ymd {
	y: number;
	m: number; // 1-12
	d: number; // 1-31
}

export interface VersePick {
	/** Chapter of Proverbs (equals the day of month). */
	chapter: number;
	/** 1-indexed verse within the chapter. */
	verse: number;
}

/** Days in month `m` (1-12) of year `y`. Handles leap years via the Date roll. */
export function daysInMonth(y: number, m: number): number {
	return new Date(y, m, 0).getDate();
}

/**
 * How many times chapter `chapter` has been read by (and including) month
 * `y`-`m`, counting from the epoch. A chapter is "read" in every month long
 * enough to contain that day-of-month.
 */
export function occurrences(chapter: number, y: number, m: number): number {
	let n = 0;
	for (let Y = EPOCH_YEAR; Y <= y; Y++) {
		const last = Y === y ? m : 12;
		for (let M = Y === EPOCH_YEAR ? EPOCH_MONTH : 1; M <= last; M++) {
			if (daysInMonth(Y, M) >= chapter) n++;
		}
	}
	return n;
}

/**
 * The verse (1-indexed) to show for calendar day `d` of month `y`-`m`, given
 * each chapter's verse count. The chapter is simply `d`.
 */
export function verseFor(y: number, m: number, d: number, verseCounts: number[]): VersePick {
	const chapter = d;
	const count = verseCounts[chapter - 1];
	if (!count || count < 1) {
		// Defensive: a day with no corresponding chapter (should not happen for
		// Proverbs, which has all of days 1–31). Fall back to verse 1.
		return { chapter, verse: 1 };
	}
	const k = occurrences(chapter, y, m);
	const verse = ((k - 1) % count) + 1;
	return { chapter, verse };
}

/**
 * Derive the local calendar (y, m, d) from a Date. Uses the *local* getters
 * (never a UTC timestamp floored to a day), so the selection flips at local
 * midnight rather than at 1700 Pacific — the timezone LANDMINE (§4, §8.1).
 */
export function localYMD(date: Date = new Date()): Ymd {
	return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

/** Convenience: pick the verse for `date` (defaults to now), using local time. */
export function verseForDate(date: Date, verseCounts: number[]): VersePick {
	const { y, m, d } = localYMD(date);
	return verseFor(y, m, d, verseCounts);
}
