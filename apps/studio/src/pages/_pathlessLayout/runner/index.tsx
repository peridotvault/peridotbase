import { createFileRoute } from "@tanstack/react-router";
import { RunnerScreen } from "@/feat/query-runner";

export const Route = createFileRoute("/_pathlessLayout/runner/")({
	validateSearch: (search: Record<string, unknown>): { cmd?: string } =>
		typeof search.cmd === "string" ? { cmd: search.cmd } : {},
	component: RouteComponent,
});

function RouteComponent() {
	const { cmd } = Route.useSearch();

	return <RunnerScreen initialQuery={cmd} />;
}
