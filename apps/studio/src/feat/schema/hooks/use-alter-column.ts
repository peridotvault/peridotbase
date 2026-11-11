import type { AlterColumnSchemaType, MutationResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	alterColumn as alterColumnRequest,
	type StudioError,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { invalidateTable } from "@/shared/query/invalidate-table";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { useOverlayStore } from "@/shared/stores/overlay.store";
import { useSchemaEditStore } from "../stores/schema-edit.store";

const normalizeAlterColumnPayload = (data: AlterColumnSchemaType): AlterColumnSchemaType => ({
	...data,
	defaultValue: data.defaultValue?.trim() ? data.defaultValue.trim() : null,
});

export const useAlterColumn = ({
	tableName,
	schemaName,
	columnName,
}: {
	tableName: string;
	schemaName: string | undefined;
	columnName: string;
}) => {
	const queryClient = useQueryClient();
	const { closeOverlay } = useOverlayStore();
	const { setEditingColumn } = useSchemaEditStore();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: alterColumnMutation, isPending: isAlteringColumn } = useMutation<
		MutationResult,
		StudioError,
		AlterColumnSchemaType
	>({
		mutationFn: (data) =>
			alterColumnRequest({
				tableName,
				schemaName,
				columnName,
				data: normalizeAlterColumnPayload(data),
				db: selectedDatabase,
			}),
		onSuccess: async () => {
			await invalidateTable(queryClient, tableName);
			setEditingColumn(null);
			closeOverlay("schema.edit-column");
		},
	});

	const alterColumn = async (data: AlterColumnSchemaType) =>
		toast
			.promise(alterColumnMutation(data), {
				loading: "Updating column...",
				success: (result) => result.message || "Column updated successfully",
				error: (error: StudioError) => sdkErrorMessage(error, "Failed to update column"),
			})
			.unwrap();

	return {
		alterColumn,
		isAlteringColumn,
	};
};
