import { requestUrl } from "obsidian";

/**
 * Minimal, mobile-safe AI client for the daily brief / end-of-day summary.
 *
 * All calls go through Obsidian's `requestUrl`, not `fetch`: it bypasses CORS
 * and works identically on iOS and desktop, and it keeps the bundle free of Node
 * built-ins (the mobile-safety contract). Two provider shapes are supported —
 * Anthropic's Messages API and any OpenAI-compatible `/chat/completions` endpoint
 * — chosen in settings so the user can point it at whatever they already pay for.
 *
 * Nothing here logs or persists the request body; the caller decides what data
 * the prompt contains (the brief honours per-category privacy toggles).
 */

export type AiProvider = "anthropic" | "openai";

export interface AiConfig {
	provider: AiProvider;
	apiKey: string;
	/** OpenAI-compatible base URL (ignored for Anthropic). */
	baseUrl: string;
	model: string;
}

export interface AiResult {
	ok: boolean;
	text: string;
	/** Present when ok is false — a short, user-facing reason. */
	error?: string;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/** Run one non-streaming completion. Returns `{ ok:false, error }` rather than
 * throwing, so callers can surface a Notice without try/catch noise. */
export async function aiComplete(cfg: AiConfig, system: string, user: string, maxTokens = 4000): Promise<AiResult> {
	if (!cfg.apiKey.trim()) return { ok: false, text: "", error: "No API key set — add one in Settings → Daily Dashboard." };
	try {
		return cfg.provider === "anthropic"
			? await anthropic(cfg, system, user, maxTokens)
			: await openai(cfg, system, user, maxTokens);
	} catch (e) {
		return { ok: false, text: "", error: describeError(e) };
	}
}

/** Models that accept the server-side refusal fallback (`fallbacks: "default"`):
 * if the model declines a request, the API re-runs it on a suitable fallback
 * model inside the same call instead of returning nothing. */
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);

async function anthropic(cfg: AiConfig, system: string, user: string, maxTokens: number): Promise<AiResult> {
	const model = cfg.model.trim() || "claude-opus-5-5";
	const fallback = FALLBACK_MODELS.has(model);
	const headers: Record<string, string> = {
		"content-type": "application/json",
		"x-api-key": cfg.apiKey.trim(),
		"anthropic-version": ANTHROPIC_VERSION,
		// Permit the request from Obsidian's webview origin.
		"anthropic-dangerous-direct-browser-access": "true",
	};
	if (fallback) headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
	const res = await requestUrl({
		url: ANTHROPIC_URL,
		method: "POST",
		headers,
		body: JSON.stringify({
			model,
			max_tokens: maxTokens,
			// A short daily summary doesn't need deep reasoning; keep it quick and cheap.
			output_config: { effort: "low" },
			...(fallback ? { fallbacks: "default" } : {}),
			system,
			messages: [{ role: "user", content: user }],
		}),
		throw: false,
	});
	if (res.status >= 400) return { ok: false, text: "", error: apiError(res.status, res.json) };
	if (res.json?.stop_reason === "refusal") return { ok: false, text: "", error: "The model declined to write this one. Try again later." };
	// Only `text` blocks are the answer; `thinking` and other blocks are skipped.
	const parts = res.json?.content;
	const text = Array.isArray(parts)
		? parts
				.filter((p: { type?: string }) => p?.type === "text")
				.map((p: { text?: string }) => p.text ?? "")
				.join("")
				.trim()
		: "";
	if (!text) return { ok: false, text: "", error: "The model returned an empty response." };
	return { ok: true, text };
}

async function openai(cfg: AiConfig, system: string, user: string, maxTokens: number): Promise<AiResult> {
	const base = (cfg.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
	const res = await requestUrl({
		url: `${base}/chat/completions`,
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${cfg.apiKey.trim()}`,
		},
		body: JSON.stringify({
			model: cfg.model || "gpt-4o-mini",
			max_tokens: maxTokens,
			messages: [
				{ role: "system", content: system },
				{ role: "user", content: user },
			],
		}),
		throw: false,
	});
	if (res.status >= 400) return { ok: false, text: "", error: apiError(res.status, res.json) };
	const text = String(res.json?.choices?.[0]?.message?.content ?? "").trim();
	if (!text) return { ok: false, text: "", error: "The model returned an empty response." };
	return { ok: true, text };
}

function apiError(status: number, json: unknown): string {
	const msg =
		(json as { error?: { message?: string } })?.error?.message ??
		(json as { message?: string })?.message ??
		"";
	const base = `AI request failed (${status})`;
	if (status === 401 || status === 403) return `${base}: check your API key.`;
	if (status === 429) return `${base}: rate limited or out of credit.`;
	return msg ? `${base}: ${msg}` : base;
}

function describeError(e: unknown): string {
	const m = e instanceof Error ? e.message : String(e);
	if (/net::|network|Failed to fetch|ENOTFOUND|ETIMEDOUT/i.test(m)) return "Couldn't reach the AI service — check your connection.";
	return `AI request error: ${m}`;
}
