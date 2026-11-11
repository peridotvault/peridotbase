import type { MutationResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	deleteTable as deleteTableRequest,
	type StudioError,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { forgetTable } from "@/shared/query/invalidate-table";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";

export const useDeleteTable = () => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();

	const {
		mutateAsync: deleteTableAsync,
		isPending: isDeletingTable,
		reset: resetDeleteResult,
	} = useMutation<MutationResult, StudioError, { tableName: string; schemaName?: string }>({
		mutationFn: ({ tableName, schemaName }) =>
			deleteTableRequest({ tableName, schemaName, db: selectedDatabase }),
		onSuccess: async (_result, { tableName }) => {
			await queryClient.invalidateQueries({ queryKey: tableKeys.lists() });
			forgetTable(queryClient, tableName);
		},
	});

	const deleteTable = async (
		tableName: string,
		schemaName: string | undefined,
	): Promise<MutationResult> => {
		const promise = deleteTableAsync({ tableName, schemaName });
		toast.promise(promise, {
			loading: "Deleting table...",
			success: (result) => result.message || `Deleted table "${tableName}"`,
			error: (error: StudioError) => sdkErrorMessage(error, "Failed to delete table"),
		});

		return promise;
	};

	return {
		deleteTable,
		isDeletingTable,
		resetDeleteResult,
	};
};
