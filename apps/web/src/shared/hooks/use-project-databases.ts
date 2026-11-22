import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { databaseKeys } from "@/shared/query/keys";
import { createDatabaseRequest, getDatabases } from "@/shared/peridotbase/databases";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { useScopeStore } from "@/shared/stores/scope.store";

/**
 * The database accounts the open project owns, read from the program. The SDK answers for the
 * project in the route scope, so the query only runs once that scope matches the URL.
 */
export const useProjectDatabases = (organization: string, project: string) => {
	const activeScope = useScopeStore((state) => state.activeScope);
	const demo = isDemoMode();
	const scoped =
		demo || (activeScope?.organization === organization && activeScope?.project === project);

	const query = useQuery({
		queryKey: databaseKeys.list(organization, project),
		queryFn: getDatabases,
		enabled: scoped && Boolean(organization) && Boolean(project),
		staleTime: 15_000,
	});

	return useMemo(() => (query.data ?? []).map((database) => database.name), [query.data]);
};

/** The database the Studio browses right now. */
export const useActiveDatabase = () => useDatabaseStore((state) => state.selectedDatabase);

/** Creates the program account first, then refreshes the list. Never stubs a success. */
export const useCreateDatabase = (organization: string, project: string) => {
	const queryClient = useQueryClient();
	const setSelectedDatabase = useDatabaseStore((state) => state.setSelectedDatabase);

	return useMutation({
		mutationFn: async (name: string) => {
			const trimmed = name.trim();

			if (!trimmed) throw new Error("Name your database first");

			await createDatabaseRequest(trimmed);

			return trimmed;
		},
		onSuccess: async (trimmed) => {
			setSelectedDatabase(trimmed);
			// One chain write, so the list is re-read rather than guessed.
			await queryClient.invalidateQueries({
				queryKey: databaseKeys.list(organization, project),
			});
		},
	});
};
