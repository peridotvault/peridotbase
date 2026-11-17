import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthScreen } from "@/feat/auth";
import { isSignedIn } from "@/shared/lib/auth";

/** The only public page. A wallet session already in place skips straight to the workspace. */
export const Route = createFileRoute("/studio/auth")({
	validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	}),
	beforeLoad: () => {
		if (isSignedIn()) throw redirect({ to: "/studio/org" });
	},
	component: function AuthPage() {
		const { redirect: target } = Route.useSearch();

		return <AuthScreen redirect={target} />;
	},
});
