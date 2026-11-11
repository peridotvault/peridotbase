import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for the table group; index and per-table data views render inside it. */
export const Route = createFileRoute("/_pathlessLayout/table")({
	component: Outlet,
});
