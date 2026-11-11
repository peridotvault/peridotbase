import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@peridotbase/ui/context-menu";
import type { Table } from "@tanstack/react-table";
import { Braces, CopyPlus } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { openAddRecord } from "@/feat/records";
import type { TableRecord } from "@/feat/tables/table.type";
import { useTableCols } from "@/shared/hooks/use-table-cols";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { toDuplicateValues } from "../utils/row-actions";
import { copyTextToClipboard } from "../utils/row-details-utils";

const copy = (text: string, success: string) =>
	toast.promise(copyTextToClipboard(text), {
		success,
		error: "Could not write to the clipboard",
	});

/** Right-click actions for the row under the pointer; `row` is undefined until one is chosen. */
export const TableRowMenu = ({
	table,
	tableName,
	row,
	onOpenChange,
	children,
}: {
	table: Table<TableRecord>;
	tableName: string;
	row: TableRecord | undefined;
	onOpenChange: (open: boolean) => void;
	children: ReactNode;
}) => {
	const schemaName = useTableSchemaName();
	const { tableCols } = useTableCols({ tableName, schemaName });

	return (
		<ContextMenu onOpenChange={onOpenChange}>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			{row ? (
				<ContextMenuContent>
					<ContextMenuItem
						onClick={() => copy(JSON.stringify(row, null, 2), "Row copied as JSON")}
					>
						<Braces className="size-4" />
						Copy row as JSON
					</ContextMenuItem>
					<ContextMenuItem
						disabled={!table.options.meta?.canMutateRows || !tableCols}
						onClick={() => {
							if (!tableCols) return;
							openAddRecord(toDuplicateValues(row, tableCols));
						}}
					>
						<CopyPlus className="size-4" />
						Duplicate row
					</ContextMenuItem>
				</ContextMenuContent>
			) : null}
		</ContextMenu>
	);
};
