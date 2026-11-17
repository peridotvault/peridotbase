import { createFileRoute } from "@tanstack/react-router";
import { OrganizationPicker } from "@/feat/workspace";

/** `/org` is where the organization is chosen. */
export const Route = createFileRoute("/studio/org/")({
	component: OrganizationPicker,
});
