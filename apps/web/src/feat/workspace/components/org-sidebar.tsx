import { Link } from "@tanstack/react-router";
import { useOrganization } from "@/shared/hooks/use-scope";

/** Settings sidebar: single General section today, room for more sections later. */
export const OrgSidebar = ({ organization }: { organization: string }) => {
	const active = useOrganization(organization);

	return (
		<div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 text-sm">
			<p className="px-3 py-2 text-xs text-muted-foreground">{active?.name ?? organization}</p>
			<Link
				to="/studio/org/$organization/settings"
				params={{ organization }}
				className="rounded-md bg-sidebar-accent px-3 py-2 font-medium text-sidebar-accent-foreground"
				aria-current="page"
			>
				General
			</Link>
		</div>
	);
};
