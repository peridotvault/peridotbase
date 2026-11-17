import { useParams } from "@tanstack/react-router";
import { useDataTab } from "@/shared/hooks/use-data-tab";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { hasSection, type SectionId } from "@/shared/lib/sections";

export const NO_TABLE_HINT = "Select a table first";

/**
 * Which commands the current route and wallet can actually run, plus the
 * hint shown on the ones that cannot. Separated from the palette so the
 * gating rules change independently of the command list's presentation.
 */
export const useCommandPaletteCapabilities = () => {
	const routeParams = useParams({ strict: false });
	const activeTable = (routeParams as { table?: string }).table ?? null;
	const capabilities = useStudioCapabilities();
	const canMutateSchema = capabilities.ddl;

	// Record sheets mount on the Data grid tab; schema sheets on the schema tab
	// (data-screen.tsx), so those commands only run on their own tab.
	const activeTab = useDataTab();
	const onTableScreen = activeTable !== null && activeTab === "table";
	const onSchemaScreen = activeTable !== null && activeTab === "schema";

	return {
		activeTable,
		activeTab,
		capabilities,
		hasSection: (id: SectionId) => hasSection(capabilities, id),
		canCreateTable: canMutateSchema,
		canEditRecords: Boolean(activeTable) && onTableScreen && capabilities.writes,
		recordsHint: !activeTable ? NO_TABLE_HINT : "Open the table data tab first",
		canEditSchema: Boolean(activeTable) && onSchemaScreen && canMutateSchema,
		schemaHint: !canMutateSchema
			? "Schema changes are pending: the Peridotbase program has no DDL instruction yet."
			: !activeTable
				? NO_TABLE_HINT
				: "Open the table schema tab first",
	};
};
