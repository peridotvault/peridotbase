import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import {
	ArrowRight,
	ArrowUpRight,
	Database,
	Download,
	Fingerprint,
	KeyRound,
	Scale,
	ShieldCheck,
	Table2,
	Wallet,
} from "lucide-react";
import {
	DOCS_URL,
	GITHUB_URL,
	LOGO_URL,
	SITE_DESCRIPTION,
	SITE_NAME,
	SITE_URL,
} from "@/shared/lib/site";
import { seoHead } from "@/shared/lib/seo";
import { buttonVariants } from "@peridotvault/peridotbase-ui/button";
import {
	DotGrid,
	HeroGlow,
	ProductCard,
	Section,
	SectionHeading,
} from "@/shared/components/marketing";
import {
	AuthPreview,
	ExportPreview,
	ImmutablePreview,
	IndexPreview,
	QueryPreview,
	TablePreview,
} from "@/shared/components/marketing-visuals";
import { DashboardMockup } from "@/shared/components/blocks/dashboard-mockup";
import { FrameworkTabs } from "@/shared/components/blocks/framework-tabs";
import { HowItWorks } from "@/shared/components/blocks/how-it-works";

/** three.js is heavy and decorative, so it loads after hydration. */
const GlassCoins = lazy(() =>
	import("@/shared/components/blocks/glass-coins").then((module) => ({
		default: module.GlassCoins,
	})),
);

/** The marketing landing: static, prerendered, crawler-readable. Section order
 *  mirrors supabase.com. */
export const Route = createFileRoute("/_marketing/")({
	head: () =>
		seoHead({
			title: "Your database, on-chain",
			description:
				"Peridotbase is a Solana-native, fully on-chain relational database. Create tables, indexes and records from your wallet, browse them in a familiar grid, and run SQL-style queries — no server, no API keys, no database cluster to operate.",
			path: "/",
			jsonLd: [
				{
					"@type": "Organization",
					name: SITE_NAME,
					url: SITE_URL,
					logo: LOGO_URL,
					sameAs: [GITHUB_URL, DOCS_URL],
				},
				{
					"@type": "WebSite",
					name: SITE_NAME,
					url: SITE_URL,
					description: SITE_DESCRIPTION,
				},
				{
					"@type": "SoftwareApplication",
					name: SITE_NAME,
					url: SITE_URL,
					applicationCategory: "DeveloperApplication",
					operatingSystem: "Web",
					description: SITE_DESCRIPTION,
					isAccessibleForFree: true,
					license: "https://www.apache.org/licenses/LICENSE-2.0",
					offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
					sameAs: [GITHUB_URL, DOCS_URL],
				},
			],
		}),
	component: LandingPage,
});

const WALLETS = ["Phantom", "Solflare", "Backpack", "Ledger"] as const;

const PRODUCTS = [
	{
		title: "Postgres experience",
		description:
			"Tables, columns, types and indexes behave the way they do in Postgres — except every row is owned by a Solana program.",
		icon: Table2,
		media: <TablePreview />,
		span: "md:col-span-6 lg:col-span-5",
	},
	{
		title: "SQL-style reads",
		description:
			"Write the query you already know. The SDK scans program state and filters in the browser, with no middle layer to trust.",
		icon: Database,
		media: <QueryPreview />,
		span: "md:col-span-6 lg:col-span-4",
	},
	{
		title: "Immutable by default",
		description:
			"Every insert, update and index change is a signed transaction with a slot and signature you can point at forever.",
		icon: ShieldCheck,
		media: <ImmutablePreview />,
		span: "md:col-span-6 lg:col-span-3",
	},
	{
		title: "Portable exports",
		description:
			"CSV and JSON generated from SDK reads in your browser. Your data leaves only when you ask it to.",
		icon: Download,
		media: <ExportPreview />,
		span: "md:col-span-6 lg:col-span-3",
	},
	{
		title: "Declared indexes",
		description:
			"Declare secondary indexes per table and the program enforces them on write, so lookups stay cheap as rows grow.",
		icon: KeyRound,
		media: <IndexPreview />,
		span: "md:col-span-6 lg:col-span-4",
	},
	{
		title: "Wallet sign-in",
		description:
			"No passwords, API keys or session servers — connect a wallet and sign the write.",
		icon: Fingerprint,
		media: <AuthPreview />,
		span: "md:col-span-6 lg:col-span-5",
	},
] as const;

function GithubIcon() {
	return (
		<svg viewBox="0 0 17 16" fill="currentColor" className="size-4" aria-hidden>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M8.5 0C3.806 0 0 3.806 0 8.5c0 3.757 2.436 6.943 5.818 8.07.425.079.581-.184.581-.409l-.011-1.443c-2.374.516-2.876-1.145-2.876-1.145-.388-.987-.948-1.25-.948-1.25-.775-.53.059-.519.059-.519.857.06 1.308.88 1.308.88.761 1.304 1.997.928 2.483.71.078-.552.298-.928.542-1.141-1.895-.216-3.886-.948-3.886-4.218 0-.931.333-1.693.879-2.29-.088-.216-.381-1.083.084-2.257 0 0 .718-.23 2.35.877a8.16 8.16 0 0 1 2.143-.289c.727.003 1.459.098 2.143.289 1.632-1.107 2.349-.877 2.349-.877.466 1.174.173 2.041.085 2.257.546.597.879 1.359.879 2.29 0 3.279-1.996 4-3.899 4.211.307.264.58.785.58 1.582l-.011 2.343c0 .227.156.492.586.409A8.503 8.503 0 0 0 17 8.5C17 3.806 13.194 0 8.5 0Z"
			/>
		</svg>
	);
}

function LandingPage() {
	return (
		<>
			{/* Hero — one-line headline + CTAs, the Studio window running off the fold */}
			<section className="relative flex h-[calc(100svh-4rem)] max-h-[880px] min-h-[600px] flex-col items-center overflow-hidden border-b border-border-default pt-24 pb-0 text-center sm:pt-32 md:pt-36">
				<HeroGlow />
				<div className="relative section-container flex flex-col items-center">
					<h1 className="max-w-4xl text-4xl font-medium tracking-tight text-balance text-foreground sm:text-5xl md:text-6xl">
						Your database lives <em className="not-italic text-primary">on-chain</em>.
					</h1>
					<div className="mt-8 flex flex-wrap justify-center gap-3">
						<a className={buttonVariants({ size: "xl" })} href="/studio/">
							Open the Studio
							<ArrowRight className="size-4" aria-hidden />
						</a>
						<a className={buttonVariants({ variant: "outline", size: "xl" })} href={DOCS_URL}>
							Read the docs
							<ArrowUpRight className="size-4" aria-hidden />
						</a>
					</div>
				</div>
				{/* Product mock: flush with the hero floor, so the window is cut by the fold */}
				<div className="relative mt-14 min-h-0 w-full flex-1 overflow-hidden sm:mt-16">
					<div className="section-container h-full">
						<DashboardMockup className="h-full rounded-b-none border-b-0" />
					</div>
				</div>
			</section>

			{/* Trust strip — "Works with any Wallet Standard wallet" */}
			<Section className="!pt-8 !pb-8">
				<p className="text-center font-mono text-xs uppercase tracking-widest text-foreground-lighter">
					Works with any Wallet Standard wallet
				</p>
				<div className="mt-6 flex flex-wrap items-center justify-center gap-8 md:gap-16">
					{WALLETS.map((wallet) => (
						<span
							key={wallet}
							className="flex items-center gap-2 font-mono text-sm text-foreground-light"
						>
							<Wallet className="size-4 text-primary" aria-hidden />
							{wallet}
						</span>
					))}
				</div>
			</Section>

			{/* Product bento */}
			<Section>
				<SectionHeading
					eyebrow="Product"
					title="A real database, on-chain"
					description="The parts you expect from Postgres — tables, queries, auth, audit — with a Solana program as the only backend."
				/>
				<div className="mt-12 grid gap-4 md:grid-cols-12">
					{PRODUCTS.map((product) => (
						<ProductCard
							key={product.title}
							title={product.title}
							description={product.description}
							icon={product.icon}
							media={product.media}
							className={product.span}
						/>
					))}
				</div>
			</Section>

			{/* Access — framework switcher: heading left, morphing code right */}
			<Section className="bg-background-alternative">
				<FrameworkTabs />
			</Section>

			{/* How it works — one tab per flow, no side rails so the graph breathes */}
			<Section rails={false}>
				<HowItWorks />
			</Section>

			{/* Open source + start CTA */}
			<Section className="bg-background-alternative">
				<div className="grid gap-4 lg:grid-cols-5">
					<div className="relative flex flex-col overflow-hidden rounded-xl border border-border-default bg-surface-75 p-8 md:p-12 lg:col-span-3">
						<DotGrid />
						<p className="relative flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-foreground-lighter">
							<Scale className="size-4 text-primary" aria-hidden />
							Open source
						</p>
						<h2 className="relative mt-4 max-w-lg text-3xl font-medium tracking-tight text-balance text-foreground sm:text-4xl">
							The Studio and SDK are Apache-2.0.
						</h2>
						<div className="relative mt-auto flex flex-wrap gap-3 pt-8">
							<a
								className={buttonVariants({ variant: "outline", size: "xl" })}
								href={GITHUB_URL}
							>
								<GithubIcon />
								Star on GitHub
							</a>
							<a
								className={buttonVariants({ variant: "outline", size: "xl" })}
								href={DOCS_URL}
							>
								Read the docs
								<ArrowUpRight className="size-4" aria-hidden />
							</a>
						</div>
					</div>
					<div className="relative overflow-hidden rounded-xl border border-border-default bg-surface-100 lg:col-span-2">
						<Suspense fallback={<div className="min-h-[320px]" />}>
							<GlassCoins
								pattern="ring"
								colors={["#87e08b", "#589770"]}
								backgroundColor="#252525"
								className="min-h-[320px]"
							/>
						</Suspense>
					</div>
				</div>
			</Section>
		</>
	);
}
