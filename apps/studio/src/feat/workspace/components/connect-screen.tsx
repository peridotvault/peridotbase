import type { Cluster } from "@peridotbase/sdk";
import { Badge } from "@peridotbase/ui/badge";
import { Button } from "@peridotbase/ui/button";
import { Input } from "@peridotbase/ui/input";
import { Label } from "@peridotbase/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@peridotbase/ui/select";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, Loader2, Plug, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { listInstalledWallets } from "@peridotbase/sdk";
import { DemoBanner } from "@/shared/components/demo-banner";
import { homePath } from "@/shared/lib/sections";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";
import {
	CLUSTER_OPTIONS,
	clusterLabel,
	useProtocolHealth,
	useWalletSession,
} from "../hooks/use-workspace";

const HealthRow = ({
	label,
	state,
	detail,
}: {
	label: string;
	state: "ok" | "pending" | "error";
	detail?: string;
}) => {
	const Icon = state === "ok" ? CheckCircle2 : state === "pending" ? Loader2 : CircleAlert;

	return (
		<div className="flex items-center justify-between gap-4 py-2">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="flex items-center gap-2 text-sm">
				<Icon
					className={
						state === "ok"
							? "size-4 text-emerald-500"
							: state === "error"
								? "size-4 text-destructive"
								: "size-4 animate-spin text-muted-foreground"
					}
				/>
				{detail ??
					(state === "ok" ? "Ready" : state === "pending" ? "Checking…" : "Unavailable")}
			</span>
		</div>
	);
};

/**
 * The workspace gate: pick an RPC endpoint, connect a Wallet Standard wallet, and watch the
 * endpoint answer. Nothing here reads Peridotbase accounts — that needs the program ID.
 */
export const ConnectScreen = () => {
	const navigate = useNavigate();
	const demo = isDemoMode();
	const capabilities = useStudioCapabilities();
	const {
		wallet,
		connect,
		disconnect,
		isConnecting,
		rpcUrl,
		cluster,
		programId,
		setRpcUrl,
		setCluster,
		setProgramId,
	} = useWalletSession();
	const health = useProtocolHealth();

	const [draftUrl, setDraftUrl] = useState(rpcUrl);
	const [draftProgramId, setDraftProgramId] = useState(programId);
	const [installedWallets, setInstalledWallets] = useState<
		ReturnType<typeof listInstalledWallets>
	>([]);

	useEffect(() => setDraftUrl(rpcUrl), [rpcUrl]);
	useEffect(() => setDraftProgramId(programId), [programId]);

	// Wallets register asynchronously after the page announces itself, so re-list once.
	useEffect(() => {
		setInstalledWallets(listInstalledWallets());

		const timer = setTimeout(() => setInstalledWallets(listInstalledWallets()), 500);

		return () => clearTimeout(timer);
	}, []);

	const handleApplyUrl = () => {
		const trimmed = draftUrl.trim();

		if (trimmed) setRpcUrl(trimmed);
	};

	const handleApplyProgram = () => setProgramId(draftProgramId.trim());

	return (
		<main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12 text-foreground">
			<DemoBanner className="fixed top-0 right-0 left-0 z-50 border-b border-amber-500/40" />
			<div className="w-full max-w-2xl space-y-6">
				<header className="space-y-2">
					<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
						<Plug className="size-4" />
						Peridotbase Studio
					</div>
					<h1 className="text-2xl font-semibold tracking-tight">Connect your workspace</h1>
					<p className="text-sm text-muted-foreground">
						{demo
							? "Demo mode is showing labeled sample data. No wallet or RPC traffic is needed to look around."
							: "The Studio talks to your Solana wallet and an RPC endpoint. There is no server in between: every read and write is a program instruction."}
					</p>
				</header>

				<section className="rounded-lg border border-border p-5">
					<h2 className="mb-3 text-sm font-medium">RPC endpoint</h2>
					<div className="flex flex-col gap-3 sm:flex-row">
						<Select value={cluster} onValueChange={(next) => setCluster(next as Cluster)}>
							<SelectTrigger aria-label="Cluster" className="sm:w-44">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CLUSTER_OPTIONS.map((option) => (
									<SelectItem key={option} value={option}>
										{clusterLabel(option)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Input
							aria-label="RPC URL"
							value={draftUrl}
							onChange={(event) => setDraftUrl(event.target.value)}
							onBlur={handleApplyUrl}
							onKeyDown={(event) => {
								if (event.key === "Enter") handleApplyUrl();
							}}
							placeholder="https://api.devnet.solana.com"
							className="font-mono text-xs"
						/>
						<Button type="button" variant="outline" onClick={handleApplyUrl}>
							Apply
						</Button>
					</div>
					<div className="mt-2">
						<HealthRow
							label="Endpoint"
							state={health.isLoading ? "pending" : health.data?.reachable ? "ok" : "error"}
							detail={
								health.data?.reachable
									? `${health.data.version ?? "Solana"} · slot ${health.data.slot ?? "?"}`
									: health.isLoading
										? undefined
										: "No response"
							}
						/>
					</div>
				</section>

				<section className="rounded-lg border border-border p-5">
					<h2 className="mb-3 text-sm font-medium">Wallet</h2>
					{wallet ? (
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="space-y-1">
								<p className="text-sm font-medium">{wallet.label ?? "Connected wallet"}</p>
								<p className="font-mono text-xs text-muted-foreground">{wallet.address}</p>
							</div>
							<Button type="button" variant="outline" onClick={disconnect}>
								Disconnect
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								{demo
									? "Demo mode opens without a wallet. Connect one only if you want to see the Wallet Standard picker."
									: installedWallets.length > 0
										? "A Wallet Standard wallet is installed. Connect it to sign instructions."
										: "No Wallet Standard wallet detected. Install one (Phantom, Solflare, Backpack) and reload."}
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<Button type="button" onClick={() => void connect()} disabled={isConnecting}>
									<Wallet className="mr-2 size-4" />
									{isConnecting ? "Connecting…" : "Connect wallet"}
								</Button>
								{installedWallets.map((installed) => (
									<Badge key={installed.name} variant="secondary">
										{installed.name}
									</Badge>
								))}
							</div>
						</div>
					)}
				</section>

				<section className="rounded-lg border border-border p-5">
					<h2 className="mb-1 text-sm font-medium">Peridotbase program</h2>
					<p className="mb-3 text-xs text-muted-foreground">
						{demo
							? "Demo mode does not connect to the program; every screen reads the bundled sample database."
							: "The program address is published by peridotbase-core. Until then the Studio can verify connectivity but cannot read accounts."}
					</p>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Input
							aria-label="Program ID"
							value={draftProgramId}
							onChange={(event) => setDraftProgramId(event.target.value)}
							placeholder="Program ID (optional)"
							className="font-mono text-xs"
						/>
						<Button type="button" variant="outline" onClick={handleApplyProgram}>
							Save
						</Button>
					</div>
					<div className="mt-2">
						<Label className="sr-only">Program readiness</Label>
						<HealthRow
							label="Account reads"
							state={demo || capabilities.discovery ? "ok" : "pending"}
							detail={
								demo
									? "Sample data (demo)"
									: capabilities.discovery
										? "Available"
										: "Waiting for the program IDL"
							}
						/>
					</div>
				</section>

				<div className="flex items-center justify-between gap-3">
					<p className="text-xs text-muted-foreground">
						{demo
							? "Demo mode: open the workspace to browse sample data."
							: wallet
								? "Wallet connected. Open the workspace to see program status."
								: "Connect a wallet to continue."}
					</p>
					<Button
						type="button"
						disabled={!demo && !wallet}
						onClick={() => navigate({ to: homePath(capabilities) })}
					>
						{demo ? "Explore the demo" : "Open workspace"}
					</Button>
				</div>
			</div>
		</main>
	);
};
