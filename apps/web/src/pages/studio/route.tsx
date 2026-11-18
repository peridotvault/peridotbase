import { Toaster } from "@peridotvault/peridotbase-ui/sonner";
import { aiDevtoolsPlugin } from "@tanstack/react-ai-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { NuqsAdapter } from "nuqs/adapters/react";
import { useLayoutEffect } from "react";
import { SettingsOverlay } from "@/feat/settings";
import { TableBuilderOverlay } from "@/feat/schema";
import { StudioTopbar } from "@/feat/workspace";
import { CommandPalette } from "@/shared/components/components/command-palette";
import { AnnouncementBar } from "@/shared/components/announcement-bar";
import { useScopeSync } from "@/shared/hooks/use-scope-sync";
import { useTheme } from "@/shared/hooks/use-theme";

const connectDevtoolsServerBus =
	import.meta.env.DEV && import.meta.env.VITE_TANSTACK_SERVER_BUS === "true";

/**
 * The Studio shell. Everything under `/studio` is wallet- and browser-scoped, so the whole
 * subtree skips SSR and renders on the client after the marketing shell has hydrated.
 */
export const Route = createFileRoute("/studio")({
	ssr: false,
	// Wallet-scoped app surface: never a search result.
	head: () => ({
		meta: [
			{ title: "Studio — Peridotbase" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	component: StudioLayout,
});

function StudioLayout() {
	const { resolvedTheme } = useTheme();

	// The organization/project catalogs come from the program; the store keeps the snapshot
	// every scoped screen reads.
	useScopeSync();

	// A layout effect, so the first frame already has the stored theme.
	useLayoutEffect(() => {
		const root = document.documentElement;
		root.classList.toggle("dark", resolvedTheme === "dark");
		root.classList.toggle("light", resolvedTheme === "light");
	}, [resolvedTheme]);

	const isAuthPage = useRouterState({
		select: (state) => state.matches.some((match) => match.routeId === "/studio/auth"),
	});

	// Auth stands alone: no topbar, no announcement, no shell chrome. Connection settings
	// moved to /admin, so the Studio chrome shows on every other page.
	const isInApp = !isAuthPage;

	return (
		<NuqsAdapter
			fullPageNavigationOnShallowFalseUpdates
			defaultOptions={{ shallow: true, clearOnDefault: true }}
		>
			<div className="studio flex h-dvh flex-col bg-background text-foreground">
				{isInApp && <AnnouncementBar />}
				{/* Every page except connect keeps the topbar; the rail starts below it. */}
				{isInApp && <StudioTopbar />}
				<div className="flex min-h-0 flex-1 flex-col">
					<Outlet />
				</div>
			</div>
			{/* Inside the adapter: it reads the open table's schema from the URL. */}
			{isInApp && <CommandPalette />}
			<Toaster position="top-right" theme={resolvedTheme} />
			{isInApp && <TableBuilderOverlay />}
			<SettingsOverlay />
			<TanStackDevtools
				config={{ position: "bottom-right" }}
				plugins={[
					{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
					{
						name: "React Query",
						render: <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />,
					},
					aiDevtoolsPlugin(),
				]}
				eventBusConfig={{ connectToServerBus: connectDevtoolsServerBus }}
			/>
		</NuqsAdapter>
	);
}
