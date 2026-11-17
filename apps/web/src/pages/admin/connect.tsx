import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminSidebar } from "@/feat/admin/components/admin-sidebar";
import { ConnectScreen } from "@/feat/admin/components/connect-screen";
import { getSession } from "@/feat/admin/lib/session";

export const Route = createFileRoute("/admin/connect")({
	beforeLoad: () => {
		if (!getSession()) throw redirect({ to: "/admin/login" });
	},
	component: AdminConnectPage,
});

function AdminConnectPage() {
	return (
		<div className="flex min-h-dvh bg-background text-foreground">
			<AdminSidebar />
			<div className="min-w-0 flex-1 overflow-y-auto">
				<ConnectScreen />
			</div>
		</div>
	);
}
