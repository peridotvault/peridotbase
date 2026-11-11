import { z } from "zod";
import { dataTypesSchema, standardizedDataTypeSchema } from "./common.js";

export const tableInfoSchema = z.object({
	tableName: z.string("Table name is required"),
	schemaName: z.string().optional(),
	rowCount: z.coerce.number("Row count is required"),
	/** True when the row count is an estimate reported by the program. */
	rowCountEstimated: z.boolean().optional(),
});

export type TableInfo = z.infer<typeof tableInfoSchema>;

/** Historical name kept for the Studio's UI types; prefer `TableInfo`. */
export type TableInfoSchemaType = TableInfo;

export const columnInfoSchema = z.object({
	columnName: z.string(),
	dataType: dataTypesSchema,
	dataTypeLabel: standardizedDataTypeSchema,
	isNullable: z.boolean(),
	columnDefault: z.string().nullable(),
	isPrimaryKey: z.boolean(),
	isForeignKey: z.boolean(),
	referencedTable: z.string().nullable(),
	referencedSchema: z.string().optional(),
	referencedColumn: z.string().nullable(),
	enumValues: z.array(z.string()).nullable(),
});

export type ColumnInfo = z.infer<typeof columnInfoSchema>;

/** Historical name kept for the Studio's UI types; prefer `ColumnInfo`. */
export type ColumnInfoSchemaType = ColumnInfo;

export const relationshipSchema = z.object({
	fromTable: z.string(),
	fromColumn: z.string(),
	toTable: z.string(),
	toColumn: z.string(),
});

export type Relationship = z.infer<typeof relationshipSchema>;

export const tableSchemaResultSchema = z.object({
	schema: z.string(),
});

export type TableSchemaResult = z.infer<typeof tableSchemaResultSchema>;
