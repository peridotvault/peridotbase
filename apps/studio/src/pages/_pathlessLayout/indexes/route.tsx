import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for the indexes group; the index page and table view render inside it. */
export const Route = createFileRoute("/_pathlessLayout/indexes")({
	component: Outlet,
});
