import { Button } from "@peridotvault/peridotbase-ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@peridotvault/peridotbase-ui/dialog";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Label } from "@peridotvault/peridotbase-ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	closeDroppedTable,
	getDroppedTables,
	restoreTable,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { CONSTANTS } from "@/shared/utils/constants";
import { tableId } from "@/shared/utils/table-id";

/** Soft-dropped catalogs: their rows are still on chain and the program can bring them back. */
export const SidebarDroppedTables = () => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();
	const [closeTarget, setCloseTarget] = useState<{
		tableName: string;
		schemaName?: string;
	} | null>(null);
	const [confirmName, setConfirmName] = useState("");

	const { data: dropped = [] } = useQuery({
		queryKey: tableKeys.dropped(selectedDatabase),
		queryFn: () => getDroppedTables(selectedDatabase),
		enabled: Boolean(selectedDatabase),
	});

	const { mutateAsync: close, isPending: isClosing } = useMutation({
		mutationFn: (table: { tableName: string; schemaName?: string }) =>
			closeDroppedTable({ ...table, db: selectedDatabase }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: tableKeys.lists() }),
	});

	const { mutateAsync: restore, isPending } = useMutation({
		mutationFn: (table: { tableName: string; schemaName?: string }) =>
			restoreTable({ ...table, db: selectedDatabase }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: tableKeys.lists() }),
	});

	if (dropped.length === 0) return null;

	const handleRestore = async (table: { tableName: string; schemaName?: string }) => {
		try {
			await toast
				.promise(restore(table), {
					loading: `Restoring ${tableId(table)}...`,
					success: (result) => result.message,
					error: (error: Error) => sdkErrorMessage(error, "Failed to restore table"),
				})
				.unwrap();
		} catch {
			// toast.promise already reported the failure.
		}
	};

	const handleClose = async () => {
		if (!closeTarget || confirmName.trim() !== closeTarget.tableName) return;

		try {
			await toast
				.promise(close(closeTarget), {
					loading: `Closing ${tableId(closeTarget)}...`,
					success: (result) => result.message,
					error: (error: Error) => sdkErrorMessage(error, "Failed to close the table"),
				})
				.unwrap();
			setCloseTarget(null);
			setConfirmName("");
		} catch {
			// toast.promise already reported the failure.
		}
	};

	return (
		<>
			<section className="mt-3 border-t border-border px-3 pt-3">
				<p className="mb-2 text-xs text-muted-foreground">Dropped tables</p>
				<ul className="space-y-1">
					{dropped.map((table) => (
						<li key={tableId(table)} className="flex items-center justify-between gap-2">
							<span className="truncate text-xs line-through">
								{table.schemaName && table.schemaName !== CONSTANTS.DEFAULT_SCHEMA && (
									<span className="text-muted-foreground">{table.schemaName}.</span>
								)}
								{table.tableName}
							</span>
							<div className="flex items-center gap-0.5">
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={`Restore ${tableId(table)}`}
									disabled={isPending || isClosing}
									onClick={() => void handleRestore(table)}
								>
									<ArchiveRestore className="size-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={`Close ${tableId(table)} permanently`}
									disabled={isPending || isClosing}
									onClick={() => {
										setCloseTarget(table);
										setConfirmName("");
									}}
								>
									<Trash2 className="size-4" />
								</Button>
							</div>
						</li>
					))}
				</ul>
			</section>

			<Dialog
				open={closeTarget != null}
				onOpenChange={(open) => {
					if (!open && !isClosing) {
						setCloseTarget(null);
						setConfirmName("");
					}
				}}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Close table permanently</DialogTitle>
						<DialogDescription>
							This closes the catalog and reclaims rent. The table cannot be restored. Type the
							table name to confirm.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="close-table-confirm">
							{closeTarget ? tableId(closeTarget) : null}
						</Label>
						<Input
							id="close-table-confirm"
							value={confirmName}
							disabled={isClosing}
							onChange={(event) => setConfirmName(event.target.value)}
						/>
					</div>
					<DialogFooter className="gap-2">
						<Button
							variant="outline"
							disabled={isClosing}
							onClick={() => setCloseTarget(null)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={
								isClosing || !closeTarget || confirmName.trim() !== closeTarget.tableName
							}
							onClick={() => void handleClose()}
						>
							Close permanently
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
