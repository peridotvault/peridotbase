import { Toaster } from "@peridotbase/ui/sonner";
import { TooltipProvider } from "@peridotbase/ui/tooltip";
import { aiDevtoolsPlugin } from "@tanstack/react-ai-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { NuqsAdapter } from "nuqs/adapters/react";
import { useLayoutEffect } from "react";
import { useWorkspaceStore } from "@/feat/workspace";
import { SettingsOverlay } from "@/feat/settings";
import { TableBuilderOverlay } from "@/feat/schema";
import { CommandPalette } from "@/shared/components/components/command-palette";
import { useTheme } from "@/shared/hooks/use-theme";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";

const connectDevtoolsServerBus =
	import.meta.env.DEV && import.meta.env.VITE_TANSTACK_SERVER_BUS === "true";

export const Route = createRootRoute({
	component: function RootRouteComponent() {
		const { resolvedTheme } = useTheme();
		const wallet = useWorkspaceStore((state) => state.wallet);

		// A layout effect, so the first frame already has the stored theme.
		useLayoutEffect(() => {
			const root = document.documentElement;
			root.classList.toggle("dark", resolvedTheme === "dark");
			root.classList.toggle("light", resolvedTheme === "light");
		}, [resolvedTheme]);

		// From the rendered matches, not the URL: while the Connect page's code loads, the URL is
		// already /connect but the outlet still renders the previous page.
		const isConnectPage = useRouterState({
			select: (state) => state.matches.some((match) => match.routeId === "/connect"),
		});

		// Demo mode never asks for a wallet: the walkthrough must open on the sample workspace.
		const demo = isDemoMode();
		const isInApp = (Boolean(wallet) || demo) && !isConnectPage;

		return (
			<TooltipProvider>
				<NuqsAdapter
					fullPageNavigationOnShallowFalseUpdates
					defaultOptions={{ shallow: true, clearOnDefault: true }}
				>
					{isConnectPage || wallet || demo ? <Outlet /> : <Navigate to="/connect" />}
					{/* Inside the adapter: it reads the open table's schema from the URL. */}
					{isInApp && <CommandPalette />}
				</NuqsAdapter>
				<Toaster position="top-right" theme={resolvedTheme} />
				{isInApp && <TableBuilderOverlay />}
				<SettingsOverlay />
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						{
							name: "React Query",
							render: (
								<ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
							),
						},
						aiDevtoolsPlugin(),
					]}
					eventBusConfig={{
						connectToServerBus: connectDevtoolsServerBus,
					}}
				/>
			</TooltipProvider>
		);
	},
});
