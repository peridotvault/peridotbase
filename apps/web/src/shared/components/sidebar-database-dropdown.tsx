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
import { Spinner } from "@peridotvault/peridotbase-ui/spinner";
import { Check, ChevronDown, Database, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	useActiveDatabase,
	useCreateDatabase,
	useProjectDatabases,
} from "@/shared/hooks/use-project-databases";
import { sdkErrorMessage } from "@/shared/peridotbase/errors";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { useDatabaseStore } from "@/shared/stores/database.store";

/** Picks the database the whole Studio browses, and creates one when the program allows it. */
export const SidebarDatabaseDropdown = () => {
	const { organization, project } = useStudioScope();
	const databases = useProjectDatabases(organization, project);
	const activeDatabase = useActiveDatabase();
	const setSelectedDatabase = useDatabaseStore((state) => state.setSelectedDatabase);
	const { mutateAsync: createDatabase, isPending: isCreating } = useCreateDatabase(
		organization,
		project,
	);
	const capabilities = useStudioCapabilities();
	const [isOpen, setIsOpen] = useState(false);
	const [name, setName] = useState("");

	const handleCreate = async () => {
		const trimmed = name.trim();

		if (!trimmed) {
			toast.error("Name your database first");
			return;
		}

		try {
			// One wallet approval and one transaction: say so while it is pending instead of
			// leaving the button unresponsive.
			await toast
				.promise(createDatabase(trimmed), {
					loading: `Creating "${trimmed}" — approve it in your wallet`,
					success: `Database "${trimmed}" created`,
					error: (error: unknown) => sdkErrorMessage(error, `Couldn't create "${trimmed}"`),
				})
				.unwrap();

			setName("");
			setIsOpen(false);
		} catch {
			// toast.promise already showed the failure and keeps the dialog open for a retry.
		}
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
							{isCreating ? (
								<Spinner size="size-3.5" color="bg-muted-foreground" />
							) : (
								<Database className="size-3.5 shrink-0 text-muted-foreground" />
							)}
							<span className="truncate">
								{isCreating
									? `Creating ${name.trim()}…`
									: (activeDatabase ?? "Select database")}
							</span>
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
					<DropdownMenuItem disabled={!capabilities.ddl} onClick={() => setIsOpen(true)}>
						<Plus className="size-4" />
						New database
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog
				open={isOpen}
				onOpenChange={(open) => {
					// The transaction is already in flight; closing would hide its progress.
					if (!isCreating) setIsOpen(open);
				}}
			>
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
						disabled={isCreating}
						onChange={(event) => setName(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !isCreating) void handleCreate();
						}}
						placeholder="Database name"
					/>
					{!capabilities.ddl && (
						<p className="text-xs text-muted-foreground">
							This connection cannot create databases.
						</p>
					)}
					{isCreating && (
						<p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
							<Loader2 className="size-3.5 animate-spin" />
							Waiting for your wallet, then for the cluster to confirm. Keep this tab open.
						</p>
					)}
					<DialogFooter className="gap-2">
						<Button variant="outline" disabled={isCreating} onClick={() => setIsOpen(false)}>
							Cancel
						</Button>
						<Button onClick={() => void handleCreate()} disabled={isCreating || !name.trim()}>
							{isCreating && <Spinner size="size-3.5" color="bg-primary-foreground" />}
							{isCreating ? "Creating…" : "Create"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};
