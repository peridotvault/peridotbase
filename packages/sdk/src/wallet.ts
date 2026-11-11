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

/** An installed wallet the Studio can put in its list, whichever discovery path found it. */
export type InstalledWallet = {
	name: string;
	icon: string | null;
};

type RegisterApi = {
	register: (...wallets: WalletStandardWallet[]) => () => void;
	get: () => WalletStandardWallet[];
};

/**
 * The pre-Wallet-Standard shape Phantom, Solflare and Backpack still inject. It is the fallback
 * path: a wallet that exposes it can connect even when its Wallet Standard announcement never
 * reaches the page.
 */
type LegacyWalletProvider = {
	connect?: (options?: {
		onlyIfTrusted?: boolean;
	}) => Promise<{ publicKey?: { toString(): string } | null } | void>;
	disconnect?: () => Promise<void>;
	publicKey?: { toString(): string } | null;
};

type InjectedWindow = Window & {
	phantom?: { solana?: LegacyWalletProvider };
	solflare?: LegacyWalletProvider;
	backpack?: LegacyWalletProvider;
	solana?: LegacyWalletProvider & {
		isPhantom?: boolean;
		isSolflare?: boolean;
		isBackpack?: boolean;
	};
};

/**
 * The wallet registry is module-level and stays subscribed for the lifetime of the page. Wallets
 * announce themselves by handling `wallet-standard:register-wallet`; dispatching
 * `wallet-standard:app-ready` asks every installed wallet to do so.
 */
let registered: WalletStandardWallet[] | null = null;
const registryListeners = new Set<() => void>();

const notifyRegistry = () => {
	for (const listener of registryListeners) listener();
};

const announceWallets = () => {
	if (typeof window === "undefined") return;

	window.dispatchEvent(new Event("wallet-standard:app-ready"));
};

/**
 * Wallets inject their content script at `document_start` but only announce once the app is
 * ready, and their announcement can miss the first `app-ready` when the extension loads late.
 * Repeating the announcement a few times over the first seconds — and re-listing on each repeat —
 * is what makes Phantom appear without a reload.
 */
const FIRST_ANNOUNCE_DELAYS_MS = [150, 600, 1500, 3000] as const;

const readRegistry = (): WalletStandardWallet[] => {
	if (registered) return registered;
	if (typeof window === "undefined") return [];

	registered = [];

	window.addEventListener("wallet-standard:register-wallet", (event) => {
		const announce = (event as CustomEvent<(api: RegisterApi) => void>).detail;

		if (typeof announce !== "function" || !registered) return;

		announce({
			get: () => registered ?? [],
			register: (...wallets) => {
				let added = false;

				for (const candidate of wallets) {
					if (!registered?.some((wallet) => wallet.name === candidate.name)) {
						registered?.push(candidate);
						added = true;
					}
				}

				if (added) notifyRegistry();

				return () => {
					let removed = false;

					for (const candidate of wallets) {
						const index = registered?.indexOf(candidate) ?? -1;

						if (index >= 0) {
							registered?.splice(index, 1);
							removed = true;
						}
					}

					if (removed) notifyRegistry();
				};
			},
		});
	});

	announceWallets();

	for (const delay of FIRST_ANNOUNCE_DELAYS_MS) {
		window.setTimeout(() => {
			announceWallets();
			// Legacy providers inject without an announcement, so a late list also picks them up.
			notifyRegistry();
		}, delay);
	}

	return registered;
};

const supportsSolana = (wallet: WalletStandardWallet) =>
	(wallet.chains ?? []).some((chain) => chain.startsWith("solana:"));

const injected = (): InjectedWindow | null =>
	typeof window === "undefined" ? null : (window as InjectedWindow);

type LegacyWallet = { name: string; provider: LegacyWalletProvider };

const legacyWallets = (): LegacyWallet[] => {
	const target = injected();

	if (!target) return [];

	const candidates: Array<{ name: string; provider?: LegacyWalletProvider }> = [
		{
			name: "Phantom",
			provider:
				target.phantom?.solana ?? (target.solana?.isPhantom ? target.solana : undefined),
		},
		{
			name: "Solflare",
			provider: target.solflare ?? (target.solana?.isSolflare ? target.solana : undefined),
		},
		{
			name: "Backpack",
			provider: target.backpack ?? (target.solana?.isBackpack ? target.solana : undefined),
		},
	];

	return candidates.filter(
		(candidate): candidate is LegacyWallet =>
			typeof candidate.provider?.connect === "function",
	);
};

/**
 * Installed Solana wallets, for the connect menu. Merges the Wallet Standard registry with the
 * legacy injected providers, so a wallet that only announces one of the two still appears.
 */
export const listInstalledWallets = (): InstalledWallet[] => {
	const standard = readRegistry()
		.filter(supportsSolana)
		.map((wallet) => ({ name: wallet.name, icon: wallet.icon ?? null }));
	const legacy = legacyWallets().map((wallet) => ({ name: wallet.name, icon: null }));
	const names = new Set(standard.map((wallet) => wallet.name));

	return [...standard, ...legacy.filter((wallet) => !names.has(wallet.name))];
};

/**
 * Calls `listener` whenever the installed set can change: a wallet registers or unregisters, or
 * one of the early re-announcements runs. Returns an unsubscribe function.
 */
export const subscribeToWallets = (listener: () => void): (() => void) => {
	readRegistry();
	registryListeners.add(listener);

	return () => {
		registryListeners.delete(listener);
	};
};

type ActiveWallet =
	| { kind: "standard"; wallet: WalletStandardWallet }
	| { kind: "legacy"; provider: LegacyWalletProvider };

/**
 * Wallet Standard implementation of the SDK's `WalletPort`, with a legacy injected-provider
 * fallback for wallets that never reach the registry.
 *
 * `connect` is real: it asks the installed wallet for an account. Signing is intentionally
 * unimplemented — no instruction payload can be serialized until `peridotbase-core` publishes
 * the program IDL, and returning a fabricated signature would misrepresent a broadcast.
 */
export const createWalletStandardPort = (): WalletPort => {
	let wallet: ConnectedWallet | null = null;
	let active: ActiveWallet | null = null;

	const connectLegacy = async (): Promise<ConnectedWallet | null> => {
		for (const legacy of legacyWallets()) {
			let result: { publicKey?: { toString(): string } | null } | void;

			try {
				result = await legacy.provider.connect?.();
			} catch {
				continue;
			}

			const publicKey = result?.publicKey ?? legacy.provider.publicKey;

			if (!publicKey) continue;

			active = { kind: "legacy", provider: legacy.provider };
			wallet = { address: publicKey.toString(), label: legacy.name };

			return wallet;
		}

		return null;
	};

	return {
		get wallet() {
			return wallet;
		},
		connect: async () => {
			const candidates = readRegistry().filter(
				(candidate) => supportsSolana(candidate) && candidate.features["standard:connect"],
			);
			const selected = candidates[0];

			if (selected) {
				const result = await selected.features["standard:connect"]?.connect?.();
				const account = result?.accounts[0] ?? selected.accounts?.[0];

				if (account) {
					active = { kind: "standard", wallet: selected };
					wallet = { address: account.address, label: selected.name };

					return wallet;
				}
			}

			return connectLegacy();
		},
		disconnect: async () => {
			try {
				if (active?.kind === "standard") {
					await active.wallet.features["standard:disconnect"]?.disconnect?.();
				} else if (active?.kind === "legacy") {
					await active.provider.disconnect?.();
				}
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
