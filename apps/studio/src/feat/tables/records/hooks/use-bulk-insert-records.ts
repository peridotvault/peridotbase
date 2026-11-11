import type { BulkInsertResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	bulkInsertRecords as bulkInsertRecordsRequest,
	type StudioError,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { invalidateTableRows } from "@/shared/query/invalidate-table";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";

export const useBulkInsertRecords = ({
	tableName,
	schemaName,
}: {
	tableName: string;
	schemaName: string | undefined;
}) => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: bulkInsertMutation, isPending: isInserting } = useMutation<
		BulkInsertResult,
		StudioError,
		Record<string, unknown>[]
	>({
		mutationFn: (records) =>
			bulkInsertRecordsRequest({
				tableName,
				schemaName,
				records,
				db: selectedDatabase,
			}),
		onSuccess: async () => {
			await Promise.all([
				invalidateTableRows(queryClient, tableName),
				queryClient.invalidateQueries({ queryKey: tableKeys.columnsByTable(tableName) }),
			]);
		},
	});

	const bulkInsertRecords = async (
		records: Record<string, unknown>[],
		options?: {
			onSuccess?: (result: BulkInsertResult) => void;
			onError?: (error: StudioError) => void;
			format?: "csv" | "json" | "excel";
		},
	) => {
		if (!records || records.length === 0) {
			throw new Error("At least one record is required");
		}

		return toast.promise(bulkInsertMutation(records), {
			loading: `Inserting ${records.length} record${records.length !== 1 ? "s" : ""}...`,
			success: (result) => {
				options?.onSuccess?.(result);

				if (result.failureCount > 0) {
					return `${result.successCount} records inserted, ${result.failureCount} failed`;
				}

				return result.message;
			},
			error: (error: StudioError) => {
				options?.onError?.(error);

				return sdkErrorMessage(error, "Failed to insert records");
			},
		});
	};

	return {
		bulkInsertRecords,
		isInserting,
	};
};
