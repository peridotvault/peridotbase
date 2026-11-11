export const databaseKeys = {
	list: () => ["databasesList"] as const,
};

export const tableKeys = {
	lists: () => ["tablesList"] as const,
	list: (db?: string | null) => ["tablesList", db] as const,
	// Under the list key, so invalidating the tables list refreshes the visualizer too.
	graph: (db?: string | null) => ["tablesList", db, "graph"] as const,
	allColumns: () => ["tableColumns"] as const,
	columnsByTable: (tableName: string) => ["tableColumns", tableName] as const,
	columns: (tableName?: string, db?: string | null, schemaName?: string) =>
		["tableColumns", tableName, db, schemaName] as const,
	allData: () => ["tableData"] as const,
	dataByTable: (tableName: string) => ["tableData", tableName] as const,
	data: ({
		tableName,
		cursor,
		limit,
		direction,
		sort,
		order,
		filters,
		db,
		schemaName,
	}: {
		tableName: string;
		schemaName?: string;
		cursor?: string | null;
		limit?: string | null;
		direction?: string | null;
		sort?: string | null;
		order?: string | null;
		filters?: string | null;
		db?: string | null;
	}) =>
		[
			"tableData",
			tableName,
			cursor,
			limit,
			direction,
			sort,
			order,
			filters,
			db,
			schemaName,
		] as const,
};

export const indexKeys = {
	all: () => ["table-indexes"] as const,
	byTable: (tableName: string) => ["table-indexes", tableName] as const,
	table: (tableName: string, db?: string | null, schemaName?: string) =>
		["table-indexes", tableName, db, schemaName] as const,
};

export const workspaceKeys = {
	health: (rpcUrl: string) => ["workspace", "health", rpcUrl] as const,
};
