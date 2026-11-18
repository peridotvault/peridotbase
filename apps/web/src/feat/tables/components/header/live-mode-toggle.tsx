import { Button } from "@peridotvault/peridotbase-ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@peridotvault/peridotbase-ui/tooltip";
import { cn } from "@peridotvault/peridotbase-ui/utils";
import { useCallback } from "react";
import { useLiveModeStore } from "../../stores/live-mode.store";

export const LiveModeToggle = () => {
	const { isLive, status, isPulsing, setLive } = useLiveModeStore();

	const handleToggle = useCallback(() => {
		setLive(!isLive);
	}, [isLive, setLive]);

	let tooltipText = "Live mode: Automatic updates (Off)";

	if (status === "paused") {
		tooltipText = "Live mode paused while editing. Click to resume.";
	} else if (isLive && status === "healthy") {
		tooltipText = "Live mode: Active";
	} else if (isLive && status === "disconnected") {
		tooltipText = "Live mode: Disconnected. Attempting to reconnect...";
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="lg"
					onClick={handleToggle}
					aria-label="Toggle Live mode"
					aria-pressed={isLive}
					data-active={isLive}
					className={cn(
						"border-l-0 border-y-0 border-r border-border rounded-none gap-1.5 flex items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
						isLive && "text-foreground",
					)}
				>
					<span className="relative flex size-2 items-center justify-center">
						{isLive && status === "healthy" && isPulsing && (
							<span
								data-testid="live-pulse-indicator"
								className="absolute inline-flex size-3.5 rounded-full bg-success opacity-75 animate-ping"
							/>
						)}
						<span
							data-testid="live-status-dot"
							className={cn("relative inline-flex size-2 rounded-full transition-colors", {
								"bg-success": isLive && status === "healthy",
								"bg-warning": isLive && status === "disconnected",
								"bg-warning/70": !isLive && status === "paused",
								"bg-muted-foreground/40": !isLive && status !== "paused",
							})}
						/>
					</span>
					<span>Live</span>
					{status === "paused" && (
						<span className="text-[10px] text-warning font-normal">(Paused)</span>
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{tooltipText}</TooltipContent>
		</Tooltip>
	);
};
