import { cn } from "@peridotbase/ui/utils";
import { FlaskConical } from "lucide-react";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";

/**
 * The one visible label every demo screen carries. It renders nothing in real mode, so the
 * banner cannot be mistaken for normal workspace chrome.
 */
export const DemoBanner = ({ className }: { className?: string }) => {
	if (!isDemoMode()) return null;

	return (
		<div
			role="status"
			className={cn(
				"flex shrink-0 items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-950 dark:text-amber-100",
				className,
			)}
		>
			<FlaskConical className="size-3.5 shrink-0" aria-hidden />
			<span>
				<strong className="font-semibold">Demo preview.</strong> Sample data only — nothing is
				read from or written to Solana.
			</span>
		</div>
	);
};
