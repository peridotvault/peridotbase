import { listInstalledWallets } from "@peridotvault/peridotbase-sdk";
import { describe, expect, it } from "vitest";

type WalletLike = {
	name: string;
	icon: string;
	chains: string[];
	features: Record<string, never>;
};
type RegisterApi = { register: (wallet: WalletLike) => () => void };

/**
 * Wallet extensions read the registry API from `wallet-standard:app-ready`'s `detail` and throw
 * `Cannot destructure property 'register' of undefined` on a detail-less Event. The registry must
 * keep announcing, so the API has to travel with the event.
 */
describe("wallet registry announcement", () => {
	it("hands the register API to wallets that read it from app-ready", () => {
		const wallet: WalletLike = {
			name: "Phantom",
			icon: "data:image/svg+xml,",
			chains: ["solana:mainnet"],
			features: {},
		};
		let api: RegisterApi | null = null;

		window.addEventListener(
			"wallet-standard:app-ready",
			(event) => {
				const detail = (event as CustomEvent<RegisterApi | undefined>).detail ?? null;

				api = detail;
				detail?.register(wallet);
			},
			{ once: true },
		);

		const names = listInstalledWallets().map((entry) => entry.name);

		expect(typeof (api as RegisterApi | null)?.register).toBe("function");
		expect(names).toContain("Phantom");
	});
});
