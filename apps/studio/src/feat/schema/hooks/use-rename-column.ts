import type { MutationResult, RenameColumnPayload } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	renameColumn as renameColumnRequest,
	type StudioError,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { invalidateTable } from "@/shared/query/invalidate-table";
import { useDatabaseStore } from "@/shared/stores/database.store";

export const useRenameColumn = ({
	tableName,
	schemaName,
	columnName,
}: {
	tableName: string;
	schemaName: string | undefined;
	columnName: string;
}) => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: renameColumnMutation, isPending: isRenamingColumn } = useMutation<
		MutationResult,
		StudioError,
		Omit<RenameColumnPayload, "oldColumnName">
	>({
		mutationFn: (data) =>
			renameColumnRequest({
				tableName,
				schemaName,
				columnName,
				data,
				db: selectedDatabase,
			}),
		onSuccess: async () => {
			await invalidateTable(queryClient, tableName);
		},
	});

	const renameColumn = async (data: Omit<RenameColumnPayload, "oldColumnName">) =>
		toast
			.promise(renameColumnMutation(data), {
				loading: "Renaming column...",
				success: (result) => result.message || "Column renamed successfully",
				error: (error: StudioError) => sdkErrorMessage(error, "Failed to rename column"),
			})
			.unwrap();

	return {
		renameColumn,
		isRenamingColumn,
	};
};
