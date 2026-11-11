import type { MutationResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	dropIndex as dropIndexRequest,
	type StudioError,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { indexKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { useOverlayStore } from "@/shared/stores/overlay.store";

export const useDropIndex = ({
	tableName,
	schemaName,
}: {
	tableName: string;
	schemaName: string | undefined;
}) => {
	const queryClient = useQueryClient();
	const { closeOverlay } = useOverlayStore();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: dropIndexMutation, isPending: isDroppingIndex } = useMutation<
		MutationResult,
		StudioError,
		string
	>({
		mutationFn: (indexName) =>
			dropIndexRequest({ tableName, schemaName, indexName, db: selectedDatabase }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: indexKeys.byTable(tableName),
				exact: false,
			});
			closeOverlay("indexes.drop-index");
		},
	});

	const dropIndex = async (indexName: string) =>
		toast.promise(dropIndexMutation(indexName), {
			loading: "Dropping index...",
			success: (result) => result.message || "Index dropped successfully",
			error: (error: StudioError) => sdkErrorMessage(error, "Failed to drop index"),
		});

	return {
		dropIndex,
		isDroppingIndex,
	};
};
