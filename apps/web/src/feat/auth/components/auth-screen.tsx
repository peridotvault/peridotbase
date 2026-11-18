import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listInstalledWallets, subscribeToWallets } from "@peridotvault/peridotbase-sdk";
import { Auth3 } from "@/shared/components/blocks/auth-3";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";
import { useWalletSession } from "@/shared/hooks/use-wallet-session";

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
		<Auth3
			wallets={wallets.map((wallet) => wallet.name)}
			isConnecting={isConnecting}
			isDemo={demo}
			onConnect={() => void handleConnect()}
			walletName={wallets[0]?.name ?? "wallet"}
		/>
	);
};
