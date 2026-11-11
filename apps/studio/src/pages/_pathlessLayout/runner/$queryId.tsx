import { createFileRoute } from "@tanstack/react-router";
import { RunnerScreen } from "@/feat/query-runner";

export const Route = createFileRoute("/_pathlessLayout/runner/$queryId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { queryId } = Route.useParams();

	return <RunnerScreen queryId={queryId} />;
}
