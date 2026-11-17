import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for the schema group; index and per-table schema views render inside it. */
export const Route = createFileRoute("/studio/org/$organization/$project/schema")({
	component: Outlet,
});
