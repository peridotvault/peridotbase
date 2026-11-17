import { Spinner } from "@peridotvault/peridotbase-ui/spinner";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { useTablesList } from "@/shared/hooks/use-tables-list";
import { DATA_TABLE_PATH, DATA_TAB_PARAM, type DataTab } from "@/shared/lib/sections";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";
import { CONSTANTS } from "@/shared/utils/constants";

/**
 * Demo mode opens its first sample table, so a walkthrough lands on real-looking screens instead
 * of "select a table". Real mode renders the page's existing placeholder untouched.
 */
export const DemoFirstTable = ({ tab, fallback }: { tab?: DataTab; fallback: ReactNode }) =>
	isDemoMode() ? <DemoRedirect tab={tab} fallback={fallback} /> : <>{fallback}</>;

const DemoRedirect = ({ tab, fallback }: { tab?: DataTab; fallback: ReactNode }) => {
	const { organization, project } = useStudioScope();
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
			to={DATA_TABLE_PATH}
			params={{ organization, project, table: table.tableName }}
			search={{
				[CONSTANTS.TABLE_SCHEMA]: table.schemaName,
				...(tab && tab !== "table" ? { [DATA_TAB_PARAM]: tab } : {}),
			}}
		/>
	);
};
