import type { OnChangeFn, Row, RowSelectionState } from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { FilterPopup } from "@/shared/components/filter-popup";
import { Toolbar } from "@/shared/components/toolbar";
import type { TableRecord } from "@/feat/tables/table.type";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { CONSTANTS } from "@/shared/utils/constants";
import { tableFiltersParser } from "../../hooks/use-grid-page";
import { useRowMutation } from "../../hooks/use-row-mutation";
import { AddRecordMenu } from "./add-record-menu";
import { ClearBtn } from "./clear-btn";
import { ColumnPreferencesMenu } from "./column-preferences-menu";
import { CopyTableNameBtn } from "./copy-table-name-btn";
import { DeleteBtn } from "./delete-btn";
import { LiveModeToggle } from "./live-mode-toggle";
import { RefetchBtn } from "./refetch-btn";
import { ReviewBtn } from "./review-btn";
import { SaveBtn } from "./save-btn";

export const TableHeader = ({
	selectedRows,
	setRowSelection,
	tableName,
}: {
	selectedRows: Row<TableRecord>[];
	setRowSelection: OnChangeFn<RowSelectionState>;
	tableName: string;
}) => {
	const { live: canLiveMode } = useStudioCapabilities();
	const { rowMutationReason } = useRowMutation();
	const schemaName = useTableSchemaName();

	const [filters, setFilters] = useQueryState(
		CONSTANTS.TABLE_STATE_KEYS.FILTERS,
		tableFiltersParser,
	);

	const [, setCursor] = useQueryState(CONSTANTS.TABLE_STATE_KEYS.CURSOR);
	const [, setDirection] = useQueryState(CONSTANTS.TABLE_STATE_KEYS.DIRECTION);

	return (
		<Toolbar
			actions={
				<>
					<SaveBtn
						tableName={tableName}
						setRowSelection={setRowSelection}
						disabledReason={rowMutationReason}
					/>
					<ReviewBtn tableName={tableName} />
					<ClearBtn tableName={tableName} />
					<DeleteBtn
						tableName={tableName}
						selectedRows={selectedRows}
						setRowSelection={setRowSelection}
						disabledReason={rowMutationReason}
					/>
				</>
			}
		>
			<RefetchBtn tableName={tableName} />
			{canLiveMode && <LiveModeToggle />}
			<FilterPopup
				tableName={tableName}
				schemaName={schemaName}
				filters={filters}
				onApply={(next) => {
					setFilters(next);
					setCursor(null);
					setDirection(null);
				}}
			/>
			<ColumnPreferencesMenu tableName={tableName} />
			<CopyTableNameBtn tableName={tableName} />
			<AddRecordMenu />
		</Toolbar>
	);
};
