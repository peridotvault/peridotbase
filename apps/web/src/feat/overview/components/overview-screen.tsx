import { Badge } from "@peridotvault/peridotbase-ui/badge";
import { Spinner } from "@peridotvault/peridotbase-ui/spinner";
import { Link } from "@tanstack/react-router";
import { Activity, CircleAlert, CheckCircle2, Database, Table2, Rows3 } from "lucide-react";
import { useMemo } from "react";
import { useActiveDatabase } from "@/shared/hooks/use-project-databases";
import { useOrganization, useProject } from "@/shared/hooks/use-scope";
import { useProtocolHealth } from "@/shared/hooks/use-protocol-health";
import { useSchemaGraph } from "@/shared/hooks/use-schema-graph";
import { useDroppedTables } from "@/shared/hooks/use-dropped-tables";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { useTablesList } from "@/shared/hooks/use-tables-list";
import {
	PageHeader,
	PageShell,
	Panel,
	PanelHeader,
	PanelList,
} from "@/shared/components/page";
import { DATA_TABLE_PATH } from "@/shared/lib/sections";
import { tableId } from "@/shared/utils/table-id";

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
	<div className="min-w-0 rounded-lg border border-border px-5 py-4">
		<div className="flex items-center gap-2 text-xs text-muted-foreground">
			<Icon className="size-3.5 shrink-0" />
			<span className="truncate">{label}</span>
		</div>
		<p className="mt-2 truncate text-2xl font-semibold tracking-tight" title={value}>
			{value}
		</p>
		{detail && (
			<p className="mt-1 truncate text-xs text-muted-foreground" title={detail}>
				{detail}
			</p>
		)}
	</div>
);

/** The project home: one screen that says whether the project is healthy and how big it is. */
export const OverviewScreen = () => {
	const { organization, project } = useStudioScope();
	const activeDatabase = useActiveDatabase();
	const activeOrganization = useOrganization(organization);
	const activeProject = useProject(organization, project);
	const health = useProtocolHealth();
	const { tablesList = [], isLoadingTablesList } = useTablesList();
	const { droppedTables, isLoadingDroppedTables } = useDroppedTables();
	const { tables: graph = [] } = useSchemaGraph();

	// Same-named tables in two schemas are different tables: key by `<schema>.<table>`.
	const columnsByTable = useMemo(
		() =>
			new Map(
				graph.map((table: { tableName: string; schemaName?: string; columns: unknown[] }) => [
					tableId(table),
					table.columns.length,
				]),
			),
		[graph],
	);

	const tableCount = tablesList.length;
	const rowCount = tablesList.reduce((total, table) => total + (table.rowCount ?? 0), 0);
	const healthy = Boolean(health.data?.reachable);
	const droppedCount = droppedTables.length;

	return (
		<PageShell>
			<PageHeader
				eyebrow={activeOrganization?.name}
				title={activeProject?.name ?? "Project overview"}
				actions={
					<Badge variant={healthy ? "default" : "destructive"}>
						{healthy ? <CheckCircle2 /> : <CircleAlert />}
						{health.isLoading ? "Checking…" : healthy ? "Healthy" : "Unreachable"}
					</Badge>
				}
			/>

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
					detail={`${columnsByTable.size} of ${tableCount} with columns loaded`}
				/>
				<Stat
					icon={Rows3}
					label="Rows"
					value={isLoadingTablesList ? "…" : rowCount.toLocaleString()}
					detail={`Across ${activeDatabase ?? "the selected database"}`}
				/>
				<Stat
					icon={Database}
					label="Dropped"
					value={isLoadingDroppedTables ? "…" : String(droppedCount)}
					detail={
						droppedCount > 0
							? `${activeDatabase ?? "selected database"} · close to reclaim rent`
							: `${activeDatabase ?? "no database"} · nothing to clean up`
					}
				/>
			</section>

			<Panel>
				<PanelHeader
					title="Tables"
					actions={<span className="text-xs text-muted-foreground">{tableCount} total</span>}
				/>
				{isLoadingTablesList ? (
					<div className="flex items-center justify-center py-10">
						<Spinner className="size-5" />
					</div>
				) : (
					<PanelList>
						{tablesList.map((table) => (
							<li key={`${table.schemaName}.${table.tableName}`}>
								<Link
									to={DATA_TABLE_PATH}
									params={{ organization, project, table: table.tableName }}
									className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/60"
								>
									<span className="truncate" title={`${table.schemaName}.${table.tableName}`}>
										{table.schemaName && table.schemaName !== "public" && (
											<span className="text-muted-foreground">{table.schemaName}.</span>
										)}
										{table.tableName}
									</span>
									<span className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
										<span>{columnsByTable.get(tableId(table)) ?? 0} columns</span>
										<span>{(table.rowCount ?? 0).toLocaleString()} rows</span>
									</span>
								</Link>
							</li>
						))}
						{tablesList.length === 0 && (
							<li className="px-5 py-6 text-center text-sm text-muted-foreground">
								No tables in {activeDatabase ?? "this database"} yet.
							</li>
						)}
					</PanelList>
				)}
			</Panel>
		</PageShell>
	);
};
