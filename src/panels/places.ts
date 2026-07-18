import { BasePanel, placard } from "./types";
import { commandButton } from "./util";

/**
 * Places / navigation (§5.8). A user-editable list of destinations: notes and
 * folders opened the way a link click does, plus command targets (e.g. today's
 * note, the recipe index). Edit the list in settings.
 */
export class PlacesPanel extends BasePanel {
	id = "places";
	title = "Places";

	protected renderBody(): void {
		placard(this.el, "Places");
		const grid = this.el.createDiv({ cls: "dash-places" });
		const places = this.ctx.settings().places;
		if (places.length === 0) {
			grid.createDiv({ cls: "dash-empty", text: "No places yet. Add shortcuts to your favourite notes and folders in the plugin settings." });
			return;
		}
		for (const place of places) {
			if (place.type === "command") {
				commandButton(grid, this.ctx.bridge, place.target, place.label, { cls: "dash-place-btn" });
			} else {
				const btn = grid.createEl("button", { cls: "dash-btn dash-place-btn", text: place.label });
				btn.addEventListener("click", () => {
					void this.ctx.app.workspace.openLinkText(place.target, "", false);
				});
			}
		}
	}
}
