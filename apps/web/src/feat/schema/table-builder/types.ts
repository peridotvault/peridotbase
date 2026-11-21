import {
	type CreateTableSchemaType,
	foreignKeyDataSchema,
} from "@peridotvault/peridotbase-sdk";
import { z } from "zod";
import { columnFieldSchema } from "../components/column-fields/column-field-values";

/** A column row's foreign key; its own column is the row's. */
const columnForeignKeySchema = foreignKeyDataSchema.omit({ columnName: true });

export const addTableSchema = z.object({
	tableName: z.string().min(1, "Table name is required"),
	schemaName: z.string().optional(),
	fields: z
		.array(columnFieldSchema.extend({ foreignKey: columnForeignKeySchema.optional() }))
		.min(1, "At least one column is required")
		.refine((fields) => fields.some((field) => field.isPrimaryKey), {
			message: "A primary key is required; add `id UUID PRIMARY KEY DEFAULT uuidv7()`",
		}),
	indexes: z
		.array(
			z.object({
				indexName: z.string().min(1, "Index name is required"),
				columns: z.array(z.string()).min(2, "A composite index needs two columns"),
				isUnique: z.boolean(),
			}),
		)
		.default([]),
});

export type AddTableFormData = z.infer<typeof addTableSchema>;

/** A foreign key without both a referenced table and column is left out, as unfinished. */
export const toCreateTablePayload = ({
	tableName,
	schemaName,
	fields,
	indexes,
}: AddTableFormData): CreateTableSchemaType => ({
	tableName,
	schemaName,
	fields: fields.map(({ foreignKey: _foreignKey, ...field }) => field),
	foreignKeys: fields.flatMap(({ columnName, foreignKey }) =>
		foreignKey?.referencedTable && foreignKey?.referencedColumn
			? [{ columnName, ...foreignKey }]
			: [],
	),
	...(indexes.length ? { indexes } : {}),
});
