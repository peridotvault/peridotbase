import type { MutationResult, RenameTableSchemaType } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	renameTable as renameTableRequest,
	type StudioError,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { forgetTable } from "@/shared/query/invalidate-table";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";

export const useRenameTable = ({
	tableName,
	schemaName,
}: {
	tableName: string;
	schemaName?: string;
}) => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: renameTableMutation, isPending: isRenamingTable } = useMutation<
		MutationResult,
		StudioError,
		RenameTableSchemaType
	>({
		mutationFn: (data) =>
			renameTableRequest({ tableName, schemaName, data, db: selectedDatabase }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: tableKeys.lists() });
			forgetTable(queryClient, tableName);
		},
	});

	const renameTable = async (data: RenameTableSchemaType) => {
		const promise = renameTableMutation(data);
		toast.promise(promise, {
			loading: "Renaming table...",
			success: (result) => result.message || "Table renamed successfully",
			error: (error: StudioError) => sdkErrorMessage(error, "Failed to rename table"),
		});

		return promise;
	};

	return {
		renameTable,
		isRenamingTable,
	};
};
