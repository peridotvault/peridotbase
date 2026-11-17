import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { isPendingIntegration } from "@/shared/peridotbase/errors";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";
import { getPeridotbaseClient } from "@/shared/peridotbase/client";
import { scopeKeys } from "@/shared/query/keys";
import { useWorkspaceStore } from "@/shared/stores/workspace.store";
import { useScopeStore } from "@/shared/stores/scope.store";

/**
 * Reads the organization/project catalogs from the program and keeps the route-scope store in
 * sync. The query key carries the connection and wallet, so switching either refetches. Demo mode
 * syncs the same way from the demo client; real mode needs a wallet, because discovery is scoped
 * to the creator.
 */
export const useScopeSync = () => {
	const rpcUrl = useWorkspaceStore((state) => state.rpcUrl);
	const cluster = useWorkspaceStore((state) => state.cluster);
	const walletAddress = useWorkspaceStore((state) => state.wallet?.address ?? null);
	const setScopeData = useScopeStore((state) => state.setScopeData);
	const demo = isDemoMode();

	const catalog = useQuery({
		queryKey: scopeKeys.catalog(rpcUrl, cluster, walletAddress),
		queryFn: async () => {
			const client = getPeridotbaseClient();
			const organizations = await client.listOrganizations();
			const projects = (
				await Promise.all(
					organizations.map((organization) => client.listProjects(organization.slug)),
				)
			).flat();

			return { organizations, projects };
		},
		enabled: demo || Boolean(walletAddress),
		staleTime: 30_000,
		retry: (attempt, error) => !isPendingIntegration(error) && attempt < 1,
	});

	useEffect(() => {
		if (catalog.data) setScopeData(catalog.data);
	}, [catalog.data, setScopeData]);

	return catalog;
};
