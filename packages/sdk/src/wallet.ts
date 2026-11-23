import type { ConnectedWallet, WalletPort } from "./ports.js";

type WalletAccountLike = {
	address: string;
	label?: string;
	chains?: readonly string[];
};

type WalletFeatureLike = {
	version?: string;
	connect?: (input?: {
		silent?: boolean;
	}) => Promise<{ accounts: readonly WalletAccountLike[] }>;
	disconnect?: () => Promise<void>;
	signTransaction?: (
		...inputs: { transaction: Uint8Array; account: WalletAccountLike }[]
	) => Promise<{ signedTransaction: Uint8Array; signature: Uint8Array }[]>;
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
 * The injected shape Phantom, Solflare and Backpack expose. It is the fallback path: a wallet
 * that exposes it can connect even when its Wallet Standard announcement never reaches the page.
 */
type InjectedWalletProvider = {
	connect?: (options?: {
		onlyIfTrusted?: boolean;
	}) => Promise<{ publicKey?: { toString(): string } | null } | void>;
	disconnect?: () => Promise<void>;
	publicKey?: { toString(): string } | null;
	signTransaction?: (transaction: unknown) => Promise<unknown>;
	/**
	 * Batch signer. Phantom/Solflare present a single approval for the whole array,
	 * unlike the Wallet Standard `solana:signTransaction` feature which prompts once
	 * per transaction.
	 */
	signAllTransactions?: (transactions: unknown[]) => Promise<unknown[]>;
};

type InjectedWindow = Window & {
	phantom?: { solana?: InjectedWalletProvider };
	solflare?: InjectedWalletProvider;
	backpack?: InjectedWalletProvider;
	solana?: InjectedWalletProvider & {
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
/** The API wallets register through; also handed to wallets that read it from `app-ready`. */
let registerApi: RegisterApi | null = null;

const notifyRegistry = () => {
	for (const listener of registryListeners) listener();
};

const announceWallets = () => {
	if (typeof window === "undefined") return;

	// Some extensions read the API from `event.detail.register` and throw
	// "Cannot destructure property 'register' of undefined" on a detail-less Event, once per
	// announcement. Spec-compliant wallets ignore the extra detail, so always attach it.
	window.dispatchEvent(
		registerApi
			? new CustomEvent("wallet-standard:app-ready", { detail: registerApi })
			: new Event("wallet-standard:app-ready"),
	);
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

	const api: RegisterApi = {
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
	};
	registerApi = api;

	window.addEventListener("wallet-standard:register-wallet", (event) => {
		const announce = (event as CustomEvent<(api: RegisterApi) => void>).detail;

		if (typeof announce !== "function") return;

		announce(api);
	});

	announceWallets();

	for (const delay of FIRST_ANNOUNCE_DELAYS_MS) {
		window.setTimeout(() => {
			announceWallets();
			// Injected providers load without an announcement, so a late list also picks them up.
			notifyRegistry();
		}, delay);
	}

	return registered;
};

const supportsSolana = (wallet: WalletStandardWallet) =>
	(wallet.chains ?? []).some((chain) => chain.startsWith("solana:"));

const injected = (): InjectedWindow | null =>
	typeof window === "undefined" ? null : (window as InjectedWindow);

type InjectedWallet = { name: string; provider: InjectedWalletProvider };

const injectedWallets = (): InjectedWallet[] => {
	const target = injected();

	if (!target) return [];

	const candidates: Array<{ name: string; provider?: InjectedWalletProvider }> = [
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
		(candidate): candidate is InjectedWallet =>
			typeof candidate.provider?.connect === "function",
	);
};

/** Same wallet name as the Wallet Standard announcement, matched to its injected provider. */
const injectedProviderFor = (name: string): InjectedWalletProvider | null =>
	injectedWallets().find((wallet) => wallet.name === name)?.provider ?? null;

/**
 * Installed Solana wallets, for the connect menu. Merges the Wallet Standard registry with the
 * injected providers, so a wallet that only announces one of the two still appears.
 */
export const listInstalledWallets = (): InstalledWallet[] => {
	const standard = readRegistry()
		.filter(supportsSolana)
		.map((wallet) => ({ name: wallet.name, icon: wallet.icon ?? null }));
	const injectedList = injectedWallets().map((wallet) => ({ name: wallet.name, icon: null }));
	const names = new Set(standard.map((wallet) => wallet.name));

	return [...standard, ...injectedList.filter((wallet) => !names.has(wallet.name))];
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
	| { kind: "standard"; wallet: WalletStandardWallet; account: WalletAccountLike }
	| { kind: "injected"; provider: InjectedWalletProvider };

/**
 * Wallet Standard implementation of the SDK's `WalletPort`, with an injected-provider
 * fallback for wallets that never reach the registry.
 *
 * `connect` is real: it asks the installed wallet for an account. Signing is intentionally
 * unimplemented — no instruction payload can be serialized until `peridotbase-core` publishes
 * the program IDL, and returning a fabricated signature would misrepresent a broadcast.
 */
export const createWalletStandardPort = (): WalletPort => {
	let wallet: ConnectedWallet | null = null;
	let active: ActiveWallet | null = null;

	const connectInjected = async (options?: {
		silent?: boolean;
	}): Promise<ConnectedWallet | null> => {
		for (const injectedWallet of injectedWallets()) {
			let result: { publicKey?: { toString(): string } | null } | void;

			try {
				result = await injectedWallet.provider.connect?.({
					onlyIfTrusted: options?.silent,
				});
			} catch {
				continue;
			}

			const publicKey = result?.publicKey ?? injectedWallet.provider.publicKey;

			if (!publicKey) continue;

			active = { kind: "injected", provider: injectedWallet.provider };
			wallet = { address: publicKey.toString(), label: injectedWallet.name };

			return wallet;
		}

		return null;
	};

	return {
		get wallet() {
			return wallet;
		},
		connect: async (options) => {
			const candidates = readRegistry().filter(
				(candidate) => supportsSolana(candidate) && candidate.features["standard:connect"],
			);
			const selected = candidates[0];

			if (selected) {
				const result = await selected.features["standard:connect"]?.connect?.({
					silent: options?.silent,
				});
				const account = result?.accounts[0] ?? selected.accounts?.[0];

				if (account) {
					active = { kind: "standard", wallet: selected, account };
					wallet = { address: account.address, label: selected.name };

					return wallet;
				}
			}

			return connectInjected(options);
		},
		disconnect: async () => {
			try {
				if (active?.kind === "standard") {
					await active.wallet.features["standard:disconnect"]?.disconnect?.();
				} else if (active?.kind === "injected") {
					await active.provider.disconnect?.();
				}
			} finally {
				wallet = null;
				active = null;
			}
		},
		signTransactions: async (payloads) => {
			const current = active;

			if (!current) throw new Error("Connect a wallet before signing");

			if (current.kind === "standard") {
				const feature = current.wallet.features["solana:signTransaction"];

				if (!feature?.signTransaction) {
					throw new Error(`${current.wallet.name} cannot sign transactions`);
				}

				// Wallet Standard sign: one wallet prompt per transaction. An injected
				// provider signs the whole batch behind one prompt, so prefer it
				// whenever the same wallet exposes both paths.
				const injectedProvider = injectedProviderFor(current.wallet.name);

				if (injectedProvider?.signAllTransactions) {
					try {
						// Sync the injected session so it can sign; some wallets
						// already trust the app after the standard connect.
						await injectedProvider.connect?.({ onlyIfTrusted: true });
					} catch {
						// A rejected trusted connect must not skip the batch signer.
					}

					try {
						const { Transaction } = await import("@solana/web3.js");
						const unsigned = payloads.map((payload) => Transaction.from(payload));
						const signed = await injectedProvider.signAllTransactions(unsigned);

						return signed.map((entry) =>
							typeof (entry as { serialize?: unknown }).serialize === "function"
								? (entry as { serialize: () => Uint8Array }).serialize()
								: (entry as Uint8Array),
						);
					} catch {
						// Injected path unavailable: fall through to Wallet Standard.
					}
				}

				const signed = await feature.signTransaction(
					...payloads.map((transaction) => ({
						transaction,
						account: current.account,
					})),
				);

				return signed.map((entry) => entry.signedTransaction);
			}

			if (!current.provider.signTransaction) {
				throw new Error("The connected wallet cannot sign transactions");
			}

			const { Transaction } = await import("@solana/web3.js");

			// One approval for the whole array when the wallet supports it.
			if (payloads.length > 1 && current.provider.signAllTransactions) {
				const signed = await current.provider.signAllTransactions(
					payloads.map((payload) => Transaction.from(payload)),
				);

				return signed.map((entry) =>
					typeof (entry as { serialize?: unknown }).serialize === "function"
						? (entry as { serialize: () => Uint8Array }).serialize()
						: (entry as Uint8Array),
				);
			}

			const out: Uint8Array[] = [];

			for (const payload of payloads) {
				const signed = await current.provider.signTransaction(Transaction.from(payload));
				out.push(
					typeof (signed as { serialize?: unknown }).serialize === "function"
						? (signed as { serialize: () => Uint8Array }).serialize()
						: payload,
				);
			}

			return out;
		},
	};
};
