import { Button } from "@peridotbase/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@peridotbase/ui/dialog";
import { useOverlayStore } from "@/shared/stores/overlay.store";
import { useSchemaEditStore } from "@/shared/stores/schema-edit.store";
import { useDeleteColumn } from "../hooks/use-delete-column";

/** Confirmation for a column queued by `openDropColumn`; mounted once by the shell. */
export const DropColumnDialog = () => {
	const { closeOverlay, isOverlayOpen } = useOverlayStore();
	const { dropColumn, closeDropColumn } = useSchemaEditStore();
	const { deleteColumn, isDeletingColumn } = useDeleteColumn();

	const open = isOverlayOpen("schema.drop-column") && dropColumn !== null;

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) return;

		closeOverlay("schema.drop-column");
		closeDropColumn();
	};

	const handleDrop = () => {
		if (!dropColumn) return;

		deleteColumn(dropColumn);
		handleOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Drop Column</DialogTitle>
					<DialogDescription>
						Are you sure you want to drop the column{" "}
						<span className="font-semibold text-foreground">
							"{dropColumn?.columnName ?? ""}"
						</span>
						? This action cannot be undone and permanently removes the data stored in it.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className="gap-2">
					<Button
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={isDeletingColumn}
					>
						Cancel
					</Button>
					<Button variant="destructive" onClick={handleDrop} disabled={isDeletingColumn}>
						{isDeletingColumn ? "Dropping..." : "Drop Column"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
