import { cn } from "@peridotvault/peridotbase-ui/utils";
import type { ReactNode } from "react";

/**
 * Page boilerplate for the Studio. Every screen uses this instead of re-declaring widths,
 * paddings and radii, so the same element always looks the same.
 *
 * The contract:
 * - page: centred column, 4px rhythm (`space-y-6`), 24px gutters
 * - header: eyebrow, title (`text-2xl`), description; actions align to the title
 * - panel: `rounded-lg` border, header row, padded body, clipped children
 * - controls: the ui primitives' `rounded-sm` scale; never hand-rolled heights
 * - type: `text-2xl` title, `text-sm` body, `text-xs` meta
 */

export const PageShell = ({
	children,
	className,
	width = "default",
}: {
	children: ReactNode;
	className?: string;
	width?: "default" | "narrow";
}) => (
	<main className={cn("flex-1 overflow-y-auto", className)}>
		<div
			className={cn(
				"mx-auto w-full space-y-6 px-6 py-10",
				width === "narrow" ? "max-w-3xl" : "max-w-4xl",
			)}
		>
			{children}
		</div>
	</main>
);

export const PageHeader = ({
	eyebrow,
	title,
	description,
	actions,
}: {
	eyebrow?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
}) => (
	<header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
		<div className="min-w-0 space-y-1">
			{eyebrow ? <p className="truncate text-xs text-muted-foreground">{eyebrow}</p> : null}
			<h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
			{description ? (
				<p className="max-w-prose text-sm text-pretty text-muted-foreground">{description}</p>
			) : null}
		</div>
		{actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
	</header>
);

export const Panel = ({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) => (
	<section className={cn("overflow-hidden rounded-lg border border-border", className)}>
		{children}
	</section>
);

export const PanelHeader = ({
	title,
	description,
	actions,
}: {
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
}) => (
	<div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
		<div className="min-w-0">
			<h2 className="truncate text-sm font-medium">{title}</h2>
			{description ? (
				<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
			) : null}
		</div>
		{actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
	</div>
);

export const PanelBody = ({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) => <div className={cn("px-5 py-4", className)}>{children}</div>;

export const PanelList = ({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) => <ul className={cn("divide-y divide-border text-sm", className)}>{children}</ul>;

/** One row of a `PanelList`: same gutters as `PanelBody`, aligned label and value. */
export const PanelRow = ({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) => (
	<li className={cn("flex items-center justify-between gap-4 px-5 py-3", className)}>
		{children}
	</li>
);
