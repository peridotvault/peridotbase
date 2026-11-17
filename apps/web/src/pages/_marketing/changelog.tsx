import { createFileRoute } from "@tanstack/react-router";
import { Tag } from "lucide-react";
import { changelog } from "@/shared/content/changelog";

export const Route = createFileRoute("/_marketing/changelog")({
	head: () => ({
		meta: [
			{ title: "Changelog — Peridotbase" },
			{ name: "description", content: "What changed in each Peridotbase Studio release." },
			{ property: "og:title", content: "Changelog — Peridotbase" },
			{
				property: "og:description",
				content: "What changed in each Peridotbase Studio release.",
			},
		],
	}),
	component: ChangelogPage,
});

const eyebrow = "mb-1.5 text-xs uppercase tracking-widest text-foreground-lighter";

function ChangelogPage() {
	return (
		<main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-16 sm:pt-24">
			<h1 className="text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
				Changelog
			</h1>
			<p className="mt-2 text-lg text-foreground-light">
				What changed in each release of the Studio, written for the people who use it.
			</p>
			{changelog.map((entry) => (
				<article
					key={entry.version}
					className="mt-10 rounded-lg border border-border-default bg-surface-75 p-6 sm:p-8"
				>
					<header>
						<h2 className="text-2xl font-medium tracking-tight text-foreground">
							{entry.title}
						</h2>
						<p className="mt-1 flex items-center gap-3 text-sm text-foreground-light">
							<code className="flex items-center gap-1.5 font-mono text-primary">
								<Tag className="size-3.5" aria-hidden />v{entry.version}
							</code>
							<time dateTime={entry.date}>{entry.date}</time>
						</p>
					</header>
					<EntryGroup title="Features" items={entry.features} />
					<EntryGroup title="Improvements" items={entry.improvements} />
					<EntryGroup title="Fixes" items={entry.bugsFixed} />
				</article>
			))}
		</main>
	);
}

function EntryGroup({ title, items }: { title: string; items?: { text: string }[] }) {
	if (!items) return null;

	return (
		<section className="mt-4">
			<h3 className={eyebrow}>{title}</h3>
			<ul className="list-disc space-y-1 pl-5 text-foreground">
				{items.map((item) => (
					<li key={item.text}>{item.text}</li>
				))}
			</ul>
		</section>
	);
}
