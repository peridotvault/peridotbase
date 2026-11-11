import {
	createPeridotbaseClient,
	createRpcPort,
	createWalletStandardPort,
	type Cluster,
	type PeridotbaseClient,
	type WalletPort,
} from "@peridotbase/sdk";
import { DemoPeridotbaseClient } from "./demo/demo-client";
import { isDemoMode } from "./demo/demo-mode";

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
let demoClient: DemoPeridotbaseClient | null = null;
let client: PeridotbaseClient = buildClient(currentConfig);

function buildClient(config: StudioConnectionConfig): PeridotbaseClient {
	walletPort ??= createWalletStandardPort();

	const options = {
		rpc: createRpcPort({ url: config.rpcUrl, cluster: config.cluster }),
		wallet: walletPort,
		programId: config.programId,
	};

	// Demo mode keeps one client so in-memory edits survive a settings change; real mode builds a
	// client per connection, because every read and write belongs to that endpoint.
	if (isDemoMode()) {
		demoClient ??= new DemoPeridotbaseClient(options);

		return demoClient;
	}

	return createPeridotbaseClient(options);
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
