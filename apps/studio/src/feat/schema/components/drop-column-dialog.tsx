import { Button } from "@peridotbase/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@peridotbase/ui/dialog";
import { useDeleteColumn } from "../hooks/use-delete-column";

export const DropColumnDialog = ({
	tableName,
	schemaName,
	columnName,
	open,
	onOpenChange,
}: {
	tableName: string;
	schemaName: string | undefined;
	columnName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) => {
	const { deleteColumn, isDeletingColumn } = useDeleteColumn();

	const handleDrop = () => {
		deleteColumn({ tableName, schemaName, columnName });
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Drop Column</DialogTitle>
					<DialogDescription>
						Are you sure you want to drop the column{" "}
						<span className="font-semibold text-foreground">"{columnName}"</span>? This action
						cannot be undone and permanently removes the data stored in it.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className="gap-2">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
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
