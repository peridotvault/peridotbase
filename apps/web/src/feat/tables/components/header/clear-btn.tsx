import { useCallback } from "react";
import { ToolbarButton } from "@/shared/components/toolbar";
import { useUpdateCell } from "../../hooks/use-update-cell";
import { useUpdateCellStore } from "../../stores/update-cell.store";

export const ClearBtn = ({ tableName }: { tableName: string }) => {
	const { getUpdateCount, clearUpdates } = useUpdateCellStore();
	const { isUpdatingCell, editScope } = useUpdateCell(tableName);

	const handleClearUpdates = useCallback(() => {
		clearUpdates(editScope.id);
	}, [clearUpdates, editScope.id]);

	if (getUpdateCount(editScope.id) === 0) {
		return null;
	}

	return (
		<ToolbarButton
			type="button"
			onClick={handleClearUpdates}
			aria-label="Clear changes to the table"
			disabled={isUpdatingCell}
		>
			Clear changes
		</ToolbarButton>
	);
};
