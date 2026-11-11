import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceScreen } from "@/feat/workspace/components/workspace-screen";

export const Route = createFileRoute("/_pathlessLayout/workspace")({
	component: WorkspaceScreen,
});
