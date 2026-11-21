import { TooltipProvider } from "@peridotvault/peridotbase-ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import NotFound from "@/shared/components/not-found";
import { OG_IMAGE, SITE_NAME } from "@/shared/lib/site";
import { queryClient } from "@/shared/lib/query-client";
import "@/polyfills";
import "@/app.css";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ name: "theme-color", content: "#0d0f0e" },
			{ name: "color-scheme", content: "dark light" },
			{ name: "application-name", content: SITE_NAME },
			{ property: "og:site_name", content: SITE_NAME },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:image", content: OG_IMAGE },
		],
		links: [
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
			{ rel: "icon", type: "image/png", sizes: "256x256", href: "/favicon.png" },
			{ rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
			{ rel: "mask-icon", href: "/favicon.svg", color: "#589770" },
		],
	}),
	notFoundComponent: NotFound,
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
