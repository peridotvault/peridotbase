import { Label } from "@peridotvault/peridotbase-ui/label";
import { Navigate } from "@tanstack/react-router";
import { PageHeader, PageShell, Panel, PanelBody } from "@/shared/components/page";
import { useOrganization } from "@/shared/hooks/use-scope";
import { OrganizationGovernanceSection } from "./organization-governance-section";

/**
 * The organization's settings tab: the catalog account plus the optional multisig policy,
 * proposals and break-glass recovery. Rename is not exposed because the slug is the route identity.
 */
export const OrgSettingsScreen = ({ organization }: { organization: string }) => {
	const active = useOrganization(organization);

	if (!active) return <Navigate to="/studio/org" replace />;

	const rows = [
		["Slug", active.slug],
		["Address", active.address],
		["Owner", active.owner],
	] as const;

	return (
		<PageShell>
			<PageHeader eyebrow={active.name} title="Org settings" />

			<Panel>
				<PanelBody className="space-y-3">
					<h2 className="text-sm font-medium">On-chain account</h2>
					<dl className="divide-y divide-border overflow-hidden rounded-lg border border-border text-sm">
						{rows.map(([label, value]) => (
							<div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
								<dt className="shrink-0 text-muted-foreground">{label}</dt>
								<dd className="min-w-0 truncate font-mono text-xs" title={value}>
									{value}
								</dd>
							</div>
						))}
					</dl>
					<Label className="block text-xs font-normal text-muted-foreground">
						Rename stays out of the Studio: the slug is the route and account identity.
					</Label>
				</PanelBody>
			</Panel>

			<OrganizationGovernanceSection organization={active.slug} />
		</PageShell>
	);
};
