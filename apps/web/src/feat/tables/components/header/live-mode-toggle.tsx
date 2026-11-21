import { Tooltip, TooltipContent, TooltipTrigger } from "@peridotvault/peridotbase-ui/tooltip";
import { cn } from "@peridotvault/peridotbase-ui/utils";
import { useCallback } from "react";
import { ToolbarButton } from "@/shared/components/toolbar";
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
				<ToolbarButton
					type="button"
					onClick={handleToggle}
					aria-label="Toggle Live mode"
					aria-pressed={isLive}
					data-active={isLive}
					className={cn("gap-1.5", isLive && "text-foreground")}
				>
					<span className="relative flex size-2 items-center justify-center">
						{isLive && status === "healthy" && isPulsing && (
							<span
								data-testid="live-pulse-indicator"
								className="absolute inline-flex size-3.5 animate-ping rounded-full bg-success opacity-75"
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
					{status === "paused" && <span className="font-normal text-warning">(Paused)</span>}
				</ToolbarButton>
			</TooltipTrigger>
			<TooltipContent side="bottom">{tooltipText}</TooltipContent>
		</Tooltip>
	);
};
