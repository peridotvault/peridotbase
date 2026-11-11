import type { DeleteRecordResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { TableRecord } from "@/feat/tables/table.type";
import { useTableCols } from "@/shared/hooks/use-table-cols";
import { type StudioError, sdkErrorMessage, deleteRecords } from "@/shared/peridotbase";
import { invalidateTableRows } from "@/shared/query/invalidate-table";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { getIdentityColumnNames } from "../utils/row-details-utils";

export const useDeleteCells = ({
	tableName,
	schemaName,
}: {
	tableName: string;
	schemaName: string | undefined;
}) => {
	const queryClient = useQueryClient();
	const { tableCols } = useTableCols({ tableName, schemaName });
	const { selectedDatabase } = useDatabaseStore();

	const {
		mutateAsync,
		isPending: isDeletingCells,
		reset: resetDeleteResult,
	} = useMutation<DeleteRecordResult, StudioError, TableRecord[]>({
		mutationFn: async (rows) => {
			// Rows are identified as an update identifies them.
			const keyColumns = getIdentityColumnNames(tableCols);

			if (keyColumns.length === 0) throw new Error("No primary key found for this table");

			// The delete endpoint matches every row on one key column.
			if (keyColumns.length > 1)
				throw new Error(
					"Deleting rows from tables with a composite primary key is not supported yet.",
				);

			const [keyColumn] = keyColumns;

			return deleteRecords({
				tableName,
				schemaName,
				primaryKeys: rows.map((row) => ({ columnName: keyColumn, value: row[keyColumn] })),
				db: selectedDatabase,
			});
		},
		onSuccess: async (result) => {
			if (result.fkViolation) return;

			await invalidateTableRows(queryClient, tableName);
		},
	});

	/** Resolves with `fkViolation` when other rows reference these. */
	const deleteCells = (rows: TableRecord[]) => {
		const promise = mutateAsync(rows);
		toast.promise(promise, {
			loading: "Deleting records...",
			success: (result) =>
				result.fkViolation
					? `Other records reference these records in "${tableName}"`
					: `Deleted ${result.deletedCount} records from "${tableName}"`,
			error: (error: StudioError) => sdkErrorMessage(error, "Failed to delete records"),
		});

		return promise;
	};

	return { deleteCells, isDeletingCells, resetDeleteResult };
};
