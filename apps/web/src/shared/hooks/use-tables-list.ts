import { useQuery } from "@tanstack/react-query";
import { getTables } from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";

export const useTablesList = () => {
	const { selectedDatabase } = useDatabaseStore();

	const {
		data: tablesList,
		isLoading: isLoadingTablesList,
		error: errorTablesList,
	} = useQuery({
		queryKey: tableKeys.list(selectedDatabase),
		queryFn: () => getTables(selectedDatabase),
		enabled: !!selectedDatabase,
	});

	return { tablesList, isLoadingTablesList, errorTablesList };
};
