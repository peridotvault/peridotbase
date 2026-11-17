import { Database, Link2, Table2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * What the studio can do, listed on the one public page. One line per perk; keep it short so
 * the card stays a glance, not a brochure.
 */
export const PRODUCT_PERKS: { icon: LucideIcon; title: string; body: string }[] = [
	{
		icon: Table2,
		title: "Browse real tables",
		body: "Grid, schema and index views for every table in the project database.",
	},
	{
		icon: Database,
		title: "Workspace-aware",
		body: "Organization, project and branch follow the URL, so a link always opens the same place.",
	},
	{
		icon: Link2,
		title: "Shareable by default",
		body: "Copy a URL and anyone with access lands on the same table and branch.",
	},
];
