import type { PeridotbaseClient, PeridotbaseClientOptions } from "./client.js";
import { ProgramNotWiredClient } from "./not-wired-client.js";

/**
 * The one place the Studio builds a client. When `peridotbase-core` publishes the program ID and
 * IDL, this factory returns an account-reading client instead; no caller changes.
 */
export const createPeridotbaseClient = (
	options: PeridotbaseClientOptions,
): PeridotbaseClient => new ProgramNotWiredClient(options);
