import { z } from "zod";
import type { RelatedRow } from "./row.js";

export const FOREIGN_KEY_ACTIONS = [
	"CASCADE",
	"SET NULL",
	"SET DEFAULT",
	"RESTRICT",
	"NO ACTION",
] as const;

export const foreignKeyActionSchema = z.enum(FOREIGN_KEY_ACTIONS);

export const fieldDataSchema = z.object({
	columnName: z.string("Column name is required"),
	columnType: z.string("Column type is required"),
	defaultValue: z.string().optional(),
	isPrimaryKey: z.boolean().default(false),
	isNullable: z.boolean().default(false),
	isUnique: z.boolean().default(false),
	isIdentity: z.boolean().default(false),
	isArray: z.boolean().default(false),
});

export type FieldData = z.infer<typeof fieldDataSchema>;

export const foreignKeyDataSchema = z.object({
	columnName: z.string("Column name is required"),
	referencedTable: z.string("Referenced table is required"),
	referencedColumn: z.string("Referenced column is required"),
	onUpdate: foreignKeyActionSchema.default("NO ACTION"),
	onDelete: foreignKeyActionSchema.default("NO ACTION"),
});

export type ForeignKeyData = z.infer<typeof foreignKeyDataSchema>;

export const createTableSchema = z.object({
	tableName: z.string("Table name is required"),
	fields: z.array(fieldDataSchema).min(1, "At least one field is required"),
	foreignKeys: z.array(foreignKeyDataSchema).optional(),
});

export type CreateTablePayload = z.infer<typeof createTableSchema>;

export const addColumnSchema = z.object({
	columnName: z.string("Column name is required"),
	columnType: z.string("Column type is required"),
	defaultValue: z.string().optional(),
	isPrimaryKey: z.boolean().default(false),
	isNullable: z.boolean().default(false),
	isUnique: z.boolean().default(false),
	isIdentity: z.boolean().default(false),
	isArray: z.boolean().default(false),
});

export type AddColumnPayload = z.infer<typeof addColumnSchema>;

export const alterColumnSchema = z.object({
	columnType: z.string("Column type is required"),
	isNullable: z.boolean(),
	defaultValue: z.string().nullable().optional(),
});

export type AlterColumnPayload = z.infer<typeof alterColumnSchema>;

export const renameColumnSchema = z.object({
	oldColumnName: z.string("Current column name is required"),
	newColumnName: z.string("New column name is required"),
});

export type RenameColumnPayload = z.infer<typeof renameColumnSchema>;

export const renameTableSchema = z.object({
	newTableName: z.string("New table name is required"),
});

export type RenameTablePayload = z.infer<typeof renameTableSchema>;

export type RenameTableSchemaType = RenameTablePayload;

/** A mutation answered by the program; every write returns one of these. */
export type MutationResult = {
	/** Human-readable summary shown in a toast. */
	message: string;
	/** Signature of the transaction that carried the mutation, when one was submitted. */
	signature?: string;
};

export type CreateTableSchemaType = CreateTablePayload;
export type AddColumnSchemaType = AddColumnPayload;
export type AlterColumnSchemaType = AlterColumnPayload;
export type RenameColumnSchemaType = RenameColumnPayload;
export type FieldDataType = FieldData;
export type ForeignKeyDataType = ForeignKeyData;
export type DeleteColumnParamsSchemaType = {
	tableName: string;
	schemaName?: string;
	columnName: string;
	cascade?: boolean;
};
export type DeleteTableResult = {
	message: string;
	fkViolation: boolean;
	deletedCount: number;
};
export type FormatType = "csv" | "json";
export type DeleteRecordResult = {
	deletedCount: number;
	fkViolation: boolean;
	relatedRecords: RelatedRow[];
};
