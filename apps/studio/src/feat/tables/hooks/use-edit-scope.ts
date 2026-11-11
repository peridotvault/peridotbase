import type { ColumnInfoSchemaType } from "@peridotbase/sdk";
import { useMemo } from "react";
import type { EditScope } from "@/feat/tables/table.type";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { getIdentityColumnNames } from "../utils/row-details-utils";

/**
 * Where the open table's drafts live. Drafts outlive navigation, so the scope names the database,
 * schema and table; the connection needs no part in it, because switching connections clears them.
 */
export const useEditScope = (
	tableName: string,
	tableCols: ColumnInfoSchemaType[] | undefined,
): EditScope => {
	const schemaName = useTableSchemaName();
	const { selectedDatabase } = useDatabaseStore();

	return useMemo(
		() => ({
			id: JSON.stringify([selectedDatabase, schemaName ?? null, tableName]),
			keyColumns: getIdentityColumnNames(tableCols),
		}),
		[selectedDatabase, schemaName, tableName, tableCols],
	);
};
