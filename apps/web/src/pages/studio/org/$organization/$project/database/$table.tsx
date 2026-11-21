import { Tabs, TabsList, TabsTrigger } from "@peridotvault/peridotbase-ui/tabs";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { IndexesScreen } from "@/feat/indexes";
import { PoliciesScreen } from "@/feat/policies";
import { SchemaScreen } from "@/feat/schema";
import { TableScreen } from "@/feat/tables";
import { useDataSearch, useDataTab } from "@/shared/hooks/use-data-tab";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { DATA_TABLE_PATH, DATA_TAB_PARAM, type DataTab } from "@/shared/lib/sections";

export const Route = createFileRoute("/studio/org/$organization/$project/database/$table")({
	component: RouteComponent,
});

function RouteComponent() {
	const { table } = Route.useParams();

	return <DataView tableName={table} />;
}

/** The unified Data view: one table, three tabs. Each tab keeps its own capability gate. */
const DataView = ({ tableName }: { tableName: string }) => {
	// Remount per table, so pending edits and selection never carry over to a same-named table.
	const schemaName = useTableSchemaName();
	const scope = useStudioScope();
	const navigate = useNavigate();
	const capabilities = useStudioCapabilities();
	const requested = useDataTab();
	const search = useDataSearch();

	const canSchema = capabilities.ddl;
	const canIndexes = capabilities.indexes;

	const active: DataTab =
		requested === "schema" && canSchema
			? "schema"
			: requested === "indexes" && canIndexes
				? "indexes"
				: requested === "policies" && canSchema
					? "policies"
					: "table";

	const handleTabChange = (value: string) => {
		void navigate({
			to: DATA_TABLE_PATH,
			params: { ...scope, table: tableName },
			search: { ...search, [DATA_TAB_PARAM]: value === "table" ? undefined : value },
		});
	};

	return (
		<main key={`${schemaName}.${tableName}`} className="flex-1 flex flex-col overflow-hidden">
			<div className="flex items-center gap-2 border-b border-border px-1 py-1">
				<Tabs value={active} onValueChange={handleTabChange}>
					<TabsList>
						<TabsTrigger value="table">Table</TabsTrigger>
						{canSchema && <TabsTrigger value="schema">Schema</TabsTrigger>}
						{canIndexes && <TabsTrigger value="indexes">Indexes</TabsTrigger>}
						{canSchema && <TabsTrigger value="policies">Policies</TabsTrigger>}
					</TabsList>
				</Tabs>
			</div>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				{active === "schema" ? (
					<SchemaScreen tableName={tableName} />
				) : active === "indexes" ? (
					<IndexesScreen tableName={tableName} />
				) : active === "policies" ? (
					<PoliciesScreen tableName={tableName} />
				) : (
					<TableScreen tableName={tableName} />
				)}
			</div>
		</main>
	);
};
