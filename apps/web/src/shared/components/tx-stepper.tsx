import { Spinner } from "@peridotvault/peridotbase-ui/spinner";
import { cn } from "@peridotvault/peridotbase-ui/utils";
import { Check, X } from "lucide-react";
import { useTxProgressStore } from "@/shared/stores/tx-progress.store";

/**
 * One row per wallet approval. A destructive action like deleting a database signs a freeze, one
 * batch per table and a finish; without this the user only saw three unexplained prompts.
 */
export const TxStepper = ({ className }: { className?: string }) => {
	const status = useTxProgressStore((state) => state.status);
	const title = useTxProgressStore((state) => state.title);
	const steps = useTxProgressStore((state) => state.steps);
	const error = useTxProgressStore((state) => state.error);

	const done = steps.filter((step) => step.status === "done").length;

	return (
		<div className={cn("flex w-[22rem] flex-col gap-3 rounded-lg bg-popover p-4", className)}>
			<div className="space-y-1">
				<p className="text-sm font-medium">
					{status === "failed" ? `${title} failed` : title}
				</p>
				<p className="text-xs text-muted-foreground">
					{status === "failed"
						? error
						: status === "done"
							? `All ${steps.length} transaction${steps.length === 1 ? "" : "s"} confirmed on-chain.`
							: `Transaction ${Math.min(done + 1, steps.length)} of ${steps.length || "?"}: approve each one in your wallet.`}
				</p>
			</div>
			{steps.length > 0 && (
				<ol aria-live="polite" className="max-h-64 space-y-0 overflow-auto">
					{steps.map((step) => (
						<li
							key={`${step.index}-${step.label}`}
							className="relative flex gap-3 pb-3 last:pb-0"
						>
							{step.index < steps.length - 1 && (
								<span
									aria-hidden
									className="absolute left-3 top-6 z-0 h-[calc(100%-1rem)] w-px bg-border"
								/>
							)}
							<span
								className={cn(
									"relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
									step.status === "done" &&
										"border-primary bg-primary text-primary-foreground",
									step.status === "active" && "border-primary bg-background text-primary",
									step.status === "failed" &&
										"border-destructive bg-destructive/10 text-destructive",
								)}
							>
								{step.status === "done" ? (
									<Check className="size-3.5" />
								) : step.status === "failed" ? (
									<X className="size-3.5" />
								) : (
									<Spinner size="size-3" color="bg-primary" />
								)}
							</span>
							<span
								className={cn(
									"pt-0.5 text-sm",
									step.status === "active" && "text-foreground",
									step.status === "failed" && "text-destructive",
								)}
							>
								{step.label}
							</span>
						</li>
					))}
				</ol>
			)}
		</div>
	);
};
