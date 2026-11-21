import { Database, FileCode2, ListOrdered, Rows3, Table2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
	SiDrizzle,
	SiGithubactions,
	SiNextdotjs,
	SiPostgresql,
	SiPrisma,
	SiReact,
	SiSolana,
} from "react-icons/si";
import { Pipeline, type PipelineNode } from "./pipeline";

/** How Peridotbase works under the hood, one tab per flow. Each flow has its own shape:
 *  different entry points, hops, and fan-out. Illustrative only. */

const icon = "size-4 fill-current";
const logo = <img src="/logo.svg" alt="" className="size-4" />;

const react: PipelineNode = {
	id: "react",
	title: "React",
	description: "Web apps",
	status: "Client hook",
	icon: <SiReact className={icon} aria-hidden />,
};

const next: PipelineNode = {
	id: "next",
	title: "Next.js",
	description: "App Router",
	status: "Route handler",
	icon: <SiNextdotjs className={icon} aria-hidden />,
};

const github: PipelineNode = {
	id: "github",
	title: "GitHub",
	description: "Actions and CI",
	status: "Push job",
	icon: <SiGithubactions className={icon} aria-hidden />,
};

const sdk = (description: string, status: string): PipelineNode => ({
	id: "sdk",
	title: "Peridotbase SDK",
	description,
	status,
	icon: logo,
});

const pda = (id: string, title: string): PipelineNode => ({
	id,
	title,
	description: "Database PDA",
	status: "On-chain",
	icon: <Database className="size-4" aria-hidden />,
});

const program: PipelineNode = {
	id: "program",
	title: "Solana program",
	description: "peridotbase_core",
	status: "Slot 285,412,888",
	icon: <SiSolana className={icon} aria-hidden />,
};

const database = (id: string, title: string, status: string): PipelineNode => ({
	id,
	title,
	description: "Database account",
	status,
	icon: <Database className="size-4" aria-hidden />,
});

type Flow = {
	id: string;
	label: string;
	/** Shown below `sm`, where four full labels do not fit. */
	short: string;
	title: string;
	blurb: ReactNode;
	nodes: PipelineNode[];
	edges: [string, string][];
};

const FLOWS: Flow[] = [
	{
		id: "orm",
		label: "From ORM",
		short: "ORM",
		title: "Migrate from your ORM",
		blurb: (
			<>
				Generate migration SQL from your ORM, then run it through the SDK. No database
				connection — just DDL.
			</>
		),
		nodes: [
			{
				id: "prisma",
				title: "Prisma",
				description: "prisma migrate diff",
				status: "schema.prisma",
				icon: <SiPrisma className={icon} aria-hidden />,
			},
			{
				id: "drizzle",
				title: "Drizzle",
				description: "drizzle-kit generate",
				status: "schema.ts",
				icon: <SiDrizzle className={icon} aria-hidden />,
			},
			{
				id: "dump",
				title: "pg_dump",
				description: "Postgres schema",
				status: "--schema-only",
				icon: <SiPostgresql className={icon} aria-hidden />,
			},
			{
				id: "sql",
				title: "Migration SQL",
				description: "Plain DDL",
				status: "schema.sql",
				icon: <FileCode2 className="size-4" aria-hidden />,
			},
			sdk("parseSql + batch", "create_table × 12"),
			program,
			{
				id: "users",
				title: "users",
				description: "Table account",
				status: "1,204 rows",
				icon: <Table2 className="size-4" aria-hidden />,
			},
			{
				id: "orders",
				title: "orders",
				description: "Table account",
				status: "8,912 rows",
				icon: <Table2 className="size-4" aria-hidden />,
			},
			{
				id: "events",
				title: "events",
				description: "Table account",
				status: "312 rows",
				icon: <Table2 className="size-4" aria-hidden />,
			},
		],
		edges: [
			["prisma", "sql"],
			["drizzle", "sql"],
			["dump", "sql"],
			["sql", "sdk"],
			["sdk", "program"],
			["program", "users"],
			["program", "orders"],
			["program", "events"],
		],
	},
	{
		id: "project",
		label: "Create project",
		short: "Project",
		title: "Create a project",
		blurb: (
			<>
				Start in the Studio: one project, many databases. Then point the SDK at that project
				and the same accounts follow you into code.
			</>
		),
		nodes: [
			{
				id: "studio",
				title: "Peridotbase Studio",
				description: "Projects and databases",
				status: "acme",
				icon: logo,
			},
			database("dev", "development", "acme/development"),
			database("staging", "staging", "acme/staging"),
			database("prod", "production", "acme/production"),
			sdk("Talks to the project", "listTables()"),
			program,
			pda("pda-dev", "development"),
			pda("pda-staging", "staging"),
			pda("pda-prod", "production"),
		],
		edges: [
			["studio", "dev"],
			["studio", "staging"],
			["studio", "prod"],
			["dev", "sdk"],
			["staging", "sdk"],
			["prod", "sdk"],
			["sdk", "program"],
			["program", "pda-dev"],
			["program", "pda-staging"],
			["program", "pda-prod"],
		],
	},
	{
		id: "write",
		label: "Write a row",
		short: "Write row",
		title: "Write a row",
		blurb: (
			<>
				Rows are instructions. The SDK stages{" "}
				<code className="font-mono text-foreground">insertRows</code>, and the program writes
				the row plus its index entries.
			</>
		),
		nodes: [
			react,
			next,
			github,
			sdk("Stages rows", "insertRows([…])"),
			program,
			{
				id: "row",
				title: "Row account",
				description: "Table scoped",
				status: "row 1,205",
				icon: <Table2 className="size-4" aria-hidden />,
			},
			{
				id: "index",
				title: "Index entry",
				description: "Secondary key",
				status: "players_status_idx",
				icon: <ListOrdered className="size-4" aria-hidden />,
			},
		],
		edges: [
			["react", "sdk"],
			["next", "sdk"],
			["github", "sdk"],
			["sdk", "program"],
			["program", "row"],
			["program", "index"],
		],
	},
	{
		id: "read",
		label: "Read rows",
		short: "Read rows",
		title: "Read rows",
		blurb: (
			<>
				Reads are plain account reads. The SDK calls{" "}
				<code className="font-mono text-foreground">readRows</code>, then decodes and filters
				the rows in your app. No API to build.
			</>
		),
		nodes: [
			react,
			next,
			sdk("Reads rows", "readRows()"),
			{
				...program,
				description: "Table accounts",
				status: "players · 1,204",
			},
			{
				id: "rows",
				title: "Rendered rows",
				description: "No API, no server",
				status: "Filtered in app",
				icon: <Rows3 className="size-4" aria-hidden />,
			},
		],
		edges: [
			["react", "sdk"],
			["next", "sdk"],
			["sdk", "program"],
			["program", "rows"],
		],
	},
];

export function HowItWorks({ className }: { className?: string }) {
	const [activeIndex, setActiveIndex] = useState(0);
	const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const flow = FLOWS[activeIndex];

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

		event.preventDefault();

		const target =
			event.key === "ArrowRight"
				? (activeIndex + 1) % FLOWS.length
				: (activeIndex - 1 + FLOWS.length) % FLOWS.length;

		setActiveIndex(target);
		tabRefs.current[target]?.focus();
	};

	return (
		<div className={className}>
			<div className="flex flex-col items-center gap-3 text-center">
				<p className="font-mono text-xs uppercase tracking-widest text-foreground-lighter">
					How it works
				</p>
				<h2
					key={flow.id}
					className="max-w-2xl text-3xl font-medium tracking-tight text-balance text-foreground animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none sm:text-4xl md:text-5xl"
				>
					{flow.title}
				</h2>
				<p
					key={`${flow.id}-blurb`}
					className="min-h-12 max-w-xl text-balance text-foreground-light animate-in fade-in duration-300 motion-reduce:animate-none"
				>
					{flow.blurb}
				</p>
			</div>

			<div
				role="tablist"
				aria-label="Flow"
				onKeyDown={handleKeyDown}
				className="mt-8 flex items-center justify-start gap-2 overflow-x-auto [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden"
			>
				{FLOWS.map((item, index) => {
					const isActive = index === activeIndex;

					return (
						<button
							key={item.id}
							ref={(node) => {
								tabRefs.current[index] = node;
							}}
							type="button"
							role="tab"
							id={`flow-tab-${item.id}`}
							aria-selected={isActive}
							aria-controls="flow-panel"
							tabIndex={isActive ? 0 : -1}
							onClick={() => setActiveIndex(index)}
							className={`inline-flex flex-none items-center whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3.5 sm:py-2 sm:text-sm ${
								isActive
									? "border-border-strong bg-surface-75 font-medium text-foreground shadow-sm"
									: "border-transparent text-foreground-light hover:border-border-default hover:text-foreground"
							}`}
						>
							<span className="sm:hidden">{item.short}</span>
							<span className="hidden sm:inline">{item.label}</span>
						</button>
					);
				})}
			</div>

			<div
				role="tabpanel"
				id="flow-panel"
				aria-labelledby={`flow-tab-${flow.id}`}
				className="mt-10 animate-in fade-in duration-300 motion-reduce:animate-none"
			>
				<Pipeline
					key={flow.id}
					nodes={flow.nodes}
					edges={flow.edges}
					nodeWidth={190}
					radius={12}
					theme="dark"
					accentColor="#87e08b"
					nodeColor="#1e1e1e"
					textColor="#ededed"
				/>
			</div>
		</div>
	);
}
