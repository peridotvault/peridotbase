import { Button } from "@peridotvault/peridotbase-ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { getDroppedTables, restoreTable, sdkErrorMessage } from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { CONSTANTS } from "@/shared/utils/constants";
import { tableId } from "@/shared/utils/table-id";

/**
 * Soft-dropped catalogs: rows stay on chain and `restore_table` brings them back.
 * There is no per-table hard close on chain — `close_table_catalog` is only valid while the
 * database itself is closing, so this panel offers restore alone instead of an action that
 * always failed with `NotClosing` (6043).
 */
export const SidebarDroppedTables = () => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();

	const { data: dropped = [] } = useQuery({
		queryKey: tableKeys.dropped(selectedDatabase),
		queryFn: () => getDroppedTables(selectedDatabase),
		enabled: Boolean(selectedDatabase),
	});

	const { mutateAsync: restore, isPending } = useMutation({
		mutationFn: (table: { tableName: string; schemaName?: string }) =>
			restoreTable({ ...table, db: selectedDatabase }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: tableKeys.lists() }),
	});

	if (dropped.length === 0) return null;

	const handleRestore = async (table: { tableName: string; schemaName?: string }) => {
		try {
			await toast
				.promise(restore(table), {
					loading: `Restoring ${tableId(table)}...`,
					success: (result) => result.message,
					error: (error: Error) => sdkErrorMessage(error, "Failed to restore table"),
				})
				.unwrap();
		} catch {
			// toast.promise already reported the failure.
		}
	};

	return (
		<section className="mt-3 border-t border-border px-3 pt-3">
			<p className="mb-2 text-xs text-muted-foreground">Dropped tables</p>
			<ul className="space-y-1">
				{dropped.map((table) => (
					<li key={tableId(table)} className="flex items-center justify-between gap-2">
						<span className="truncate text-xs line-through">
							{table.schemaName && table.schemaName !== CONSTANTS.DEFAULT_SCHEMA && (
								<span className="text-muted-foreground">{table.schemaName}.</span>
							)}
							{table.tableName}
						</span>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={`Restore ${tableId(table)}`}
							disabled={isPending}
							onClick={() => void handleRestore(table)}
						>
							<ArchiveRestore className="size-4" />
						</Button>
					</li>
				))}
			</ul>
			<p className="mt-2 text-[11px] text-muted-foreground">
				Dropped tables keep their rent. Restore one to use it again, or delete the database to
				reclaim everything.
			</p>
		</section>
	);
};
