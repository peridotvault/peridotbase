import { TooltipProvider } from "@peridotvault/peridotbase-ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { queryClient } from "@/shared/lib/query-client";
import "@/polyfills";
import "@/app.css";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
		],
		links: [
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
			{ rel: "icon", type: "image/png", sizes: "256x256", href: "/favicon.png" },
		],
	}),
	component: RootComponent,
});

function RootComponent() {
	return (
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				<QueryClientProvider client={queryClient}>
					<TooltipProvider>
						<Outlet />
					</TooltipProvider>
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	);
}
