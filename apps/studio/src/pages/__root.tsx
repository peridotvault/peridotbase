import { Toaster } from "@peridotbase/ui/sonner";
import { TooltipProvider } from "@peridotbase/ui/tooltip";
import { aiDevtoolsPlugin } from "@tanstack/react-ai-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { NuqsAdapter } from "nuqs/adapters/react";
import { useLayoutEffect } from "react";
import { SettingsOverlay } from "@/feat/settings";
import { TableBuilderOverlay } from "@/feat/schema";
import { CommandPalette } from "@/shared/components/components/command-palette";
import { useTheme } from "@/shared/hooks/use-theme";

const connectDevtoolsServerBus =
	import.meta.env.DEV && import.meta.env.VITE_TANSTACK_SERVER_BUS === "true";

export const Route = createRootRoute({
	component: function RootRouteComponent() {
		const { resolvedTheme } = useTheme();

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

		// The Studio opens without a wallet. Until the program can sign, connecting one is
		// optional; the connect page stays reachable from the workspace menu.
		const isInApp = !isConnectPage;

		return (
			<TooltipProvider>
				<NuqsAdapter
					fullPageNavigationOnShallowFalseUpdates
					defaultOptions={{ shallow: true, clearOnDefault: true }}
				>
					<Outlet />
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
