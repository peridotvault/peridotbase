import { IntegrationUnavailableError } from "./errors.js";
import type { ConnectedWallet, WalletPort } from "./ports.js";

type WalletAccountLike = {
	address: string;
	label?: string;
	chains?: readonly string[];
};

type WalletFeatureLike = {
	version?: string;
	connect?: () => Promise<{ accounts: readonly WalletAccountLike[] }>;
	disconnect?: () => Promise<void>;
};

export type WalletStandardWallet = {
	name: string;
	icon?: string;
	chains?: readonly string[];
	accounts?: readonly WalletAccountLike[];
	features: Record<string, WalletFeatureLike>;
};

type RegisterApi = {
	register: (...wallets: WalletStandardWallet[]) => () => void;
	get: () => WalletStandardWallet[];
};

/**
 * The wallet registry is module-level and stays subscribed for the lifetime of the page.
 * Wallets announce themselves by handling `wallet-standard:register-wallet`; dispatching
 * `wallet-standard:app-ready` asks every installed wallet to do so.
 */
let registered: WalletStandardWallet[] | null = null;

const ensureRegistry = (): WalletStandardWallet[] => {
	if (registered) return registered;
	if (typeof window === "undefined") return [];

	registered = [];

	window.addEventListener("wallet-standard:register-wallet", (event) => {
		const announce = (event as CustomEvent<(api: RegisterApi) => void>).detail;

		if (typeof announce !== "function" || !registered) return;

		announce({
			get: () => registered ?? [],
			register: (...wallets) => {
				for (const candidate of wallets) {
					if (!registered?.some((wallet) => wallet.name === candidate.name)) {
						registered?.push(candidate);
					}
				}

				return () => {
					for (const candidate of wallets) {
						const index = registered?.indexOf(candidate) ?? -1;
						if (index >= 0) registered?.splice(index, 1);
					}
				};
			},
		});
	});

	window.dispatchEvent(new Event("wallet-standard:app-ready"));

	return registered;
};

const supportsSolana = (wallet: WalletStandardWallet) =>
	(wallet.chains ?? []).some((chain) => chain.startsWith("solana:"));

/** Installed Solana wallets, for the connect menu. Empty until a wallet extension registers. */
export const listInstalledWallets = () =>
	ensureRegistry()
		.filter(supportsSolana)
		.map((wallet) => ({ name: wallet.name, icon: wallet.icon ?? null }));

/**
 * Wallet Standard implementation of the SDK's `WalletPort`.
 *
 * `connect` is real: it asks the installed wallet for an account. Signing is intentionally
 * unimplemented — no instruction payload can be serialized until `peridotbase-core` publishes
 * the program IDL, and returning a fabricated signature would misrepresent a broadcast.
 */
export const createWalletStandardPort = (): WalletPort => {
	let wallet: ConnectedWallet | null = null;
	let active: WalletStandardWallet | null = null;

	return {
		get wallet() {
			return wallet;
		},
		connect: async () => {
			const candidates = ensureRegistry().filter(
				(candidate) => supportsSolana(candidate) && candidate.features["standard:connect"],
			);
			const selected = candidates[0];

			if (!selected) return null;

			const result = await selected.features["standard:connect"]?.connect?.();
			const account = result?.accounts[0] ?? selected.accounts?.[0];

			if (!account) return null;

			active = selected;
			wallet = { address: account.address, label: selected.name };

			return wallet;
		},
		disconnect: async () => {
			try {
				await active?.features["standard:disconnect"]?.disconnect?.();
			} finally {
				wallet = null;
				active = null;
			}
		},
		signTransaction: async () => {
			throw new IntegrationUnavailableError("wallet.signTransaction");
		},
	};
};
