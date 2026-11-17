import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/shared/components/site-chrome";

/** Public marketing shell, Supabase-aligned. `.marketing` scopes the brand tokens. */
export const Route = createFileRoute("/_marketing")({
	component: MarketingLayout,
});

function MarketingLayout() {
	return (
		<div className="marketing flex min-h-dvh flex-col bg-background text-foreground">
			<SiteHeader />
			<main className="flex-1">
				<Outlet />
			</main>
			<SiteFooter />
		</div>
	);
}
