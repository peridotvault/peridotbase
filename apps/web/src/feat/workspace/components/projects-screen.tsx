import { Badge } from "@peridotvault/peridotbase-ui/badge";
import { Button } from "@peridotvault/peridotbase-ui/button";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useOrganization } from "@/shared/hooks/use-scope";
import { useRefreshCatalog } from "@/shared/hooks/use-refresh-catalog";
import { getPeridotbaseClient } from "@/shared/peridotbase/client";
import { sdkErrorMessage } from "@/shared/peridotbase/errors";
import { useScopeStore } from "@/shared/stores/scope.store";

/** The organization's projects tab: pick a project to open the Studio, or create one on chain. */
export const ProjectsScreen = ({ organization }: { organization: string }) => {
	const navigate = useNavigate();
	const activeOrganization = useOrganization(organization);
	const projects = useScopeStore((state) => state.projects);
	const refresh = useRefreshCatalog();
	const [name, setName] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	const organizationProjects = useMemo(
		() => projects.filter((project) => project.organization === organization),
		[projects, organization],
	);

	if (!activeOrganization) return <Navigate to="/studio/org" replace />;

	const handleCreate = async () => {
		if (!name.trim()) return;

		setIsCreating(true);

		try {
			const project = await getPeridotbaseClient().createProject(organization, name);

			setName("");
			await refresh();
			await navigate({
				to: "/studio/org/$organization/$project",
				params: { organization, project: project.slug },
			});
		} catch (error) {
			toast.error(sdkErrorMessage(error, "Couldn't create the project"));
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<main className="flex-1 overflow-y-auto">
			<div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
				<header className="space-y-1">
					<p className="text-xs text-muted-foreground">{activeOrganization.name}</p>
					<h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
					<p className="text-sm text-muted-foreground">
						{organizationProjects.length} project{organizationProjects.length === 1 ? "" : "s"}
					</p>
				</header>

				{organizationProjects.length === 0 ? (
					<p className="rounded-lg border border-border px-5 py-4 text-sm text-muted-foreground">
						No projects yet. Create one below to open the Studio.
					</p>
				) : (
					<ul className="grid gap-3 sm:grid-cols-2">
						{organizationProjects.map((project) => (
							<li key={project.slug}>
								<Link
									to="/studio/org/$organization/$project"
									params={{ organization, project: project.slug }}
									className="block rounded-lg border border-border px-5 py-4 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								>
									<div className="flex items-center justify-between gap-3">
										<span className="truncate text-sm font-medium">{project.name}</span>
										<Badge variant="default">on-chain</Badge>
									</div>
									<p className="mt-1 font-mono text-xs text-muted-foreground">
										{project.address.slice(0, 8)}…
									</p>
								</Link>
							</li>
						))}
					</ul>
				)}

				<section className="rounded-lg border border-border p-5">
					<h2 className="mb-3 text-sm font-medium">New project</h2>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Input
							aria-label="Project name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") void handleCreate();
							}}
							placeholder="Project name"
							disabled={isCreating}
						/>
						<Button
							type="button"
							onClick={() => void handleCreate()}
							disabled={isCreating || !name.trim()}
						>
							<Plus className="mr-2 size-4" />
							Create
						</Button>
					</div>
					<p className="mt-2 text-xs text-muted-foreground">
						Creating signs one transaction with the connected wallet.
					</p>
				</section>
			</div>
		</main>
	);
};
