import { Button } from "@peridotvault/peridotbase-ui/button";
import { cn } from "@peridotvault/peridotbase-ui/utils";
import type { ComponentProps, ReactNode } from "react";

/**
 * The app toolbar: one 32px row under the page title, 4px gutters, `rounded-sm` controls.
 *
 * Buttons sit side by side with a 4px gap instead of shared borders, so no item needs to
 * cancel a neighbour's radius and every target keeps the same hover state.
 */
export const Toolbar = ({
	children,
	actions,
	className,
}: {
	children: ReactNode;
	actions?: ReactNode;
	className?: string;
}) => (
	<header
		className={cn(
			"sticky top-0 z-10 flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-1 text-foreground",
			className,
		)}
	>
		<div className="flex min-w-0 items-center gap-1">{children}</div>
		{actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
	</header>
);

/** A labelled toolbar action; `variant` carries the emphasis. */
export const ToolbarButton = ({ className, ...props }: ComponentProps<typeof Button>) => (
	<Button variant="ghost" size="sm" className={className} {...props} />
);

/** An icon-only toolbar action, square so a row of them stays on one grid. */
export const ToolbarIconButton = ({ className, ...props }: ComponentProps<typeof Button>) => (
	<Button
		variant="ghost"
		size="icon-sm"
		className={cn("text-muted-foreground hover:text-foreground", className)}
		{...props}
	/>
);
