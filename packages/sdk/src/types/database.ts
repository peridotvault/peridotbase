import { z } from "zod";

/** A database account the connected wallet can read. `name` is its on-chain account name. */
export const databaseInfoSchema = z.object({
	name: z.string("Name is required"),
	owner: z.string("Owner is required"),
	/** Account size in bytes, human readable. */
	size: z.string("Size is required"),
	encoding: z.string("Encoding is required"),
});

export type DatabaseInfo = z.infer<typeof databaseInfoSchema>;

/** Identifies a table inside a database; `schema` is reserved for future namespacing. */
export type TableRef = {
	database: string;
	table: string;
	schema?: string;
};

/** Identifies a column inside a table. */
export type ColumnRef = TableRef & {
	column: string;
};
