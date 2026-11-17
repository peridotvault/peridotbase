import { createFileRoute } from "@tanstack/react-router";
import { OverviewScreen } from "@/feat/overview";

export const Route = createFileRoute("/studio/org/$organization/$project/")({
	component: OverviewScreen,
});
