import { createFileRoute } from "@tanstack/react-router";
import { DemoFirstTable } from "@/shared/components/demo-first-table";

export const Route = createFileRoute("/_pathlessLayout/table/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<DemoFirstTable
			section="table"
			fallback={
				<div className="flex-1 flex items-center justify-center">
					Select a table to view data
				</div>
			}
		/>
	);
}
