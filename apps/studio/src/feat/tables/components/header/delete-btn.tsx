import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@peridotbase/ui/alert-dialog";
import { Button } from "@peridotbase/ui/button";
import type { OnChangeFn, Row, RowSelectionState } from "@tanstack/react-table";
import { useCallback, useState } from "react";
import type { TableRecord } from "@/feat/tables/table.type";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { useDeleteCells } from "../../hooks/use-delete-cell";

export const DeleteBtn = ({
	selectedRows,
	setRowSelection,
	tableName,
	disabledReason,
}: {
	tableName: string;
	selectedRows: Row<TableRecord>[];
	setRowSelection: OnChangeFn<RowSelectionState>;
	disabledReason?: string;
}) => {
	const { deleteCells, isDeletingCells } = useDeleteCells({
		tableName,
		schemaName: useTableSchemaName(),
	});

	const [isOpenConfirmDialog, setIsOpenConfirmDialog] = useState(false);

	const handleDeleteClick = useCallback(() => {
		if (disabledReason) return;
		setIsOpenConfirmDialog(true);
	}, [disabledReason]);

	const handleConfirmDelete = useCallback(async () => {
		if (disabledReason) return;
		const rowData = selectedRows.map((row) => row.original);
		setIsOpenConfirmDialog(false);

		try {
			const result = await deleteCells(rowData);

			// The program refused because other rows still reference these; the toast says so.
			if (result.fkViolation) return;

			setRowSelection({});
		} catch {
			// The mutation hook already reported the failure through toast.promise.
		}
	}, [disabledReason, deleteCells, selectedRows, setRowSelection]);

	if (selectedRows?.length === 0) {
		return null;
	}

	return (
		<>
			<Button
				type="button"
				variant="destructive"
				className="h-8! border-l-0 border-y-0 border-r border-border text-white rounded-none"
				onClick={handleDeleteClick}
				aria-label="Delete the selected record"
				disabled={isDeletingCells || Boolean(disabledReason)}
				title={disabledReason}
			>
				Delete Record
				{selectedRows?.length > 1 && (
					<span className="ml-1.5 px-1.5 text-[10px] bg-white/20 border border-white/20 rounded">
						{selectedRows?.length}
					</span>
				)}
			</Button>

			<AlertDialog open={isOpenConfirmDialog} onOpenChange={setIsOpenConfirmDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {selectedRows.length === 1 ? "Record" : "Records"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete{" "}
							{selectedRows.length === 1 ? "this record" : `${selectedRows.length} records`}{" "}
							from "{tableName}"? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
