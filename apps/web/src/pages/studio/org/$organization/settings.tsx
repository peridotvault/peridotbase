import { createFileRoute, Navigate } from "@tanstack/react-router";
import { OrgSettingsScreen } from "@/feat/workspace";
import { useOrganization } from "@/shared/hooks/use-scope";

export const Route = createFileRoute("/studio/org/$organization/settings")({
	component: RouteComponent,
});

function RouteComponent() {
	const { organization } = Route.useParams();
	const active = useOrganization(organization);

	if (!active) return <Navigate to="/studio/org" replace />;

	return <OrgSettingsScreen organization={organization} />;
}
