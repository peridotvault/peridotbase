import type { MutationResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateRecords, type StudioError, sdkErrorMessage } from "@/shared/peridotbase";
import { invalidateTableRows } from "@/shared/query/invalidate-table";
import { useDatabaseStore } from "@/shared/stores/database.store";

export type RowFieldUpdate = {
	columnName: string;
	value: unknown;
};

export const useUpdateRecord = ({
	tableName,
	schemaName,
}: {
	tableName: string;
	schemaName: string | undefined;
}) => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: updateRecordMutation, isPending: isUpdatingRecord } = useMutation<
		MutationResult,
		StudioError,
		{
			rowData: Record<string, unknown>;
			updates: RowFieldUpdate[];
			primaryKey?: string;
			primaryKeys?: string[];
		}
	>({
		mutationFn: ({ rowData, updates, primaryKey, primaryKeys }) => {
			const payload: Parameters<typeof updateRecords>[0] = {
				tableName,
				schemaName,
				updates: updates.map((update) => ({ rowData, ...update })),
				db: selectedDatabase,
			};

			if (primaryKey) payload.primaryKey = primaryKey;

			if (primaryKeys?.length) payload.primaryKeys = primaryKeys;

			return updateRecords(payload);
		},
		onSuccess: async () => {
			await invalidateTableRows(queryClient, tableName);
		},
	});

	const updateRecord = async ({
		rowData,
		updates,
		primaryKey,
		primaryKeys,
	}: {
		rowData: Record<string, unknown>;
		updates: RowFieldUpdate[];
		primaryKey?: string;
		primaryKeys?: string[];
	}) => {
		if (updates.length === 0) {
			throw new Error("At least one field is required");
		}

		return toast
			.promise(updateRecordMutation({ rowData, updates, primaryKey, primaryKeys }), {
				loading: "Saving changes...",
				success: (result) => result.message || "Record updated successfully",
				error: (error: StudioError) => sdkErrorMessage(error, "Failed to update record"),
			})
			.unwrap();
	};

	return {
		updateRecord,
		isUpdatingRecord,
	};
};
