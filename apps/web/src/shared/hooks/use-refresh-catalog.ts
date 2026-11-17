import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { databaseKeys } from "@/shared/query/keys";
import { getPeridotbaseClient } from "@/shared/peridotbase/client";
import { sdkErrorMessage } from "@/shared/peridotbase/errors";
import { useScopeStore } from "@/shared/stores/scope.store";

/** Refetch the live catalog (orgs, projects, databases) from the program. */
export const useRefreshCatalog = () => {
	const queryClient = useQueryClient();

	return useCallback(async () => {
		const setScopeData = useScopeStore.getState().setScopeData;

		try {
			const client = getPeridotbaseClient();
			const organizations = await client.listOrganizations();
			const projects = (
				await Promise.all(
					organizations.map((organization) => client.listProjects(organization.slug)),
				)
			).flat();

			setScopeData({ organizations, projects });
			await queryClient.invalidateQueries({ queryKey: databaseKeys.all() });
			toast.success("Workspace refreshed");
		} catch (error) {
			toast.error(sdkErrorMessage(error, "Couldn't refresh the workspace"));
		}
	}, [queryClient]);
};
