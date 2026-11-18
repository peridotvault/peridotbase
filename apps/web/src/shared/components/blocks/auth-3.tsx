"use client";

import { Button } from "@peridotvault/peridotbase-ui/button";
import { Loader2, Wallet } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type Auth3Props = {
	/** Wallets discovered in the browser, shown as read-only chips. */
	wallets: readonly string[];
	/** True while the connect mutation is in flight. */
	isConnecting: boolean;
	/** Demo mode skips the wallet entirely. */
	isDemo: boolean;
	/** Connect the wallet, or open the demo when `isDemo`. */
	onConnect: () => void;
	/** Where the primary copy points: the first wallet name, or "wallet". */
	walletName?: string;
};

function BrandMark() {
	return (
		<div className="flex items-center gap-2">
			<img src="/logo.svg" alt="" className="size-7" />
			<span className="font-display text-sm font-medium text-foreground">
				Peridotbase Studio
			</span>
		</div>
	);
}

/**
 * React Bits Pro `auth-3`, re-cut for Peridotbase: the same centered card over a full-bleed
 * backdrop, with a brand panel on the right. Sign-in here means connecting a Solana wallet,
 * so the email form and OAuth buttons are replaced by the wallet action and detected wallets.
 * Harmonized to the Supabase tokens (`bg-surface-75`, `border-border-default`, primary green).
 */
export function Auth3({
	wallets,
	isConnecting,
	isDemo,
	onConnect,
	walletName = "wallet",
}: Auth3Props) {
	const reduceMotion = useReducedMotion();

	const enter = reduceMotion
		? { initial: { opacity: 0 }, animate: { opacity: 1 } }
		: {
				initial: { opacity: 0, x: -24 },
				animate: { opacity: 1, x: 0 },
			};

	return (
		<div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-background p-6">
			{/* Backdrop: neutral dot grid, no external asset. */}
			<div aria-hidden="true" className="dot-grid absolute inset-0 opacity-50" />

			<div className="relative z-10 mx-auto flex w-full max-w-[1100px] items-center justify-center gap-12">
				<motion.div
					initial={enter.initial}
					animate={enter.animate}
					transition={{ duration: reduceMotion ? 0.2 : 0.6, ease: EASE }}
					className="w-full max-w-md rounded-2xl border border-border-default bg-surface-75 p-8 shadow-2xl"
				>
					<BrandMark />

					<h1 className="mt-8 text-3xl font-medium tracking-tight text-foreground">Sign in</h1>
					<p className="mt-2 text-sm text-foreground-light">
						{isDemo
							? "Demo mode opens labeled sample data and never touches Solana."
							: "Connect the wallet that owns your database. The wallet is the account."}
					</p>

					<Button
						type="button"
						size="xl"
						onClick={onConnect}
						disabled={isConnecting}
						className="mt-6 w-full"
					>
						{isConnecting ? (
							<Loader2 className="size-4 animate-spin" aria-hidden />
						) : (
							<Wallet className="size-4" aria-hidden />
						)}
						{isDemo ? "Open the demo" : `Connect ${walletName}`}
					</Button>

					{!isDemo && (
						<>
							<div className="my-6 flex items-center gap-3" aria-hidden="true">
								<span className="h-px flex-1 bg-border-default" />
								<span className="font-mono text-xs text-foreground-lighter">
									Detected wallets
								</span>
								<span className="h-px flex-1 bg-border-default" />
							</div>

							{wallets.length > 0 ? (
								<ul className="grid gap-2">
									{wallets.map((name) => (
										<li
											key={name}
											className="flex h-11 items-center gap-3 rounded-md border border-border-default bg-surface-100 px-4 text-sm font-medium text-foreground"
										>
											<Wallet className="size-4 text-foreground-lighter" aria-hidden />
											{name}
											<span className="ml-auto font-mono text-xs text-foreground-lighter">
												Standard
											</span>
										</li>
									))}
								</ul>
							) : (
								<p className="rounded-md border border-border-default bg-surface-100 px-4 py-3 text-sm text-foreground-light">
									No Solana wallet detected. Install Phantom, Solflare, or Backpack, then
									reload.
								</p>
							)}

							<p className="mt-6 text-center text-sm text-foreground-light">
								Wallets are discovered through Wallet Standard. Nothing leaves this browser
								until you sign.
							</p>
						</>
					)}
				</motion.div>

				<motion.div
					initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
					animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
					transition={{ duration: reduceMotion ? 0.2 : 0.6, delay: 0.2, ease: EASE }}
					className="hidden max-w-sm lg:block"
				>
					<p className="text-4xl font-medium tracking-tight text-foreground">Peridotbase</p>
					<p className="mt-4 max-w-[26ch] text-lg leading-relaxed text-foreground-light">
						Tables, rows, and indexes live on Solana. Sign in with the wallet that owns them.
					</p>
				</motion.div>
			</div>
		</div>
	);
}

export default Auth3;
