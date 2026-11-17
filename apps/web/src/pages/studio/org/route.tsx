import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isSignedIn } from "@/shared/lib/auth";

/**
 * Layout for the `/org` group; the organization picker and studio live under it. Every scoped
 * page is gated here: without a wallet session there is no organization to derive, so the guest
 * goes to the sign-in page instead of an empty shell.
 */
export const Route = createFileRoute("/studio/org")({
	beforeLoad: ({ location }) => {
		if (!isSignedIn()) {
			throw redirect({ to: "/studio/auth", search: { redirect: location.href } });
		}
	},
	component: Outlet,
});
