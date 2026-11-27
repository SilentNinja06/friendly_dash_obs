/** Links shown under Settings → Support & updates. */
export interface SupportLink {
	label: string;
	blurb: string;
	cta: string;
	url: string;
}

export const SUPPORT_LINKS: SupportLink[] = [
	{
		label: "Announcements on Signal",
		blurb: "Release notes and news, in a Signal announcement group.",
		cta: "Join on Signal",
		url: "https://signal.group/#CjQKIE0SrZPTQLhQDCNcponi2KvgzOTbpyvwB7t57bbtBK_vEhDZsGKwWZHJMpBLz8AgGrMe",
	},
	{
		label: "Discord server",
		blurb: "Announcements for the whole project, plus a place to ask questions.",
		cta: "Join on Discord",
		url: "https://discord.gg/KcKG73WGq",
	},
	{
		label: "Buy me a coffee",
		blurb: "If the dashboard helps you, a coffee helps keep it going.",
		cta: "Buy me a coffee",
		url: "https://buymeacoffee.com/pipertruac1",
	},
];
