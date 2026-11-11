import { Button } from "@peridotbase/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@peridotbase/ui/dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import { Circle, Plug, Settings2, Unplug, Wallet } from "lucide-react";
import { clusterLabel, useWalletSession } from "../hooks/use-workspace";

/** Compact workspace status for the sidebar footer: cluster, wallet, and the way to change them. */
export const WorkspaceMenu = () => {
	const navigate = useNavigate();
	const { wallet, connect, disconnect, isConnecting, cluster } = useWalletSession();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Workspace connection"
					className="relative"
				>
					<Plug />
					<Circle
						className={
							wallet
								? "absolute -right-0.5 -bottom-0.5 size-2 fill-emerald-500 text-emerald-500"
								: "absolute -right-0.5 -bottom-0.5 size-2 fill-muted-foreground text-muted-foreground"
						}
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" side="top" className="w-64">
				<DropdownMenuLabel className="space-y-0.5">
					<p className="text-xs font-medium">Peridotbase</p>
					<p className="font-mono text-[11px] font-normal text-muted-foreground">
						{clusterLabel(cluster)}
					</p>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{wallet ? (
					<>
						<DropdownMenuLabel className="flex items-center gap-2 font-normal">
							<Wallet className="size-3.5 text-muted-foreground" />
							<span className="truncate font-mono text-[11px]">{wallet.address}</span>
						</DropdownMenuLabel>
						<DropdownMenuItem onClick={disconnect}>
							<Unplug />
							Disconnect wallet
						</DropdownMenuItem>
					</>
				) : (
					<DropdownMenuItem disabled={isConnecting} onClick={() => void connect()}>
						<Wallet />
						{isConnecting ? "Connecting…" : "Connect wallet"}
					</DropdownMenuItem>
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => navigate({ to: "/connect" })}>
					<Settings2 />
					Connection settings
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
