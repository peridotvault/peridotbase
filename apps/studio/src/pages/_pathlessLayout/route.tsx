import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { Chat } from "@/feat/ai-assistant";
import { QueriesSidebar } from "@/feat/query-runner";
import { DropColumnDialog, EditTableSheet } from "@/feat/schema";
import { TablesSidebar } from "@/feat/tables";
import { SidebarFooter } from "@/feat/workspace";
import { NavRail } from "@/shared/components/components/nav-rail";
import { SidebarWrapper } from "@/shared/components/sidebar-wrapper";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { homePath, sectionOf } from "@/shared/lib/sections";
import { usePersonalPreferencesStore } from "@/shared/stores/personal-preferences.store";

export const Route = createFileRoute("/_pathlessLayout")({
	component: RouteComponent,
});

function RouteComponent() {
	const capabilities = useStudioCapabilities();
	const { pathname } = useLocation();
	const section = sectionOf(pathname);

	const {
		sidebar: { mode, width },
	} = usePersonalPreferencesStore();

	if (section && !section.appliesTo(capabilities)) {
		return <Navigate to={homePath(capabilities)} />;
	}

	const sidebar = section?.sidebar;

	return (
		<div className="bg-background text-foreground w-dvw flex h-dvh max-h-dvh overflow-hidden relative">
			<NavRail assistant={<Chat />} />
			{sidebar && (
				<SidebarWrapper>
					{sidebar === "queries" ? <QueriesSidebar /> : <TablesSidebar />}
					<SidebarFooter />
				</SidebarWrapper>
			)}

			<div
				className="rail-content relative flex-1 flex flex-col h-full overflow-hidden"
				style={{
					marginLeft: sidebar && mode === "pinned" ? `${width}px` : "0",
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
