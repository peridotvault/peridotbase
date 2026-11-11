import { z } from "zod";

export const indexInfoSchema = z.object({
	indexName: z.string(),
	columns: z.array(z.string()),
	isUnique: z.boolean(),
	method: z.string().nullable(),
	kind: z.enum(["primary", "unique-constraint", "index"]),
	definition: z.string().nullable(),
});

export type IndexInfo = z.infer<typeof indexInfoSchema>;

/** Historical name kept for the Studio's screens; prefer `IndexInfo`. */
export type IndexInfoSchemaType = IndexInfo;

export const createIndexSchema = z.object({
	indexName: z.string().min(1),
	columns: z.array(z.string().min(1)).min(1),
	isUnique: z.boolean(),
	method: z.string().optional(),
});

export type CreateIndexPayload = z.infer<typeof createIndexSchema>;

/** Historical name kept for the Studio's forms; prefer `CreateIndexPayload`. */
export type CreateIndexSchemaType = CreateIndexPayload;
