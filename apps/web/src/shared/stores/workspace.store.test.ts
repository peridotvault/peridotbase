import { describe, expect, it } from "vitest";
import { liveWallet, useWorkspaceStore, WALLET_SESSION_TTL_MS } from "./workspace.store";

/*
 * Failure modes:
 * - A refresh signs the tab out because the stored wallet is not restored.
 * - An expired session keeps granting access forever.
 */

const wallet = { address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", label: "Phantom" };
const now = 1_700_000_000_000;

const storeSession = (expiresAt: number) =>
	localStorage.setItem(
		"peridotbase-workspace",
		JSON.stringify({ state: { wallet, walletExpiresAt: expiresAt }, version: 0 }),
	);

describe("liveWallet", () => {
	it("keeps a session inside its window", () => {
		expect(liveWallet(wallet, now + 1, now)).toBe(wallet);
	});

	it("drops a session once it expires", () => {
		expect(liveWallet(wallet, now, now)).toBeNull();
	});
});

describe("wallet session persistence", () => {
	it("restores an unexpired session on rehydrate", async () => {
		storeSession(Date.now() + WALLET_SESSION_TTL_MS);
		await useWorkspaceStore.persist.rehydrate();

		expect(useWorkspaceStore.getState().wallet).toEqual(wallet);
	});

	it("signs out a session stored past its expiry", async () => {
		storeSession(Date.now() - 1);
		await useWorkspaceStore.persist.rehydrate();

		expect(useWorkspaceStore.getState().wallet).toBeNull();
	});
});
