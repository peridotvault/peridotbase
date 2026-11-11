import type { ExecuteQueryResult } from "@peridotbase/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { executeQuery as executeQueryRequest } from "@/shared/peridotbase";
import { invalidateAllTables } from "@/shared/query/invalidate-table";
import { useDatabaseStore } from "@/shared/stores/database.store";

export const useExecuteQuery = () => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();

	const {
		// `mutate` reports a failure through `executeQueryError` only, never as a rejection.
		mutate: executeQuery,
		isPending: isExecutingQuery,
		error: executeQueryError,
	} = useMutation<ExecuteQueryResult, Error, { query: string }>({
		mutationFn: ({ query }) => executeQueryRequest({ query, db: selectedDatabase }),
		// A query can change any table's rows, columns or indexes.
		// Not awaited: the result shows while the other screens refetch.
		onSuccess: () => {
			invalidateAllTables(queryClient);
		},
	});

	return {
		executeQuery,
		isExecutingQuery,
		executeQueryError,
	};
};
