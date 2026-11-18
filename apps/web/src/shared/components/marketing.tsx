import type { ComponentType, ReactNode } from "react";
import Grainient from "./blocks/grainient";

/** Subtle dotted grid background, masked to a soft ellipse. */
export function DotGrid({ className = "" }: { className?: string }) {
	return (
		<div
			aria-hidden="true"
			className={`dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] ${className}`}
		/>
	);
}

/** Hero backdrop: the Peridot brand grainient, softened behind a light veil so the ink
 *  hero copy stays readable. Decorative. */
export function HeroGlow() {
	return (
		<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
			<Grainient
				colors={["#0d0f0e", "#123324", "#349b65", "#87ee83"]}
				angle={180}
				grainAmount={0.2}
				dpr={1}
				interactive
				clickSwirl
				className="absolute inset-0 opacity-30"
			/>
			<div className="absolute inset-0 bg-linear-to-b from-background/85 via-background/55 to-background/20" />
			<DotGrid className="opacity-60" />
		</div>
	);
}

type SectionProps = {
	children: ReactNode;
	className?: string;
};

/** Full-bleed section band. Backgrounds and rails span the viewport; every gutter lives inside
 *  the section itself, so the content never sits against the rail. The page-level rail overlay
 *  (marketing route) paints above the band. */
export function Section({ children, className = "" }: SectionProps) {
	return (
		<section className={`section-rail ${className}`}>
			<div className={`section-container py-16 sm:py-20 md:py-24 ${className}`}>
				{children}
			</div>
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
	// Copy on top, visual underneath: one reading order, one place that looks like UI.
	const inner = (
		<>
			<div className="flex flex-col gap-2 p-6">
				<div className="flex items-center gap-2.5">
					{Icon ? <Icon className="size-5 flex-none text-primary" aria-hidden /> : null}
					<h3 className="text-xl font-medium tracking-tight text-foreground">{title}</h3>
				</div>
				<p className="text-sm text-foreground-light">{description}</p>
			</div>
			{media ? (
				<div aria-hidden="true" className="flex flex-1 items-center p-3 sm:p-4">
					<div className="w-full overflow-hidden rounded-lg border border-border-default bg-background-alternative shadow-sm">
						{media}
					</div>
				</div>
			) : null}
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
	return (
		<a href={href} className={base}>
			{inner}
		</a>
	);
}
