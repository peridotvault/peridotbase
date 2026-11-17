import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@peridotvault/peridotbase-ui/dropdown-menu";
import { cn } from "@peridotvault/peridotbase-ui/utils";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
	Bug,
	Building2,
	Check,
	ChevronDown,
	FolderKanban,
	GitBranch,
	LogOut,
	Monitor,
	Moon,
	Settings,
	Sun,
	User,
	Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { LuGithub } from "react-icons/lu";
import { useTheme } from "@/shared/hooks/use-theme";
import { useOrganization, useProject } from "@/shared/hooks/use-scope";
import { useScopeStore } from "@/shared/stores/scope.store";
import { useOverlayStore } from "@/shared/stores/overlay.store";
import { CONSTANTS } from "@/shared/utils/constants";
import { useWalletSession } from "@/shared/hooks/use-wallet-session";

const THEMES = [
	{ value: "light", label: "Light", icon: Sun },
	{ value: "dark", label: "Dark", icon: Moon },
	{ value: "system", label: "System", icon: Monitor },
] as const;

export const useProfileMenuTheme = () => {
	const { theme, setTheme } = useTheme();

	return {
		theme,
		setTheme,
		ThemeIcon: THEMES.find((t) => t.value === theme)?.icon ?? Monitor,
	};
};

/** The branch the network implies: mainnet → main, testnet → test, localnet → local, the rest → dev. */
export const branchOfCluster = (cluster: string) => {
	if (cluster === "mainnet-beta") return "main";
	if (cluster === "testnet") return "test";
	if (cluster === "localnet") return "local";

	return "dev";
};

/** Every network the studio can point at, as the branch it implies. */
export const BRANCH_OPTIONS = [
	{ cluster: "mainnet-beta", branch: "main" },
	{ cluster: "testnet", branch: "test" },
	{ cluster: "devnet", branch: "dev" },
	{ cluster: "localnet", branch: "local" },
] as const;

const crumbLabel =
	"inline-flex max-w-40 items-center gap-1 truncate rounded-l-md px-2 py-1 text-sm transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const crumbChevron =
	"inline-flex shrink-0 items-center rounded-r-md px-1 py-1 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const crumbStatic =
	"inline-flex max-w-40 cursor-default items-center gap-1 truncate px-2 py-1 text-sm";

/**
 * Full-width bar above every page except the connect screen: logo, then organization / project /
 * branch breadcrumbs, then the profile. The profile menu carries the account plus theme, bug
 * report and GitHub — the rail keeps only navigation and the sidebar toggle. It lives in the
 * root route, so it reads the scope from the router instead of route params.
 */
export const StudioTopbar = () => {
	const navigate = useNavigate();
	const scope = useRouterState({
		select: (state) =>
			(state.matches.at(-1)?.params ?? {}) as { organization?: string; project?: string },
	});
	const organization = scope.organization ?? "";
	const project = scope.project ?? "";
	const activeOrganization = useOrganization(organization);
	const activeProject = useProject(organization, project);
	const organizations = useScopeStore((state) => state.organizations);
	const projects = useScopeStore((state) => state.projects);
	const { wallet, connect, disconnect, isConnecting, cluster, setCluster } =
		useWalletSession();
	const { theme, setTheme, ThemeIcon } = useProfileMenuTheme();
	const { openOverlay } = useOverlayStore();

	const organizationProjects = useMemo(
		() => projects.filter((item) => item.organization === organization),
		[projects, organization],
	);

	const branch = branchOfCluster(cluster);

	return (
		<header className="relative z-30 flex h-12 shrink-0 items-center gap-1 border-b border-border bg-background pr-2">
			{/* Same width as the rail, so the logo sits directly above it. */}
			<div
				className="flex shrink-0 items-center justify-center"
				style={{ width: CONSTANTS.RAIL_WIDTH }}
			>
				<button
					type="button"
					onClick={() => navigate({ to: "/studio/org" })}
					aria-label="Peridotbase home"
					className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<img src="/logo.svg" alt="" className="size-6" />
				</button>
			</div>

			<span aria-hidden className="shrink-0 text-sm text-muted-foreground/50">
				/
			</span>

			<nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-0.5">
				<DropdownMenu>
					<span className="inline-flex min-w-0 items-center">
						<button
							type="button"
							className={crumbLabel}
							aria-label="Go to organization overview"
							onClick={() =>
								organization &&
								navigate({
									to: "/studio/org/$organization",
									params: { organization },
								})
							}
							disabled={!organization}
							title={activeOrganization?.name ?? (organization || "Organizations")}
						>
							<Building2 className="size-3.5 shrink-0 text-muted-foreground" />
							<span className="truncate">
								{activeOrganization?.name ?? (organization || "Select organization")}
							</span>
						</button>
						<DropdownMenuTrigger className={crumbChevron} aria-label="Switch organization">
							<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
						</DropdownMenuTrigger>
					</span>
					<DropdownMenuContent align="start" className="w-56">
						<DropdownMenuLabel>Organizations</DropdownMenuLabel>
						{organizations.map((item) => (
							<DropdownMenuItem
								key={item.slug}
								onClick={() =>
									navigate({
										to: "/studio/org/$organization",
										params: { organization: item.slug },
									})
								}
							>
								<span className="flex-1 truncate">{item.name}</span>
								{item.slug === organization && <Check className="size-4" />}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				{project && (
					<>
						<span aria-hidden className="text-sm text-muted-foreground/50">
							/
						</span>

						<DropdownMenu>
							<span className="inline-flex min-w-0 items-center">
								<button
									type="button"
									className={crumbLabel}
									aria-label="Go to project overview"
									onClick={() =>
										navigate({
											to: "/studio/org/$organization/$project",
											params: { organization, project },
										})
									}
									title={activeProject?.name ?? project}
								>
									<FolderKanban className="size-3.5 shrink-0 text-muted-foreground" />
									<span className="truncate">{activeProject?.name ?? project}</span>
								</button>
								<DropdownMenuTrigger className={crumbChevron} aria-label="Switch project">
									<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
								</DropdownMenuTrigger>
							</span>
							<DropdownMenuContent align="start" className="w-56">
								<DropdownMenuLabel>Projects</DropdownMenuLabel>
								{organizationProjects.map((item) => (
									<DropdownMenuItem
										key={item.slug}
										onClick={() =>
											navigate({
												to: "/studio/org/$organization/$project",
												params: { organization, project: item.slug },
											})
										}
									>
										<span className="flex-1 truncate">{item.name}</span>
										{item.slug === project && <Check className="size-4" />}
									</DropdownMenuItem>
								))}
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() =>
										navigate({ to: "/studio/org/$organization", params: { organization } })
									}
								>
									<FolderKanban />
									All projects
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<span aria-hidden className="text-sm text-muted-foreground/50">
							/
						</span>

						<DropdownMenu>
							<span className="inline-flex min-w-0 items-center">
								<span className={cn(crumbStatic, "font-mono text-xs")} title={branch}>
									<GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
									<span className="truncate">{branch}</span>
								</span>
								<DropdownMenuTrigger className={crumbChevron} aria-label="Switch branch">
									<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
								</DropdownMenuTrigger>
							</span>
							<DropdownMenuContent align="start" className="w-56">
								<DropdownMenuLabel>Branches</DropdownMenuLabel>
								{BRANCH_OPTIONS.map((option) => (
									<DropdownMenuItem
										key={option.cluster}
										onClick={() => setCluster(option.cluster)}
									>
										<span className="flex-1 truncate font-mono text-xs">{option.branch}</span>
										<span className="font-mono text-[11px] text-muted-foreground">
											{option.cluster}
										</span>
										{option.cluster === cluster && <Check className="size-4" />}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</>
				)}
			</nav>

			<div className="ml-auto flex items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger
						className={cn(
							"flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
						)}
						aria-label="Account"
					>
						<span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
							{(wallet?.label ?? wallet?.address ?? "?").slice(0, 2)}
						</span>
						<span className="hidden max-w-32 truncate font-mono text-xs text-muted-foreground sm:inline">
							{wallet
								? (wallet.label ?? `${wallet.address.slice(0, 4)}…${wallet.address.slice(-4)}`)
								: "Not connected"}
						</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-60">
						<DropdownMenuLabel className="space-y-0.5">
							<p className="text-xs font-medium">{wallet?.label ?? "No wallet"}</p>
							<p className="truncate font-mono text-[11px] font-normal text-muted-foreground">
								{wallet?.address ?? "Connect to sign with a wallet"}
							</p>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{wallet ? (
							<DropdownMenuItem onClick={() => void disconnect()}>
								<LogOut />
								Disconnect
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem disabled={isConnecting} onClick={() => void connect()}>
								<Wallet />
								{isConnecting ? "Connecting…" : "Connect wallet"}
							</DropdownMenuItem>
						)}
						<DropdownMenuItem onClick={() => navigate({ to: "/studio/auth" })}>
							<User />
							Sign in
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuSub>
							<DropdownMenuSubTrigger>
								<ThemeIcon />
								Theme
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								{THEMES.map(({ value, label, icon: Icon }) => (
									<DropdownMenuItem key={value} onClick={() => setTheme(value)}>
										<Icon />
										{label}
										{theme === value && <Check className="ml-auto" />}
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
						<DropdownMenuItem onClick={() => openOverlay("settings.app")}>
							<Settings />
							Settings
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<a
								href="https://github.com/antiganeinc/peridotbase/issues/new"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Bug />
								Report a bug
							</a>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<a
								href="https://github.com/antiganeinc/peridotbase"
								target="_blank"
								rel="noopener noreferrer"
							>
								<LuGithub />
								View on GitHub
							</a>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
};
