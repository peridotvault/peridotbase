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

/**
 * One finished step of a multi-statement run. The UI marks the first unreported step active, so
 * a script that lands ten statements shows progress instead of a blank spinner.
 */
export type QueryRunStepEvent = {
	/** Zero-based position of the finished step in the run. */
	index: number;
	total: number;
	label: string;
	status: "active" | "done" | "failed";
};
