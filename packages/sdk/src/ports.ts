/** Clusters the Studio can point its RPC transport at. */
export const clusters = ["mainnet-beta", "devnet", "testnet", "localnet", "custom"] as const;

export type Cluster = (typeof clusters)[number];

export const DEFAULT_CLUSTER: Cluster = "devnet";

export type WalletKind = "unknown" | "installed";

export type ConnectedWallet = {
	/** Base58 account address the user connected with. */
	address: string;
	label?: string;
};

/**
 * The wallet surface the Studio needs. Implemented today by the Wallet Standard adapter, which
 * discovers wallets through `wallet-standard:register-wallet` and falls back to the provider the
 * extension injects. Message and transaction signing run against the connected wallet when the
 * program IDL starts defining instructions.
 */
export type WalletPort = {
	wallet: ConnectedWallet | null;
	/**
	 * Opens the wallet picker. Resolves with the connected wallet, or `null` when the user
	 * dismissed it. Rejects only on an unexpected failure.
	 */
	connect: () => Promise<ConnectedWallet | null>;
	/** Drops the session without touching the wallet extension itself. */
	disconnect: () => Promise<void>;
	/**
	 * Signs serialized transactions with the connected wallet and returns the signed bytes, in
	 * the same order. Throws when no wallet is connected or the wallet rejects.
	 */
	signTransactions: (payloads: Uint8Array[]) => Promise<Uint8Array[]>;
};

/** JSON-RPC surface the Studio needs. Transport is `fetch` today; the interface stays narrow so
 * a WebSocket subscription transport can replace it without touching callers. */
export type RpcPort = {
	url: string;
	cluster: Cluster;
	/** Lowest-level health check the Studio runs to label a connection "reachable". */
	getSlot: () => Promise<bigint>;
	getVersion: () => Promise<string>;
	getBalance: (address: string) => Promise<bigint>;
};
