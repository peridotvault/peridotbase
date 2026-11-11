import type { DeleteColumnParamsSchemaType, MutationResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	deleteColumn as deleteColumnRequest,
	type StudioError,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { invalidateTable } from "@/shared/query/invalidate-table";
import { useDatabaseStore } from "@/shared/stores/database.store";

type DeleteColumnParams = Omit<DeleteColumnParamsSchemaType, "db" | "schemaName"> & {
	schemaName: string | undefined;
};

export const useDeleteColumn = () => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: deleteColumnAsync, isPending: isDeletingColumn } = useMutation<
		MutationResult,
		StudioError,
		DeleteColumnParams
	>({
		mutationFn: (params) => deleteColumnRequest({ ...params, db: selectedDatabase ?? "" }),
		onSuccess: async (_result, variables) => {
			await invalidateTable(queryClient, variables.tableName);
		},
	});

	const deleteColumn = (params: DeleteColumnParams) =>
		toast.promise(deleteColumnAsync(params), {
			loading: "Deleting column...",
			success: (result) => result.message || "Column deleted successfully",
			error: (error: StudioError) => sdkErrorMessage(error, "Failed to delete column"),
		});

	return {
		deleteColumn,
		isDeletingColumn,
	};
};
