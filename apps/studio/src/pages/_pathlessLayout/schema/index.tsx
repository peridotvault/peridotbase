import { createFileRoute } from "@tanstack/react-router";
import { DemoFirstTable } from "@/shared/components/demo-first-table";

export const Route = createFileRoute("/_pathlessLayout/schema/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<DemoFirstTable
			section="schema"
			fallback={
				<main className="flex-1 flex items-center justify-center">
					Select a table to view its schema
				</main>
			}
		/>
	);
}
