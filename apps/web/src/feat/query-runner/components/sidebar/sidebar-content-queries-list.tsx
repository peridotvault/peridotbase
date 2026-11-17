import { SidebarDatabaseDropdown } from "@/shared/components/sidebar-database-dropdown";
import { SidebarListQueries } from "./sidebar-list-queries";
import { SidebarSearchQueriesList } from "./sidebar-search-queries-list";

export const SidebarContentQueriesList = () => {
	return (
		<>
			<SidebarDatabaseDropdown />
			<SidebarSearchQueriesList />
			<SidebarListQueries />
		</>
	);
};
