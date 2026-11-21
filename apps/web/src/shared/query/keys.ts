export const databaseKeys = {
	/** Prefix for every cached database list, whatever the scope. */
	all: () => ["databasesList"] as const,
	grants: (db?: string | null) => ["databaseGrants", db] as const,
	allGrants: () => ["databaseGrants"] as const,
	list: (organization?: string, project?: string) =>
		["databasesList", organization, project] as const,
};

export const tableKeys = {
	lists: () => ["tablesList"] as const,
	list: (db?: string | null) => ["tablesList", db] as const,
	dropped: (db?: string | null) => ["tablesList", db, "dropped"] as const,
	// Under the list key, so invalidating the tables list refreshes the visualizer too.
	graph: (db?: string | null) => ["tablesList", db, "graph"] as const,
	allColumns: () => ["tableColumns"] as const,
	allRelationships: () => ["relationships"] as const,
	relationships: (db?: string | null) => ["relationships", db] as const,
	columnsByTable: (tableName: string) => ["tableColumns", tableName] as const,
	columns: (tableName?: string, db?: string | null, schemaName?: string) =>
		["tableColumns", tableName, db, schemaName] as const,
	allData: () => ["tableData"] as const,
	dataByTable: (tableName: string) => ["tableData", tableName] as const,
	allComments: () => ["tableComment"] as const,
	comment: (tableName: string, db?: string | null, schemaName?: string) =>
		["tableComment", tableName, db, schemaName] as const,
	allAudit: () => ["databaseAudit"] as const,
	audit: (db?: string | null) => ["databaseAudit", db] as const,
	allAuditEvents: () => ["auditEvents"] as const,
	allSchemas: () => ["schemas"] as const,
	schemas: (db?: string | null) => ["schemas", db] as const,
	allDatabaseTypes: () => ["databaseTypes"] as const,
	allStorage: () => ["tableStorage"] as const,
	allExtensions: () => ["tableExtension"] as const,
	extension: (table?: string, db?: string | null, schema?: string) =>
		["tableExtension", table, db, schema] as const,
	allPolicies: () => ["tablePolicies"] as const,
	policies: (table?: string, db?: string | null, schema?: string) =>
		["tablePolicies", table, db, schema] as const,
	allPolicyProposals: () => ["policyProposals"] as const,
	policyProposals: (table?: string, db?: string | null, schema?: string) =>
		["policyProposals", table, db, schema] as const,
	storage: (table?: string, db?: string | null, schema?: string) =>
		["tableStorage", table, db, schema] as const,
	databaseTypes: (db?: string | null) => ["databaseTypes", db] as const,
	allSponsorAllowances: () => ["sponsorAllowances"] as const,
	sponsorAllowances: () => ["sponsorAllowances"] as const,
	auditEvents: (db?: string | null) => ["auditEvents", db] as const,
	allGuards: () => ["tableGuards"] as const,
	guards: (tableName: string, db?: string | null, schemaName?: string) =>
		["tableGuards", tableName, db, schemaName] as const,
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
	members: (organization: string) => ["workspace", "members", organization] as const,
	orgPolicy: (organization: string) => ["workspace", "orgPolicy", organization] as const,
	orgProposals: (organization: string) => ["workspace", "orgProposals", organization] as const,
};

/** The organization/project catalogs, per connection and wallet. */
export const scopeKeys = {
	all: () => ["scope"] as const,
	catalog: (rpcUrl: string, cluster: string, wallet: string | null) =>
		["scope", rpcUrl, cluster, wallet] as const,
};
