import type { MutationResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	createRecord as createRecordRequest,
	type RecordValues,
	type StudioError,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { invalidateTableRows } from "@/shared/query/invalidate-table";
import { useDatabaseStore } from "@/shared/stores/database.store";

export const useCreateRecord = ({
	tableName,
	schemaName,
}: {
	tableName: string;
	schemaName: string | undefined;
}) => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: createRecordMutation, isPending: isCreatingRecord } = useMutation<
		MutationResult,
		StudioError,
		RecordValues
	>({
		mutationFn: (data) =>
			createRecordRequest({
				tableName,
				schemaName,
				data,
				db: selectedDatabase,
			}),
		onSuccess: async () => {
			await invalidateTableRows(queryClient, tableName);
		},
	});

	const createRecord = async (
		data: RecordValues,
		options: {
			onSuccess?: () => void;
			onError?: (error: StudioError) => void;
		},
	) => {
		return toast.promise(createRecordMutation(data, options), {
			loading: "Creating record...",
			success: (result) => result.message || "Record created successfully",
			error: (error: StudioError) => sdkErrorMessage(error, "Failed to create record"),
		});
	};

	return {
		createRecord,
		isCreatingRecord,
	};
};
