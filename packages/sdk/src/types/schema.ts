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
	isArray: z.boolean().default(false),
	/** ENUM/DOMAIN catalog name this column references, when any. */
	typeName: z.string().optional(),
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

/**
 * A composite index declared with the table. The program cannot add a
 * multi-column index later, so it has to ride along with `create_table`.
 */
export const tableIndexSchema = z.object({
	indexName: z.string("Index name is required"),
	/** Ordered columns; at least two, otherwise declare a unique column instead. */
	columns: z
		.array(z.string("Column name is required"))
		.min(2, "A composite index needs two columns"),
	isUnique: z.boolean().default(false),
});

export type TableIndex = z.infer<typeof tableIndexSchema>;

export const createTableSchema = z.object({
	tableName: z.string("Table name is required"),
	/** Target schema namespace; omitted means the database default. */
	schemaName: z.string().optional(),
	fields: z.array(fieldDataSchema).min(1, "At least one field is required"),
	foreignKeys: z.array(foreignKeyDataSchema).optional(),
	indexes: z.array(tableIndexSchema).optional(),
});

export type CreateTablePayload = z.infer<typeof createTableSchema>;

export const addColumnSchema = z.object({
	columnName: z.string("Column name is required"),
	columnType: z.string("Column type is required"),
	defaultValue: z.string().optional(),
	isPrimaryKey: z.boolean().default(false),
	isNullable: z.boolean().default(false),
	isUnique: z.boolean().default(false),
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

/** A schema namespace created in the database. */
export const schemaCatalogInfoSchema = z.object({
	schemaName: z.string(),
	createdAt: z.number(),
});

export type SchemaCatalogInfo = z.infer<typeof schemaCatalogInfoSchema>;

/** A database-scoped ENUM or DOMAIN catalog. */
export const databaseTypeInfoSchema = z.object({
	typeName: z.string(),
	kind: z.enum(["enum", "domain"]),
	/** Base column type the catalog enforces. */
	base: z.string(),
	scale: z.number(),
	/** Allowed values, decoded with the base type (empty for domains). */
	enumValues: z.array(z.string()),
	createdAt: z.number(),
});

export type DatabaseTypeInfo = z.infer<typeof databaseTypeInfoSchema>;

export const createEnumSchema = z.object({
	typeName: z.string("Type name is required"),
	values: z.array(z.string()).min(1, "At least one enum value is required"),
});

export type CreateEnumPayload = z.infer<typeof createEnumSchema>;

export const domainCheckOperators = ["gt", "ge", "lt", "le", "eq", "ne"] as const;

export type DomainCheckOperator = (typeof domainCheckOperators)[number];

export const createDomainSchema = z.object({
	typeName: z.string("Type name is required"),
	base: z.string("Base type is required"),
	scale: z.number().nonnegative().optional(),
	operator: z.enum(domainCheckOperators),
	value: z.string("Check value is required"),
});

export type CreateDomainPayload = z.infer<typeof createDomainSchema>;
