import { Button } from "@peridotvault/peridotbase-ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@peridotvault/peridotbase-ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@peridotvault/peridotbase-ui/dropdown-menu";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Label } from "@peridotvault/peridotbase-ui/label";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
	ClipboardCopy,
	CopyPlus,
	Download,
	EllipsisVertical,
	FileCode,
	Pencil,
	Settings2,
	Trash2,
	Type,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSchemaEditStore } from "@/shared/stores/schema-edit.store";
import { useCopyTableSchema } from "@/shared/hooks/use-copy-table-schema";
import { useExportFile } from "@/shared/hooks/use-export-file";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { DATA_TABLE_PATH } from "@/shared/lib/sections";
import { useOverlayStore } from "@/shared/stores/overlay.store";
import { CONSTANTS } from "@/shared/utils/constants";
import { useDeleteTable } from "../../hooks/use-delete-table";
import { useDuplicateTable } from "../../hooks/use-duplicate-table";
import { useRenameTable } from "../../hooks/use-rename-table";
import { TableSettingsDialog } from "../table-settings-dialog";
import { tableId } from "@/shared/utils/table-id";

export const SidebarListTablesMenu = ({
	tableName,
	schemaName,
}: {
	tableName: string;
	schemaName?: string;
}) => {
	const navigate = useNavigate();
	const params = useParams({ strict: false });
	const scope = useStudioScope();
	const openSchema = useTableSchemaName();
	const { copyTableSchema, isCopyingSchema } = useCopyTableSchema();
	const { exportFile, isExportingFile } = useExportFile();
	const { deleteTable, isDeletingTable } = useDeleteTable();
	const { duplicateTable, isDuplicatingTable } = useDuplicateTable({ tableName, schemaName });
	const { renameTable, isRenamingTable } = useRenameTable({ tableName, schemaName });
	const { openOverlay, closeOverlay, isOverlayOpen } = useOverlayStore();
	const { setEditingTable } = useSchemaEditStore();
	const capabilities = useStudioCapabilities();
	const [newTableName, setNewTableName] = useState(tableName);
	const [duplicateName, setDuplicateName] = useState(`${tableName}_copy`);

	const isOpenTable = params.table === tableName && openSchema === schemaName;

	// Same-named tables in two schemas each get their own dialogs.
	const overlayKey = tableId({ schemaName, tableName });
	const renameOverlayId = `tables.rename-table.${overlayKey}` as const;
	const deleteOverlayId = `tables.delete-table.${overlayKey}` as const;
	const duplicateOverlayId = `tables.duplicate-table.${overlayKey}` as const;
	const settingsOverlayId = `tables.settings.${overlayKey}` as const;

	const handleRenameDialogChange = (open: boolean) => {
		if (open) {
			setNewTableName(tableName);
			openOverlay(renameOverlayId);
		} else {
			closeOverlay(renameOverlayId);
		}
	};

	const handleRename = async () => {
		const trimmed = newTableName.trim();

		if (!trimmed || trimmed === tableName) return;

		try {
			await renameTable({ newTableName: trimmed });
			handleRenameDialogChange(false);

			if (isOpenTable) {
				navigate({
					to: DATA_TABLE_PATH,
					params: { ...scope, table: trimmed },
					search: { [CONSTANTS.TABLE_SCHEMA]: schemaName },
				});
			}
		} catch {
			// Error notification handled by toast.promise in useRenameTable
		}
	};

	const handleDuplicateDialogChange = (open: boolean) => {
		if (open) {
			setDuplicateName(`${tableName}_copy`);
			openOverlay(duplicateOverlayId);
		} else {
			closeOverlay(duplicateOverlayId);
		}
	};

	const handleDuplicate = async () => {
		const trimmed = duplicateName.trim();

		if (!trimmed || trimmed === tableName) return;

		try {
			await duplicateTable(trimmed);
			handleDuplicateDialogChange(false);
			navigate({
				to: DATA_TABLE_PATH,
				params: { ...scope, table: trimmed },
				search: { [CONSTANTS.TABLE_SCHEMA]: schemaName },
			});
		} catch {
			// Error notification handled by toast.promise in useDuplicateTable
		}
	};

	const handleCopyName = () => {
		navigator.clipboard.writeText(tableName);
		toast.success("Table name copied to clipboard");
	};

	const handleDelete = async () => {
		try {
			await deleteTable(tableName, schemaName);
			closeOverlay(deleteOverlayId);

			if (isOpenTable) navigate({ to: "/studio/org/$organization/$project", params: scope });
		} catch {
			// Error notification handled by toast.promise in useDeleteTable
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={(e) => {
							// Prevent the parent sidebar <Link> from navigating
							// when opening the row actions menu.
							e.stopPropagation();
							e.preventDefault();
						}}
						onPointerDown={(e) => {
							e.stopPropagation();
						}}
					>
						<EllipsisVertical />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-56" align="start">
					<DropdownMenuGroup>
						<DropdownMenuItem onClick={handleCopyName}>
							<ClipboardCopy className="size-4" />
							Copy name
						</DropdownMenuItem>
						{capabilities.ddl && (
							<DropdownMenuItem
								onClick={() => copyTableSchema(tableName, schemaName)}
								disabled={isCopyingSchema}
							>
								<FileCode className="size-4" />
								Copy table schema
							</DropdownMenuItem>
						)}
						<DropdownMenuSeparator />
						{capabilities.ddl && (
							<>
								<DropdownMenuItem onClick={() => handleRenameDialogChange(true)}>
									<Type className="size-4" />
									Rename table
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => {
										setEditingTable({ tableName, schemaName });
										openOverlay("schema.edit-table");
									}}
								>
									<Pencil className="size-4" />
									Edit table
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => openOverlay(settingsOverlayId)}>
									<Settings2 className="size-4" />
									Table settings
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => handleDuplicateDialogChange(true)}>
									<CopyPlus className="size-4" />
									Duplicate table
								</DropdownMenuItem>
							</>
						)}
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<Download className="size-4" />
								Export data
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuItem
									onClick={() => exportFile({ tableName, schemaName, format: "csv" })}
									disabled={isExportingFile}
								>
									Export as CSV
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => exportFile({ tableName, schemaName, format: "json" })}
									disabled={isExportingFile}
								>
									Export as JSON
								</DropdownMenuItem>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						{capabilities.ddl && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onClick={() => openOverlay(deleteOverlayId)}
								>
									<Trash2 className="size-4" />
									Drop table
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>

			<RenameTableDialog
				tableName={tableName}
				newTableName={newTableName}
				setNewTableName={setNewTableName}
				isOpen={isOverlayOpen(renameOverlayId)}
				onOpenChange={handleRenameDialogChange}
				onRename={handleRename}
				isRenaming={isRenamingTable}
			/>

			<DeleteTableDialog
				isOpen={isOverlayOpen(deleteOverlayId)}
				// Controlled and trigger-less: the dialog only ever asks to close.
				onOpenChange={(open) => {
					if (!open) closeOverlay(deleteOverlayId);
				}}
				tableName={tableName}
				onDelete={handleDelete}
				isDeleting={isDeletingTable}
			/>

			<DuplicateTableDialog
				tableName={tableName}
				duplicateName={duplicateName}
				setDuplicateName={setDuplicateName}
				isOpen={isOverlayOpen(duplicateOverlayId)}
				onOpenChange={handleDuplicateDialogChange}
				onDuplicate={handleDuplicate}
				isDuplicating={isDuplicatingTable}
			/>

			<TableSettingsDialog
				tableName={tableName}
				schemaName={schemaName}
				open={isOverlayOpen(settingsOverlayId)}
				onOpenChange={(open) => {
					if (open) openOverlay(settingsOverlayId);
					else closeOverlay(settingsOverlayId);
				}}
			/>
		</>
	);
};

const RenameTableDialog = ({
	tableName,
	newTableName,
	setNewTableName,
	isOpen,
	onOpenChange,
	onRename,
	isRenaming,
}: {
	tableName: string;
	newTableName: string;
	setNewTableName: (value: string) => void;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onRename: () => void;
	isRenaming: boolean;
}) => {
	const trimmed = newTableName.trim();
	const isDisabled = !trimmed || trimmed === tableName;

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Rename Table</DialogTitle>
					<DialogDescription>
						Update the table name while keeping all data and schema unchanged.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="current-table-name">Current name</Label>
						<Input id="current-table-name" value={tableName} readOnly disabled />
					</div>

					<div className="space-y-2">
						<Label htmlFor="new-table-name">New name</Label>
						<Input
							id="new-table-name"
							value={newTableName}
							onChange={(e) => setNewTableName(e.target.value)}
							placeholder="table_name"
							autoFocus
							disabled={isRenaming}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !isDisabled && !isRenaming) {
									onRename();
								}
							}}
						/>
					</div>
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRenaming}>
						Cancel
					</Button>
					<Button onClick={onRename} disabled={isDisabled || isRenaming}>
						{isRenaming ? "Renaming..." : "Rename Table"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

const DuplicateTableDialog = ({
	tableName,
	duplicateName,
	setDuplicateName,
	isOpen,
	onOpenChange,
	onDuplicate,
	isDuplicating,
}: {
	tableName: string;
	duplicateName: string;
	setDuplicateName: (value: string) => void;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onDuplicate: () => void;
	isDuplicating: boolean;
}) => {
	const trimmed = duplicateName.trim();
	const isDisabled = !trimmed || trimmed === tableName;

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Duplicate Table</DialogTitle>
					<DialogDescription>
						Copy the columns, constraints and indexes of "{tableName}". Rows are not copied, so
						the new table starts empty.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2">
					<Label htmlFor="duplicate-table-name">New table name</Label>
					<Input
						id="duplicate-table-name"
						value={duplicateName}
						onChange={(event) => setDuplicateName(event.target.value)}
						placeholder="table_copy"
						autoFocus
						disabled={isDuplicating}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !isDisabled && !isDuplicating) {
								onDuplicate();
							}
						}}
					/>
				</div>

				<DialogFooter className="gap-2">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isDuplicating}
					>
						Cancel
					</Button>
					<Button onClick={onDuplicate} disabled={isDisabled || isDuplicating}>
						{isDuplicating ? "Duplicating..." : "Duplicate Table"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

const DeleteTableDialog = ({
	isOpen,
	onOpenChange,
	tableName,
	onDelete,
	isDeleting,
}: {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	tableName: string;
	onDelete: () => void;
	isDeleting: boolean;
}) => {
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Drop Table</DialogTitle>
					<DialogDescription>
						Drop the table <span className="font-semibold text-foreground">"{tableName}"</span>
						? Its rows stay on chain and it moves to Dropped tables, where you can restore it.
						Closing it there reclaims rent and cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={onDelete} disabled={isDeleting}>
						{isDeleting ? "Dropping..." : "Drop Table"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
