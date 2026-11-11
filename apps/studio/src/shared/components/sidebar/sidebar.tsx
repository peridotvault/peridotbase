import { useLocation } from "@tanstack/react-router";
import { SidebarContentQueriesList } from "@/shared/components/sidebar/sidebar-content-queries-list";
import { SidebarContentTablesList } from "@/shared/components/sidebar/sidebar-content-tables-list";
import { SidebarFooter } from "@/shared/components/sidebar/sidebar-footer";
import { SidebarWrapper } from "@/shared/components/sidebar/sidebar-wrapper";
import { sectionOf } from "@/shared/lib/sections";

export const Sidebar = () => {
	const { pathname } = useLocation();

	return (
		<SidebarWrapper>
			{sectionOf(pathname)?.sidebar === "queries" ? (
				<SidebarContentQueriesList />
			) : (
				<SidebarContentTablesList />
			)}
			<SidebarFooter />
		</SidebarWrapper>
	);
};
