import type { Cluster, ConnectedWallet } from "@peridotvault/peridotbase-sdk";
import { DEFAULT_CLUSTER } from "@peridotvault/peridotbase-sdk";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { configurePeridotbase } from "@/shared/peridotbase";

export const DEFAULT_RPC_URL = "https://api.devnet.solana.com";
/** Deployed `peridotbase_core` devnet address (see peridotbase-core/contracts/solana/Anchor.toml). */
export const DEFAULT_PROGRAM_ID = "AzhEnpdLzZHf7ro8NfqGpmuSqBHxA7bViTRezFKha6X3";

/** How long a remembered wallet session stays valid without connecting again. */
export const WALLET_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** The stored session, while it has not expired. An expired one signs the tab out silently. */
export const liveWallet = (
	wallet: ConnectedWallet | null,
	expiresAt: number | null,
	now = Date.now(),
): ConnectedWallet | null => (wallet && expiresAt !== null && expiresAt > now ? wallet : null);

type WorkspaceStore = {
	/** Endpoint every SDK read goes through. */
	rpcUrl: string;
	cluster: Cluster;
	/** Filled in once `peridotbase-core` publishes its deployed address. */
	programId: string;
	/**
	 * The active wallet session. Persisted for {@link WALLET_SESSION_TTL_MS} so a reload stays
	 * signed in; the extension still owns signing, so a silent reconnect restores that half.
	 */
	wallet: ConnectedWallet | null;
	/** Epoch ms the stored wallet expires; `null` when signed out. */
	walletExpiresAt: number | null;
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
			programId: DEFAULT_PROGRAM_ID,
			wallet: null,
			walletExpiresAt: null,

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
			setWallet: (wallet) => {
				set({
					wallet,
					walletExpiresAt: wallet ? Date.now() + WALLET_SESSION_TTL_MS : null,
				});
				// The program client snapshots the wallet's public key when it is built, so a new
				// session needs a new client; otherwise signing still uses the read-only provider.
				applyConnection({ ...get(), wallet });
			},
		}),
		{
			name: "peridotbase-workspace",
			partialize: ({ rpcUrl, cluster, programId, wallet, walletExpiresAt }) => ({
				rpcUrl,
				cluster,
				programId,
				wallet,
				walletExpiresAt,
			}),
			// Stored values come from localStorage, so an unknown cluster falls back to devnet and
			// a session past its expiry signs out on load.
			merge: (persisted, current) => {
				const stored = (persisted ?? {}) as Partial<WorkspaceStore>;
				const wallet = liveWallet(stored.wallet ?? null, stored.walletExpiresAt ?? null);

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
					programId: stored.programId || DEFAULT_PROGRAM_ID,
					wallet,
					walletExpiresAt: wallet ? (stored.walletExpiresAt ?? null) : null,
				};
			},
		},
	),
);

// Rehydration is synchronous, so the SDK client already matches the stored endpoint before
// the first render asks it for health.
applyConnection(useWorkspaceStore.getState());
