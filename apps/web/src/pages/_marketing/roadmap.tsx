import { createFileRoute } from "@tanstack/react-router";
import { Check, CircleDashed, LoaderCircle } from "lucide-react";
import { roadmapItems } from "@/shared/content/roadmap";
import { ROADMAP_STATUS } from "@/shared/content/roadmap-helpers";

export const Route = createFileRoute("/_marketing/roadmap")({
	head: () => ({
		meta: [
			{ title: "Roadmap — Peridotbase" },
			{
				name: "description",
				content: "What is done, what is in progress, and what comes next for Peridotbase.",
			},
			{ property: "og:title", content: "Roadmap — Peridotbase" },
			{
				property: "og:description",
				content: "What is done, what is in progress, and what comes next for Peridotbase.",
			},
		],
	}),
	component: RoadmapPage,
});

const toneStyles = {
	done: "text-primary",
	active: "text-primary",
	next: "text-foreground-lighter",
} as const;

const badgeStyles = {
	done: "border-primary/30 bg-primary/10 text-primary",
	active: "border-border-default bg-surface-100 text-primary",
	next: "border-border-default bg-surface-100 text-foreground-light",
} as const;

const toneIcons = {
	done: Check,
	active: LoaderCircle,
	next: CircleDashed,
} as const;

function RoadmapPage() {
	return (
		<main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-16 sm:pt-24">
			<h1 className="text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
				Roadmap
			</h1>
			<p className="mt-2 text-lg text-foreground-light">
				Peridotbase ships in the open. A capability turns on for users only when the program
				and the Studio both implement it.
			</p>
			{roadmapItems.map((group) => {
				const status = ROADMAP_STATUS[group.status];
				const ToneIcon = toneIcons[status.tone];
				return (
					<section
						key={group.title}
						className="mt-8 rounded-lg border border-border-default bg-surface-75 p-6 sm:p-8"
					>
						<header className="flex flex-wrap items-center gap-3">
							<h2 className="text-2xl font-medium tracking-tight text-foreground">
								{group.title}
							</h2>
							<span
								className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${badgeStyles[status.tone]}`}
							>
								<ToneIcon
									className={`size-3 ${status.tone === "active" ? "animate-spin motion-reduce:animate-none" : ""}`}
									aria-hidden
								/>
								{status.label}
							</span>
						</header>
						<ul className="mt-4 space-y-2">
							{group.items.map((item) => {
								const itemStatus = ROADMAP_STATUS[item.status];
								const ItemIcon = toneIcons[itemStatus.tone];
								return (
									<li key={item.title} className="flex items-start gap-2.5">
										<ItemIcon
											className={`mt-0.5 size-4 flex-none ${toneStyles[itemStatus.tone]}`}
											aria-hidden
										/>
										<span className="text-foreground">{item.title}</span>
									</li>
								);
							})}
						</ul>
					</section>
				);
			})}
		</main>
	);
}
