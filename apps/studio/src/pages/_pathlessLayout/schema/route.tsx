import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for the schema group; index and per-table schema views render inside it. */
export const Route = createFileRoute("/_pathlessLayout/schema")({
	component: Outlet,
});
