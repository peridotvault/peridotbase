import type { AddColumnSchemaType, MutationResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	addColumn as addColumnRequest,
	type StudioError,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { invalidateTable } from "@/shared/query/invalidate-table";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { useOverlayStore } from "@/shared/stores/overlay.store";

const normalizeAddColumnPayload = (data: AddColumnSchemaType): AddColumnSchemaType => ({
	...data,
	defaultValue: data.defaultValue?.trim() ? data.defaultValue.trim() : undefined,
});

export const useAddColumn = ({
	tableName,
	schemaName,
}: {
	tableName: string;
	schemaName: string | undefined;
}) => {
	const queryClient = useQueryClient();
	const { closeOverlay } = useOverlayStore();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: addColumnMutation, isPending: isAddingColumn } = useMutation<
		MutationResult,
		StudioError,
		AddColumnSchemaType
	>({
		mutationFn: (data) =>
			addColumnRequest({
				tableName,
				schemaName,
				data: normalizeAddColumnPayload(data),
				db: selectedDatabase,
			}),
		onSuccess: async () => {
			await invalidateTable(queryClient, tableName);
			closeOverlay("schema.add-column");
		},
	});

	const addColumn = async (data: AddColumnSchemaType) =>
		toast
			.promise(addColumnMutation(data), {
				loading: "Adding column...",
				success: (result) => result.message || "Column added successfully",
				error: (error: StudioError) => sdkErrorMessage(error, "Failed to add column"),
			})
			.unwrap();

	return {
		addColumn,
		isAddingColumn,
	};
};
