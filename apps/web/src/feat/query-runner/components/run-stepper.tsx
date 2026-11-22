import { Spinner } from "@peridotvault/peridotbase-ui/spinner";
import { cn } from "@peridotvault/peridotbase-ui/utils";
import { Check, X } from "lucide-react";

export type RunStep = {
	index: number;
	label: string;
	status: "active" | "done" | "failed";
};

/**
 * Progress for a multi-statement run. A script that lands ten statements used to sit behind a
 * blank spinner; every finished step now replaces it with the statement that ran and the ones
 * still queued behind it.
 */
export const RunStepper = ({ steps, total }: { steps: RunStep[]; total: number }) => {
	const slots = Math.max(total, steps.length);
	const done = steps.filter((step) => step.status === "done").length;
	const current = Math.min(done + 1, slots);

	return (
		<div className="mx-auto flex h-full w-full max-w-xl flex-col justify-center gap-4 p-6">
			<div className="space-y-1">
				<p className="text-sm font-medium">
					Running {slots > 0 ? `${current} of ${slots}` : "query"}
				</p>
				<p className="text-xs text-muted-foreground">
					Each step is sent in one wallet approval and waits for confirmation before the next.
				</p>
			</div>
			<ol aria-live="polite" className="space-y-0">
				{Array.from({ length: slots }, (_, index) => {
					const step = steps.find((entry) => entry.index === index);
					const status = step?.status ?? "pending";
					const label = step?.label ?? "Waiting for the previous step";

					return (
						<li key={index} className="relative flex gap-3 pb-4 last:pb-0">
							{index < slots - 1 && (
								<span
									aria-hidden
									className="absolute left-3 top-6 z-0 h-[calc(100%-1rem)] w-px bg-border"
								/>
							)}
							<span
								className={cn(
									"relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
									status === "done" && "border-primary bg-primary text-primary-foreground",
									status === "active" && "border-primary bg-background text-primary",
									status === "failed" &&
										"border-destructive bg-destructive/10 text-destructive",
									status === "pending" && "border-border bg-background text-muted-foreground",
								)}
							>
								{status === "done" ? (
									<Check className="size-3.5" />
								) : status === "failed" ? (
									<X className="size-3.5" />
								) : status === "active" ? (
									<Spinner size="size-3" color="bg-primary" />
								) : (
									index + 1
								)}
							</span>
							<span
								className={cn(
									"pt-0.5 text-sm",
									status === "pending" && "text-muted-foreground",
									status === "failed" && "text-destructive",
								)}
							>
								{label}
							</span>
						</li>
					);
				})}
			</ol>
		</div>
	);
};
