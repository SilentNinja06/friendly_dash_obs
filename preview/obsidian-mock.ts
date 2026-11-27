/* Browser stand-in for the Obsidian API, for screenshots only. Not shipped. */
// @ts-nocheck
import momentLib from "moment";
export const moment = momentLib;

type Attrs = { cls?: string | string[]; text?: string; attr?: Record<string, unknown>; type?: string; value?: string; placeholder?: string; href?: string };
function apply(el: HTMLElement, o?: Attrs | string) {
	if (!o) return el;
	if (typeof o === "string") { el.className = o; return el; }
	if (o.cls) el.className = Array.isArray(o.cls) ? o.cls.join(" ") : o.cls;
	if (o.text !== undefined) el.textContent = String(o.text);
	if (o.type) el.setAttribute("type", o.type);
	if (o.value !== undefined) (el as HTMLInputElement).value = o.value;
	if (o.placeholder) el.setAttribute("placeholder", o.placeholder);
	if (o.href) el.setAttribute("href", o.href);
	if (o.attr) for (const [k, v] of Object.entries(o.attr)) if (v != null) el.setAttribute(k, String(v));
	return el;
}
const P = (Element.prototype as any);
P.createEl = function (tag: string, o?: Attrs, cb?: (e: HTMLElement) => void) { const e = apply(document.createElement(tag), o); this.appendChild(e); cb?.(e); return e; };
P.createDiv = function (o?: Attrs, cb?: any) { return this.createEl("div", o, cb); };
P.createSpan = function (o?: Attrs, cb?: any) { return this.createEl("span", o, cb); };
P.empty = function () { while (this.firstChild) this.removeChild(this.firstChild); };
P.setText = function (t: string) { this.textContent = t; };
P.addClass = function (...c: string[]) { this.classList.add(...c.flatMap((x) => x.split(" ").filter(Boolean))); };
P.addClasses = function (c: string[]) { this.classList.add(...c); };
P.removeClass = function (...c: string[]) { this.classList.remove(...c); };
P.toggleClass = function (c: string, v: boolean) { this.classList.toggle(c, v); };
P.hasClass = function (c: string) { return this.classList.contains(c); };
P.setAttr = function (k: string, v: string) { this.setAttribute(k, v); };
P.onClickEvent = function (fn: any) { this.addEventListener("click", fn); };
P.hide = function () { this.style.display = "none"; };
P.show = function () { this.style.display = ""; };
P.setCssStyles = function (s: any) { Object.assign(this.style, s); };
P.instanceOf = function (c: any) { return this instanceof c; };
(window as any).createDiv = (o?: Attrs) => apply(document.createElement("div"), o);
(window as any).createEl = (t: string, o?: Attrs) => apply(document.createElement(t), o);
(window as any).createSpan = (o?: Attrs) => apply(document.createElement("span"), o);
(window as any).createFragment = (cb?: any) => { const f = document.createDocumentFragment(); cb?.(f); return f; };
(DocumentFragment.prototype as any).createEl = P.createEl; (DocumentFragment.prototype as any).createDiv = P.createDiv; (DocumentFragment.prototype as any).createSpan = P.createSpan;

const ICONS: Record<string, string> = { "arrow-up": "↑", "arrow-down": "↓", plus: "+", search: "⌕", "refresh-cw": "↻", check: "✓", x: "×", "chevron-left": "‹", "chevron-right": "›", calendar: "▦", pencil: "✎", trash: "🗑", star: "★" };
export function setIcon(el: HTMLElement, name: string) { el.textContent = ICONS[name] ?? "•"; }
export function normalizePath(p: string) { return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, ""); }
export const Platform = { isMobile: false, isDesktop: true, isIosApp: false, isMacOS: false, isPhone: false };
export class Notice { constructor(m: any) { console.log("[Notice]", String(m)); } setMessage() { return this; } hide() {} }
export class TAbstractFile { path = ""; name = ""; parent: any = null; }
export class TFile extends TAbstractFile { stat = { mtime: Date.now(), ctime: Date.now(), size: 0 }; get basename() { return this.name.replace(/\.[^.]+$/, ""); } get extension() { const m = this.name.match(/\.([^.]+)$/); return m ? m[1] : ""; } }
export class TFolder extends TAbstractFile { children: TAbstractFile[] = []; }
export async function requestUrl() { throw new Error("offline"); }
export function getAllTags() { return []; }
export function prepareFuzzySearch(q: string) { const l = q.toLowerCase(); return (t: string) => (t.toLowerCase().includes(l) ? { score: 1, matches: [] } : null); }
export const MarkdownRenderer = { render: async (_a: any, md: string, el: HTMLElement) => { el.createDiv({ text: md }); }, renderMarkdown: async (md: string, el: HTMLElement) => { el.createDiv({ text: md }); } };
export class Component { load() {} unload() {} addChild(c: any) { return c; } register() {} registerEvent() {} registerDomEvent() {} registerInterval(i: number) { return i; } }
export class Modal { modalEl = document.createElement("div"); contentEl: HTMLElement; titleEl: HTMLElement; constructor(public app: any) { this.titleEl = (this.modalEl as any).createDiv(); this.contentEl = (this.modalEl as any).createDiv(); } open() { (this as any).onOpen?.(); } close() { (this as any).onClose?.(); } setTitle(t: string) { this.titleEl.setText(t); return this; } }
export class FuzzySuggestModal<T> extends Modal { setPlaceholder() {} }
export class SuggestModal<T> extends Modal { setPlaceholder() {} }
export class ItemView extends Component { contentEl: HTMLElement; containerEl: HTMLElement; app: any; constructor(public leaf: any) { super(); this.app = leaf.app; this.containerEl = document.createElement("div"); this.contentEl = (this.containerEl as any).createDiv({ cls: "view-content" }); } }
export class MarkdownView {}
export class WorkspaceLeaf {}
export class PluginSettingTab { containerEl = document.createElement("div"); constructor(public app: any, public plugin: any) {} }
export class Setting { settingEl: HTMLElement; constructor(el: HTMLElement) { this.settingEl = (el as any).createDiv(); } setName() { return this; } setDesc() { return this; } setHeading() { return this; } addText() { return this; } addToggle() { return this; } addButton() { return this; } addTextArea() { return this; } addDropdown() { return this; } addExtraButton() { return this; } setClass() { return this; } }
export class Plugin extends Component { app: any; manifest: any; constructor(app: any, manifest: any) { super(); this.app = app; this.manifest = manifest; } async loadData() { return null; } async saveData() {} registerView() {} addSettingTab() {} addRibbonIcon() { return document.createElement("div"); } addCommand() {} registerObsidianProtocolHandler() {} addStatusBarItem() { return document.createElement("div"); } }
