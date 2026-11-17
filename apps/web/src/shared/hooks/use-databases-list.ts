import { useQuery } from "@tanstack/react-query";
import { getDatabases } from "@/shared/peridotbase";
import { databaseKeys } from "@/shared/query/keys";

/** The database accounts the open project owns. */
export const useDatabasesList = (organization: string, project: string) => {
	const {
		data,
		isLoading: isLoadingDatabases,
		error: databasesError,
		refetch: refetchDatabases,
		isRefetching: isRefetchingDatabases,
	} = useQuery({
		queryKey: databaseKeys.list(organization, project),
		queryFn: getDatabases,
		enabled: Boolean(organization) && Boolean(project),
		staleTime: 1000 * 60 * 5,
	});

	return {
		databases: data,
		isLoadingDatabases,
		databasesError,
		refetchDatabases,
		isRefetchingDatabases,
	};
};
