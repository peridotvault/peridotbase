export const INTEGRATION_UNAVAILABLE = "PROGRAM_NOT_WIRED" as const;

export type IntegrationUnavailableCode = typeof INTEGRATION_UNAVAILABLE;

/**
 * Thrown by every client method whose program-side instruction does not exist yet. Carries the
 * integration the caller must wait for (`peridotbase-core` program ID + IDL) instead of an
 * HTTP-style status code, because there is no server left to blame.
 */
export class IntegrationUnavailableError extends Error {
	readonly code: IntegrationUnavailableCode = INTEGRATION_UNAVAILABLE;
	/** The program operation that has no on-chain instruction yet, e.g. `readRows`. */
	readonly operation: string;

	constructor(operation: string) {
		super(
			`${operation} is not available yet: the Peridotbase program in peridotbase-core has not published a program ID or IDL for it. Point the Studio at any Solana RPC to verify network connectivity in the meantime.`,
		);
		this.name = "IntegrationUnavailableError";
		this.operation = operation;
	}
}

export type SdkError = {
	message: string;
	operation: string;
	/** Present on wallet/RPC failures; absent on unimplemented operations. */
	cause?: unknown;
};

/** The SDK-facing rejection: unimplemented operations, RPC failures and wallet rejections all land here. */
export type SdkFailure = Error & {
	operation?: string;
	cause?: unknown;
};

export const isIntegrationUnavailable = (
	error: unknown,
): error is IntegrationUnavailableError => error instanceof IntegrationUnavailableError;
