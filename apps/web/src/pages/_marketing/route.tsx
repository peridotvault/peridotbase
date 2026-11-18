import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/shared/components/site-chrome";

/** Public marketing shell, Supabase-aligned. `.marketing` scopes the brand tokens. */
export const Route = createFileRoute("/_marketing")({
	component: MarketingLayout,
});

function MarketingLayout() {
	return (
		<div className="marketing flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
			<SiteHeader />
			<main className="relative flex-1">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 left-1/2 z-40 hidden w-full max-w-(--container-max-width) -translate-x-1/2 border-x border-border-default md:block"
				/>
				<Outlet />
			</main>
			<SiteFooter />
		</div>
	);
}
