import type { ExecuteQueryResult, QueryRunStepEvent } from "@peridotvault/peridotbase-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { executeQuery as executeQueryRequest } from "@/shared/peridotbase";
import { invalidateAllTables } from "@/shared/query/invalidate-table";
import { useDatabaseStore } from "@/shared/stores/database.store";

export type RunStep = {
	index: number;
	label: string;
	status: QueryRunStepEvent["status"];
};

export const useExecuteQuery = () => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();
	const [steps, setSteps] = useState<RunStep[]>([]);
	const [stepTotal, setStepTotal] = useState(0);

	const onStep = useCallback((event: QueryRunStepEvent) => {
		setStepTotal(event.total);
		setSteps((current) =>
			[...current.filter((step) => step.index !== event.index), event].sort(
				(a, b) => a.index - b.index,
			),
		);
	}, []);

	const {
		// `mutate` reports a failure through `executeQueryError` only, never as a rejection.
		mutate: executeQuery,
		isPending: isExecutingQuery,
		error: executeQueryError,
	} = useMutation<ExecuteQueryResult, Error, { query: string }>({
		mutationFn: ({ query }) => {
			setSteps([]);
			setStepTotal(0);
			return executeQueryRequest({ query, db: selectedDatabase, onStep });
		},
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
		steps,
		stepTotal,
	};
};
