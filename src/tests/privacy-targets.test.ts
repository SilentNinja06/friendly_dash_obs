import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMPANIONS } from "../companions/registry";

test("every companion with a card is in the privacy check's scan list", () => {
	const targets: { repo: string }[] = JSON.parse(readFileSync(new URL("../../scripts/privacy-targets.json", import.meta.url), "utf8"));
	assert.deepEqual(targets.map((t) => t.repo).sort(), COMPANIONS.map((c) => c.repo).sort());
});
