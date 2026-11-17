import { createFileRoute, redirect } from "@tanstack/react-router";
import { isSignedIn } from "@/shared/lib/auth";

/** `/studio` sends a guest to sign-in and a wallet session to the organization picker. */
export const Route = createFileRoute("/studio/")({
	beforeLoad: () => {
		throw redirect({ to: isSignedIn() ? "/studio/org" : "/studio/auth" });
	},
});
