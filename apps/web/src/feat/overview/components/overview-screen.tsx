import { Badge } from "@peridotvault/peridotbase-ui/badge";
import { Spinner } from "@peridotvault/peridotbase-ui/spinner";
import { Link } from "@tanstack/react-router";
import { Activity, CircleAlert, CheckCircle2, Database, Table2, Rows3 } from "lucide-react";
import { useMemo } from "react";
import { useOrganization, useProject } from "@/shared/hooks/use-scope";
import { useProtocolHealth } from "@/shared/hooks/use-protocol-health";
import { useSchemaGraph } from "@/shared/hooks/use-schema-graph";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { useTablesList } from "@/shared/hooks/use-tables-list";
import { useDatabasesList } from "@/shared/hooks/use-databases-list";
import { DATA_TABLE_PATH } from "@/shared/lib/sections";

const Stat = ({
	icon: Icon,
	label,
	value,
	detail,
}: {
	icon: typeof Activity;
	label: string;
	value: string;
	detail?: string;
}) => (
	<div className="rounded-lg border border-border px-5 py-4">
		<div className="flex items-center gap-2 text-xs text-muted-foreground">
			<Icon className="size-3.5" />
			{label}
		</div>
		<p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
		{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
	</div>
);

/** The project home: one screen that says whether the project is healthy and how big it is. */
export const OverviewScreen = () => {
	const { organization, project } = useStudioScope();
	const activeOrganization = useOrganization(organization);
	const activeProject = useProject(organization, project);
	const health = useProtocolHealth();
	const { databases } = useDatabasesList(organization, project);
	const { tablesList = [], isLoadingTablesList } = useTablesList();
	const { tables: graph = [] } = useSchemaGraph();

	const columnsByTable = useMemo(
		() =>
			new Map(
				graph.map((table: { tableName: string; columns: unknown[] }) => [
					table.tableName,
					table.columns.length,
				]),
			),
		[graph],
	);

	const tableCount = tablesList.length;
	const rowCount = tablesList.reduce((total, table) => total + (table.rowCount ?? 0), 0);
	const indexCount = graph.length;
	const healthy = Boolean(health.data?.reachable);
	const storage = databases?.[0]?.size ?? "—";

	return (
		<main className="flex-1 overflow-y-auto">
			<div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
				<header className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">{activeOrganization?.name}</p>
						<h1 className="text-2xl font-semibold tracking-tight">
							{activeProject?.name ?? "Project overview"}
						</h1>
					</div>
					<Badge variant={healthy ? "default" : "destructive"} className="gap-1">
						{healthy ? (
							<CheckCircle2 className="size-3.5" />
						) : (
							<CircleAlert className="size-3.5" />
						)}
						{health.isLoading ? "Checking…" : healthy ? "Healthy" : "Unreachable"}
					</Badge>
				</header>

				<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<Stat
						icon={Activity}
						label="Status"
						value={healthy ? "Healthy" : "Down"}
						detail={
							health.data?.version
								? `${health.data.version} · slot ${health.data.slot ?? "?"}`
								: "No response from the endpoint"
						}
					/>
					<Stat
						icon={Table2}
						label="Tables"
						value={isLoadingTablesList ? "…" : String(tableCount)}
						detail={`${columnsByTable.size} with columns loaded`}
					/>
					<Stat
						icon={Rows3}
						label="Rows"
						value={isLoadingTablesList ? "…" : rowCount.toLocaleString()}
						detail="Across every table"
					/>
					<Stat
						icon={Database}
						label="Storage"
						value={storage}
						detail={`${databases?.[0]?.name ?? "no database"} · ${indexCount} tables graphed`}
					/>
				</section>

				<section className="rounded-lg border border-border">
					<div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
						<h2 className="text-sm font-medium">Tables</h2>
						<span className="text-xs text-muted-foreground">{tableCount} total</span>
					</div>
					{isLoadingTablesList ? (
						<div className="flex items-center justify-center py-10">
							<Spinner className="size-5" />
						</div>
					) : (
						<ul className="divide-y divide-border text-sm">
							{tablesList.map((table) => (
								<li key={`${table.schemaName}.${table.tableName}`}>
									<Link
										to={DATA_TABLE_PATH}
										params={{ organization, project, table: table.tableName }}
										className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/60"
									>
										<span className="truncate">
											{table.schemaName && table.schemaName !== "public" && (
												<span className="text-muted-foreground">{table.schemaName}.</span>
											)}
											{table.tableName}
										</span>
										<span className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
											<span>{columnsByTable.get(table.tableName) ?? 0} columns</span>
											<span>{(table.rowCount ?? 0).toLocaleString()} rows</span>
										</span>
									</Link>
								</li>
							))}
							{tablesList.length === 0 && (
								<li className="px-5 py-6 text-center text-sm text-muted-foreground">
									This project has no tables yet.
								</li>
							)}
						</ul>
					)}
				</section>
			</div>
		</main>
	);
};
