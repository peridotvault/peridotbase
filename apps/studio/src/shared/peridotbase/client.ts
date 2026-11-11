import {
	createPeridotbaseClient,
	createRpcPort,
	createWalletStandardPort,
	type Cluster,
	type PeridotbaseClient,
	type WalletPort,
} from "@peridotbase/sdk";

export type StudioConnectionConfig = {
	rpcUrl: string;
	cluster: Cluster;
	/** Absent until peridotbase-core publishes the deployed program address. */
	programId: string | null;
};

let currentConfig: StudioConnectionConfig = {
	rpcUrl: "https://api.devnet.solana.com",
	cluster: "devnet",
	programId: null,
};

let walletPort: WalletPort | null = null;
let client: PeridotbaseClient = buildClient(currentConfig);

function buildClient(config: StudioConnectionConfig): PeridotbaseClient {
	walletPort ??= createWalletStandardPort();

	return createPeridotbaseClient({
		rpc: createRpcPort({ url: config.rpcUrl, cluster: config.cluster }),
		wallet: walletPort,
		programId: config.programId,
	});
}

/**
 * The Studio's single SDK client. It is rebuilt whenever the workspace points at another RPC
 * endpoint or cluster, so every feature reads a client that matches the visible connection.
 */
export const getPeridotbaseClient = (): PeridotbaseClient => client;

export const configurePeridotbase = (config: StudioConnectionConfig): void => {
	currentConfig = config;
	client = buildClient(config);
};

export const getWalletPort = (): WalletPort | null => walletPort;
