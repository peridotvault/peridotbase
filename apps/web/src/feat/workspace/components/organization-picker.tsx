import { Badge } from "@peridotvault/peridotbase-ui/badge";
import { Button } from "@peridotvault/peridotbase-ui/button";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, PanelBody } from "@/shared/components/page";
import { useRefreshCatalog } from "@/shared/hooks/use-refresh-catalog";
import { getPeridotbaseClient } from "@/shared/peridotbase/client";
import { sdkErrorMessage } from "@/shared/peridotbase/errors";
import { useScopeStore } from "@/shared/stores/scope.store";

/** First step of the Studio: pick an organization the wallet owns, or create one on chain. */
export const OrganizationPicker = () => {
	const navigate = useNavigate();
	const organizations = useScopeStore((state) => state.organizations);
	const projects = useScopeStore((state) => state.projects);
	const refresh = useRefreshCatalog();
	const [name, setName] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	const handleCreate = async () => {
		const trimmed = name.trim();

		if (!trimmed) return;

		setIsCreating(true);

		try {
			// One transaction: name it while it is pending so a wallet prompt is never a mystery.
			const organization = await toast
				.promise(getPeridotbaseClient().createOrganization(trimmed), {
					loading: `Creating "${trimmed}" — approve the transaction in your wallet (~30s)`,
					success: `Organization "${trimmed}" created`,
					error: (error: unknown) =>
						sdkErrorMessage(error, "Couldn't create the organization"),
				})
				.unwrap();

			setName("");
			await refresh();
			await navigate({
				to: "/studio/org/$organization",
				params: { organization: organization.slug },
			});
		} catch {
			// toast.promise already showed the failure.
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<main className="flex h-full flex-col items-center overflow-y-auto bg-background px-6 py-12 text-foreground">
			<div className="my-auto w-full max-w-2xl space-y-6">
				<PageHeader
					eyebrow={
						<span className="inline-flex items-center gap-2">
							<Building2 className="size-4" />
							Peridotbase Studio
						</span>
					}
					title="Choose an organization"
					description="Projects, tables and usage live inside an organization you own on chain."
				/>

				{organizations.length === 0 ? (
					<p className="rounded-lg border border-border px-5 py-4 text-sm text-muted-foreground">
						This wallet has no organization yet. Create one below; it becomes a Solana account
						that owns your projects and databases.{" "}
						<Link
							to="/admin/connect"
							className="font-medium text-foreground underline decoration-current/40 underline-offset-4 hover:decoration-current"
						>
							Check the connection
						</Link>
						.
					</p>
				) : (
					<ul className="grid gap-3 sm:grid-cols-2">
						{organizations.map((organization) => {
							const count = projects.filter(
								(project) => project.organization === organization.slug,
							).length;

							return (
								<li key={organization.slug}>
									<Link
										to="/studio/org/$organization"
										params={{ organization: organization.slug }}
										className="block rounded-lg border border-border px-5 py-4 transition-colors hover:border-muted-foreground/30 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									>
										<div className="flex min-w-0 items-center justify-between gap-3">
											<span className="truncate text-sm font-medium" title={organization.name}>
												{organization.name}
											</span>
											<Badge variant="secondary" className="shrink-0">
												on-chain
											</Badge>
										</div>
										<p className="mt-1 text-xs text-muted-foreground">
											{count} project{count === 1 ? "" : "s"}
										</p>
									</Link>
								</li>
							);
						})}
					</ul>
				)}

				<Panel>
					<PanelBody className="space-y-3">
						<h2 className="text-sm font-medium">New organization</h2>
						<div className="flex flex-col gap-2 sm:flex-row">
							<Input
								aria-label="Organization name"
								value={name}
								onChange={(event) => setName(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === "Enter") void handleCreate();
								}}
								placeholder="Organization name"
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
							Creating signs 1 transaction with your wallet (create organization).
						</p>
					</PanelBody>
				</Panel>
			</div>
		</main>
	);
};
