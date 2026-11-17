import {
	Database,
	FolderKanban,
	LayoutDashboard,
	type LucideIcon,
	Plug,
	Settings,
	SquareTerminal,
	Users,
	Workflow,
} from "lucide-react";
import type { Capabilities } from "@peridotvault/peridotbase-sdk";

type OrgSection = {
	id: "projects" | "team" | "settings";
	label: string;
	icon: LucideIcon;
	to:
		| "/studio/org/$organization"
		| "/studio/org/$organization/team"
		| "/studio/org/$organization/settings";
};

type Section = {
	id: string;
	icon: LucideIcon;
	/** `tables` lists the active database's tables; sections without it keep the sidebar closed. */
	sidebar: "tables" | "queries" | "databases" | null;
	/** Opens on the selected table, so switching between these views keeps it. */
	perTable: boolean;
	/** A section stays hidden while the program has no instruction behind it. */
	appliesTo: (capabilities: Capabilities) => boolean;
};

/** Every studio route lives under the selected organization and project. */
export const PROJECT_ROOT = "/studio/org/$organization/$project" as const;

export const SECTION_PATHS = {
	overview: PROJECT_ROOT,
	// ponytail: the Data view still lives on the legacy `/table` path so existing links keep
	// working; rename to `/data` with redirects when routes are next touched.
	database: `${PROJECT_ROOT}/table`,
	runner: `${PROJECT_ROOT}/runner`,
	visualizer: `${PROJECT_ROOT}/visualizer`,
	workspace: `${PROJECT_ROOT}/workspace`,
} as const;

/** Host route for the unified Data view: table data plus schema and indexes tabs. */
// ponytail: same legacy `/table` path as above; rename together with SECTION_PATHS.data.
export const DATA_TABLE_PATH = `${PROJECT_ROOT}/table/$table` as const;

/** Search key for the active Data tab; absent means the data grid. */
export const DATA_TAB_PARAM = "tab" as const;

export type DataTab = "table" | "schema" | "indexes";

/** Org-level rail items, in display order: projects, team, org settings. */
export const ORG_SECTIONS = [
	{ id: "projects", label: "Projects", icon: FolderKanban, to: "/studio/org/$organization" },
	{ id: "team", label: "Team", icon: Users, to: "/studio/org/$organization/team" },
	{
		id: "settings",
		label: "Org settings",
		icon: Settings,
		to: "/studio/org/$organization/settings",
	},
] as const satisfies readonly OrgSection[];

/** Every app section, in nav rail order. The overview is the project home. */
export const SECTIONS = [
	{
		id: "overview",
		icon: LayoutDashboard,
		sidebar: null,
		perTable: false,
		appliesTo: () => true,
	},
	{
		id: "database",
		icon: Database,
		sidebar: "tables",
		perTable: true,
		appliesTo: (capabilities) => capabilities.discovery,
	},
	{
		id: "runner",
		icon: SquareTerminal,
		sidebar: "queries",
		perTable: false,
		appliesTo: (capabilities) => capabilities.queries,
	},
	{
		id: "visualizer",
		icon: Workflow,
		sidebar: "databases",
		perTable: false,
		appliesTo: (capabilities) => capabilities.discovery,
	},
	{
		id: "workspace",
		icon: Plug,
		sidebar: null,
		perTable: false,
		appliesTo: () => true,
	},
] as const satisfies readonly Section[];

export type SectionId = (typeof SECTIONS)[number]["id"];

export const hasSection = (capabilities: Capabilities | undefined, id: SectionId) =>
	Boolean(
		capabilities && SECTIONS.find((section) => section.id === id)?.appliesTo(capabilities),
	);

/** The org-level item a pathname is in; `/studio/org/<org>` is the projects tab. */
export const orgSectionOf = (pathname: string): (typeof ORG_SECTIONS)[number] | undefined => {
	const segments = pathname.split("/").filter(Boolean);

	if (segments[0] !== "studio" || segments[1] !== "org" || !segments[2]) return undefined;

	const segment = segments[3] ?? "projects";

	return ORG_SECTIONS.find((section) => section.id === segment);
};

/** The section a pathname is in; legacy table, schema and indexes URLs all resolve to Data. */
export const sectionOf = (pathname: string): (typeof SECTIONS)[number] | undefined => {
	const segments = pathname.split("/").filter(Boolean);

	if (segments[0] !== "studio" || segments[1] !== "org") return undefined;

	const raw = segments[4] ?? "overview";
	const segment = raw === "table" || raw === "schema" || raw === "indexes" ? "database" : raw;

	return SECTIONS.find((section) => section.id === segment);
};

/** The route a table link opens: the unified Data view. The active tab travels in search. */
// ponytail: `_pathname` stays so old call sites keep compiling; drop it when routes are renamed.
