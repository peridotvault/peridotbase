import { describe, expect, it } from "vitest";
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
