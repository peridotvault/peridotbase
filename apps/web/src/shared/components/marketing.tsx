import type { ComponentType, ReactNode } from "react";

/** Subtle dotted grid background, masked to a soft ellipse. */
export function DotGrid({ className = "" }: { className?: string }) {
	return (
		<div
			aria-hidden="true"
			className={`dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] ${className}`}
		/>
	);
}

/** Supabase-style hero glow: dark canvas with a green radial lift at the bottom and
 *  a faint dotted grid. Decorative only. */
export function HeroGlow() {
	return (
		<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
			<div
				className="absolute inset-x-0 bottom-0 h-[40rem]"
				style={{
					background:
						"radial-gradient(60rem 30rem at 50% 100%, hsl(152 75% 60% / 0.18), transparent 70%)",
				}}
			/>
			<DotGrid className="opacity-60" />
		</div>
	);
}

type SectionProps = {
	children: ReactNode;
	className?: string;
};

/** Centered max-width container with Supabase vertical rhythm. */
export function Section({ children, className = "" }: SectionProps) {
	return (
		<section className={`py-16 sm:py-20 md:py-24 ${className}`}>
			<div className="section-container">{children}</div>
		</section>
	);
}

type SectionHeadingProps = {
	eyebrow?: string;
	title: string;
	description?: string;
	center?: boolean;
};

/** Supabase-style section heading: small mono eyebrow, big balanced title, muted lead. */
export function SectionHeading({
	eyebrow,
	title,
	description,
	center = true,
}: SectionHeadingProps) {
	return (
		<div className={`flex flex-col gap-3 ${center ? "items-center text-center" : ""}`}>
			{eyebrow ? (
				<p className="font-mono text-xs uppercase tracking-widest text-foreground-lighter">
					{eyebrow}
				</p>
			) : null}
			<h2 className="max-w-2xl text-3xl font-medium tracking-tight text-balance text-foreground sm:text-4xl md:text-5xl">
				{title}
			</h2>
			{description ? (
				<p className="max-w-xl text-balance text-foreground-light">{description}</p>
			) : null}
		</div>
	);
}

type ProductCardProps = {
	title: string;
	description: string;
	icon?: ComponentType<{ className?: string }>;
	media?: ReactNode;
	href?: string;
	external?: boolean;
	className?: string;
};

/** Rounded, bordered card with a media slot above the body — Supabase product-card
 *  pattern. */
export function ProductCard({
	title,
	description,
	icon: Icon,
	media,
	href,
	external = false,
	className = "",
}: ProductCardProps) {
	const body = (
		<div className="flex flex-col gap-3 p-6">
			{Icon ? (
				<span className="flex size-10 items-center justify-center rounded-lg border border-border-default bg-surface-100 text-primary">
					<Icon className="size-5" aria-hidden />
				</span>
			) : null}
			<h3 className="text-lg font-medium tracking-tight text-foreground">{title}</h3>
			<p className="text-sm text-foreground-light">{description}</p>
		</div>
	);

	const inner = (
		<>
			{media ? (
				<div aria-hidden="true" className="overflow-hidden border-b border-border-default">
					{media}
				</div>
			) : null}
			{body}
		</>
	);

	const base = `group flex h-full flex-col rounded-lg border border-border-default bg-surface-75 transition-colors hover:border-border-strong hover:bg-surface-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`;

	if (href === undefined) return <div className={base}>{inner}</div>;
	if (external)
		return (
			<a href={href} target="_blank" rel="noopener noreferrer" className={base}>
				{inner}
			</a>
		);
	return <a href={href} className={base}>{inner}</a>;
}
