import type { QueryResult } from "@peridotbase/sdk";
import { getPeridotbaseClient } from "./client";

export const executeQuery = ({
	query,
	db,
}: {
	query: string;
	db?: string | null;
}): Promise<QueryResult> => {
	if (!db) throw new Error("Select a database first");

	return getPeridotbaseClient().executeQuery(db, { statement: query });
};
