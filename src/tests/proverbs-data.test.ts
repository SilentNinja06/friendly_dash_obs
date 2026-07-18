import { test } from "node:test";
import assert from "node:assert/strict";
import { chapters, verseCounts, totalVerses, verseText, reference } from "../core/proverbs";

/**
 * Guards the vendored data (§4). These are the *only* place the literal counts
 * are allowed to appear — everywhere else derives them at runtime. If this test
 * fails, the data file was regenerated wrongly (or from the wrong source).
 */

const EXPECTED_PER_CHAPTER = [
	33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29,
	30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31,
];

test("Proverbs has 31 chapters", () => {
	assert.equal(chapters().length, 31);
});

test("Proverbs has 915 verses total", () => {
	assert.equal(totalVerses(), 915);
});

test("per-chapter verse counts match the known KJV shape", () => {
	assert.deepEqual(verseCounts(), EXPECTED_PER_CHAPTER);
});

test("the shortest chapter is chapter 9, with 18 verses", () => {
	const counts = verseCounts();
	const min = Math.min(...counts);
	assert.equal(min, 18);
	assert.equal(counts.indexOf(min) + 1, 9);
});

test("verses are contiguous — every chapter/verse resolves to non-empty text", () => {
	verseCounts().forEach((count, ci) => {
		for (let v = 1; v <= count; v++) {
			assert.ok(verseText(ci + 1, v).length > 0, `empty text at ${ci + 1}:${v}`);
		}
	});
});

test("reference formatting", () => {
	assert.equal(reference(15, 7), "Proverbs 15:7");
});
