export type RoadmapItemStatus = "completed" | "planned" | "in-progress";

export type RoadmapItemTask = {
	title: string;
	status: RoadmapItemStatus;
};

export type RoadmapItem = {
	title: string;
	status: RoadmapItemStatus;
	items: RoadmapItemTask[];
};

export const roadmapItems: RoadmapItem[] = [
	{
		title: "Foundation",
		status: "completed",
		items: [
			{ title: "Rebuild the fork as a pnpm + Turborepo monorepo", status: "completed" },
			{ title: "Wallet Standard connection with no vendor dependency", status: "completed" },
			{ title: "RPC health checks across clusters", status: "completed" },
			{ title: "TypeScript SDK with transport, wallet, and RPC ports", status: "completed" },
			{ title: "Capability-gated Studio sections", status: "completed" },
		],
	},
	{
		title: "Program integration",
		status: "in-progress",
		items: [
			{
				title: "Publish the deployed program ID and IDL from peridotbase-core",
				status: "in-progress",
			},
			{ title: "Database and table discovery", status: "planned" },
			{ title: "Row reads with cursor pagination", status: "planned" },
			{ title: "Row inserts, updates, and deletes", status: "planned" },
			{ title: "Table and column DDL", status: "planned" },
			{ title: "Query execution", status: "planned" },
			{ title: "Index listing and management", status: "planned" },
			{ title: "Live table refresh", status: "planned" },
		],
	},
	{
		title: "Studio",
		status: "in-progress",
		items: [
			{
				title: "Spreadsheet grid with range selection and pending edits",
				status: "completed",
			},
			{ title: "Schema visualizer with foreign-key edges", status: "completed" },
			{ title: "Monaco SQL runner with result grid", status: "completed" },
			{ title: "CSV and JSON export built from SDK reads", status: "completed" },
			{ title: "Command palette and keyboard navigation", status: "completed" },
			{ title: "Light, dark, and system themes", status: "completed" },
			{ title: "AI assistant scoped to the open database schema", status: "completed" },
			{ title: "Query history and saved queries", status: "planned" },
			{ title: "Transaction preview and rollback", status: "planned" },
			{ title: "Migration diff drafts with human review", status: "planned" },
		],
	},
	{
		title: "Ecosystem",
		status: "planned",
		items: [
			{ title: "SDK cookbook and framework examples", status: "planned" },
			{ title: "Hosted read-only explorer for public databases", status: "planned" },
			{ title: "Wallet-scoped access grants and sharing", status: "planned" },
			{ title: "Indexer and analytics pipeline guide", status: "planned" },
		],
	},
];
