import { Button } from "@peridotvault/peridotbase-ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, RadioTower, BookOpen } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { DOCS_URL } from "@/shared/lib/site";

const TICKS = Array.from({ length: 12 }, (_, index) => index * 30);

const BLIPS = [
	{ left: "81%", top: "40%", delay: 1.2 },
	{ left: "61%", top: "69%", delay: 2.5 },
	{ left: "15%", top: "56%", delay: 4.33 },
];

export default function NotFound() {
	const reduceMotion = useReducedMotion();

	const container: Variants = {
		hidden: {},
		visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
	};

	const item: Variants = {
		hidden: { opacity: 0, y: reduceMotion ? 0 : 18 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
		},
	};

	return (
		<main className="min-h-dvh w-full bg-background px-4 py-16 text-foreground sm:px-6 sm:py-20 lg:px-8">
			<div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
				{/* Scope panel */}
				<motion.div
					initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
					className="relative order-2 flex flex-col overflow-hidden rounded-lg border border-border bg-card p-6 sm:p-8 lg:order-1 lg:p-10"
				>
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,var(--border)_1px,transparent_1px)] [background-size:22px_22px]"
					/>

					<div className="relative flex items-center justify-between font-mono text-xs text-muted-foreground">
						<span>Sweep 06.0s</span>
						<span>Sector NE-04</span>
					</div>

					<div className="relative mx-auto my-8 aspect-square w-full max-w-[300px] sm:my-10 sm:max-w-[380px] lg:max-w-[430px]">
						<div className="absolute inset-0 rounded-full border border-border" />
						<div className="absolute inset-[16%] rounded-full border border-border" />
						<div className="absolute inset-[32%] rounded-full border border-border" />
						<div className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-border/70" />
						<div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-border/70" />

						{TICKS.map((tick) => (
							<div
								key={tick}
								aria-hidden="true"
								className="absolute inset-0"
								style={{ transform: `rotate(${tick}deg)` }}
							>
								<span className="absolute top-0 left-1/2 h-2 w-px -translate-x-1/2 bg-border" />
							</div>
						))}

						<motion.div
							animate={reduceMotion ? undefined : { rotate: 360 }}
							transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
							className="absolute inset-0 overflow-hidden rounded-full"
						>
							<div className="absolute inset-0 [background:conic-gradient(from_0deg,transparent_0deg,transparent_282deg,color-mix(in_srgb,var(--ring)_45%,transparent)_360deg)]" />
							<div className="absolute top-0 left-1/2 h-1/2 w-px origin-bottom -translate-x-1/2 bg-ring/70" />
						</motion.div>

						{BLIPS.map((blip) => (
							<div
								key={`${blip.left}-${blip.top}`}
								aria-hidden="true"
								className="absolute -translate-x-1/2 -translate-y-1/2"
								style={{ left: blip.left, top: blip.top }}
							>
								<span className="block size-1.5 rounded-full bg-muted-foreground" />
								{!reduceMotion && (
									<>
										<motion.span
											animate={{ opacity: [0, 1, 0] }}
											transition={{
												duration: 1.6,
												delay: blip.delay,
												repeat: Infinity,
												repeatDelay: 4.4,
												ease: "easeOut",
											}}
											className="absolute inset-0 rounded-full bg-ring"
										/>
										<motion.span
											animate={{ opacity: [0.6, 0], scale: [0.5, 2.8] }}
											transition={{
												duration: 1.6,
												delay: blip.delay,
												repeat: Infinity,
												repeatDelay: 4.4,
												ease: "easeOut",
											}}
											className="absolute -inset-1.5 rounded-full border border-ring/50"
										/>
									</>
								)}
							</div>
						))}

						<span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
					</div>

					<div className="relative flex items-center justify-between font-mono text-xs text-muted-foreground">
						<span>Records: 00</span>
						<span>Signal: lost</span>
					</div>
				</motion.div>

				{/* Copy */}
				<motion.div
					variants={container}
					initial="hidden"
					animate="visible"
					className="order-1 max-w-xl lg:order-2"
				>
					<motion.h1 variants={item}>
						<span className="block select-none text-[5.5rem] leading-none font-black tracking-[-0.05em] sm:text-[7.5rem] lg:text-[9rem]">
							4
							<span className="text-transparent [-webkit-text-stroke:2.5px_var(--foreground)]">
								0
							</span>
							4
						</span>
						<span className="mt-5 block text-2xl font-medium tracking-tight text-balance sm:text-3xl md:text-4xl">
							Nothing on the scope.
						</span>
					</motion.h1>

					<motion.p
						variants={item}
						className="mt-4 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
					>
						We swept every route twice and this page isn&apos;t broadcasting anymore. Head back
						to base, or read the docs to find what you need.
					</motion.p>

					<motion.div
						variants={item}
						className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4"
					>
						<Button asChild size="xl">
							<Link to="/">
								<ArrowLeft />
								Back home
							</Link>
						</Button>
						<Button asChild variant="ghost" size="xl">
							<a href={DOCS_URL} target="_blank" rel="noreferrer">
								<BookOpen />
								Read the docs
							</a>
						</Button>
					</motion.div>

					<motion.div
						variants={item}
						className="mt-10 flex items-center gap-2 font-mono text-xs text-muted-foreground"
					>
						<RadioTower className="size-3.5" />
						peridotbase · route not found
					</motion.div>
				</motion.div>
			</div>
		</main>
	);
}
