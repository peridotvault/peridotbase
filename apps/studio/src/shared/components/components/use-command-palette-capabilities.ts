import { useLocation, useParams } from "@tanstack/react-router";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { hasSection, homePath, type SectionId } from "@/shared/lib/sections";

export const NO_TABLE_HINT = "Select a table first";

/**
 * Which commands the current route and wallet can actually run, plus the
 * hint shown on the ones that cannot. Separated from the palette so the
 * gating rules change independently of the command list's presentation.
 */
export const useCommandPaletteCapabilities = () => {
	const { pathname } = useLocation();
	const routeParams = useParams({ strict: false });
	const activeTable = (routeParams as { table?: string }).table ?? null;
	const capabilities = useStudioCapabilities();
	const canMutateSchema = capabilities.ddl;

	// Record and schema sheets mount per-screen (table-screen.tsx,
	// schema-screen.tsx), so those commands only run on their own screen.
	const onTableScreen = pathname.startsWith("/table/");
	const onSchemaScreen = pathname.startsWith("/schema/");

	return {
		pathname,
		activeTable,
		capabilities,
		homePath: homePath(capabilities),
		hasSection: (id: SectionId) => hasSection(capabilities, id),
		canCreateTable: canMutateSchema,
		canEditRecords: Boolean(activeTable) && onTableScreen && capabilities.writes,
		recordsHint: !activeTable ? NO_TABLE_HINT : "Open the table data screen first",
		canEditSchema: Boolean(activeTable) && onSchemaScreen && canMutateSchema,
		schemaHint: !canMutateSchema
			? "Schema changes are pending: the Peridotbase program has no DDL instruction yet."
			: !activeTable
				? NO_TABLE_HINT
				: "Open the table schema screen first",
	};
};
