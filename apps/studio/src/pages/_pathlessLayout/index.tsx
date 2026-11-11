import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { homePath } from "@/shared/lib/sections";

export const Route = createFileRoute("/_pathlessLayout/")({
	component: RouteComponent,
});

function RouteComponent() {
	const capabilities = useStudioCapabilities();

	return <Navigate to={homePath(capabilities)} />;
}
