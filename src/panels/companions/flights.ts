import { BasePanel, placard } from "../types";
import { companionPlugin } from "../../companions/registry";

/** Brainstormer's read-only status API (its src/api.ts, version 1). Mirrored,
 * not imported: the plugins ship separately. */
interface Place {
	iata: string;
	city: string;
}
interface FlightStatus {
	from: Place;
	to: Place;
	task?: string;
	tag?: string;
	dueAt: number | null;
	remainingMs: number;
	progress: number;
	paused: boolean;
	phase: string;
}
interface BrainstormerApi {
	version: number;
	activeFlight(): FlightStatus | null;
	location(): Place | null;
	onChange(cb: () => void): () => void;
	openBook(): void;
	openDeck(): void;
	renderGlobe?(el: HTMLElement, size: number): boolean;
}

const PHASE: Record<string, string> = {
	boarding: "Boarding",
	taxi: "Taxiing",
	takeoff: "Take-off",
	climb: "Climbing",
	cruise: "Cruising",
	descent: "Descending",
	holding: "Holding",
	approach: "On approach",
	"taxi-in": "Taxiing to gate",
	paused: "Paused",
};

export function phaseLabel(phase: string): string {
	return PHASE[phase] ?? phase.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Flights — the Brainstormer focus flight in progress, or where you are. */
export class FlightsPanel extends BasePanel {
	id = "flights";
	title = "Flights";

	private unsub: (() => void) | null = null;
	private subscribedTo: BrainstormerApi | null = null;
	private live: { time: HTMLElement; bar: HTMLElement; eta: HTMLElement } | null = null;
	private globe: HTMLElement | null = null;
	private globeAt = 0;

	protected async setup(): Promise<void> {
		this.setInterval(() => this.tick(), 1000);
		this.onCleanup(() => this.unsub?.());
	}

	private api(): BrainstormerApi | null {
		const api = companionPlugin(this.ctx.app, "brainstormer")?.api as Partial<BrainstormerApi> | undefined;
		if (!api || api.version !== 1 || typeof api.activeFlight !== "function") return null;
		return api as BrainstormerApi;
	}

	protected async renderBody(): Promise<void> {
		this.live = null;
		this.globe = null;
		const api = this.api();
		const head = placard(this.el, "Flights");
		if (!api) {
			this.el.createDiv({ cls: "dash-muted", text: "Update Brainstormer to see your flights here." });
			return;
		}
		this.subscribe(api);
		const tools = head.createDiv({ cls: "dash-qotd-tools" });
		tools.createEl("button", { cls: "dash-qotd-add", text: "↗", attr: { "aria-label": "Open the flight deck" } }).addEventListener("click", () => api.openDeck());

		const card = this.el.createDiv({ cls: "cmp-card" });
		const f = safe(() => api.activeFlight());
		if (f) {
			const route = card.createDiv({ cls: "cmp-route" });
			route.createSpan({ cls: "cmp-code", text: f.from.iata });
			route.createSpan({ cls: "cmp-dash" });
			route.createSpan({ cls: "cmp-plane", text: "✈" });
			route.createSpan({ cls: "cmp-dash" });
			route.createSpan({ cls: "cmp-code", text: f.to.iata });
			const status = card.createDiv({ cls: "cmp-line" });
			status.createSpan({ cls: "cmp-tag" + (f.paused ? " is-warn" : ""), text: phaseLabel(f.phase) });
			status.createSpan({ cls: "dash-muted", text: ` ${f.from.city} → ${f.to.city}` });
			if (f.task || f.tag) card.createDiv({ cls: "cmp-note", text: f.task || f.tag || "" });
			this.drawGlobe(api, card);
			const bar = card.createDiv({ cls: "cmp-bar" }).createDiv({ cls: "cmp-bar-fill" });
			const nums = card.createDiv({ cls: "cmp-nums" });
			this.live = { time: nums.createSpan({ cls: "cmp-big" }), bar, eta: nums.createSpan({ cls: "dash-muted" }) };
			this.tick();
			card.createDiv({ cls: "dash-btn-row" }).createEl("button", { cls: "dash-btn", text: "Open flight deck" }).addEventListener("click", () => api.openDeck());
		} else {
			const here = safe(() => api.location());
			card.createDiv({ cls: "cmp-line", text: here ? `You're in ${here.city} (${here.iata}).` : "Pick a home airport to start flying." });
			this.drawGlobe(api, card);
			const row = card.createDiv({ cls: "dash-btn-row" });
			row.createEl("button", { cls: "dash-btn dash-btn-primary", text: "Book a flight" }).addEventListener("click", () => api.openBook());
			row.createEl("button", { cls: "dash-btn", text: "Open flight deck" }).addEventListener("click", () => api.openDeck());
		}
	}

	private tick(): void {
		const live = this.live;
		if (!live || !live.time.isConnected) return;
		const api = this.api();
		const f = api ? safe(() => api.activeFlight()) : null;
		if (!f) {
			this.rerender();
			return;
		}
		live.time.setText(f.paused ? `${clock(f.remainingMs)} · paused` : `${clock(f.remainingMs)} left`);
		live.bar.style.width = `${Math.max(0, Math.min(1, f.progress)) * 100}%`;
		live.eta.setText(f.dueAt ? `Lands ${new Date(f.dueAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "");
		if (api && this.globe && Date.now() - this.globeAt > 15_000) this.paintGlobe(api);
	}

	private drawGlobe(api: BrainstormerApi, card: HTMLElement): void {
		if (typeof api.renderGlobe !== "function") return;
		this.globe = card.createDiv({ cls: "cmp-globe" });
		this.globe.addEventListener("click", () => api.openDeck());
		this.paintGlobe(api);
	}

	private paintGlobe(api: BrainstormerApi): void {
		const g = this.globe;
		if (!g) return;
		this.globeAt = Date.now();
		const size = Math.min(280, Math.max(160, this.el.clientWidth || 240));
		g.toggleClass("is-empty", !safe(() => api.renderGlobe!(g, size)));
	}

	private subscribe(api: BrainstormerApi): void {
		if (this.subscribedTo === api) return;
		this.unsub?.();
		this.subscribedTo = api;
		this.unsub = safe(() => api.onChange(() => this.rerender())) ?? null;
	}
}

function safe<T>(fn: () => T): T | null {
	try {
		return fn();
	} catch (e) {
		console.warn("Daily Dashboard: Brainstormer status unavailable", e);
		return null;
	}
}

function clock(ms: number): string {
	const total = Math.max(0, Math.ceil(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const mm = String(m).padStart(2, "0");
	const ss = String(s).padStart(2, "0");
	return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
