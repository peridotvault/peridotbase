import { useSearch } from "@tanstack/react-router";
import { DATA_TAB_PARAM, type DataTab } from "@/shared/lib/sections";

/** The Data tab requested on the current URL; anything unknown falls back to the grid. */
export const useDataTab = (): DataTab => {
	const search = useSearch({ strict: false });
	const tab = DATA_TAB_PARAM in search ? search[DATA_TAB_PARAM] : undefined;

	return tab === "schema" || tab === "indexes" ? tab : "table";
};

/** The current URL search, for carrying unrelated keys across Data tab changes. */
export const useDataSearch = () => useSearch({ strict: false });
