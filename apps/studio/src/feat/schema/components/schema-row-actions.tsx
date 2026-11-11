import type { ColumnInfoSchemaType } from "@peridotbase/sdk";
import { Button } from "@peridotbase/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@peridotbase/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@peridotbase/ui/dropdown-menu";
import { Input } from "@peridotbase/ui/input";
import { Label } from "@peridotbase/ui/label";
import { EllipsisVertical, Pencil, Trash2, Type } from "lucide-react";
import { useState } from "react";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { useOverlayStore } from "@/shared/stores/overlay.store";
import { openDropColumn, useSchemaEditStore } from "@/shared/stores/schema-edit.store";
import { useRenameColumn } from "../hooks/use-rename-column";

export const SchemaRowActions = ({
	col,
	tableName,
}: {
	col: ColumnInfoSchemaType;
	tableName: string;
}) => {
	const { openOverlay } = useOverlayStore();
	const { setEditingColumn } = useSchemaEditStore();
	const schemaName = useTableSchemaName();

	const { renameColumn, isRenamingColumn } = useRenameColumn({
		tableName,
		schemaName,
		columnName: col.columnName,
	});

	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
	const [newColumnName, setNewColumnName] = useState(col.columnName);

	const handleEditColumn = () => {
		setEditingColumn(col);
		openOverlay("schema.edit-column");
	};

	const handleRenameDialogChange = (open: boolean) => {
		setIsRenameDialogOpen(open);

		if (!open) {
			setNewColumnName(col.columnName);
		}
	};

	const handleRenameColumn = async () => {
		try {
			await renameColumn({ newColumnName: newColumnName.trim() });
			handleRenameDialogChange(false);
		} catch {
			// The mutation hook already reported the failure through toast.promise.
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon-sm">
						<EllipsisVertical className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={handleEditColumn}>
							<Pencil className="size-4" />
							Edit Column
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handleRenameDialogChange(true)}>
							<Type className="size-4" />
							Rename Column
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={() =>
								openDropColumn({
									tableName,
									schemaName,
									columnName: col.columnName,
								})
							}
						>
							<Trash2 className="size-4" />
							Drop Column
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>

			<RenameColumnDialog
				columnName={col.columnName}
				newColumnName={newColumnName}
				setNewColumnName={setNewColumnName}
				isOpen={isRenameDialogOpen}
				onOpenChange={handleRenameDialogChange}
				onRename={handleRenameColumn}
				isRenaming={isRenamingColumn}
			/>
		</>
	);
};

const RenameColumnDialog = ({
	columnName,
	newColumnName,
	setNewColumnName,
	isOpen,
	onOpenChange,
	onRename,
	isRenaming,
}: {
	columnName: string;
	newColumnName: string;
	setNewColumnName: (value: string) => void;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onRename: () => void;
	isRenaming: boolean;
}) => {
	const isDisabled = !newColumnName.trim() || newColumnName.trim() === columnName;

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Rename Column</DialogTitle>
					<DialogDescription>
						Update the column name while keeping the rest of the schema unchanged.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="current-column-name">Current name</Label>
						<Input id="current-column-name" value={columnName} readOnly disabled />
					</div>

					<div className="space-y-2">
						<Label htmlFor="new-column-name">New name</Label>
						<Input
							id="new-column-name"
							value={newColumnName}
							onChange={(e) => setNewColumnName(e.target.value)}
							placeholder="column_name"
							autoFocus
						/>
					</div>
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRenaming}>
						Cancel
					</Button>
					<Button onClick={onRename} disabled={isDisabled || isRenaming}>
						{isRenaming ? "Renaming..." : "Rename Column"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
