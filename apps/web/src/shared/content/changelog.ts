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
		version: "0.2.0",
		date: "2026-11-17",
		title: "Record storage on devnet",
		features: [
			{
				text: "New tables store one record per on-chain account, so a primary-key read is a single account fetch instead of a page scan",
			},
			{
				text: "Reads, edits, deletes, index lookups, and SQL run against both storage layouts, chosen per table from its on-chain descriptor",
			},
			{
				text: "The Studio runs against program v0.3.0 on devnet, including the upgraded record and batch instructions",
			},
		],
		improvements: [
			{
				text: "Inserts and edits on new tables touch only the row and its index claims, so independent writers no longer queue on one table page",
			},
			{
				text: "Tables created from the SQL runner use the new layout too",
			},
		],
	},
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
