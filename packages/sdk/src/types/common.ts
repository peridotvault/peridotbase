import { z } from "zod";

/**
 * The cell variants the Studio renders. They describe presentation, not the protocol's storage
 * type: a column still carries its full protocol type in `dataTypeLabel`.
 */
export const dataTypesSchema = z.enum([
	"text",
	"boolean",
	"number",
	"enum",
	"json",
	"date",
	"array",
]);

export type DataTypes = z.infer<typeof dataTypesSchema>;

export const DataTypes = {
	text: "text",
	boolean: "boolean",
	number: "number",
	enum: "enum",
	json: "json",
	date: "date",
	array: "array",
} as const satisfies Record<DataTypes, string>;

/** Wire-level column types the protocol knows about today. */
export const standardizedDataTypes = [
	"int",
	"bigint",
	"smallint",
	"numeric",
	"float",
	"double",
	"boolean",
	"text",
	"varchar",
	"char",
	"json",
	"jsonb",
	"uuid",
	"date",
	"time",
	"timestamp",
	"timestamptz",
	"bytea",
	"array",
	"enum",
] as const;

export const standardizedDataTypeSchema = z.enum(standardizedDataTypes);

export type StandardizedDataType = z.infer<typeof standardizedDataTypeSchema>;

export const StandardizedDataType = standardizedDataTypeSchema.enum;

export const sortDirections = ["asc", "desc"] as const;

export type SortDirection = (typeof sortDirections)[number];

export const sortSchema = z.object({
	columnName: z.string(),
	direction: z.enum(sortDirections),
});

export type SortType = z.infer<typeof sortSchema>;

export const filterSchema = z.object({
	columnName: z.string(),
	operator: z.string(),
	value: z.string(),
});

export type FilterType = z.infer<typeof filterSchema>;
