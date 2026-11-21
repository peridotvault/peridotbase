import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Plug } from "lucide-react";
import { cn } from "@peridotvault/peridotbase-ui/utils";
import { clearSession, getSession } from "@/feat/admin/lib/session";

const linkCls = (active: boolean) =>
	cn(
		"flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors",
		active
			? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
			: "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
	);

/** Sidebar admin: Dashboard, Connection, keluar. Dipakai semua halaman /admin ber-login. */
export const AdminSidebar = () => {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const user = getSession();

	const logout = () => {
		clearSession();
		void navigate({ to: "/admin/login" });
	};

	return (
		<aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-border bg-muted/30 p-3">
			<p className="px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Admin{user ? ` · ${user}` : ""}
			</p>
			<Link to="/admin" className={linkCls(pathname === "/admin")}>
				<LayoutDashboard className="size-4" />
				Dashboard
			</Link>
			<Link to="/admin/connect" className={linkCls(pathname === "/admin/connect")}>
				<Plug className="size-4" />
				Connection
			</Link>
			<button
				type="button"
				onClick={logout}
				className={cn(linkCls(false), "mt-auto w-full text-left")}
			>
				<LogOut className="size-4" />
				Keluar
			</button>
		</aside>
	);
};
