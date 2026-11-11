import type { CreateIndexSchemaType, MutationResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	createIndex as createIndexRequest,
	type StudioError,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { indexKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { useOverlayStore } from "@/shared/stores/overlay.store";

export const useCreateIndex = ({
	tableName,
	schemaName,
}: {
	tableName: string;
	schemaName: string | undefined;
}) => {
	const queryClient = useQueryClient();
	const { closeOverlay } = useOverlayStore();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: createIndexMutation, isPending: isCreatingIndex } = useMutation<
		MutationResult,
		StudioError,
		CreateIndexSchemaType
	>({
		mutationFn: (data) =>
			createIndexRequest({ tableName, schemaName, data, db: selectedDatabase }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: indexKeys.byTable(tableName),
				exact: false,
			});
			closeOverlay("indexes.create-index");
		},
	});

	const createIndex = async (data: CreateIndexSchemaType) =>
		toast.promise(createIndexMutation(data), {
			loading: "Creating index...",
			success: (result) => result.message || "Index created successfully",
			error: (error: StudioError) => sdkErrorMessage(error, "Failed to create index"),
		});

	return {
		createIndex,
		isCreatingIndex,
	};
};
