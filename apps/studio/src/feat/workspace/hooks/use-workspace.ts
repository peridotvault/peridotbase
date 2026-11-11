import { clusters, type Cluster } from "@peridotbase/sdk";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getProtocolHealth, getWalletPort, sdkErrorMessage } from "@/shared/peridotbase";
import { workspaceKeys } from "@/shared/query/keys";
import { resetConnectionState } from "@/shared/stores/connection-reset";
import { useWorkspaceStore } from "../stores/workspace.store";

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

/**
 * The wallet session and its actions. `connect` opens the wallet extension's own picker through
 * Wallet Standard; it never fabricates an account when no extension is installed.
 */
export const useWalletSession = () => {
	const {
		wallet,
		setWallet,
		rpcUrl,
		cluster,
		programId,
		setRpcUrl,
		setCluster,
		setProgramId,
	} = useWorkspaceStore();

	const connectMutation = useMutation({
		mutationFn: async () => {
			const port = getWalletPort();

			if (!port) throw new Error("This browser has no Wallet Standard wallet to connect.");

			return port.connect();
		},
		onSuccess: (connected) => {
			if (!connected) {
				toast.info("No wallet was selected");
				return;
			}

			setWallet(connected);
			toast.success(`Connected ${connected.label ?? connected.address}`);
		},
		onError: (error) => toast.error(sdkErrorMessage(error, "Could not connect the wallet")),
	});

	const disconnect = async () => {
		await getWalletPort()?.disconnect();
		resetConnectionState();
		setWallet(null);
		toast.success("Wallet disconnected");
	};

	return {
		wallet,
		connect: connectMutation.mutateAsync,
		disconnect,
		isConnecting: connectMutation.isPending,
		rpcUrl,
		cluster,
		programId,
		setRpcUrl,
		setCluster,
		setProgramId,
	};
};

export const CLUSTER_OPTIONS = clusters satisfies readonly Cluster[];

export const clusterLabel = (cluster: Cluster) => cluster.replace("mainnet-beta", "mainnet");
