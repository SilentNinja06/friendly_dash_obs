/*
 * Regenerate data/proverbs-kjv.json from the public-domain source.
 *
 * The bundled verse text is NOT written by hand or from memory — it is vendored
 * from a reputable public-domain KJV dataset. Run this only to refresh/verify
 * the data; the committed JSON is the source of truth at build time.
 *
 *   node scripts/build-proverbs.mjs
 *
 * Source: https://github.com/aruljohn/Bible-kjv (Proverbs.json)
 * Licence: King James Version — public domain in the US.
 */
import { writeFileSync } from "node:fs";

const SRC = "https://raw.githubusercontent.com/aruljohn/Bible-kjv/master/Proverbs.json";
const OUT = new URL("../data/proverbs-kjv.json", import.meta.url);

const EXPECTED_TOTAL = 915;
const EXPECTED_PER_CHAPTER = [
	33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29,
	30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31,
];

const res = await fetch(SRC);
if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
const src = await res.json();

// Verify verses are contiguous 1..N so array index + 1 == verse number.
for (const c of src.chapters) {
	c.verses.forEach((v, i) => {
		if (Number(v.verse) !== i + 1) {
			throw new Error(`non-contiguous verse in chapter ${c.chapter}`);
		}
	});
}

const chapters = src.chapters.map((c) => ({
	chapter: Number(c.chapter),
	verses: c.verses.map((v) => v.text),
}));

const counts = chapters.map((c) => c.verses.length);
const total = counts.reduce((a, b) => a + b, 0);
if (chapters.length !== 31) throw new Error(`expected 31 chapters, got ${chapters.length}`);
if (total !== EXPECTED_TOTAL) throw new Error(`expected ${EXPECTED_TOTAL} verses, got ${total}`);
if (JSON.stringify(counts) !== JSON.stringify(EXPECTED_PER_CHAPTER)) {
	throw new Error("per-chapter counts do not match the known KJV shape");
}

const out = {
	translation: "KJV",
	translationName: "King James Version",
	book: "Proverbs",
	license: "Public domain (US). Sourced from github.com/aruljohn/Bible-kjv.",
	chapters,
};

writeFileSync(OUT, JSON.stringify(out) + "\n");
console.log(`wrote ${OUT.pathname} — ${chapters.length} chapters, ${total} verses`);
