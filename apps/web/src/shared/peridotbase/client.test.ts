import { describe, expect, it } from "vitest";
import { readRowsQuerySchema } from "@peridotvault/peridotbase-sdk";
import { getWalletPort } from "./client";

/*
 * Failure mode:
 * - The wallet port is only built by a client read, and those reads are gated on the wallet, so
 *   signing in on a fresh page throws "This browser has no wallet to connect."
 */

describe("getWalletPort", () => {
	it("returns a usable port before any client read", () => {
		expect(typeof getWalletPort().connect).toBe("function");
	});
});

/*
 * Failure mode:
 * - `readRows` reads `query.filters.every`/`query.sorts.length`, so a caller that only wants a
 *   page (`{ limit }`) used to crash with "Cannot read properties of undefined".
 */
describe("readRowsQuerySchema", () => {
	it("defaults the optional sort and filter arrays", () => {
		const query = readRowsQuerySchema.parse({ limit: 5 });

		expect(query.sorts).toEqual([]);
		expect(query.filters).toEqual([]);
	});
});
