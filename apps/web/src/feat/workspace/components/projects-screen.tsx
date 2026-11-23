import { Badge } from "@peridotvault/peridotbase-ui/badge";
import { Button } from "@peridotvault/peridotbase-ui/button";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, PageShell, Panel, PanelBody } from "@/shared/components/page";
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
		const trimmed = name.trim();

		if (!trimmed) return;

		setIsCreating(true);

		try {
			// One transaction: name it while it is pending so a wallet prompt is never a mystery.
			const project = await toast
				.promise(getPeridotbaseClient().createProject(organization, trimmed), {
					loading: `Creating "${trimmed}" — approve the transaction in your wallet (~30s)`,
					success: `Project "${trimmed}" created`,
					error: (error: unknown) => sdkErrorMessage(error, "Couldn't create the project"),
				})
				.unwrap();

			setName("");
			await refresh();
			await navigate({
				to: "/studio/org/$organization/$project",
				params: { organization, project: project.slug },
			});
		} catch {
			// toast.promise already showed the failure.
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<PageShell>
			<PageHeader
				eyebrow={activeOrganization.name}
				title="Projects"
				description={`${organizationProjects.length} project${organizationProjects.length === 1 ? "" : "s"}`}
			/>

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
								className="group flex flex-col rounded-lg border border-border px-5 py-4 transition-colors hover:border-muted-foreground/30 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							>
								<div className="flex min-w-0 items-center justify-between gap-3">
									<span className="truncate text-sm font-medium" title={project.name}>
										{project.name}
									</span>
									<Badge variant="default" className="shrink-0">
										on-chain
									</Badge>
								</div>
								<p className="mt-1 truncate font-mono text-xs text-muted-foreground">
									{project.address.slice(0, 8)}…
								</p>
							</Link>
						</li>
					))}
				</ul>
			)}

			<Panel>
				<PanelBody className="space-y-3">
					<h2 className="text-sm font-medium">New project</h2>
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
							<Plus />
							Create
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						Opening a project signs 1 transaction with your wallet.
					</p>
				</PanelBody>
			</Panel>
		</PageShell>
	);
};
