import { queryOptions, useQuery } from "@tanstack/react-query";
import { getDatabases } from "@/shared/peridotbase";
import { databaseKeys } from "@/shared/query/keys";

const databasesListQuery = queryOptions({
	queryKey: databaseKeys.list(),
	queryFn: getDatabases,
	staleTime: 1000 * 60 * 5,
});

export const useDatabasesList = () => {
	const {
		data,
		isLoading: isLoadingDatabases,
		error: databasesError,
		refetch: refetchDatabases,
		isRefetching: isRefetchingDatabases,
	} = useQuery(databasesListQuery);

	return {
		databases: data,
		isLoadingDatabases,
		databasesError,
		refetchDatabases,
		isRefetchingDatabases,
	};
};
