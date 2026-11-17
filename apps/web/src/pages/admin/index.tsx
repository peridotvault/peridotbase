import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardScreen } from "@/feat/admin/components/dashboard-screen";
import { getSession } from "@/feat/admin/lib/session";

/** `/admin` = dashboard. Belum login -> `/admin/login`. */
export const Route = createFileRoute("/admin/")({
	beforeLoad: () => {
		if (!getSession()) throw redirect({ to: "/admin/login" });
	},
	component: DashboardScreen,
});
