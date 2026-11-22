import type { ExecuteQueryResult } from "@peridotvault/peridotbase-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { executeQuery as executeQueryRequest, sdkErrorMessage } from "@/shared/peridotbase";
import { invalidateAllTables } from "@/shared/query/invalidate-table";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { useQueryRunStore } from "@/shared/stores/query-run.store";

export type { QueryRunStep as RunStep } from "@/shared/stores/query-run.store";

export const useExecuteQuery = () => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();
	const start = useQueryRunStore((state) => state.start);
	const apply = useQueryRunStore((state) => state.apply);
	const finish = useQueryRunStore((state) => state.finish);
	const isExecutingQuery = useQueryRunStore((state) => state.status === "running");

	const {
		// `mutate` reports a failure through `executeQueryError` only, never as a rejection.
		mutate: executeQuery,
		error: executeQueryError,
	} = useMutation<ExecuteQueryResult, Error, { query: string }>({
		mutationFn: ({ query }) => {
			start();

			return executeQueryRequest({ query, db: selectedDatabase, onStep: apply }).then(
				(result) => {
					// A query can change any table's rows, columns or indexes. Kept out of
					// `onSuccess` so it still runs when the runner screen has been left.
					invalidateAllTables(queryClient);
					finish(null);

					return result;
				},
				(error: Error) => {
					// The toast outlives this screen, so it needs the same readable message.
					finish(new Error(sdkErrorMessage(error, "Query failed")));

					throw error;
				},
			);
		},
	});

	return { executeQuery, isExecutingQuery, executeQueryError };
};
