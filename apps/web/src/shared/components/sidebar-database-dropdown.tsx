import { Button } from "@peridotvault/peridotbase-ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@peridotvault/peridotbase-ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@peridotvault/peridotbase-ui/dropdown-menu";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Check, ChevronDown, Database, Plus } from "lucide-react";
import { useState } from "react";
import {
	useActiveDatabase,
	useCreateDatabase,
	useProjectDatabases,
} from "@/shared/hooks/use-project-databases";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { useDatabaseStore } from "@/shared/stores/database.store";

/** Picks the database the whole Studio browses, and creates one when the program allows it. */
export const SidebarDatabaseDropdown = () => {
	const { organization, project } = useStudioScope();
	const databases = useProjectDatabases(organization, project);
	const activeDatabase = useActiveDatabase();
	const setSelectedDatabase = useDatabaseStore((state) => state.setSelectedDatabase);
	const createDatabase = useCreateDatabase(organization, project);
	const capabilities = useStudioCapabilities();
	const [isCreating, setIsCreating] = useState(false);
	const [name, setName] = useState("");

	const handleCreate = async () => {
		const created = await createDatabase(name);

		if (!created) return;

		setName("");
		setIsCreating(false);
	};

	return (
		<div className="px-3 pt-3">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						className="h-8! w-full justify-between rounded-sm font-mono text-xs"
						aria-label="Database"
					>
						<span className="flex min-w-0 items-center gap-2">
							<Database className="size-3.5 shrink-0 text-muted-foreground" />
							<span className="truncate">{activeDatabase ?? "Select database"}</span>
						</span>
						<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-56">
					<DropdownMenuLabel>Databases</DropdownMenuLabel>
					{databases.map((database) => (
						<DropdownMenuItem key={database} onClick={() => setSelectedDatabase(database)}>
							<Database className="size-4" />
							<span className="flex-1 truncate font-mono text-xs">{database}</span>
							{database === activeDatabase && <Check className="size-4" />}
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem disabled={!capabilities.ddl} onClick={() => setIsCreating(true)}>
						<Plus className="size-4" />
						New database
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={isCreating} onOpenChange={setIsCreating}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>New database</DialogTitle>
						<DialogDescription>
							Name the database account this project will browse.
						</DialogDescription>
					</DialogHeader>
					<Input
						autoFocus
						aria-label="Database name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") void handleCreate();
						}}
						placeholder="Database name"
					/>
					{!capabilities.ddl && (
						<p className="text-xs text-muted-foreground">
							This connection cannot create databases.
						</p>
					)}
					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={() => setIsCreating(false)}>
							Cancel
						</Button>
						<Button onClick={() => void handleCreate()} disabled={!name.trim()}>
							Create
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};
