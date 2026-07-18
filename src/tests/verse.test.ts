import { test } from "node:test";
import assert from "node:assert/strict";
import { verseFor, verseForDate, localYMD, daysInMonth } from "../core/verse";
import { verseCounts } from "../core/proverbs";

/**
 * The verse-selection scheme (§4). The 31:1 → 31:2 pair is load-bearing: if
 * March 31 produces 31:3 instead of 31:2, the pointer is global instead of
 * per-chapter and the scheme is wrong (February must not have consumed a verse).
 */

const counts = verseCounts();

function pick(dateStr: string): string {
	const [y, m, d] = dateStr.split("-").map(Number);
	const { chapter, verse } = verseFor(y, m, d, counts);
	return `${chapter}:${verse}`;
}

test("verified date → verse vectors", () => {
	assert.equal(pick("2026-01-01"), "1:1");
	assert.equal(pick("2026-07-15"), "15:7");
	assert.equal(pick("2026-02-28"), "28:2");
	assert.equal(pick("2026-04-30"), "30:3");
	assert.equal(pick("2026-01-31"), "31:1");
});

test("31:1 → 31:2 across a skipped February (per-chapter pointer)", () => {
	// March 31 is only the *second* time chapter 31 is read (Jan 31, then Mar 31);
	// February never reached day 31, so it did not advance the pointer.
	assert.equal(pick("2026-01-31"), "31:1");
	assert.equal(pick("2026-03-31"), "31:2"); // NOT 31:3
});

test("chapters wrap independently — ch1 is far ahead of ch31 by December", () => {
	// Chapter 1 is read every month, so by 2026-12 it is on its 12th read.
	assert.equal(pick("2026-12-01"), "1:12");
	// Chapter 31 is read only in the 7 long months of 2026 → verse 7.
	assert.equal(pick("2026-12-31"), "31:7");
});

test("daysInMonth handles February and leap years", () => {
	assert.equal(daysInMonth(2026, 2), 28);
	assert.equal(daysInMonth(2028, 2), 29); // leap
	assert.equal(daysInMonth(2026, 4), 30);
	assert.equal(daysInMonth(2026, 1), 31);
});

test("no February skip logic: chapters 29–31 simply never picked in Feb", () => {
	// There is no 2026-02-29/30/31 to ask about; the scheme never needs to skip.
	// Sanity: the last February day resolves to chapter 28.
	const { chapter } = verseFor(2026, 2, 28, counts);
	assert.equal(chapter, 28);
});

/**
 * Timezone pin (LANDMINE §4, §8.1). The selection must be derived from *local*
 * calendar fields, so it is stable across an entire local day and flips only at
 * local midnight — never at 1700 Pacific the way a floored UTC timestamp would.
 */
test("stable across a full local day in America/Los_Angeles", () => {
	const original = process.env.TZ;
	process.env.TZ = "America/Los_Angeles";
	try {
		// Sample every hour of a local calendar day; all must land on the same verse.
		const results = new Set<string>();
		for (let h = 0; h < 24; h++) {
			const d = new Date(2026, 6, 15, h, 30, 0); // 2026-07-15 local, month is 0-indexed
			const { y, m, d: day } = localYMD(d);
			assert.equal(`${y}-${m}-${day}`, "2026-7-15");
			const { chapter, verse } = verseForDate(d, counts);
			results.add(`${chapter}:${verse}`);
		}
		assert.equal(results.size, 1, "verse changed within a single local day");
		assert.equal([...results][0], "15:7");
	} finally {
		if (original === undefined) delete process.env.TZ;
		else process.env.TZ = original;
	}
});
