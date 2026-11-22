import { Spinner } from "@peridotvault/peridotbase-ui/spinner";
import { cn } from "@peridotvault/peridotbase-ui/utils";
import { Check, X } from "lucide-react";
import { useQueryRunStore } from "@/shared/stores/query-run.store";

/**
 * Progress for a multi-statement run, rendered inside a toast so it keeps reporting after the
 * runner screen is left. A script that lands ten statements used to sit behind a blank spinner;
 * every finished step now replaces it with the statement that ran and the ones still queued.
 */
export const RunStepper = ({ className }: { className?: string }) => {
	const status = useQueryRunStore((state) => state.status);
	const steps = useQueryRunStore((state) => state.steps);
	const total = useQueryRunStore((state) => state.total);
	const error = useQueryRunStore((state) => state.error);

	const slots = Math.max(total, steps.length);
	const done = steps.filter((step) => step.status === "done").length;
	const current = Math.min(done + 1, slots);

	const title =
		status === "failed"
			? "Query failed"
			: status === "done"
				? `Finished ${slots} step${slots === 1 ? "" : "s"}`
				: slots > 0
					? `Running ${current} of ${slots}`
					: "Running query";

	return (
		<div className={cn("flex w-[22rem] flex-col gap-3 rounded-lg bg-popover p-4", className)}>
			<div className="space-y-1">
				<p className="text-sm font-medium">{title}</p>
				<p className="text-xs text-muted-foreground">
					{status === "failed"
						? error
						: status === "done"
							? "All statements confirmed on-chain."
							: "Each step waits for confirmation before the next."}
				</p>
			</div>
			{slots > 0 && (
				<ol aria-live="polite" className="max-h-64 space-y-0 overflow-auto">
					{Array.from({ length: slots }, (_, index) => {
						const step = steps.find((entry) => entry.index === index);
						const stepStatus = step?.status ?? "pending";
						const label = step?.label ?? "Waiting for the previous step";

						return (
							<li key={index} className="relative flex gap-3 pb-3 last:pb-0">
								{index < slots - 1 && (
									<span
										aria-hidden
										className="absolute left-3 top-6 z-0 h-[calc(100%-1rem)] w-px bg-border"
									/>
								)}
								<span
									className={cn(
										"relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
										stepStatus === "done" &&
											"border-primary bg-primary text-primary-foreground",
										stepStatus === "active" && "border-primary bg-background text-primary",
										stepStatus === "failed" &&
											"border-destructive bg-destructive/10 text-destructive",
										stepStatus === "pending" &&
											"border-border bg-background text-muted-foreground",
									)}
								>
									{stepStatus === "done" ? (
										<Check className="size-3.5" />
									) : stepStatus === "failed" ? (
										<X className="size-3.5" />
									) : stepStatus === "active" ? (
										<Spinner size="size-3" color="bg-primary" />
									) : (
										index + 1
									)}
								</span>
								<span
									className={cn(
										"pt-0.5 text-sm",
										stepStatus === "pending" && "text-muted-foreground",
										stepStatus === "failed" && "text-destructive",
									)}
								>
									{label}
								</span>
							</li>
						);
					})}
				</ol>
			)}
		</div>
	);
};
