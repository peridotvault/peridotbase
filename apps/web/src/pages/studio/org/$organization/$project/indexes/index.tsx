import { createFileRoute } from "@tanstack/react-router";
import { DemoFirstTable } from "@/shared/components/demo-first-table";

export const Route = createFileRoute("/studio/org/$organization/$project/indexes/")({
	component: RouteComponent,
});

/** Legacy indexes entry: opens the indexes tab of the Data view. */
function RouteComponent() {
	return (
		<DemoFirstTable
			tab="indexes"
			fallback={
				<main className="flex-1 flex items-center justify-center">
					Select a table to view its indexes
				</main>
			}
		/>
	);
}
