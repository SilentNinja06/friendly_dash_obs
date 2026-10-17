import { App, Modal, Platform } from "obsidian";

/**
 * A modal that sits at the bottom of the screen on a phone and stays above the
 * on-screen keyboard. Subclasses draw into `renderBody(root)`; on the desktop it
 * is an ordinary centred modal.
 */
export abstract class SheetModal extends Modal {
	private vvHandler: (() => void) | null = null;

	constructor(app: App) {
		super(app);
	}

	protected abstract renderBody(root: HTMLElement): void;

	onOpen(): void {
		this.modalEl.addClass("dash-sheet");
		if (Platform.isMobile) {
			this.modalEl.addClass("dash-sheet-mobile");
			this.trackKeyboard();
		}
		this.contentEl.addClass("dash-sheet-body");
		this.renderBody(this.contentEl);
	}

	/** Lift the sheet by the keyboard's height so fields are never hidden behind it. */
	private trackKeyboard(): void {
		const vv = window.visualViewport;
		if (!vv) return;
		const apply = () => {
			const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
			this.modalEl.style.marginBottom = `${keyboard}px`;
			this.modalEl.style.maxHeight = `${vv.height - 12}px`;
		};
		this.vvHandler = apply;
		vv.addEventListener("resize", apply);
		apply();
	}

	onClose(): void {
		if (this.vvHandler) window.visualViewport?.removeEventListener("resize", this.vvHandler);
		this.vvHandler = null;
		this.contentEl.empty();
	}
}
