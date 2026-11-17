import { AddRecordForm, BulkInsertSheet } from "../records";
import { TableTab } from "../components/table-tab";

export const TableScreen = ({ tableName }: { tableName: string }) => {
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<TableTab tableName={tableName} />

			<AddRecordForm tableName={tableName} />
			<BulkInsertSheet tableName={tableName} format="auto" />
			<BulkInsertSheet tableName={tableName} format="csv" />
			<BulkInsertSheet tableName={tableName} format="excel" />
			<BulkInsertSheet tableName={tableName} format="json" />
		</div>
	);
};
