import { isPendingIntegration } from "@/shared/peridotbase";

export const TableErrorState = ({
	errorTableData,
	errorTableCols,
}: {
	errorTableData: Error | null;
	errorTableCols: Error | null;
}) => {
	const error = errorTableData || errorTableCols;
	const errorMessage = error?.message || "";

	const isPending = error ? isPendingIntegration(error) : false;

	const isNetworkError =
		!isPending &&
		(errorMessage.includes("Network Error") || errorMessage.includes("Failed to fetch"));

	let errorTitle = "Something went wrong";
	let errorDescription = errorMessage || "An unexpected error occurred";

	if (isPending) {
		errorTitle = "Program operation pending";
		errorDescription =
			errorMessage ||
			`The Peridotbase program in peridotbase-core has not published a program ID or IDL for this read yet.`;
	} else if (isNetworkError) {
		errorTitle = "Connection failed";
		errorDescription =
			"Unable to reach the RPC endpoint. Check the workspace connection settings.";
	}

	return (
		<div className="size-full flex flex-col items-center justify-center">
			<div className="flex-1 flex flex-col items-center justify-center gap-2">
				<div className="text-sm font-medium">{errorTitle}</div>
				<div className="text-sm text-muted-foreground">{errorDescription}</div>
			</div>
		</div>
	);
};
