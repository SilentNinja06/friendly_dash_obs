#!/usr/bin/env node
/**
 * Privacy check for the dashboard and every companion plugin it supports.
 *
 * Scans what users actually install — this repo's built files and source, and
 * the latest GitHub release (main.js, manifest.json, styles.css) of each
 * companion in scripts/privacy-targets.json — for:
 *
 *  1. Private terms: names, places or other details the author never wants in a
 *     public plugin. They come from the PRIVACY_TERMS secret (one per line; blank
 *     lines and lines starting with # are ignored) and are NEVER written to the
 *     log: a hit is reported as "private term #N" with the file and line only.
 *  2. Email addresses (other than no-reply / example addresses).
 *  3. Phone-number-shaped strings.
 *
 * Findings that are known to be fine can be approved in scripts/privacy-allow.txt
 * by their fingerprint (printed with each finding; it's a hash, not the text).
 *
 * Exit code 1 on any unapproved finding, so a release can't ship past it.
 * Usage: PRIVACY_TERMS=… GITHUB_TOKEN=… node scripts/privacy-scan.mjs [--local-only]
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const localOnly = process.argv.includes("--local-only");

const terms = (process.env.PRIVACY_TERMS ?? "")
	.split(/\r?\n/)
	.map((t) => t.trim())
	.filter((t) => t && !t.startsWith("#"));

const allow = new Set(
	existsSync(join(ROOT, "scripts/privacy-allow.txt"))
		? readFileSync(join(ROOT, "scripts/privacy-allow.txt"), "utf8")
				.split(/\r?\n/)
				.map((l) => l.replace(/#.*/, "").trim())
				.filter(Boolean)
		: [],
);

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const EMAIL_OK = /(^|[.@])(noreply|no-reply)@|@users\.noreply\.github\.com$|@example\.(com|org|net)$|@anthropic\.com$/i;
const PHONE = /(?<![\w.])(?:\+?1[\s.-])?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?![\w.])/g;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const termRes = terms.map((t) => new RegExp(`(?<![A-Za-z0-9])${escapeRe(t)}(?![A-Za-z0-9])`, "i"));

const findings = [];
const notes = [];

function fingerprint(target, file, kind, match) {
	return createHash("sha256").update(`${target}|${file}|${kind}|${match.toLowerCase()}`).digest("hex").slice(0, 16);
}

function report(target, file, line, kind, match, label) {
	const fp = fingerprint(target, file, kind, match);
	if (allow.has(fp)) return;
	findings.push(`${target} · ${file}:${line} · ${label} · fingerprint ${fp}`);
}

function scanText(target, file, text) {
	const lines = text.split(/\r?\n/);
	lines.forEach((ln, i) => {
		const n = i + 1;
		termRes.forEach((re, k) => {
			const m = re.exec(ln);
			if (m) report(target, file, n, `term${k}`, m[0], `private term #${k + 1}`);
		});
		for (const m of ln.matchAll(EMAIL)) {
			if (!EMAIL_OK.test(m[0])) report(target, file, n, "email", m[0], "email address");
		}
		for (const m of ln.matchAll(PHONE)) report(target, file, n, "phone", m[0], "phone-number-shaped text");
	});
}

// ── this repo ──────────────────────────────────────────────────────────────
const LOCAL_SKIP = /(^|\/)(node_modules|\.git|data)(\/|$)|package-lock\.json$|\.(png|jpe?g|gif|ico|woff2?)$/;
function walk(dir) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		const rel = relative(ROOT, p);
		if (LOCAL_SKIP.test(rel)) continue;
		if (statSync(p).isDirectory()) walk(p);
		else if (rel !== "scripts/privacy-allow.txt") scanText("daily-dash", rel, readFileSync(p, "utf8"));
	}
}
walk(ROOT);

// ── companion releases ─────────────────────────────────────────────────────
async function scanCompanions() {
	const targets = JSON.parse(readFileSync(join(ROOT, "scripts/privacy-targets.json"), "utf8"));
	const headers = { Accept: "application/vnd.github+json", "User-Agent": "daily-dash-privacy-scan" };
	if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
	for (const { repo } of targets) {
		const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers });
		if (res.status === 404) {
			notes.push(`${repo}: no public release (private repo or none yet) — not installable, so not scanned.`);
			continue;
		}
		if (!res.ok) {
			findings.push(`${repo}: could not read releases (HTTP ${res.status}) — can't confirm it's clean.`);
			continue;
		}
		const rel = await res.json();
		for (const name of ["main.js", "manifest.json", "styles.css"]) {
			const asset = (rel.assets ?? []).find((a) => a.name === name);
			if (!asset) continue;
			const r = await fetch(asset.browser_download_url, { headers: { "User-Agent": headers["User-Agent"] } });
			if (!r.ok) {
				findings.push(`${repo}: could not download ${name} (HTTP ${r.status}).`);
				continue;
			}
			scanText(`${repo}@${rel.tag_name}`, name, await r.text());
		}
		notes.push(`${repo}@${rel.tag_name}: scanned.`);
	}
}

if (!localOnly) await scanCompanions();

if (!terms.length) notes.push("PRIVACY_TERMS is not set: only emails and phone numbers were checked.");
for (const n of notes) console.log(`· ${n}`);
if (findings.length) {
	console.error(`\n✗ Privacy check found ${findings.length} thing(s) to review:`);
	for (const f of findings) console.error(`  - ${f}`);
	console.error("\nFix them at the source, or approve a false positive by adding its fingerprint to scripts/privacy-allow.txt.");
	process.exit(1);
}
console.log(`\n✓ Privacy check passed (${terms.length} private term(s), emails, phone numbers).`);
