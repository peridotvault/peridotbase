import type {
	AddColumnPayload,
	AlterColumnPayload,
	ColumnInfo,
	CreateIndexPayload,
	CreateTablePayload,
	IndexInfo,
	MutationResult,
	ReadRowsQuery,
	RenameColumnPayload,
	RenameTablePayload,
	TableInfo,
	TableRef,
	TableGuards,
	TableStorage,
	SetTablePartitioningPayload,
} from "@peridotvault/peridotbase-sdk";
import { getPeridotbaseClient } from "./client";

export type TableDataParams = {
	tableName: string;
	schemaName?: string;
	db?: string;
	limit?: string;
	cursor?: string | null;
	direction?: string | null;
	sort?: string;
	order?: string | null;
	filters?: string;
};

const ref = (
	db: string | null | undefined,
	tableName: string,
	schemaName?: string,
): TableRef => {
	if (!db) throw new Error("Select a database first");

	return { database: db, table: tableName, schema: schemaName };
};

export const getTables = (db?: string | null): Promise<TableInfo[]> => {
	if (!db) throw new Error("Select a database first");

	return getPeridotbaseClient().listTables(db);
};

export const getDroppedTables = (db?: string | null): Promise<TableInfo[]> => {
	if (!db) throw new Error("Select a database first");

	return getPeridotbaseClient().listDroppedTables(db);
};

export type SchemaGraphTable = TableInfo & { columns: ColumnInfo[] };

/**
 * The visualizer needs every table with its columns. The SDK exposes the relationship graph
 * directly; this helper only joins the two reads the screens need today.
 */
export const getSchemaGraph = async (db?: string | null): Promise<SchemaGraphTable[]> => {
	if (!db) throw new Error("Select a database first");

	const client = getPeridotbaseClient();

	return client.listTablesWithColumns(db);
};

export const getTableColumns = (
	tableName: string,
	db?: string | null,
	schemaName?: string,
): Promise<ColumnInfo[]> =>
	getPeridotbaseClient().getTableColumns(ref(db, tableName, schemaName));

export const getTableData = ({
	tableName,
	schemaName,
	db,
	limit,
	cursor,
	direction,
	sort,
	order,
	filters,
}: TableDataParams) => {
	const query: ReadRowsQuery = {
		limit: Number.parseInt(limit ?? "50", 10),
		direction: direction === "desc" ? "desc" : "asc",
		cursor: cursor ?? undefined,
		sorts: sort
			? [
					{
						columnName: sort,
						direction: order === "desc" ? "desc" : "asc",
					},
				]
			: [],
		filters: filters ? (JSON.parse(filters) as ReadRowsQuery["filters"]) : [],
	};

	return getPeridotbaseClient().readRows(ref(db, tableName, schemaName), query);
};

export const createTable = (
	data: CreateTablePayload,
	db?: string | null,
): Promise<MutationResult> => {
	if (!db) throw new Error("Select a database first");

	return getPeridotbaseClient().createTable(db, data);
};

export const deleteTable = ({
	tableName,
	schemaName,
	db,
}: {
	tableName: string;
	schemaName?: string;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().dropTable(ref(db, tableName, schemaName));

export const duplicateTable = ({
	tableName,
	newTableName,
	schemaName,
	db,
}: {
	tableName: string;
	newTableName: string;
	schemaName?: string;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().duplicateTable(ref(db, tableName, schemaName), newTableName);

export const closeDroppedTable = ({
	tableName,
	schemaName,
	db,
}: {
	tableName: string;
	schemaName?: string;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().closeDroppedTable(ref(db, tableName, schemaName));

export const restoreTable = ({
	tableName,
	schemaName,
	db,
}: {
	tableName: string;
	schemaName?: string;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().restoreTable(ref(db, tableName, schemaName));

export const getTableComment = (
	tableName: string,
	db?: string | null,
	schemaName?: string,
): Promise<string | null> =>
	getPeridotbaseClient().getTableComment(ref(db, tableName, schemaName));

export const setTableComment = ({
	tableName,
	schemaName,
	comment,
	db,
}: {
	tableName: string;
	schemaName?: string;
	comment: string;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().setTableComment(ref(db, tableName, schemaName), comment);

export const getTableGuards = (
	tableName: string,
	db?: string | null,
	schemaName?: string,
): Promise<TableGuards> =>
	getPeridotbaseClient().getTableGuards(ref(db, tableName, schemaName));

export const setTableGuards = ({
	tableName,
	schemaName,
	guards,
	db,
}: {
	tableName: string;
	schemaName?: string;
	guards: Partial<TableGuards>;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().setTableGuards(ref(db, tableName, schemaName), guards);

export const getTableStorage = (
	tableName: string,
	db?: string | null,
	schemaName?: string,
): Promise<TableStorage> =>
	getPeridotbaseClient().getTableStorage(ref(db, tableName, schemaName));

export const setTableHistoryLimit = ({
	tableName,
	schemaName,
	limit,
	db,
}: {
	tableName: string;
	schemaName?: string;
	limit: number;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().setTableHistoryLimit(ref(db, tableName, schemaName), limit);

export const setTablePartitioning = ({
	tableName,
	schemaName,
	payload,
	db,
}: {
	tableName: string;
	schemaName?: string;
	payload: SetTablePartitioningPayload;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().setTablePartitioning(ref(db, tableName, schemaName), payload);

export const renameTable = ({
	tableName,
	schemaName,
	data,
	db,
}: {
	tableName: string;
	schemaName?: string;
	data: RenameTablePayload;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().renameTable(ref(db, tableName, schemaName), data);

export const addColumn = ({
	tableName,
	schemaName,
	data,
	db,
}: {
	tableName: string;
	schemaName?: string;
	data: AddColumnPayload;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().addColumn(ref(db, tableName, schemaName), data);

export const alterColumn = ({
	tableName,
	schemaName,
	columnName,
	data,
	db,
}: {
	tableName: string;
	schemaName?: string;
	columnName: string;
	data: AlterColumnPayload;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().alterColumn(ref(db, tableName, schemaName), columnName, data);

export const renameColumn = ({
	tableName,
	schemaName,
	columnName,
	data,
	db,
}: {
	tableName: string;
	schemaName?: string;
	columnName: string;
	/** The current name comes from `columnName`, so callers only pick the new one. */
	data: Omit<RenameColumnPayload, "oldColumnName">;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().renameColumn(ref(db, tableName, schemaName), {
		oldColumnName: columnName,
		...data,
	});

export const deleteColumn = ({
	tableName,
	schemaName,
	columnName,
	db,
}: {
	tableName: string;
	schemaName?: string;
	columnName: string;
	db?: string | null;
	cascade?: boolean;
}): Promise<MutationResult> =>
	getPeridotbaseClient().dropColumn({
		...ref(db, tableName, schemaName),
		column: columnName,
	});

export const getTableIndexes = (
	tableName: string,
	db?: string | null,
	schemaName?: string,
): Promise<IndexInfo[]> => getPeridotbaseClient().listIndexes(ref(db, tableName, schemaName));

export const createIndex = ({
	tableName,
	schemaName,
	data,
	db,
}: {
	tableName: string;
	schemaName?: string;
	data: CreateIndexPayload;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().createIndex(ref(db, tableName, schemaName), data);

export const dropIndex = ({
	tableName,
	schemaName,
	indexName,
	db,
}: {
	tableName: string;
	schemaName?: string;
	indexName: string;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().dropIndex(ref(db, tableName, schemaName), indexName);

export const getRelationships = (db?: string | null) => {
	if (!db) throw new Error("Select a database first");

	return getPeridotbaseClient().getRelationships(db);
};

export const createForeignKey = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
	payload: { column: string; parentTable: string; parentColumn?: string },
) => getPeridotbaseClient().createForeignKey(ref(db, tableName, schemaName), payload);

export const dropForeignKey = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
	payload: { fkId: string; parentTable: string },
) => getPeridotbaseClient().dropForeignKey(ref(db, tableName, schemaName), payload);

export const createCompositeForeignKey = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
	payload: {
		childColumns: string[];
		parentTable: string;
		parentIndexId?: string;
		match?: "simple" | "full";
	},
) => getPeridotbaseClient().createCompositeForeignKey(ref(db, tableName, schemaName), payload);

export const setIndexNullsNotDistinct = ({
	tableName,
	schemaName,
	indexName,
	nullsNotDistinct,
	db,
}: {
	tableName: string;
	schemaName?: string;
	indexName: string;
	nullsNotDistinct: boolean;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().setIndexNullsNotDistinct(
		ref(db, tableName, schemaName),
		indexName,
		nullsNotDistinct,
	);
