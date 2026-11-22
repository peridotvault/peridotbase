import type { Cluster, ConnectedWallet } from "@peridotvault/peridotbase-sdk";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import deployment from "@/shared/config/deployment.json";
import { configurePeridotbase } from "@/shared/peridotbase";

/**
 * Deployment config lives in `src/shared/config/deployment.json`, not in localStorage: the
 * program address belongs to the build, so every browser must agree on it.
 */
export const DEFAULT_RPC_URL = deployment.rpcUrl;
export const DEFAULT_CLUSTER = deployment.cluster as Cluster;
export const DEFAULT_PROGRAM_ID = deployment.programId;

/**
 * The rate-limited public devnet endpoint. A browser that stored it before the deployment moved
 * to a dedicated RPC would keep every request throttled, so it is never restored.
 */
const PUBLIC_DEVNET_RPC = "https://api.devnet.solana.com";

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
	/** Build-time program address from `src/shared/config/deployment.json`; never persisted. */
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
			partialize: ({ rpcUrl, cluster, wallet, walletExpiresAt }) => ({
				rpcUrl,
				cluster,
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
					rpcUrl:
						stored.rpcUrl && stored.rpcUrl !== PUBLIC_DEVNET_RPC
							? stored.rpcUrl
							: DEFAULT_RPC_URL,
					cluster:
						stored.cluster &&
						["mainnet-beta", "devnet", "testnet", "localnet", "custom"].includes(
							stored.cluster,
						)
							? stored.cluster
							: DEFAULT_CLUSTER,
					programId: DEFAULT_PROGRAM_ID,
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
