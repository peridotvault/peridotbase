import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { DATA_TABLE_PATH, DATA_TAB_PARAM } from "@/shared/lib/sections";

export const Route = createFileRoute("/studio/org/$organization/$project/schema/$table")({
	component: RouteComponent,
});

/** Legacy per-table schema URL: opens the schema tab of the unified Data view. */
function RouteComponent() {
	const { organization, project, table } = useParams({ strict: false });
	const navigate = useNavigate();

	useEffect(() => {
		void navigate({
			to: DATA_TABLE_PATH,
			params: { organization: organization ?? "", project: project ?? "", table: table ?? "" },
			search: { [DATA_TAB_PARAM]: "schema" },
			replace: true,
		});
	}, [navigate, organization, project, table]);

	return null;
}
