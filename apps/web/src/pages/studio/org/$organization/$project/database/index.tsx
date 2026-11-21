import { Button } from "@peridotvault/peridotbase-ui/button";
import { Spinner } from "@peridotvault/peridotbase-ui/spinner";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Database } from "lucide-react";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { useTablesList } from "@/shared/hooks/use-tables-list";
import { useActiveDatabase } from "@/shared/hooks/use-project-databases";
import { DATA_TABLE_PATH } from "@/shared/lib/sections";
import { useOverlayStore } from "@/shared/stores/overlay.store";
import { CONSTANTS } from "@/shared/utils/constants";

export const Route = createFileRoute("/studio/org/$organization/$project/database/")({
	component: RouteComponent,
});

/** The Data section has no table of its own: open the first one, or invite the first table. */
function RouteComponent() {
	const { organization, project } = useStudioScope();
	const activeDatabase = useActiveDatabase();
	const { tablesList, isLoadingTablesList } = useTablesList();
	const openOverlay = useOverlayStore((state) => state.openOverlay);
	const table = tablesList?.[0];

	if (!activeDatabase) {
		return (
			<main className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
				Select a database from the sidebar
			</main>
		);
	}

	if (isLoadingTablesList) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<Spinner size="size-6" />
			</div>
		);
	}

	if (!table) {
		return (
			<main className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
				<Database className="size-8 text-muted-foreground" />
				<p className="text-sm text-muted-foreground">
					No tables in this database yet. Create one to start storing rows on-chain.
				</p>
				<Button onClick={() => openOverlay("table-builder.create-table")}>Create table</Button>
			</main>
		);
	}

	return (
		<Navigate
			to={DATA_TABLE_PATH}
			params={{ organization, project, table: table.tableName }}
			search={{ [CONSTANTS.TABLE_SCHEMA]: table.schemaName }}
			replace
		/>
	);
}
