import { useQuery } from "@tanstack/react-query";
import { getProtocolHealth } from "@/shared/peridotbase";
import { workspaceKeys } from "@/shared/query/keys";
import { useWorkspaceStore } from "@/shared/stores/workspace.store";

/** Health of the configured endpoint. Shared because the overview and the connection screen both show it. */
export const useProtocolHealth = () => {
	const { rpcUrl, cluster, programId } = useWorkspaceStore();

	return useQuery({
		queryKey: workspaceKeys.health(`${cluster}:${rpcUrl}:${programId}`),
		queryFn: getProtocolHealth,
		enabled: Boolean(rpcUrl),
		retry: false,
		staleTime: 10_000,
	});
};
