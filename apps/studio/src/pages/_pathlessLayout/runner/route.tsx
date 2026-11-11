import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for the query runner group; index and saved query views render inside it. */
export const Route = createFileRoute("/_pathlessLayout/runner")({
	component: Outlet,
});
