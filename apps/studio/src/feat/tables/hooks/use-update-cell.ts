import type { MutationResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTableCols } from "@/shared/hooks/use-table-cols";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { updateRecords, type StudioError, sdkErrorMessage } from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";
import {
	CELL_DEFAULT,
	type CellUpdate,
	useUpdateCellStore,
} from "../stores/update-cell.store";
import { useEditScope } from "./use-edit-scope";

export const useUpdateCell = (table: string) => {
	const queryClient = useQueryClient();
	const { removeUpdates } = useUpdateCellStore();
	const { selectedDatabase } = useDatabaseStore();
	const schemaName = useTableSchemaName();
	const { tableCols } = useTableCols({
		tableName: table,
		schemaName: schemaName ?? undefined,
	});

	const editScope = useEditScope(table, tableCols);

	const { mutateAsync: updateCellMutation, isPending: isUpdatingCell } = useMutation<
		MutationResult,
		StudioError,
		CellUpdate[]
	>({
		mutationFn: (updates) => {
			// Composite keys are sent in full so an edit can never match more than its own record.
			const identityColumnNames = editScope.keyColumns;

			const payload: Parameters<typeof updateRecords>[0] = {
				tableName: table,
				schemaName,
				db: selectedDatabase,
				updates: updates.map((update) => ({
					rowData: update.rowData,
					columnName: update.columnName,
					...(update.newValue === CELL_DEFAULT
						? { value: null, useDefault: true }
						: { value: update.newValue }),
				})),
			};

			if (identityColumnNames.length > 0) {
				payload.primaryKey = identityColumnNames[0];
				payload.primaryKeys = identityColumnNames;
			}

			return updateRecords(payload);
		},
		onSuccess: async (_data, updates) => {
			removeUpdates(updates);

			await queryClient.invalidateQueries({
				queryKey: tableKeys.dataByTable(table),
				exact: false,
			});
		},
	});

	const updateCell = async (updates: CellUpdate[]) => {
		const count = updates.length;

		return toast
			.promise(updateCellMutation(updates), {
				loading: "Saving changes...",
				success: (result) =>
					result.message ||
					`${count} ${count === 1 ? "change" : "changes"} saved successfully`,
				error: (error: StudioError) => sdkErrorMessage(error, "Failed to save changes"),
			})
			.unwrap();
	};

	return {
		updateCell,
		isUpdatingCell,
		editScope,
	};
};
