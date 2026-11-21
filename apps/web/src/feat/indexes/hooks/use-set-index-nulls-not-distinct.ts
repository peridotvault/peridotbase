import type { MutationResult } from "@peridotvault/peridotbase-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	setIndexNullsNotDistinct as setIndexNullsNotDistinctRequest,
	type StudioError,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { indexKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";

export const useSetIndexNullsNotDistinct = ({
	tableName,
	schemaName,
}: {
	tableName: string;
	schemaName: string | undefined;
}) => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync, isPending } = useMutation<
		MutationResult,
		StudioError,
		{ indexName: string; nullsNotDistinct: boolean }
	>({
		mutationFn: (data) =>
			setIndexNullsNotDistinctRequest({
				tableName,
				schemaName,
				db: selectedDatabase,
				...data,
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: indexKeys.byTable(tableName),
				exact: false,
			});
		},
	});

	const setIndexNullsNotDistinct = async (data: {
		indexName: string;
		nullsNotDistinct: boolean;
	}) => {
		const promise = mutateAsync(data);
		toast.promise(promise, {
			loading: "Updating index...",
			success: (result) => result.message || "Index updated",
			error: (error: StudioError) => sdkErrorMessage(error, "Failed to update the index"),
		});

		return promise;
	};

	return { setIndexNullsNotDistinct, isUpdating: isPending };
};
