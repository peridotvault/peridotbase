import type { QueryResult, QueryRunStepEvent } from "@peridotvault/peridotbase-sdk";
import { getPeridotbaseClient } from "./client";

export const executeQuery = ({
	query,
	db,
	onStep,
}: {
	query: string;
	db?: string | null;
	onStep?: (event: QueryRunStepEvent) => void;
}): Promise<QueryResult> => {
	if (!db) throw new Error("Select a database first");

	return getPeridotbaseClient().executeQuery(db, { statement: query }, onStep);
};
