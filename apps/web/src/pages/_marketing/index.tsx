import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	ArrowUpRight,
	Database,
	Download,
	KeyRound,
	Scale,
	Server,
	Table2,
	Wallet,
} from "lucide-react";
import { DOCS_URL, GITHUB_URL } from "@/shared/lib/site";
import {
	DotGrid,
	HeroGlow,
	ProductCard,
	Section,
	SectionHeading,
} from "@/shared/components/marketing";
import {
	ExportPreview,
	IndexPreview,
	QueryPreview,
	TablePreview,
} from "@/shared/components/marketing-visuals";

/** The marketing landing: static, prerendered, crawler-readable. Section order
 *  mirrors supabase.com. */
export const Route = createFileRoute("/_marketing/")({
	head: () => ({
		meta: [
			{ title: "Peridotbase — your database, on-chain" },
			{
				name: "description",
				content:
					"A Solana-native, fully on-chain relational database. Browse tables, edit records, and run queries straight from your wallet.",
			},
			{ property: "og:title", content: "Peridotbase — your database, on-chain" },
			{
				property: "og:description",
				content:
					"A Solana-native, fully on-chain relational database. Browse tables, edit records, and run queries straight from your wallet.",
			},
		],
	}),
	component: LandingPage,
});

const SNIPPET = `import {
  createPeridotbaseClient,
  createRpcPort,
  createWalletStandardPort,
} from "@peridotvault/peridotbase-sdk";

const client = createPeridotbaseClient({
  rpc: createRpcPort({ url: "https://api.devnet.solana.com", cluster: "devnet" }),
  wallet: createWalletStandardPort(),
  programId: null, // published by peridotbase-core
});

const tables = await client.listTables(database);`;

const WALLETS = ["Phantom", "Solflare", "Backpack", "Ledger"] as const;

const PRODUCTS = [
	{
		title: "Tables",
		description:
			"Rows and schema are Solana program accounts. Browse them like a spreadsheet; what you see is what the chain holds.",
		icon: Table2,
		media: <TablePreview />,
		span: "md:col-span-7",
	},
	{
		title: "Queries",
		description:
			"SQL-shaped reads that scan program state and filter in the browser — no middle layer to trust.",
		icon: Database,
		media: <QueryPreview />,
		span: "md:col-span-5",
	},
	{
		title: "Indexes",
		description: "Declare secondary indexes per table. The program enforces them on write.",
		icon: KeyRound,
		media: <IndexPreview />,
		span: "md:col-span-5",
	},
	{
		title: "Exports",
		description: "CSV and JSON generated from SDK reads. Nothing leaves your machine.",
		icon: Download,
		media: <ExportPreview />,
		span: "md:col-span-7",
	},
] as const;

const ACCESS_POINTS = [
	{
		title: "Typed SDK client",
		body: "One client for tables, schema, queries, and indexes — wired straight to the program.",
		icon: Database,
	},
	{
		title: "SQL-shaped reads",
		body: "PostgreSQL-style types and familiar query shapes. No proprietary API to learn.",
		icon: Table2,
	},
	{
		title: "Wallet-signed writes",
		body: "Every mutation is an instruction your wallet signs. Keys never leave the extension.",
		icon: Wallet,
	},
] as const;

const STEPS = [
	{
		title: "Connect",
		body: "Pick an installed wallet. Peridotbase receives a public address and nothing else.",
		icon: Wallet,
	},
	{
		title: "Point at an RPC",
		body: "Choose a cluster or paste a custom endpoint. The Studio checks it with a slot and version call.",
		icon: Server,
	},
	{
		title: "Browse",
		body: "Open a database, then move between tables, schema, queries, and indexes.",
		icon: Table2,
	},
] as const;

const STATS = [
	{ value: "0", label: "servers in the middle", icon: Server },
	{ value: "100%", label: "of state on Solana", icon: Database },
	{ value: "0", label: "keys we ever hold", icon: KeyRound },
	{ value: "1", label: "relational model", icon: Table2 },
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
			{/* Hero — centered headline + 2 CTAs, glow + product mock below */}
			<section className="relative flex flex-col items-center overflow-hidden pt-24 pb-16 text-center sm:pt-32 md:pt-40">
				<HeroGlow />
				<div className="relative section-container flex flex-col items-center">
					<span className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-100 px-3 py-1 text-xs text-foreground-light">
						<Database className="size-3.5 text-primary" aria-hidden />
						Solana-native relational database
					</span>
					<h1 className="mt-6 max-w-4xl text-4xl font-medium tracking-tight text-balance text-foreground sm:text-5xl md:text-6xl">
						Your database lives <em className="not-italic text-primary">on-chain</em>.
					</h1>
					<p className="mt-5 max-w-xl text-balance text-lg text-foreground-light">
						Peridotbase stores tables, rows, and indexes as Solana program accounts. The Studio
						browses them through your wallet — no server, no custody, no off-chain copy.
					</p>
					<div className="mt-8 flex flex-wrap justify-center gap-3">
						<a
							className="flex items-center gap-2 rounded-md bg-primary-solid px-5 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary-solid-hover"
							href="/studio/"
						>
							Open the Studio
							<ArrowRight className="size-4" aria-hidden />
						</a>
						<a
							className="flex items-center gap-2 rounded-md border border-border-default px-5 py-2.5 font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-surface-100"
							href={DOCS_URL}
						>
							Read the docs
							<ArrowUpRight className="size-4" aria-hidden />
						</a>
					</div>
				</div>
				{/* Product mock below hero */}
				<div className="relative section-container mt-16 w-full">
					<div className="overflow-hidden rounded-xl border border-border-default bg-surface-100 shadow-2xl">
						<TablePreview />
					</div>
				</div>
			</section>

			{/* Trust strip — "Works with any Wallet Standard wallet" */}
			<Section className="!pt-0 !pb-8">
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
					title="Everything a table needs, on-chain"
					description="Four surfaces that mirror a real database tool — every value is program state."
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

			{/* Query it your way — code side-by-side */}
			<Section className="bg-surface-100">
				<SectionHeading
					eyebrow="Access"
					title="Query it your way"
					description="Three ways in, one program underneath."
				/>
				<div className="mt-12 grid gap-4 md:grid-cols-2">
					<ul className="space-y-4">
						{ACCESS_POINTS.map((point) => (
							<li
								key={point.title}
								className="flex items-start gap-4 rounded-lg border border-border-default bg-surface-75 p-6"
							>
								<span className="flex size-10 flex-none items-center justify-center rounded-lg border border-border-default bg-surface-200 text-primary">
									<point.icon className="size-5" aria-hidden />
								</span>
								<div>
									<h3 className="font-medium text-foreground">{point.title}</h3>
									<p className="mt-1 text-sm text-foreground-light">{point.body}</p>
								</div>
							</li>
						))}
					</ul>
					<pre className="overflow-x-auto rounded-lg border border-border-default bg-surface-75 p-6 font-mono text-sm leading-relaxed text-foreground">
						<code>{SNIPPET}</code>
					</pre>
				</div>
			</Section>

			{/* Steps */}
			<Section>
				<SectionHeading eyebrow="Get started" title="From wallet to table in three steps" />
				<div className="mt-12 grid gap-4 md:grid-cols-3">
					{STEPS.map((step, index) => (
						<div
							key={step.title}
							className="flex flex-col gap-4 rounded-lg border border-border-default bg-surface-75 p-6"
						>
							<div className="flex items-center justify-between">
								<span className="flex size-10 items-center justify-center rounded-lg border border-border-default bg-surface-200 text-primary">
									<step.icon className="size-5" aria-hidden />
								</span>
								<p className="font-mono text-xs text-primary">0{index + 1}</p>
							</div>
							<div>
								<h3 className="text-xl font-medium tracking-tight text-foreground">
									{step.title}
								</h3>
								<p className="mt-1 text-sm text-foreground-light">{step.body}</p>
							</div>
						</div>
					))}
				</div>
			</Section>

			{/* Stats band */}
			<Section className="bg-surface-100">
				<div className="relative">
					<DotGrid />
					<div className="relative grid grid-cols-2 gap-4 md:grid-cols-4">
						{STATS.map((stat) => (
							<div
								key={stat.label}
								className="relative flex flex-col gap-3 rounded-lg border border-border-default bg-surface-75 p-6"
							>
								<span className="flex size-10 items-center justify-center rounded-lg border border-border-default bg-surface-200 text-primary">
									<stat.icon className="size-5" aria-hidden />
								</span>
								<p className="text-5xl font-medium tracking-tight text-foreground tabular-nums">
									{stat.value}
								</p>
								<p className="text-sm text-foreground-light">{stat.label}</p>
							</div>
						))}
					</div>
				</div>
			</Section>

			{/* Open source CTA */}
			<Section>
				<div className="grid gap-4 md:grid-cols-2">
					<div className="rounded-xl border border-border-default bg-surface-75 p-8 md:p-12">
						<h2 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
							Open source from day one
						</h2>
						<p className="mt-3 max-w-xl text-foreground-light">
							The Studio, SDK, and configuration are Apache-2.0, with fork attribution
							preserved. The program publishes each instruction to{" "}
							<code className="font-mono text-primary">peridotbase-core</code> — no Studio
							rewrite required.
						</p>
						<div className="mt-6 flex flex-wrap gap-3">
							<a
								className="flex items-center gap-2 rounded-md border border-border-default px-5 py-2.5 font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-surface-100"
								href={GITHUB_URL}
							>
								<GithubIcon />
								Star on GitHub
							</a>
							<a
								className="flex items-center gap-2 rounded-md border border-border-default px-5 py-2.5 font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-surface-100"
								href="/roadmap/"
							>
								See the roadmap
								<ArrowRight className="size-4" aria-hidden />
							</a>
						</div>
					</div>
					<div className="relative flex flex-col items-start justify-center overflow-hidden rounded-xl border border-border-default bg-surface-100 p-8 md:p-12">
						<DotGrid />
						<p className="relative flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-foreground-lighter">
							<Scale className="size-4 text-primary" aria-hidden />
							Apache-2.0
						</p>
						<p className="relative mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
							Start your project on devnet today.
						</p>
						<a
							className="relative mt-6 flex items-center gap-2 rounded-md bg-primary-solid px-5 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary-solid-hover"
							href="/studio/"
						>
							Open the Studio
							<ArrowRight className="size-4" aria-hidden />
						</a>
					</div>
				</div>
			</Section>
		</>
	);
}
