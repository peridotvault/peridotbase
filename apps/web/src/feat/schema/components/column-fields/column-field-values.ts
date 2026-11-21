import { z } from "zod";

export const columnFieldSchema = z.object({
	columnName: z.string().min(1, "Column name is required"),
	columnType: z.string().min(1, "Column type is required"),
	defaultValue: z.string(),
	isPrimaryKey: z.boolean(),
	isNullable: z.boolean(),
	isUnique: z.boolean(),
	isArray: z.boolean(),
	/** ENUM/DOMAIN catalog name this column references, when any. */
	typeName: z.string().optional(),
});

export type ColumnFieldValues = z.infer<typeof columnFieldSchema>;

export const DEFAULT_COLUMN_FIELD: ColumnFieldValues = {
	columnName: "",
	columnType: "",
	defaultValue: "",
	isPrimaryKey: false,
	isNullable: true,
	isUnique: false,
	isArray: false,
};

export type ColumnOptionName = keyof Pick<
	ColumnFieldValues,
	"isNullable" | "isUnique" | "isArray"
>;

export type ColumnOption = {
	name: ColumnOptionName;
	label: string;
	description: string;
};
