import { BasePanel, placard } from "./types";
import { verseForDate } from "../core/verse";
import { verseCounts, verseText, reference, TRANSLATION } from "../core/proverbs";

/**
 * Verse of the Day (§4). A single Proverbs verse chosen deterministically from
 * the local calendar date — chapter = day of month, verse advancing per-chapter.
 * No commentary, no interpretation; just the verse, its reference, and "KJV".
 * This is the panel most likely to be read every morning, so it is given the
 * most typographic care in the stylesheet.
 */
export class VersePanel extends BasePanel {
	id = "verse";
	title = "Verse of the Day";
	private shownRef = "";

	protected async setup(): Promise<void> {
		// The verse only changes at local midnight; re-render when the day flips.
		this.setInterval(() => {
			const { chapter, verse } = verseForDate(new Date(), verseCounts());
			if (reference(chapter, verse) !== this.shownRef) this.rerender();
		}, 60 * 1000);
	}

	protected renderBody(): void {
		placard(this.el, "Verse of the Day");
		const { chapter, verse } = verseForDate(new Date(), verseCounts());
		this.shownRef = reference(chapter, verse);

		const card = this.el.createDiv({ cls: "dash-verse" });
		card.createDiv({ cls: "dash-verse-text", text: `“${verseText(chapter, verse)}”` });
		const cite = card.createDiv({ cls: "dash-verse-cite" });
		cite.createSpan({ cls: "dash-verse-ref", text: reference(chapter, verse) });
		cite.createSpan({ cls: "dash-verse-translation", text: TRANSLATION });
	}
}
