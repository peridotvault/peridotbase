import {
	Columns3Cog,
	ListTree,
	type LucideIcon,
	Plug,
	SquareTerminal,
	Table2,
	Workflow,
} from "lucide-react";
import type { Capabilities } from "@peridotbase/sdk";

type Section = {
	id: string;
	icon: LucideIcon;
	/** `data` is the table list; sections without it keep the sidebar closed. */
	sidebar: "data" | "queries" | null;
	/** Opens on the selected table, so switching between these views keeps it. */
	perTable: boolean;
	/** A section stays hidden while the program has no instruction behind it. */
	appliesTo: (capabilities: Capabilities) => boolean;
};

/** Every app section, in nav rail order. The first one is the home screen. */
export const SECTIONS = [
	{
		id: "table",
		icon: Table2,
		sidebar: "data",
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
		id: "schema",
		icon: Columns3Cog,
		sidebar: "data",
		perTable: true,
		appliesTo: (capabilities) => capabilities.ddl,
	},
	{
		id: "indexes",
		icon: ListTree,
		sidebar: "data",
		perTable: true,
		appliesTo: (capabilities) => capabilities.indexes,
	},
	{
		id: "visualizer",
		icon: Workflow,
		sidebar: null,
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

/** The section a pathname is in; `/` belongs to the table section. */
export const sectionOf = (pathname: string): (typeof SECTIONS)[number] | undefined => {
	const segment = pathname.split("/")[1] || "table";

	return SECTIONS.find((section) => section.id === segment);
};

/** The route a table link opens from `pathname`: the per-table view it is in, else the grid. */
export const tablePath = (pathname: string) => {
	const section = sectionOf(pathname);

	return `/${section?.perTable ? section.id : "table"}/$table` as const;
};

/**
 * Where `/` sends the user: the first working area, or the workspace status page while every
 * data section is still waiting on the program. The workspace itself is always last, so it is
 * never chosen over a section that actually works.
 */
export const homePath = (capabilities: Capabilities | undefined) => {
	const dataSection = capabilities
		? SECTIONS.find((section) => section.id !== "workspace" && section.appliesTo(capabilities))
		: undefined;

	return `/${dataSection?.id ?? "workspace"}` as const;
};
