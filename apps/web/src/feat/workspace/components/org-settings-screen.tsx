import { Label } from "@peridotvault/peridotbase-ui/label";
import { Navigate } from "@tanstack/react-router";
import { useOrganization } from "@/shared/hooks/use-scope";

/**
 * The organization's settings tab. The catalog account stores the name and owner; the program has
 * no rename or delete instruction, so this screen reports the account instead of faking an edit.
 */
export const OrgSettingsScreen = ({ organization }: { organization: string }) => {
	const active = useOrganization(organization);

	if (!active) return <Navigate to="/studio/org" replace />;

	return (
		<main className="flex-1 overflow-y-auto">
			<div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
				<header className="space-y-1">
					<p className="text-xs text-muted-foreground">{active.name}</p>
					<h1 className="text-2xl font-semibold tracking-tight">Org settings</h1>
				</header>

				<section className="rounded-lg border border-border p-5">
					<h2 className="mb-3 text-sm font-medium">On-chain account</h2>
					<dl className="divide-y divide-border rounded-lg border border-border text-sm">
						<div className="flex items-center justify-between gap-4 px-4 py-2.5">
							<dt className="text-muted-foreground">Slug</dt>
							<dd className="font-mono text-xs">{active.slug}</dd>
						</div>
						<div className="flex items-center justify-between gap-4 px-4 py-2.5">
							<dt className="text-muted-foreground">Address</dt>
							<dd className="font-mono text-xs">{active.address}</dd>
						</div>
						<div className="flex items-center justify-between gap-4 px-4 py-2.5">
							<dt className="text-muted-foreground">Owner</dt>
							<dd className="font-mono text-xs">{active.owner}</dd>
						</div>
					</dl>
					<Label className="mt-3 block text-xs text-muted-foreground">
						The program has no rename or delete instruction yet, so these fields are read-only.
					</Label>
				</section>
			</div>
		</main>
	);
};
