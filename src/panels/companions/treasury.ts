import { BasePanel, placard } from "../types";
import { runCompanionCommand } from "../../companions/registry";

/** Treasury — a quick way into your budget. (Balances stay in Treasury itself.) */
export class TreasuryPanel extends BasePanel {
	id = "treasury";
	title = "Budget";

	protected renderBody(): void {
		const open = () => runCompanionCommand(this.ctx.app, "treasury:open-treasury");
		placard(this.el, "Budget");
		const card = this.el.createDiv({ cls: "cmp-card" });
		card.createDiv({ cls: "dash-muted", text: "Your budget, accounts and upcoming bills live in Treasury." });
		card.createDiv({ cls: "dash-btn-row" }).createEl("button", { cls: "dash-btn dash-btn-primary", text: "Open budget" }).addEventListener("click", open);
	}
}
