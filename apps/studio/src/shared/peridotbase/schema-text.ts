import type { ColumnInfo, TableRef } from "@peridotbase/sdk";
import { getPeridotbaseClient } from "./client";

const ref = (
	db: string | null | undefined,
	tableName: string,
	schemaName?: string,
): TableRef => {
	if (!db) throw new Error("Select a database first");

	return { database: db, table: tableName, schema: schemaName };
};

/**
 * Renders a table's schema as DDL-like text for the clipboard. Peridotbase stores the schema as
 * program accounts rather than SQL, so this is a readable description, not executable SQL.
 */
export const getTableSchema = async (
	tableName: string,
	db: string | null | undefined,
	schemaName?: string,
): Promise<{ schema: string }> => {
	const columns = await getPeridotbaseClient().getTableColumns(ref(db, tableName, schemaName));

	return { schema: renderTableSchema(tableName, columns) };
};

export const renderTableSchema = (tableName: string, columns: ColumnInfo[]): string => {
	const lines = columns.map((column) => {
		const parts = [`  ${column.columnName} ${column.dataTypeLabel}`];

		if (column.isPrimaryKey) parts.push("PRIMARY KEY");
		if (!column.isNullable) parts.push("NOT NULL");
		if (column.columnDefault !== null) parts.push(`DEFAULT ${column.columnDefault}`);
		if (column.isForeignKey && column.referencedTable) {
			parts.push(`REFERENCES ${column.referencedTable}(${column.referencedColumn ?? ""})`);
		}

		return parts.join(" ");
	});

	return `-- Peridotbase table "${tableName}"\nCREATE TABLE ${tableName} (\n${lines.join(",\n")}\n);\n`;
};
