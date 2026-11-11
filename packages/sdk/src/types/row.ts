import { z } from "zod";

export const readRowsQuerySchema = z.object({
	/** Opaque pagination cursor minted by the program. */
	cursor: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(500).default(50),
	direction: z.enum(["asc", "desc"]).default("asc"),
	sorts: z.array(z.object({ columnName: z.string(), direction: z.enum(["asc", "desc"]) })),
	filters: z.array(
		z.object({ columnName: z.string(), operator: z.string(), value: z.string() }),
	),
});

export type ReadRowsQuery = z.infer<typeof readRowsQuerySchema>;

export type RowRecord = Record<string, unknown>;

export type RowKey = Record<string, unknown>;

export type RowPage = {
	rows: RowRecord[];
	meta: {
		limit: number;
		total: number;
		totalEstimated?: boolean;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		nextCursor: string | null;
		prevCursor: string | null;
	};
};

/** Historical name kept for the Studio's grid; prefer `RowPage`. */
export type TableDataResultSchemaType = RowPage;

export type BulkInsertResult = {
	success: boolean;
	message: string;
	successCount: number;
	failureCount: number;
	errors?: Array<{ recordIndex: number; error: string }>;
};

export type RelatedRow = {
	tableName: string;
	columnName: string;
	constraintName: string;
	records: RowRecord[];
};

export type DeleteRowsResult = {
	deletedCount: number;
	fkViolation: boolean;
	relatedRecords: RelatedRow[];
};

/** Historical name kept for the Studio's dialogs; prefer `RelatedRow`. */
export type RelatedRecord = RelatedRow;
