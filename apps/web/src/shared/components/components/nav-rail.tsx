import { Tooltip, TooltipContent, TooltipTrigger } from "@peridotvault/peridotbase-ui/tooltip";
import { cn } from "@peridotvault/peridotbase-ui/utils";
import { Link, useLocation, useParams } from "@tanstack/react-router";
import { PanelLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import {
	SECTION_PATHS,
	SECTIONS,
	ORG_SECTIONS,
	DATA_TABLE_PATH,
	orgSectionOf,
	sectionOf,
} from "@/shared/lib/sections";
import { usePersonalPreferencesStore } from "@/shared/stores/personal-preferences.store";
import { CONSTANTS } from "@/shared/utils/constants";

const railTile =
	"relative flex size-12 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";

const RailTip = ({ label, children }: { label: string; children: ReactNode }) => (
	<Tooltip>
		<TooltipTrigger asChild>{children}</TooltipTrigger>
		<TooltipContent side="right">
			<p className="capitalize">{label}</p>
		</TooltipContent>
	</Tooltip>
);

const RailSections = () => {
	const { pathname } = useLocation();
	const params = useParams({ strict: false });
	const capabilities = useStudioCapabilities();
	const { organization, project } = useStudioScope();

	// The org level has no project, so `SECTIONS` links (which all need one) would break.
	// Render the org items there instead; the project shell keeps its own sections.
	const current = sectionOf(pathname);
	const activeTable = (params as { table?: string }).table;
	const openSchema = useTableSchemaName();
	const orgCurrent = orgSectionOf(pathname);

	if (!project) {
		return ORG_SECTIONS.map((section) => {
			const Icon = section.icon;

			return (
				<RailTip key={section.id} label={section.label}>
					<Link
						to={section.to}
						params={{ organization }}
						aria-label={section.label}
						aria-current={orgCurrent === section ? "page" : undefined}
						className={cn(railTile, orgCurrent === section && "bg-muted text-foreground")}
					>
						<Icon className="size-5" />
					</Link>
				</RailTip>
			);
		});
	}
	return SECTIONS.filter((section) => section.appliesTo(capabilities)).map((section) => {
		const Icon = section.icon;
		const isActive = current === section;

		// Keep the selected table when staying inside Data; every other section opens its root.
		const link =
			section.perTable && activeTable
				? {
						to: DATA_TABLE_PATH,
						params: { organization, project, table: activeTable },
						search: { [CONSTANTS.TABLE_SCHEMA]: openSchema },
					}
				: {
						to: SECTION_PATHS[section.id],
						params: { organization, project },
					};

		return (
			<RailTip key={section.id} label={section.id}>
				<Link
					{...link}
					aria-label={section.id}
					aria-current={isActive ? "page" : undefined}
					className={cn(railTile, isActive && "bg-muted text-foreground")}
				>
					<Icon className="size-5" />
				</Link>
			</RailTip>
		);
	});
};

const SidebarToggle = () => {
	const {
		sidebar: { mode },
		setSidebarMode,
	} = usePersonalPreferencesStore();

	const isOpen = mode !== "hidden";

	return (
		<RailTip label={isOpen ? "Hide sidebar" : "Show sidebar"}>
			<button
				type="button"
				aria-label="Toggle sidebar"
				className={railTile}
				onClick={() => setSidebarMode(isOpen ? "hidden" : "pinned")}
			>
				<PanelLeft className="size-5" />
			</button>
		</RailTip>
	);
};

const Divider = () => <div className="h-px w-full shrink-0 bg-border" />;

// Sections on top; AI assistant plus the sidebar toggle pinned to the bottom. App settings
// live in the topbar profile menu; the rail keeps only page navigation. Theme, bug report
// and GitHub live in the topbar profile menu.
export const NavRail = ({ assistant }: { assistant?: ReactNode }) => {
	return (
		<nav
			aria-label="Main"
			className="relative z-20 flex shrink-0 flex-col border-r border-border bg-background"
			style={{ width: CONSTANTS.RAIL_WIDTH }}
		>
			<RailSections />
			<div className="mt-auto flex flex-col">
				<Divider />
				{assistant}
				<Divider />
				<SidebarToggle />
			</div>
		</nav>
	);
};
