import { Button } from "@peridotvault/peridotbase-ui/button";
import { X } from "lucide-react";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";
import { useAnnouncementStore, useAnnouncementVisible } from "../stores/announcement.store";

/**
 * The one dismissible strip above the topbar. It renders only for demo mode; the close button
 * hides it for 24h via localStorage, then it returns on its own.
 */
export const AnnouncementBar = () => {
	const visible = useAnnouncementVisible();
	const dismiss = useAnnouncementStore((state) => state.dismiss);

	if (!isDemoMode() || !visible) return null;

	return (
		<div
			role="status"
			className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-950 dark:text-amber-100"
		>
			<span className="flex-1">
				<strong className="font-semibold">Demo preview.</strong> Sample data only — nothing is
				read from or written to Solana.
			</span>
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				aria-label="Dismiss announcement for 24 hours"
				onClick={dismiss}
				className="shrink-0 text-inherit hover:bg-amber-500/15 hover:text-inherit"
			>
				<X className="size-3.5" />
			</Button>
		</div>
	);
};
