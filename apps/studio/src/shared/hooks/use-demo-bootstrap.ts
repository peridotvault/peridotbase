import { useEffect } from "react";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { useDatabasesList } from "./use-databases-list";

/**
 * Demo mode has exactly one labeled sample database, so the shell selects it as soon as the list
 * arrives. Real mode keeps the existing rule: the user picks a database from the sidebar footer.
 */
export const useDemoBootstrap = () => {
	const demo = isDemoMode();
	const { selectedDatabase, setSelectedDatabase } = useDatabaseStore();
	const { databases } = useDatabasesList();

	useEffect(() => {
		if (!demo || selectedDatabase || !databases?.length) return;

		setSelectedDatabase(databases[0].name);
	}, [demo, databases, selectedDatabase, setSelectedDatabase]);
};
