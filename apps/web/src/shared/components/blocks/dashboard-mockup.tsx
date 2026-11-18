import {
	Building2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ClipboardCheck,
	Columns3,
	Database,
	Eraser,
	Filter,
	FolderKanban,
	GitBranch,
	Key,
	LayoutDashboard,
	PanelLeft,
	Plug,
	Plus,
	Radio,
	RefreshCw,
	Save,
	Search,
	SquareTerminal,
	Trash2,
	Workflow,
} from "lucide-react";

/** Landing hero mock: the Studio as a window, cut by the hero floor. Mirrors the real shell —
 *  nav rail, database sidebar, Data tabs, table toolbar, rows grid and footer. Decorative only. */

const RAIL = [
	{ icon: LayoutDashboard, label: "overview" },
	{ icon: Database, label: "database", active: true },
	{ icon: SquareTerminal, label: "runner" },
	{ icon: Workflow, label: "visualizer" },
	{ icon: Plug, label: "workspace" },
];

const TABLES = [
	{ label: "players", rows: "2,048", active: true },
	{ label: "matches", rows: "8,912" },
	{ label: "assets", rows: "1,204" },
	{ label: "scores", rows: "312" },
	{ label: "leaderboard", rows: "128" },
];

const TABS = ["Table", "Schema", "Indexes"];

const TOOLS = [RefreshCw, Radio, Filter, Columns3, Plus, Save, ClipboardCheck, Eraser, Trash2];

const COLUMNS = [
	{ name: "id", type: "i64", key: true },
	{ name: "owner", type: "pubkey" },
	{ name: "status", type: "enum" },
	{ name: "balance", type: "u64" },
];

const ROWS = [
	["1", "8sK2…Qf9m", "active", "2.4"],
	["2", "3xR7…Mv4p", "active", "1.1"],
	["3", "Bd93…a7TJ", "frozen", "0.9"],
	["4", "27eQ…4cLk", "active", "3.7"],
	["5", "6a9K…c8Fd", "active", "0.4"],
	["6", "D504…1bXz", "frozen", "2.0"],
	["7", "9efJ…5aHn", "active", "1.8"],
	["8", "31bM…e6Pq", "active", "0.6"],
	["9", "Hh82…n2Ve", "active", "4.2"],
	["10", "Kd17…r5Ws", "frozen", "0.2"],
	["11", "Pm40…t8Yb", "active", "1.3"],
	["12", "Tn66…u1Zc", "active", "5.6"],
];

const GRID = "grid grid-cols-[64px_minmax(0,1.5fr)_104px_minmax(0,1fr)]";
const TILE = "flex h-8 items-center border-r border-border px-2.5 last:border-r-0";

function TrafficLights() {
	return (
		<div className="flex items-center gap-1.5" aria-hidden="true">
			<span className="size-2.5 rounded-full bg-[#ff5f57]/80" />
			<span className="size-2.5 rounded-full bg-[#febc2e]/80" />
			<span className="size-2.5 rounded-full bg-[#28c840]/80" />
		</div>
	);
}

export function DashboardMockup({ className = "" }: { className?: string }) {
	return (
		<div
			role="img"
			aria-label="Preview of Peridotbase Studio: nav rail, database sidebar, Data tabs and the players rows grid"
			className={`mx-auto flex w-full max-w-[1100px] flex-col overflow-hidden rounded-xl border border-border bg-background text-left text-xs leading-5 text-foreground shadow-2xl ${className}`}
		>
			{/* Window chrome */}
			<div className="flex h-8 shrink-0 items-center gap-3 border-b border-border bg-muted/40 px-3">
				<TrafficLights />
				<span className="hidden flex-1 text-center font-mono text-[10px] text-muted-foreground sm:block">
					app.peridotbase.com/studio
				</span>
				<span className="flex-1 sm:hidden" />
			</div>

			{/* Studio topbar */}
			<div className="flex h-12 shrink-0 items-center gap-1 border-b border-border pr-2">
				<div className="hidden w-12 shrink-0 items-center justify-center md:flex">
					<img src="/logo.svg" alt="" className="size-6" />
				</div>
				<span
					aria-hidden
					className="hidden shrink-0 text-sm text-muted-foreground/50 md:inline"
				>
					/
				</span>

				<div className="flex min-w-0 items-center gap-1 pl-2 md:pl-0">
					<span className="flex min-w-0 items-center gap-1.5 px-1.5 text-sm">
						<Building2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
						<span className="truncate">acme</span>
						<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
					</span>
					<span aria-hidden className="text-sm text-muted-foreground/50">
						/
					</span>
					<span className="flex min-w-0 items-center gap-1.5 px-1.5 text-sm">
						<FolderKanban className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
						<span className="truncate">analytics</span>
						<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
					</span>
					<span aria-hidden className="hidden text-sm text-muted-foreground/50 sm:inline">
						/
					</span>
					<span className="hidden items-center gap-1.5 px-1.5 font-mono text-xs sm:flex">
						<GitBranch className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
						dev
					</span>
				</div>

				<div className="ml-auto flex items-center gap-2">
					<span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground uppercase">
						8s
					</span>
					<span className="hidden max-w-32 truncate font-mono text-xs text-muted-foreground sm:inline">
						8sK2…Qf9m
					</span>
				</div>
			</div>

			<div className="grid min-h-0 flex-1 md:grid-cols-[48px_216px_minmax(0,1fr)]">
				{/* Icon rail */}
				<nav className="hidden flex-col border-r border-border bg-background md:flex">
					{RAIL.map((item) => (
						<span
							key={item.label}
							className={`flex size-12 shrink-0 items-center justify-center ${
								item.active ? "bg-muted text-foreground" : "text-muted-foreground"
							}`}
						>
							<item.icon className="size-5" aria-hidden />
						</span>
					))}
					<span className="mt-auto flex flex-col">
						<span aria-hidden className="h-px w-full shrink-0 bg-border" />
						<span className="flex size-12 shrink-0 items-center justify-center text-muted-foreground">
							<PanelLeft className="size-5" aria-hidden />
						</span>
					</span>
				</nav>

				{/* Database sidebar */}
				<aside className="hidden flex-col border-r border-border bg-background md:flex">
					<div className="px-3 pt-3">
						<span className="flex h-8 w-full items-center justify-between gap-2 rounded-sm border border-border px-2.5 font-mono text-xs">
							<span className="flex min-w-0 items-center gap-2">
								<Database className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
								<span className="truncate">mainnet_db</span>
							</span>
							<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
						</span>
					</div>

					<div className="space-y-2 px-3 pt-2 pb-3">
						<div className="flex items-center gap-2">
							<span className="relative flex h-8 min-w-0 flex-1 items-center gap-2 rounded-sm border border-border px-2 text-muted-foreground">
								<Search className="size-3.5 shrink-0" aria-hidden />
								<span className="truncate text-xs">Search tables</span>
								<span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-border px-0.5 font-mono text-[10px]">
									/
								</span>
							</span>
							<span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground">
								<Plus className="size-4" aria-hidden />
							</span>
						</div>
					</div>

					<ul className="flex-1 overflow-hidden">
						{TABLES.map((table) => (
							<li key={table.label} className="relative">
								{table.active ? (
									<span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
								) : null}
								<span
									className={`flex items-center gap-0.5 py-1.5 pr-2 pl-4 text-sm ${
										table.active
											? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
											: "text-sidebar-foreground/70"
									}`}
								>
									<span className="min-w-0 flex-1 truncate">{table.label}</span>
									<span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm border border-border px-1 font-mono text-[10px] text-muted-foreground">
										{table.rows}
									</span>
								</span>
							</li>
						))}
					</ul>
				</aside>

				{/* Data view */}
				<main className="flex min-w-0 flex-col">
					<div className="flex items-center gap-2 border-b border-border px-3 py-2">
						<div className="inline-flex items-center rounded-md bg-muted p-0.5 text-sm">
							{TABS.map((tab) => (
								<span
									key={tab}
									className={`rounded-sm px-2 py-0.5 ${
										tab === "Table"
											? "bg-background font-medium text-foreground shadow-sm"
											: "text-muted-foreground"
									}`}
								>
									{tab}
								</span>
							))}
						</div>
					</div>

					<div className="flex h-8 shrink-0 items-center gap-0.5 overflow-hidden border-b border-border px-1">
						{TOOLS.map((Icon, i) => (
							<span
								key={i}
								className={`flex size-7 items-center justify-center rounded-sm ${
									i === 5 ? "text-foreground" : "text-muted-foreground"
								}`}
							>
								<Icon className="size-4" aria-hidden />
							</span>
						))}
					</div>

					<div className="min-h-0 flex-1 overflow-hidden">
						<div className={`${GRID} border-b border-border bg-muted/40 text-sm`}>
							{COLUMNS.map((column) => (
								<span key={column.name} className={TILE}>
									{column.key ? (
										<Key className="mr-1 size-3.5 shrink-0 text-primary" aria-hidden />
									) : null}
									<span className="truncate">{column.name}</span>
									<span className="ml-1.5 hidden font-mono text-[10px] text-muted-foreground sm:inline">
										{column.type}
									</span>
								</span>
							))}
						</div>
						{ROWS.map((row) => (
							<div key={row[0]} className={`${GRID} border-b border-border text-sm`}>
								<span className={`${TILE} text-muted-foreground tabular-nums`}>{row[0]}</span>
								<span className={`${TILE} font-mono text-xs`}>{row[1]}</span>
								<span className={TILE}>
									<span className="inline-flex items-center gap-1.5">
										<span
											className={`size-1.5 rounded-full ${
												row[2] === "active"
													? "bg-brand-500 dark:bg-brand-bright"
													: "bg-border-strong"
											}`}
											aria-hidden
										/>
										{row[2]}
									</span>
								</span>
								<span className={`${TILE} tabular-nums`}>
									{row[3]}
									<span className="ml-1 text-muted-foreground">SOL</span>
								</span>
							</div>
						))}
					</div>

					<div className="flex h-9 shrink-0 items-center justify-between border-t border-border px-2">
						<div className="flex items-center gap-2">
							<span className="text-xs whitespace-nowrap text-muted-foreground">
								Rows per page
							</span>
							<span className="inline-flex h-6 items-center gap-1 rounded-sm border border-border px-1.5 font-mono text-xs">
								10
								<ChevronDown className="size-3 text-muted-foreground" aria-hidden />
							</span>
						</div>
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<span className="hidden font-mono tabular-nums sm:inline">1–10 of 2,048</span>
							<ChevronsLeft className="size-4" aria-hidden />
							<ChevronLeft className="size-4" aria-hidden />
							<ChevronRight className="size-4" aria-hidden />
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
