import { Bridge } from "../core/bridge";

/** A button wired to an Obsidian command. If the command is missing (its plugin
 * isn't enabled), the button is shown disabled with a plain-language tooltip —
 * never a crash. */
export function commandButton(
	parent: HTMLElement,
	bridge: Bridge,
	fullId: string,
	label: string,
	opts: { cls?: string; onRun?: () => void } = {}
): HTMLButtonElement {
	const btn = parent.createEl("button", { cls: `dash-btn ${opts.cls ?? ""}`.trim(), text: label });
	if (!bridge.commandExists(fullId)) {
		btn.setAttr("disabled", "true");
		btn.addClass("is-unavailable");
		btn.setAttr("title", "This button needs its plugin. Enable the matching plugin to turn it on.");
		return btn;
	}
	btn.addEventListener("click", () => {
		bridge.runCommand(fullId);
		opts.onRun?.();
	});
	return btn;
}
