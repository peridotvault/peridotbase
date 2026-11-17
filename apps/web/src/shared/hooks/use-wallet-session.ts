import { clusters, type Cluster } from "@peridotvault/peridotbase-sdk";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getWalletPort, sdkErrorMessage } from "@/shared/peridotbase";
import { resetConnectionState } from "@/shared/stores/connection-reset";
import { useWorkspaceStore } from "@/shared/stores/workspace.store";

/**
 * The wallet session and its actions. `connect` opens the installed wallet (Wallet Standard
 * first, then its injected provider); it never fabricates an account when no wallet is present.
 * The session is the Studio's sign-in: every organization is derived from the wallet address.
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

			if (!port) throw new Error("This browser has no wallet to connect.");

			return port.connect();
		},
		onSuccess: (connected) => {
			if (!connected) {
				toast.info(
					"The wallet did not return an account. Approve the connection in the extension, then try again.",
				);
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
