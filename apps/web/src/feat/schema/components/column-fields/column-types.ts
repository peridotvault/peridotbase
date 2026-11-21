import type { StandardizedDataType } from "@peridotvault/peridotbase-sdk";
import type { ColumnOption } from "./column-field-values";

/**
 * Column types the create-table form offers. Every value maps to a wire-level
 * program type; unknown types are rejected instead of silently becoming TEXT.
 */
export type FormColumnType = StandardizedDataType | "address";

export const PSQL_TYPES = {
	numeric: [
		{
			value: "smallint",
			label: "smallint",
			description: "Signed two-byte integer (stored as bigint)",
		},
		{ value: "int", label: "int", description: "Signed four-byte integer (stored as bigint)" },
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
	json: [],
	binary: [],
	other: [
		{
			value: "address",
			label: "address",
			description: "32-byte Solana wallet/program address",
		},
	],
} satisfies Record<string, { value: FormColumnType; label: string; description: string }[]>;

export const ARRAY_COMPATIBLE_TYPES: string[] = [];

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
		name: "isArray",
		label: "Define as Array",
		description: "Define your column as a variable-length multidimensional array",
	},
];
