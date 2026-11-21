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
 * The Studio sign-in: a centered card over a dot-grid backdrop, with the product line beside it.
 * Sign-in means connecting a Solana wallet, so the email form and OAuth buttons are replaced by
 * the wallet action and the detected wallets. Uses the Studio tokens only — the marketing surface
 * tokens are scoped to `.marketing` and would render as empty borders here.
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
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:22px_22px]"
			/>

			<div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-center gap-12">
				<motion.div
					initial={enter.initial}
					animate={enter.animate}
					transition={{ duration: reduceMotion ? 0.2 : 0.6, ease: EASE }}
					className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-lg"
				>
					<BrandMark />

					<h1 className="mt-8 text-2xl font-semibold tracking-tight text-foreground">
						Sign in
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
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
								<span className="h-px flex-1 bg-border" />
								<span className="font-mono text-xs text-muted-foreground">
									Detected wallets
								</span>
								<span className="h-px flex-1 bg-border" />
							</div>

							{wallets.length > 0 ? (
								<ul className="grid gap-2">
									{wallets.map((name) => (
										<li
											key={name}
											className="flex h-11 items-center gap-3 rounded-sm border border-border bg-muted/40 px-4 text-sm font-medium text-foreground"
										>
											<Wallet className="size-4 text-muted-foreground" aria-hidden />
											<span className="truncate">{name}</span>
											<span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
												Standard
											</span>
										</li>
									))}
								</ul>
							) : (
								<p className="rounded-sm border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
									No Solana wallet detected. Install Phantom, Solflare, or Backpack, then
									reload.
								</p>
							)}

							<p className="mt-6 text-center text-sm text-muted-foreground">
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
					<p className="mt-4 max-w-[26ch] text-lg leading-relaxed text-pretty text-muted-foreground">
						Tables, rows, and indexes live on Solana. Sign in with the wallet that owns them.
					</p>
				</motion.div>
			</div>
		</div>
	);
}

export default Auth3;
