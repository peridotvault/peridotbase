export type ChangelogEntry = {
	text: string;
};

export type ChangelogItem = {
	version: string;
	date: string;
	title: string;
	features?: ChangelogEntry[];
	improvements?: ChangelogEntry[];
	bugsFixed?: ChangelogEntry[];
};

/**
 * Studio releases. Each entry describes what a user can see or do; implementation detail stays
 * in the commit history.
 */
export const changelog: ChangelogItem[] = [
	{
		version: "0.1.0",
		date: "2026-11-11",
		title: "Peridotbase Studio, rebuilt from the fork",
		features: [
			{
				text: "A wallet-connected workspace for Solana: connect through Wallet Standard and pick a cluster or custom RPC endpoint",
			},
			{
				text: "Table, schema, runner, indexes, and visualizer sections preserved from the db-studio interface",
			},
			{
				text: "Table and query exports generated in the browser as CSV or JSON",
			},
			{
				text: "Bring-your-own-key AI assistant for Gemini, OpenAI, and Anthropic",
			},
			{
				text: "A TypeScript SDK that exposes the same client the Studio uses",
			},
		],
		improvements: [
			{
				text: "Every action gated by a capability flag, so a control never appears available before the program implements it",
			},
			{
				text: "The Studio reports unwired program operations as pending integration instead of failing silently",
			},
		],
		bugsFixed: [
			{
				text: "Removed the Hono/Elysia server, database drivers, Electron shell, and hosted AI relay from the fork",
			},
		],
	},
];
