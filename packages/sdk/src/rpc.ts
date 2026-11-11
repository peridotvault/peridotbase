import { IntegrationUnavailableError } from "./errors.js";
import type { Cluster, RpcPort } from "./ports.js";

type RpcResponse<T> = {
	jsonrpc: "2.0";
	id: number;
	result?: T;
	error?: { code: number; message: string; data?: unknown };
};

export type RpcTransportOptions = {
	url: string;
	cluster: Cluster;
	/** Injectable for tests and for hosts that proxy RPC calls. */
	fetchImpl?: typeof fetch;
	timeoutMs?: number;
};

let requestId = 0;

/**
 * A single JSON-RPC POST against the configured endpoint. Kept free of any `@solana/*` transport
 * package so the Studio only depends on the wire format while the program is not wired.
 */
const request = async <T>(
	options: RpcTransportOptions,
	method: string,
	params: unknown[] = [],
): Promise<T> => {
	const fetchImpl = options.fetchImpl ?? globalThis.fetch;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);

	try {
		const response = await fetchImpl(options.url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId, method, params }),
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(`RPC ${method} failed with HTTP ${response.status}`);
		}

		const body = (await response.json()) as RpcResponse<T>;

		if (body.error) {
			throw new Error(`RPC ${method} failed: ${body.error.message}`);
		}

		if (body.result === undefined) {
			throw new Error(`RPC ${method} returned no result`);
		}

		return body.result;
	} finally {
		clearTimeout(timeout);
	}
};

/**
 * Creates the RPC port the Studio uses for connectivity checks. Nothing here reads Peridotbase
 * accounts yet: account decoding needs the program ID and IDL that `peridotbase-core` owns.
 */
export const createRpcPort = (options: RpcTransportOptions): RpcPort => ({
	url: options.url,
	cluster: options.cluster,
	getSlot: async () => BigInt(await request<number>(options, "getSlot")),
	getVersion: async () =>
		(await request<{ "solana-core": string }>(options, "getVersion"))["solana-core"],
	getBalance: async (address) => {
		const { value } = await request<{ value: number }>(options, "getBalance", [address]);
		return BigInt(value);
	},
});

/**
 * Reads a program account once a program ID exists. Exposed so the Studio can keep the same RPC
 * transport when the IDL lands, and so the missing piece is a value, not a rewrite.
 */
export const getProgramAccounts = async <T>(
	port: RpcPort,
	fetchImpl: typeof fetch,
	programId: string,
): Promise<T[]> => {
	if (!programId) throw new IntegrationUnavailableError("getProgramAccounts");

	const result = await request<Array<{ account: T }>>(
		{ url: port.url, cluster: port.cluster, fetchImpl },
		"getProgramAccounts",
		[programId, { encoding: "base64" }],
	);

	return result.map((entry) => entry.account);
};
