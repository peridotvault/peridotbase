import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { Chat } from "@/feat/ai-assistant";
import { QueriesSidebar } from "@/feat/query-runner";
import { DropColumnDialog, EditTableSheet } from "@/feat/schema";
import { TablesSidebar } from "@/feat/tables";
import { DatabasesSidebar } from "@/feat/visualizer";
import { NavRail } from "@/shared/components/components/nav-rail";
import { SidebarWrapper } from "@/shared/components/sidebar-wrapper";
import { useProjectDatabases } from "@/shared/hooks/use-project-databases";
import { useProject } from "@/shared/hooks/use-scope";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { PROJECT_ROOT, sectionOf } from "@/shared/lib/sections";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { useScopeStore } from "@/shared/stores/scope.store";
import { usePersonalPreferencesStore } from "@/shared/stores/personal-preferences.store";

export const Route = createFileRoute("/studio/org/$organization/$project")({
	component: RouteComponent,
});

function RouteComponent() {
	const { organization, project } = Route.useParams();
	const capabilities = useStudioCapabilities();
	const { pathname } = useLocation();
	const section = sectionOf(pathname);
	const activeProject = useProject(organization, project);
	const databases = useProjectDatabases(organization, project);
	const { selectedDatabase, setSelectedDatabase } = useDatabaseStore();
	const setActiveScope = useScopeStore((state) => state.setActiveScope);

	// The SDK scopes every on-chain read and write to the organization/project in the URL.
	useEffect(() => {
		setActiveScope({ organization, project });
	}, [organization, project, setActiveScope]);

	const {
		sidebar: { mode, width },
	} = usePersonalPreferencesStore();

	// A project browses the database picked in the sidebar; the URL is not the selector.
	useEffect(() => {
		const fallback = databases[0] ?? null;

		if (!selectedDatabase || !databases.includes(selectedDatabase)) {
			if (selectedDatabase !== fallback) setSelectedDatabase(fallback);
		}
	}, [databases, selectedDatabase, setSelectedDatabase]);

	if (!activeProject) {
		return <Navigate to="/studio/org" replace />;
	}

	if (section && !section.appliesTo(capabilities)) {
		return <Navigate to={PROJECT_ROOT} params={{ organization, project }} replace />;
	}

	// Sections without a sidebar render full-width; only data and queries keep the panel.
	const sidebar = section?.sidebar;

	if (!sidebar) {
		return (
			<div className="bg-background text-foreground relative flex min-h-0 flex-1 overflow-hidden">
				<NavRail assistant={<Chat />} />
				<div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
					<Outlet />
				</div>

				{/* Shell-level dialogs opened from anywhere through their stores. */}
				<EditTableSheet />
				<DropColumnDialog />
			</div>
		);
	}

	return (
		<div className="bg-background text-foreground relative flex min-h-0 flex-1 overflow-hidden">
			<NavRail assistant={<Chat />} />
			<SidebarWrapper>
				{sidebar === "queries" ? (
					<QueriesSidebar />
				) : sidebar === "databases" ? (
					<DatabasesSidebar />
				) : (
					<TablesSidebar />
				)}
			</SidebarWrapper>

			<div
				className="rail-content relative flex-1 flex flex-col h-full overflow-hidden"
				style={{
					marginLeft: mode === "pinned" ? `${width}px` : "0",
				}}
			>
				<Outlet />
			</div>

			{/* Shell-level dialogs opened from anywhere through their stores. */}
			<EditTableSheet />
			<DropColumnDialog />
		</div>
	);
}
