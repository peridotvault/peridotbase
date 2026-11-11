import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getTableSchema, sdkErrorMessage } from "@/shared/peridotbase";
import { useDatabaseStore } from "@/shared/stores/database.store";

export const useCopyTableSchema = () => {
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: copyTableSchemaMutation, isPending: isCopyingSchema } = useMutation({
		mutationFn: async ({
			tableName,
			schemaName,
		}: {
			tableName: string;
			schemaName: string | undefined;
		}) => {
			const { schema } = await getTableSchema(tableName, selectedDatabase, schemaName);
			await navigator.clipboard.writeText(schema);

			return schema;
		},
	});

	const copyTableSchema = async (tableName: string, schemaName: string | undefined) => {
		return toast.promise(copyTableSchemaMutation({ tableName, schemaName }), {
			loading: "Copying table schema...",
			success: "Table schema copied to clipboard",
			error: (error: Error) => sdkErrorMessage(error, "Failed to copy table schema"),
		});
	};

	return {
		copyTableSchema,
		isCopyingSchema,
	};
};
