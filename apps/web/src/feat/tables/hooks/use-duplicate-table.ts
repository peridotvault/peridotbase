import type { MutationResult } from "@peridotvault/peridotbase-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	type StudioError,
	duplicateTable as duplicateTableRequest,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";

export const useDuplicateTable = ({
	tableName,
	schemaName,
}: {
	tableName: string;
	schemaName?: string;
}) => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync, isPending } = useMutation<MutationResult, StudioError, string>({
		mutationFn: (newTableName) =>
			duplicateTableRequest({
				tableName,
				newTableName,
				schemaName,
				db: selectedDatabase,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: tableKeys.lists() });
		},
	});

	const duplicateTable = async (newTableName: string) => {
		const promise = mutateAsync(newTableName);
		toast.promise(promise, {
			loading: "Duplicating table...",
			success: (result) => result.message || "Table duplicated",
			error: (error: StudioError) => sdkErrorMessage(error, "Failed to duplicate table"),
		});

		return promise;
	};

	return { duplicateTable, isDuplicatingTable: isPending };
};
