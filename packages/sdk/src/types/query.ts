import { z } from "zod";

export const executeQuerySchema = z.object({
	statement: z.string().trim().min(1, "A statement is required"),
});

export type ExecuteQueryRequest = z.infer<typeof executeQuerySchema>;

export type QueryResult = {
	columns: string[];
	rows: Record<string, unknown>[];
	rowCount: number;
	/** Execution time in milliseconds, measured by the client. */
	duration: number;
	message?: string;
};

/** Historical name kept for the Studio's screens; prefer `QueryResult`. */
export type ExecuteQueryResult = QueryResult;
