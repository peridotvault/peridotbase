import { createFileRoute } from "@tanstack/react-router";
import { DemoFirstTable } from "@/shared/components/demo-first-table";

export const Route = createFileRoute("/studio/org/$organization/$project/schema/")({
	component: RouteComponent,
});

/** Legacy schema entry: opens the schema tab of the Data view. */
function RouteComponent() {
	return (
		<DemoFirstTable
			tab="schema"
			fallback={
				<main className="flex-1 flex items-center justify-center">
					Select a table to view its schema
				</main>
			}
		/>
	);
}
