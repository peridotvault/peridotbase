import { AddRecordForm, BulkInsertSheet } from "../records";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { TableTab } from "../components/table-tab";

export const TableScreen = ({ tableName }: { tableName: string }) => {
	// Remount per table, so pending edits and selection never carry over to a same-named table.
	const schemaName = useTableSchemaName();

	return (
		<main key={`${schemaName}.${tableName}`} className="flex-1 flex flex-col overflow-hidden">
			<TableTab tableName={tableName} />

			<AddRecordForm tableName={tableName} />
			<BulkInsertSheet tableName={tableName} format="auto" />
			<BulkInsertSheet tableName={tableName} format="csv" />
			<BulkInsertSheet tableName={tableName} format="excel" />
			<BulkInsertSheet tableName={tableName} format="json" />
		</main>
	);
};
