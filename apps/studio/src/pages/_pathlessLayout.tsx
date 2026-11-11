import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { NavRail } from "@/shared/components/components/nav-rail";
import { Sidebar } from "@/shared/components/sidebar/sidebar";
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

	const hasSidebar = Boolean(section?.sidebar);

	return (
		<div className="bg-background text-foreground w-dvw flex h-dvh max-h-dvh overflow-hidden relative">
			<NavRail />
			{hasSidebar && <Sidebar />}

			<div
				className="rail-content relative flex-1 flex flex-col h-full overflow-hidden"
				style={{
					marginLeft: hasSidebar && mode === "pinned" ? `${width}px` : "0",
				}}
			>
				<Outlet />
			</div>
		</div>
	);
}
