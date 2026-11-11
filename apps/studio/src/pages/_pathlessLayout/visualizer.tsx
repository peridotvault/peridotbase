import { createFileRoute } from "@tanstack/react-router";
import { VisualizerScreen } from "@/feat/visualizer";

export const Route = createFileRoute("/_pathlessLayout/visualizer")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<main className="flex-1 overflow-hidden">
			<VisualizerScreen />
		</main>
	);
}
