import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ProjectsScreen } from "@/feat/workspace";
import { useOrganization } from "@/shared/hooks/use-scope";

export const Route = createFileRoute("/studio/org/$organization/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { organization } = Route.useParams();
	const active = useOrganization(organization);

	if (!active) return <Navigate to="/studio/org" replace />;

	return <ProjectsScreen organization={organization} />;
}
