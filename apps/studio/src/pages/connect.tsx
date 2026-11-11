import { createFileRoute } from "@tanstack/react-router";
import { ConnectScreen } from "@/feat/workspace/components/connect-screen";

export const Route = createFileRoute("/connect")({
	component: ConnectScreen,
});
