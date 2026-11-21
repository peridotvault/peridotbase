import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@peridotvault/peridotbase-ui/dropdown-menu";
import { Plus } from "lucide-react";
import { ToolbarButton } from "@/shared/components/toolbar";
import { openAddRecord } from "@/shared/stores/add-record.store";
import { useOverlayStore } from "@/shared/stores/overlay.store";

export const AddRecordMenu = () => {
	const { openOverlay } = useOverlayStore();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<ToolbarButton type="button" variant="default" aria-label="Add records to the table">
					<Plus />
					Add record
				</ToolbarButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-48">
				<DropdownMenuItem onClick={() => openAddRecord()}>Add Record</DropdownMenuItem>
				<DropdownMenuItem onClick={() => openOverlay("records.bulk-insert-csv")}>
					Add data from CSV
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => openOverlay("records.bulk-insert-excel")}>
					Add data from Excel
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => openOverlay("records.bulk-insert-json")}>
					Add data from JSON
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
