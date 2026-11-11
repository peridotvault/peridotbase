import type { FormatType } from "@peridotbase/sdk";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { type StudioError, exportTable, sdkErrorMessage } from "@/shared/peridotbase";
import { useDatabaseStore } from "@/shared/stores/database.store";

type ExportFileParams = {
	tableName: string;
	schemaName: string | undefined;
	format: FormatType;
};

export const useExportFile = () => {
	const { selectedDatabase } = useDatabaseStore();

	const { mutateAsync: exportFileMutation, isPending: isExportingFile } = useMutation<
		void,
		StudioError,
		ExportFileParams
	>({
		mutationFn: async ({ tableName, schemaName, format }: ExportFileParams) => {
			const { filename, contentType, data } = await exportTable({
				tableName,
				schemaName,
				format,
				db: selectedDatabase,
			});

			const blob = new Blob([data], { type: contentType });
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		},
	});

	// The toast reports a failure; the returned toast id never rejects.
	const exportFile = (params: ExportFileParams) =>
		toast.promise(exportFileMutation(params), {
			loading: "Exporting file...",
			success: "File exported successfully",
			error: (error: StudioError) => sdkErrorMessage(error, "Failed to export file"),
		});

	return {
		exportFile,
		isExportingFile,
	};
};
