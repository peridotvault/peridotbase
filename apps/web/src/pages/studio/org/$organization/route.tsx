import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { Chat } from "@/feat/ai-assistant";
import { OrgSidebar } from "@/feat/workspace";
import { NavRail } from "@/shared/components/components/nav-rail";
import { SidebarWrapper } from "@/shared/components/sidebar-wrapper";
import { useOrganization } from "@/shared/hooks/use-scope";
import { orgSectionOf } from "@/shared/lib/sections";
import { usePersonalPreferencesStore } from "@/shared/stores/personal-preferences.store";
import { useScopeStore } from "@/shared/stores/scope.store";

export const Route = createFileRoute("/studio/org/$organization")({
	component: RouteComponent,
});

function RouteComponent() {
	const { organization } = Route.useParams();

	return <OrgGate organization={organization} />;
}

/** The org shell: rail on every org tab, sidebar only on settings. Unknown org goes to picker. */
const OrgGate = ({ organization }: { organization: string }) => {
	const active = useOrganization(organization);
	const settled = useScopeStore((state) => state.catalogSettled);
	const { pathname } = useLocation();

	const {
		sidebar: { mode, width },
	} = usePersonalPreferencesStore();

	// A refresh starts with an empty catalog; wait for the read before declaring the slug unknown.
	if (!settled) return null;

	if (!active) return <Navigate to="/studio/org" replace />;

	// The project subtree (`/org/<org>/<project>/…`) renders its own rail + sidebar; only the
	// org-level routes get the org shell. `orgSectionOf` reads the segment after the org slug.
	const orgSection = orgSectionOf(pathname);

	if (!orgSection) return <Outlet />;

	// Projects and team are full-width; settings keeps a sidebar for future sections.
	const showSidebar = orgSection.id === "settings";

	if (!showSidebar) {
		return (
			<div className="bg-background text-foreground relative flex min-h-0 flex-1 overflow-hidden">
				<NavRail assistant={<Chat />} />
				<div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
					<Outlet />
				</div>
			</div>
		);
	}

	return (
		<div className="bg-background text-foreground relative flex min-h-0 flex-1 overflow-hidden">
			<NavRail assistant={<Chat />} />
			<SidebarWrapper>
				<OrgSidebar organization={organization} />
			</SidebarWrapper>

			<div
				className="rail-content relative flex h-full min-w-0 flex-1 flex-col overflow-hidden"
				style={{
					marginLeft: mode === "pinned" ? `${width}px` : "0",
				}}
			>
				<Outlet />
			</div>
		</div>
	);
};
