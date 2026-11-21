import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";
import { useCallback } from "react";
import { ToolbarButton } from "@/shared/components/toolbar";
import { useUpdateCell } from "../../hooks/use-update-cell";
import { useUpdateCellStore } from "../../stores/update-cell.store";

export const SaveBtn = ({
	tableName,
	setRowSelection,
	disabledReason,
}: {
	tableName: string;
	setRowSelection: OnChangeFn<RowSelectionState>;
	disabledReason?: string;
}) => {
	const { getUpdates, getUpdateCount } = useUpdateCellStore();
	const { updateCell, isUpdatingCell, editScope } = useUpdateCell(tableName);

	const handleSave = useCallback(async () => {
		if (disabledReason) return;
		const updates = getUpdates(editScope.id);

		if (updates.length === 0) return;

		try {
			await updateCell(updates);
			setRowSelection({});
		} catch {
			// The mutation hook already reported the failure through toast.promise.
		}
	}, [disabledReason, getUpdates, editScope.id, updateCell, setRowSelection]);

	const updateCount = getUpdateCount(editScope.id);

	if (updateCount === 0) {
		return null;
	}

	return (
		<ToolbarButton
			type="button"
			variant="default"
			onClick={handleSave}
			aria-label="Save changes to the table"
			disabled={isUpdatingCell || Boolean(disabledReason)}
			title={disabledReason}
		>
			Save changes
			<span className="rounded-full bg-foreground/10 px-1.5 text-[0.625rem] leading-4 tabular-nums">
				{updateCount}
			</span>
		</ToolbarButton>
	);
};
