import { Badge } from "@peridotbase/ui/badge";
import { Button } from "@peridotbase/ui/button";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, Loader2, Settings2, Wallet } from "lucide-react";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { useProtocolHealth, useWalletSession } from "../hooks/use-workspace";

const capabilitiesList = [
	["discovery", "List databases and tables"],
	["reads", "Read rows"],
	["writes", "Insert, update and delete rows"],
	["ddl", "Create and alter tables"],
	["indexes", "Manage indexes"],
	["queries", "Run queries"],
	["live", "Live table refresh"],
] as const;

/**
 * The home section while the program is not wired: it reports exactly what the protocol can do
 * today instead of showing empty tables as if they were real.
 */
export const WorkspaceScreen = () => {
	const capabilities = useStudioCapabilities();
	const health = useProtocolHealth();
	const { wallet, cluster, rpcUrl, programId } = useWalletSession();

	return (
		<main className="flex-1 overflow-y-auto">
			<div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
				<header className="space-y-2">
					<h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
					<p className="text-sm text-muted-foreground">
						The Studio reads your Peridotbase database directly from Solana. This page shows
						what the connected program can do right now.
					</p>
				</header>

				<section className="rounded-lg border border-border">
					<div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
						<h2 className="text-sm font-medium">Connection</h2>
						<Link
							to="/connect"
							className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4"
						>
							<Settings2 className="size-3.5" />
							Change
						</Link>
					</div>
					<dl className="divide-y divide-border text-sm">
						<div className="flex items-center justify-between gap-4 px-5 py-3">
							<dt className="text-muted-foreground">Cluster</dt>
							<dd className="font-mono text-xs">{cluster}</dd>
						</div>
						<div className="flex items-center justify-between gap-4 px-5 py-3">
							<dt className="text-muted-foreground">RPC</dt>
							<dd className="truncate font-mono text-xs">{rpcUrl}</dd>
						</div>
						<div className="flex items-center justify-between gap-4 px-5 py-3">
							<dt className="text-muted-foreground">Endpoint</dt>
							<dd className="flex items-center gap-2">
								{health.isLoading ? (
									<Loader2 className="size-4 animate-spin text-muted-foreground" />
								) : health.data?.reachable ? (
									<CheckCircle2 className="size-4 text-emerald-500" />
								) : (
									<CircleAlert className="size-4 text-destructive" />
								)}
								<span className="text-xs">
									{health.isLoading
										? "Checking…"
										: health.data?.reachable
											? `${health.data.version ?? "Solana"} · slot ${health.data.slot ?? "?"}`
											: "No response"}
								</span>
							</dd>
						</div>
						<div className="flex items-center justify-between gap-4 px-5 py-3">
							<dt className="text-muted-foreground">Wallet</dt>
							<dd className="flex items-center gap-2">
								<Wallet className="size-4 text-muted-foreground" />
								<span className="font-mono text-xs">
									{wallet ? (wallet.label ?? wallet.address) : "Not connected"}
								</span>
							</dd>
						</div>
						<div className="flex items-center justify-between gap-4 px-5 py-3">
							<dt className="text-muted-foreground">Program</dt>
							<dd className="font-mono text-xs">
								{programId || "Published by peridotbase-core"}
							</dd>
						</div>
					</dl>
				</section>

				<section className="rounded-lg border border-border">
					<div className="border-b border-border px-5 py-3">
						<h2 className="text-sm font-medium">Program capabilities</h2>
					</div>
					<ul className="divide-y divide-border text-sm">
						{capabilitiesList.map(([key, label]) => (
							<li key={key} className="flex items-center justify-between gap-4 px-5 py-3">
								<span>{label}</span>
								<Badge variant={capabilities[key] ? "default" : "secondary"}>
									{capabilities[key] ? "Available" : "Pending"}
								</Badge>
							</li>
						))}
					</ul>
					{!capabilities.discovery && (
						<p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
							Account reads stay disabled until{" "}
							<span className="font-mono">peridotbase-core</span> publishes the deployed
							program address and its account layout. The table, schema and index screens
							appear once they work.
						</p>
					)}
				</section>

				<div className="flex justify-end">
					<Button asChild>
						<Link to="/connect">Connection settings</Link>
					</Button>
				</div>
			</div>
		</main>
	);
};
