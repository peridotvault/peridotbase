import { Button } from "@peridotvault/peridotbase-ui/button";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Loader2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { listInstalledWallets, subscribeToWallets } from "@peridotvault/peridotbase-sdk";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";
import { useWalletSession } from "@/shared/hooks/use-wallet-session";
import { PRODUCT_PERKS } from "./perks";

/**
 * The one public page: what the product does plus the sign-in step. Signing in means connecting a
 * wallet, because every organization the program can show is derived from the wallet that created
 * it. Demo mode has no wallet by design, so it offers the walkthrough instead.
 */
export const AuthScreen = ({ redirect }: { redirect?: string }) => {
	const navigate = useNavigate();
	const router = useRouter();
	const demo = isDemoMode();
	const { connect, isConnecting } = useWalletSession();
	const [wallets, setWallets] = useState(() => listInstalledWallets());

	useEffect(() => subscribeToWallets(() => setWallets(listInstalledWallets())), []);

	const enter = () => {
		// The wallet session lives in memory, so the redirect must stay inside the router: a full
		// page load would drop the session and bounce straight back here.
		if (redirect?.startsWith("/")) {
			void router.history.push(redirect);
			return;
		}

		void navigate({ to: "/studio/org" });
	};

	const handleConnect = async () => {
		if (demo) {
			enter();
			return;
		}

		const connected = await connect().catch(() => null);

		if (connected) enter();
	};

	return (
		<main className="flex h-full overflow-y-auto bg-background text-foreground">
			<div className="m-auto grid w-full max-w-5xl gap-10 px-6 py-12 lg:grid-cols-2">
				<section className="space-y-6">
					<div className="flex items-center gap-2">
						<img src="/logo.svg" alt="" className="size-7" />
						<span className="text-sm font-medium">Peridotbase Studio</span>
					</div>
					<h1 className="text-3xl font-semibold tracking-tight">
						Sign in with the wallet that owns your database.
					</h1>
					<p className="text-sm text-muted-foreground">
						Your organization, projects and tables are Solana accounts. The wallet is the
						identity: connecting it is signing in, and nothing is read until it is connected.
					</p>
					<ul className="space-y-4">
						{PRODUCT_PERKS.map((perk) => (
							<li key={perk.title} className="flex gap-3">
								<span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
									<perk.icon className="size-4 text-muted-foreground" />
								</span>
								<span>
									<p className="text-sm font-medium">{perk.title}</p>
									<p className="text-sm text-muted-foreground">{perk.body}</p>
								</span>
							</li>
						))}
					</ul>
				</section>

				<section className="rounded-xl border border-border p-6">
					<h2 className="text-lg font-semibold tracking-tight">Sign in</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						{demo
							? "Demo mode: the walkthrough opens with labeled sample data and never touches Solana."
							: wallets.length > 0
								? "Approve the connection in your wallet to continue."
								: "No Solana wallet detected. Install Phantom, Solflare, or Backpack, then reload."}
					</p>

					<Button
						type="button"
						className="mt-5 w-full"
						onClick={() => void handleConnect()}
						disabled={isConnecting}
					>
						{isConnecting ? (
							<Loader2 className="mr-2 size-4 animate-spin" />
						) : (
							<Wallet className="mr-2 size-4" />
						)}
						{demo ? "Open the demo" : `Connect ${wallets[0]?.name ?? "wallet"}`}
					</Button>

					{!demo && (
						<p className="mt-4 text-xs text-muted-foreground">
							Wallets are discovered through Wallet Standard, with the injected provider as a
							fallback. Nothing leaves this browser until you sign a transaction.
						</p>
					)}
				</section>
			</div>
		</main>
	);
};
