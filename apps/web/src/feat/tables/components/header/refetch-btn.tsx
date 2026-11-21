import { RefreshCw } from "lucide-react";
import { useCallback } from "react";
import { ToolbarIconButton } from "@/shared/components/toolbar";
import { useTableCols } from "@/shared/hooks/use-table-cols";
import { useTableData } from "@/shared/hooks/use-table-data";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { useGridPage } from "../../hooks/use-grid-page";

export const RefetchBtn = ({ tableName }: { tableName: string }) => {
	const schemaName = useTableSchemaName();

	const { refetchTableData, isRefetchingTableData } = useTableData(
		useGridPage(tableName, schemaName),
	);

	const { refetchTableCols, isRefetchingTableCols } = useTableCols({ tableName, schemaName });

	const handleRefetch = useCallback(() => {
		Promise.all([refetchTableData(), refetchTableCols()]);
	}, [refetchTableData, refetchTableCols]);

	return (
		<ToolbarIconButton
			type="button"
			onClick={handleRefetch}
			aria-label="Refetch table data and columns"
			disabled={isRefetchingTableData || isRefetchingTableCols}
		>
			<RefreshCw />
		</ToolbarIconButton>
	);
};
