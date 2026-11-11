import type { Cluster, ConnectedWallet } from "@peridotbase/sdk";
import { DEFAULT_CLUSTER } from "@peridotbase/sdk";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { configurePeridotbase } from "@/shared/peridotbase";

export const DEFAULT_RPC_URL = "https://api.devnet.solana.com";

type WorkspaceStore = {
	/** Endpoint every SDK read goes through. */
	rpcUrl: string;
	cluster: Cluster;
	/** Filled in once `peridotbase-core` publishes its deployed address. */
	programId: string;
	/**
	 * The active wallet session. Deliberately not persisted: the wallet extension owns the
	 * session, and a reload must ask it again rather than claim an address it no longer holds.
	 */
	wallet: ConnectedWallet | null;
	setRpcUrl: (rpcUrl: string) => void;
	setCluster: (cluster: Cluster) => void;
	setProgramId: (programId: string) => void;
	setWallet: (wallet: ConnectedWallet | null) => void;
};

const applyConnection = ({
	rpcUrl,
	cluster,
	programId,
	wallet,
}: {
	rpcUrl: string;
	cluster: Cluster;
	programId: string;
	wallet: ConnectedWallet | null;
}) => {
	configurePeridotbase({
		rpcUrl,
		cluster,
		programId: programId.trim() ? programId.trim() : null,
	});

	return wallet;
};

export const useWorkspaceStore = create<WorkspaceStore>()(
	persist(
		(set, get) => ({
			rpcUrl: DEFAULT_RPC_URL,
			cluster: DEFAULT_CLUSTER,
			programId: "",
			wallet: null,

			setRpcUrl: (rpcUrl) => {
				set({ rpcUrl });
				applyConnection({ ...get(), rpcUrl });
			},
			setCluster: (cluster) => {
				set({ cluster });
				applyConnection({ ...get(), cluster });
			},
			setProgramId: (programId) => {
				set({ programId });
				applyConnection({ ...get(), programId });
			},
			setWallet: (wallet) => set({ wallet }),
		}),
		{
			name: "peridotbase-workspace",
			partialize: ({ rpcUrl, cluster, programId }) => ({ rpcUrl, cluster, programId }),
			// Stored values come from localStorage, so an unknown cluster falls back to devnet.
			merge: (persisted, current) => {
				const stored = (persisted ?? {}) as Partial<WorkspaceStore>;

				return {
					...current,
					rpcUrl: stored.rpcUrl || DEFAULT_RPC_URL,
					cluster:
						stored.cluster &&
						["mainnet-beta", "devnet", "testnet", "localnet", "custom"].includes(
							stored.cluster,
						)
							? stored.cluster
							: DEFAULT_CLUSTER,
					programId: stored.programId ?? "",
				};
			},
		},
	),
);

// Rehydration is synchronous, so the SDK client already matches the stored endpoint before
// the first render asks it for health.
applyConnection(useWorkspaceStore.getState());
