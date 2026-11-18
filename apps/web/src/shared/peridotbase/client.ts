import {
	createPeridotbaseClient,
	createRpcPort,
	createWalletStandardPort,
	type Cluster,
	type PeridotbaseClient,
	type WalletPort,
} from "@peridotvault/peridotbase-sdk";
import { useScopeStore } from "@/shared/stores/scope.store";
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
/**
 * Built on first use, not at import: the server imports this module while prerendering the
 * marketing pages, and the program client needs browser globals (`window`, wallet discovery).
 */
let client: PeridotbaseClient | null = null;

function buildClient(config: StudioConnectionConfig): PeridotbaseClient {
	walletPort ??= createWalletStandardPort();

	const options = {
		rpc: createRpcPort({ url: config.rpcUrl, cluster: config.cluster }),
		wallet: walletPort,
		programId: config.programId,
		// The open route owns the chain scope; the client reads it lazily so a navigation does
		// not need to rebuild the SDK.
		scope: () => useScopeStore.getState().activeScope,
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
export const getPeridotbaseClient = (): PeridotbaseClient =>
	(client ??= buildClient(currentConfig));

export const configurePeridotbase = (config: StudioConnectionConfig): void => {
	currentConfig = config;
	// The next read builds against the new endpoint; keeps module import side-effect free.
	client = null;
};

// Built on first use: signing in needs the port before any client read, and those reads are
// gated on the wallet the port is meant to connect.
export const getWalletPort = (): WalletPort => (walletPort ??= createWalletStandardPort());
