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
} from "@peridotbase/sdk";
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

export type SchemaGraphTable = TableInfo & { columns: ColumnInfo[] };

/**
 * The visualizer needs every table with its columns. The SDK exposes the relationship graph
 * directly; this helper only joins the two reads the screens need today.
 */
export const getSchemaGraph = async (db?: string | null): Promise<SchemaGraphTable[]> => {
	if (!db) throw new Error("Select a database first");

	const client = getPeridotbaseClient();
	const tables = await client.listTables(db);

	return Promise.all(
		tables.map(async (table) => ({
			...table,
			columns: await client.getTableColumns({
				database: db,
				table: table.tableName,
				schema: table.schemaName,
			}),
		})),
	);
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
