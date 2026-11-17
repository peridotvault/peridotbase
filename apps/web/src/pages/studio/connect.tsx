import { createFileRoute } from "@tanstack/react-router";
import { ConnectScreen } from "@/feat/admin/components/connect-screen";

export const Route = createFileRoute("/studio/connect")({
	component: ConnectScreen,
});
