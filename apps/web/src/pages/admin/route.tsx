import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { useTheme } from "@/shared/hooks/use-theme";

/** Admin shell. Client-only like Studio, served from the same app, no extra service. */
export const Route = createFileRoute("/admin")({
	ssr: false,
	// Operator surface: never a search result.
	head: () => ({
		meta: [{ title: "Admin — Peridotbase" }, { name: "robots", content: "noindex, nofollow" }],
	}),
	component: AdminLayout,
});

function AdminLayout() {
	const { resolvedTheme } = useTheme();

	useLayoutEffect(() => {
		const root = document.documentElement;
		root.classList.toggle("dark", resolvedTheme === "dark");
		root.classList.toggle("light", resolvedTheme === "light");
	}, [resolvedTheme]);

	return (
		<div className="flex min-h-dvh flex-col bg-background text-foreground">
			<Outlet />
		</div>
	);
}
