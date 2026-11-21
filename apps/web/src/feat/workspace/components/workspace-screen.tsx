import { Badge } from "@peridotvault/peridotbase-ui/badge";
import { Button } from "@peridotvault/peridotbase-ui/button";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, Loader2, Settings2, Wallet } from "lucide-react";
import {
	PageHeader,
	PageShell,
	Panel,
	PanelHeader,
	PanelList,
	PanelRow,
} from "@/shared/components/page";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";
import { useProtocolHealth } from "@/shared/hooks/use-protocol-health";
import { useWalletSession } from "@/shared/hooks/use-wallet-session";
import { AuditSection } from "./audit-section";
import { CatalogSection } from "./catalog-section";
import { DatabaseAdminSection } from "./database-admin-section";
import { SponsorAllowanceSection } from "./sponsor-allowance-section";

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
	const demo = isDemoMode();
	const capabilities = useStudioCapabilities();
	const health = useProtocolHealth();
	const { wallet, cluster, rpcUrl, programId } = useWalletSession();

	return (
		<PageShell width="narrow">
			<PageHeader
				title="Workspace"
				description={
					demo
						? "Demo preview of your Peridotbase workspace. This page samples the connection layout with labeled data; the table, runner, schema, index and visualizer sections browse it."
						: "The Studio reads your Peridotbase database directly from Solana. This page shows what the connected program can do right now."
				}
			/>

			<Panel>
				<PanelHeader
					title="Connection"
					actions={
						<Button variant="ghost" size="sm" asChild>
							<Link to="/admin/connect">
								<Settings2 />
								Change
							</Link>
						</Button>
					}
				/>
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
							{demo ? (
								<>
									<CheckCircle2 className="size-4 text-success" />
									<span className="text-xs">Demo sample data · no RPC calls</span>
								</>
							) : health.isLoading ? (
								<Loader2 className="size-4 animate-spin text-muted-foreground" />
							) : health.data?.reachable ? (
								<CheckCircle2 className="size-4 text-success" />
							) : (
								<CircleAlert className="size-4 text-destructive" />
							)}
							{!demo && (
								<span className="text-xs">
									{health.isLoading
										? "Checking…"
										: health.data?.reachable
											? `${health.data.version ?? "Solana"} · slot ${health.data.slot ?? "?"}`
											: "No response"}
								</span>
							)}
						</dd>
					</div>
					<div className="flex items-center justify-between gap-4 px-5 py-3">
						<dt className="text-muted-foreground">Wallet</dt>
						<dd className="flex items-center gap-2">
							<Wallet className="size-4 text-muted-foreground" />
							<span className="font-mono text-xs">
								{wallet
									? (wallet.label ?? wallet.address)
									: demo
										? "Demo (wallet not required)"
										: "Not connected"}
							</span>
						</dd>
					</div>
					<div className="flex items-center justify-between gap-4 px-5 py-3">
						<dt className="text-muted-foreground">Program</dt>
						<dd className="font-mono text-xs">
							{demo
								? "Not connected (demo mode)"
								: programId || "Published by peridotbase-core"}
						</dd>
					</div>
				</dl>
			</Panel>

			<Panel>
				<PanelHeader title={demo ? "Program capabilities (demo)" : "Program capabilities"} />
				<PanelList>
					{capabilitiesList.map(([key, label]) => (
						<PanelRow key={key}>
							<span>{label}</span>
							<Badge
								variant={demo ? "secondary" : capabilities[key] ? "default" : "secondary"}
							>
								{demo ? "Demo" : capabilities[key] ? "Available" : "Pending"}
							</Badge>
						</PanelRow>
					))}
				</PanelList>
				{demo ? (
					<p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
						Demo mode simulates every capability from the bundled sample database. Open any
						section from the rail to browse tables, schema, indexes, the visualizer and the
						query runner. Toggle demo mode from the admin dashboard at{" "}
						<span className="font-mono">/admin</span>.
					</p>
				) : (
					!capabilities.discovery && (
						<p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
							Account reads stay disabled until the connection has a program address. Open{" "}
							<span className="font-mono">/connect</span> to point the Studio at{" "}
							<span className="font-mono">peridotbase-core</span>.
						</p>
					)
				)}
			</Panel>

			<CatalogSection />

			<DatabaseAdminSection />

			<SponsorAllowanceSection />

			<AuditSection />

			<div className="flex justify-end">
				<Button asChild>
					<Link to="/admin/connect">Connection settings</Link>
				</Button>
			</div>
		</PageShell>
	);
};
