import type { ColumnInfoSchemaType } from "@peridotbase/sdk";
import type { TableRecord } from "@/feat/tables/table.type";
import { isGeneratedColumn, toFormValues } from "./row-details-utils";

/**
 * Add-record form values for a copy of the row. Leaves out what the program generates, a
 * lone primary key (a copy can never reuse it), and NULLs, so those columns take their default.
 */
export const toDuplicateValues = (row: TableRecord, tableCols: ColumnInfoSchemaType[]) => {
	const isLonePrimaryKey = tableCols.filter((col) => col.isPrimaryKey).length === 1;

	const omitted = new Set(
		tableCols.flatMap((col) =>
			isGeneratedColumn(col) || (col.isPrimaryKey && isLonePrimaryKey) ? [col.columnName] : [],
		),
	);

	return Object.fromEntries(
		Object.entries(toFormValues(row, tableCols)).filter(
			([name]) => !omitted.has(name) && row[name] !== null && row[name] !== undefined,
		),
	);
};
