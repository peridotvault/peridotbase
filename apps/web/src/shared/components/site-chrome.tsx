import { ArrowUpRight } from "lucide-react";
import { DOCS_URL, GITHUB_URL } from "@/shared/lib/site";

const navLink = "text-sm text-foreground-light transition-colors hover:text-foreground";

/** Sticky Supabase-style navbar: translucent over the hero, border-b, rounded buttons. */
export function SiteHeader() {
	return (
		<header className="sticky top-0 z-40 border-b border-border-default bg-background/90 backdrop-blur-xs">
			<div className="section-container flex h-16 items-center justify-between gap-6">
				<a
					className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
					href="/"
				>
					<img className="size-6 rounded" src="/logo.svg" alt="" width={24} height={24} />
					Peridotbase
				</a>
				<nav className="flex items-center gap-6" aria-label="Primary">
					<a className={`hidden sm:inline ${navLink}`} href={DOCS_URL}>
						Docs
					</a>
					<a className={`hidden sm:inline ${navLink}`} href={`${DOCS_URL}/sdk/`}>
						SDK
					</a>
					<a className={`hidden sm:inline ${navLink}`} href="/roadmap/">
						Roadmap
					</a>
					<a className={`hidden sm:inline ${navLink}`} href="/changelog/">
						Changelog
					</a>
					<a
						className="hidden items-center gap-1.5 rounded-md border border-border-default px-2.5 py-1 text-xs text-foreground-light transition-colors hover:text-foreground sm:flex"
						href={GITHUB_URL}
					>
						GitHub
						<ArrowUpRight className="size-3" aria-hidden />
					</a>
					<a
						className="rounded-md bg-primary-solid px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-solid-hover"
						href="/studio/"
					>
						Open Studio
					</a>
				</nav>
			</div>
		</header>
	);
}

export function SiteFooter() {
	return (
		<footer className="border-t border-border-default">
			<div className="section-container grid gap-8 py-12 sm:py-16 md:grid-cols-4">
				<div>
					<div className="flex items-center gap-2 font-semibold text-foreground">
						<img className="size-5 rounded" src="/logo.svg" alt="" width={20} height={20} />
						Peridotbase
					</div>
					<p className="mt-3 max-w-xs text-sm text-foreground-lighter">
						A Solana-native, fully on-chain relational database. Apache-2.0.
					</p>
				</div>
				<div className="grid grid-cols-2 gap-8 md:col-span-3">
					<div>
						<p className="font-mono text-xs uppercase tracking-widest text-foreground-lighter">
							Product
						</p>
						<ul className="mt-3 space-y-2 text-sm">
							<li>
								<a className={navLink} href="/studio/">
									Studio
								</a>
							</li>
							<li>
								<a className={navLink} href="/roadmap/">
									Roadmap
								</a>
							</li>
							<li>
								<a className={navLink} href="/changelog/">
									Changelog
								</a>
							</li>
						</ul>
					</div>
					<div>
						<p className="font-mono text-xs uppercase tracking-widest text-foreground-lighter">
							Developers
						</p>
						<ul className="mt-3 space-y-2 text-sm">
							<li>
								<a className={navLink} href={DOCS_URL}>
									Documentation
								</a>
							</li>
							<li>
								<a className={navLink} href={`${DOCS_URL}/sdk/`}>
									SDK
								</a>
							</li>
							<li>
								<a className={navLink} href={GITHUB_URL}>
									GitHub
								</a>
							</li>
						</ul>
					</div>
				</div>
			</div>
			<div className="section-container border-t border-border-alternative py-6 text-xs text-foreground-lighter">
				Apache-2.0. Built on Solana.
			</div>
		</footer>
	);
}
