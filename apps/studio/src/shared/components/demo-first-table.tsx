import { Spinner } from "@peridotbase/ui/spinner";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTablesList } from "@/shared/hooks/use-tables-list";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";
import { CONSTANTS } from "@/shared/utils/constants";

const TABLE_ROUTE = {
	table: "/table/$table",
	schema: "/schema/$table",
	indexes: "/indexes/$table",
} as const;

/**
 * Demo mode opens its first sample table, so a walkthrough lands on real-looking screens instead
 * of "select a table". Real mode renders the page's existing placeholder untouched.
 */
export const DemoFirstTable = ({
	section,
	fallback,
}: {
	section: keyof typeof TABLE_ROUTE;
	fallback: ReactNode;
}) =>
	isDemoMode() ? <DemoRedirect section={section} fallback={fallback} /> : <>{fallback}</>;

const DemoRedirect = ({
	section,
	fallback,
}: {
	section: keyof typeof TABLE_ROUTE;
	fallback: ReactNode;
}) => {
	const { tablesList, isLoadingTablesList } = useTablesList();

	if (isLoadingTablesList) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<Spinner size="size-6" />
			</div>
		);
	}

	const table = tablesList?.[0];

	if (!table) return <>{fallback}</>;

	return (
		<Navigate
			to={TABLE_ROUTE[section]}
			params={{ table: table.tableName }}
			search={{ [CONSTANTS.TABLE_SCHEMA]: table.schemaName }}
		/>
	);
};
