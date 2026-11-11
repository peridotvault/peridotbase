/**
 * What the Peridotbase program currently exposes to the Studio. The UI reads these flags to
 * decide between rendering a control and rendering its "not available yet" state, so a flag is
 * only ever `true` once the program and this SDK actually implement the operation.
 */
export type Capabilities = {
	/** Wallet connection and RPC health checks. */
	wallet: boolean;
	/** Listing database and table accounts. */
	discovery: boolean;
	/** Reading rows. */
	reads: boolean;
	/** Inserting, updating and deleting rows. */
	writes: boolean;
	/** Creating, altering and dropping tables and columns. */
	ddl: boolean;
	/** Running a query against the program. */
	queries: boolean;
	/** Index listing and management. */
	indexes: boolean;
	/** Live refresh of an open table. */
	live: boolean;
};

export const PROGRAM_NOT_WIRED: Capabilities = {
	wallet: true,
	discovery: false,
	reads: false,
	writes: false,
	ddl: false,
	queries: false,
	indexes: false,
	live: false,
};
