import type { PeridotbaseClient, PeridotbaseClientOptions } from "./client.js";
import { ProgramNotWiredClient } from "./not-wired-client.js";
import { ProgramClient } from "./program-client.js";

/**
 * The one place the Studio builds a client. A configured program ID gets the on-chain client;
 * without one, the wallet-only client stays and every program operation reports the gap.
 */
export const createPeridotbaseClient = (
	options: PeridotbaseClientOptions,
): PeridotbaseClient =>
	options.programId ? new ProgramClient(options) : new ProgramNotWiredClient(options);
