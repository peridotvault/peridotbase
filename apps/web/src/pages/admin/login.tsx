import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginScreen } from "@/feat/admin/components/login-screen";
import { getSession } from "@/feat/admin/lib/session";

/** Login gate. A session already in place skips straight to the dashboard. */
export const Route = createFileRoute("/admin/login")({
	beforeLoad: () => {
		if (getSession()) throw redirect({ to: "/admin" });
	},
	component: LoginScreen,
});
