import { clusters, type Cluster } from "@peridotvault/peridotbase-sdk";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { getWalletPort, sdkErrorMessage } from "@/shared/peridotbase";
import { resetConnectionState } from "@/shared/stores/connection-reset";
import { useWorkspaceStore } from "@/shared/stores/workspace.store";

/** Guards the restore so several mounted readers do not race the same wallet prompt. */
let restoring = false;

/**
 * The wallet session and its actions. `connect` opens the installed wallet (Wallet Standard
 * first, then its injected provider); it never fabricates an account when no wallet is present.
 * The session is the Studio's sign-in: every organization is derived from the wallet address.
 */
export const useWalletSession = () => {
	const { wallet, setWallet, rpcUrl, cluster, programId, setRpcUrl, setCluster } =
		useWorkspaceStore();

	// One silent reconnect per page load, however many components read the session.
	useEffect(() => {
		const stored = useWorkspaceStore.getState().wallet;
		const port = getWalletPort();

		if (restoring || !stored || port.wallet) return;

		restoring = true;

		void port
			.connect({ silent: true })
			.then((connected) => {
				// The wallet may answer with another account; only the stored one keeps the session.
				if (connected?.address === stored.address) setWallet(connected);
			})
			.catch(() => {
				// A locked or absent extension leaves the stored session readable until it expires.
			})
			.finally(() => {
				restoring = false;
			});
	}, [setWallet]);

	const connectMutation = useMutation({
		mutationFn: async () => getWalletPort().connect(),
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
		await getWalletPort().disconnect();
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
	};
};

export const CLUSTER_OPTIONS = clusters satisfies readonly Cluster[];

export const clusterLabel = (cluster: Cluster) => cluster.replace("mainnet-beta", "mainnet");
