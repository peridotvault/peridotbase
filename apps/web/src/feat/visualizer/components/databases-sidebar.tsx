import { ScrollArea } from "@peridotvault/peridotbase-ui/scroll-area";
import { cn } from "@peridotvault/peridotbase-ui/utils";
import { Database } from "lucide-react";
import { SidebarDatabaseDropdown } from "@/shared/components/sidebar-database-dropdown";
import { useProjectDatabases } from "@/shared/hooks/use-project-databases";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { useTablesCount } from "@/shared/hooks/use-tables-count";
import { useDatabaseStore } from "@/shared/stores/database.store";

/** Every database in the project; picking one moves the visualizer to it. */
export const DatabasesSidebar = () => {
	const { organization, project } = useStudioScope();
	const databases = useProjectDatabases(organization, project);

	return (
		<>
			<SidebarDatabaseDropdown />
			<ScrollArea className="block h-full w-full flex-1 overflow-y-auto pb-3 [&_[data-slot=scroll-area-viewport]>div]:block!">
				<ul className="space-y-0.5 px-3 py-3">
					{databases.map((database) => (
						<DatabaseItem key={database} database={database} />
					))}
				</ul>
			</ScrollArea>
		</>
	);
};

const DatabaseItem = ({ database }: { database: string }) => {
	const selectedDatabase = useDatabaseStore((state) => state.selectedDatabase);
	const setSelectedDatabase = useDatabaseStore((state) => state.setSelectedDatabase);
	const { count } = useTablesCount(database);
	const isActive = selectedDatabase === database;

	return (
		<li>
			<button
				type="button"
				onClick={() => setSelectedDatabase(database)}
				aria-current={isActive ? "page" : undefined}
				className={cn(
					"flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
					isActive
						? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
						: "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
				)}
			>
				<Database className="size-4 shrink-0 text-muted-foreground" />
				<span className="min-w-0 flex-1 truncate text-left font-mono text-xs">{database}</span>
				<span className="shrink-0 text-xs text-muted-foreground">
					{count == null ? "…" : `${count} tables`}
				</span>
			</button>
		</li>
	);
};
