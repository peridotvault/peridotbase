import { useQuery } from "@tanstack/react-query";
import { getDroppedTables } from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";

/** Catalogs that were dropped but still hold rent on-chain. */
export const useDroppedTables = () => {
	const { selectedDatabase } = useDatabaseStore();

	const { data: droppedTables = [], isLoading } = useQuery({
		queryKey: tableKeys.dropped(selectedDatabase),
		queryFn: () => getDroppedTables(selectedDatabase),
		enabled: Boolean(selectedDatabase),
	});

	return { droppedTables, isLoadingDroppedTables: isLoading };
};
