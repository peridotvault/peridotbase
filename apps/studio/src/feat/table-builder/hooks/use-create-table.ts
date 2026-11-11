import type { CreateTableSchemaType, MutationResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	createTable as createTableRequest,
	type StudioError,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { useOverlayStore } from "@/shared/stores/overlay.store";

export const useCreateTable = () => {
	const { closeOverlay } = useOverlayStore();
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: createTableMutation, isPending: isCreatingTable } = useMutation<
		MutationResult,
		StudioError,
		CreateTableSchemaType
	>({
		mutationFn: (data) => createTableRequest(data, selectedDatabase),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: tableKeys.lists() });
			closeOverlay("table-builder.create-table");
		},
	});

	const createTable = async (
		data: CreateTableSchemaType,
		options?: {
			onSuccess?: () => void;
			onError?: (error: StudioError) => void;
		},
	) =>
		toast.promise(createTableMutation(data, options), {
			loading: "Creating table...",
			success: (result) => result.message || "Table created successfully",
			error: (error: StudioError) => sdkErrorMessage(error, "Failed to create table"),
		});

	return {
		createTable,
		isCreatingTable,
	};
};
