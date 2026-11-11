import type { StandardizedDataType } from "@peridotbase/sdk";
import type { ColumnOption } from "./column-field-values";

/**
 * The column types the Peridotbase program knows. `serial` and `bigserial` are accepted by the
 * create-column form as identity shorthand; every other value is a wire-level protocol type.
 */
export type FormColumnType = StandardizedDataType | "serial" | "bigserial";

export const PSQL_TYPES = {
	numeric: [
		{ value: "smallint", label: "smallint", description: "Signed two-byte integer" },
		{ value: "int", label: "int", description: "Signed four-byte integer" },
		{ value: "bigint", label: "bigint", description: "Signed eight-byte integer" },
		{ value: "float", label: "float", description: "Single precision floating-point number" },
		{
			value: "double",
			label: "double",
			description: "Double precision floating-point number",
		},
		{
			value: "numeric",
			label: "numeric",
			description: "Exact numeric of selectable precision",
		},
		{ value: "serial", label: "serial", description: "Auto-incrementing four-byte integer" },
		{
			value: "bigserial",
			label: "bigserial",
			description: "Auto-incrementing eight-byte integer",
		},
	],
	text: [
		{ value: "text", label: "text", description: "Variable-length string" },
		{ value: "varchar", label: "varchar", description: "Variable-length string with a limit" },
		{ value: "char", label: "char", description: "Fixed-length string" },
		{ value: "uuid", label: "uuid", description: "Universally unique identifier" },
	],
	boolean: [{ value: "boolean", label: "boolean", description: "Boolean true/false" }],
	datetime: [
		{ value: "date", label: "date", description: "Calendar date" },
		{ value: "time", label: "time", description: "Time of day" },
		{
			value: "timestamp",
			label: "timestamp",
			description: "Date and time without a time zone",
		},
		{
			value: "timestamptz",
			label: "timestamptz",
			description: "Date and time with a time zone",
		},
	],
	json: [
		{ value: "json", label: "json", description: "JSON document" },
		{ value: "jsonb", label: "jsonb", description: "Binary JSON document" },
	],
	binary: [{ value: "bytea", label: "bytea", description: "Binary data" }],
	other: [
		{ value: "array", label: "array", description: "Array of another type" },
		{ value: "enum", label: "enum", description: "One of a fixed set of labels" },
	],
} satisfies Record<string, { value: FormColumnType; label: string; description: string }[]>;

// Serial types auto-increment, so they cannot also be identity columns.
export const SERIAL_TYPES: string[] = ["serial", "bigserial"];

export const ARRAY_COMPATIBLE_TYPES: string[] = [
	"smallint",
	"int",
	"bigint",
	"float",
	"double",
	"numeric",
	"text",
	"varchar",
	"char",
	"uuid",
	"boolean",
	"date",
	"time",
	"timestamp",
	"timestamptz",
	"bytea",
];

export const COLUMN_OPTIONS: ColumnOption[] = [
	{
		name: "isNullable",
		label: "Is Nullable",
		description: "Specify if the column can assume a NULL value if no value is provided",
	},
	{
		name: "isUnique",
		label: "Is Unique",
		description: "Enforce if values in the column should be unique across rows",
	},
	{
		name: "isIdentity",
		label: "Is Identity",
		description: "Automatically assign a sequential unique number to the column",
	},
	{
		name: "isArray",
		label: "Define as Array",
		description: "Define your column as a variable-length multidimensional array",
	},
];
