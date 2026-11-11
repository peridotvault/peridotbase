import { Button } from "@peridotbase/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@peridotbase/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@peridotbase/ui/tooltip";
import { cn } from "@peridotbase/ui/utils";
import { useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { WorkspaceMenu } from "@/feat/workspace";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { useDatabasesList } from "@/shared/hooks/use-databases-list";
import { homePath } from "@/shared/lib/sections";
import { useDatabaseStore } from "@/shared/stores/database.store";

/** One line: `● workspace / database ⌄ ⟳`. The workspace button opens connection status. */
export function SidebarFooter() {
	const { databases, isLoadingDatabases, refetchDatabases, isRefetchingDatabases } =
		useDatabasesList();

	const { selectedDatabase, setSelectedDatabase } = useDatabaseStore();
	const capabilities = useStudioCapabilities();
	const navigate = useNavigate();
	const busy = isLoadingDatabases || isRefetchingDatabases;

	const handleDatabaseChange = (value: string) => {
		setSelectedDatabase(value);
		navigate({ to: homePath(capabilities), search: {} });
	};

	const handleRefresh = async () => {
		await refetchDatabases();
		toast.success("Databases refreshed");
	};

	return (
		<div className="mt-auto flex h-11 items-center gap-0.5 border-t border-sidebar-border bg-sidebar px-2 text-sidebar-foreground">
			<WorkspaceMenu />
			<span aria-hidden className="text-xs text-muted-foreground/50">
				/
			</span>
			<Select value={selectedDatabase || ""} onValueChange={handleDatabaseChange}>
				<SelectTrigger
					variant="outline"
					aria-label="Database"
					disabled={busy}
					className="h-7 min-w-0 flex-1 border-0 px-2 font-mono shadow-none hover:bg-muted/60"
				>
					<SelectValue placeholder="Select database…" />
				</SelectTrigger>
				<SelectContent>
					{databases?.map((db) => (
						<SelectItem key={db.name} value={db.name} className="font-mono text-xs">
							{db.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Refresh databases"
						onClick={handleRefresh}
						disabled={busy}
					>
						<RefreshCw className={cn(busy && "animate-spin")} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Refresh databases</TooltipContent>
			</Tooltip>
		</div>
	);
}
