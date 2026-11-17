import { useQuery } from "@tanstack/react-query";
import { getTables } from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";

/** The table count shown next to a database in the visualizer sidebar. */
export const useTablesCount = (database: string | null) => {
	const { data } = useQuery({
		queryKey: tableKeys.list(database),
		queryFn: () => getTables(database),
		enabled: Boolean(database),
	});

	return { count: data?.length };
};
