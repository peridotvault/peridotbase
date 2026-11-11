import type {
	ColumnInfo,
	DatabaseInfo,
	DataTypes,
	IndexInfo,
	Relationship,
	RowRecord,
	StandardizedDataType,
	TableInfo,
} from "@peridotbase/sdk";

/**
 * Sample rows for the env-gated Studio demo. This is the single place the Studio keeps data that
 * does not come from the program, and `demo-client.ts` is the only code that reads it. Real mode
 * never imports this module: `shared/peridotbase/client.ts` builds the demo client only when
 * `VITE_STUDIO_DEMO=true`.
 */
export type DemoTable = {
	info: TableInfo;
	columns: ColumnInfo[];
	rows: RowRecord[];
	indexes: IndexInfo[];
};

export type DemoDatabase = {
	info: DatabaseInfo;
	tables: DemoTable[];
	relationships: Relationship[];
};

/** The Studio's normalized type for every PostgreSQL-style type the demo accepts. */
const VARIANT_BY_TYPE: Record<string, DataTypes> = {
	smallint: "number",
	int: "number",
	integer: "number",
	bigint: "number",
	serial: "number",
	bigserial: "number",
	numeric: "number",
	decimal: "number",
	real: "number",
	float: "number",
	double: "number",
	"double precision": "number",
	boolean: "boolean",
	bool: "boolean",
	text: "text",
	varchar: "text",
	character: "text",
	"character varying": "text",
	char: "text",
	uuid: "text",
	bytea: "text",
	json: "json",
	jsonb: "json",
	date: "date",
	time: "date",
	"time with time zone": "date",
	"time without time zone": "date",
	timestamp: "date",
	timestamptz: "date",
	"timestamp with time zone": "date",
	"timestamp without time zone": "date",
	array: "array",
	enum: "enum",
};

/** Maps a SQL type name to the label the schema screens show. */
export const standardizedType = (type: string): StandardizedDataType => {
	const normalized = type.trim().toLowerCase();

	if (normalized === "serial") return "int";
	if (normalized === "bigserial") return "bigint";

	return (
		Object.keys(VARIANT_BY_TYPE).includes(normalized) ? normalized : "text"
	) as StandardizedDataType;
};

/** The coarse kind the data grid uses to choose a cell renderer. */
export const variant = (type: StandardizedDataType): DataTypes =>
	VARIANT_BY_TYPE[type] ?? "text";

const column = (
	columnName: string,
	dataTypeLabel: StandardizedDataType,
	dataType: DataTypes,
	options: Partial<Omit<ColumnInfo, "columnName" | "dataType" | "dataTypeLabel">> = {},
): ColumnInfo => ({
	columnName,
	dataType,
	dataTypeLabel,
	isNullable: false,
	columnDefault: null,
	isPrimaryKey: false,
	isForeignKey: false,
	referencedTable: null,
	referencedColumn: null,
	enumValues: null,
	...options,
});

const primaryIndex = (tableName: string, columnName: string): IndexInfo => ({
	indexName: `${tableName}_pkey`,
	columns: [columnName],
	isUnique: true,
	method: null,
	kind: "primary",
	definition: `PRIMARY KEY (${columnName})`,
});

const index = (
	tableName: string,
	columns: string[],
	options: { unique?: boolean; method?: string } = {},
): IndexInfo => {
	const suffix = columns.join("_");
	const method = options.method ?? "btree";
	const unique = options.unique ?? false;

	return {
		indexName: `${tableName}_${suffix}_idx`,
		columns,
		isUnique: unique,
		method,
		kind: unique ? "unique-constraint" : "index",
		definition: `CREATE ${unique ? "UNIQUE " : ""}INDEX ${tableName}_${suffix}_idx ON ${tableName} USING ${method} (${columns.join(", ")})`,
	};
};

const createUsers = (): DemoTable => ({
	info: { tableName: "users", schemaName: "public", rowCount: 5 },
	columns: [
		column("id", "bigint", "number", { isPrimaryKey: true }),
		column("email", "text", "text"),
		column("full_name", "text", "text", { isNullable: true }),
		column("role", "text", "text", { columnDefault: "'member'" }),
		column("is_active", "boolean", "boolean", { columnDefault: "true" }),
		column("created_at", "timestamptz", "date", { columnDefault: "now()" }),
	],
	rows: [
		{
			id: 1,
			email: "ada@peridot.dev",
			full_name: "Ada Lovelace",
			role: "owner",
			is_active: true,
			created_at: "2026-01-12T09:24:00.000Z",
		},
		{
			id: 2,
			email: "grace@peridot.dev",
			full_name: "Grace Hopper",
			role: "admin",
			is_active: true,
			created_at: "2026-01-18T16:02:00.000Z",
		},
		{
			id: 3,
			email: "alan@peridot.dev",
			full_name: "Alan Turing",
			role: "engineer",
			is_active: false,
			created_at: "2026-02-01T10:11:00.000Z",
		},
		{
			id: 4,
			email: "katherine@peridot.dev",
			full_name: "Katherine Johnson",
			role: "analyst",
			is_active: true,
			created_at: "2026-02-14T13:45:00.000Z",
		},
		{
			id: 5,
			email: "linus@peridot.dev",
			full_name: "Linus Torvalds",
			role: "engineer",
			is_active: true,
			created_at: "2026-03-02T07:30:00.000Z",
		},
	],
	indexes: [
		primaryIndex("users", "id"),
		index("users", ["email"], { unique: true }),
		index("users", ["role"]),
	],
});

const createOrganizations = (): DemoTable => ({
	info: { tableName: "organizations", schemaName: "public", rowCount: 4 },
	columns: [
		column("id", "bigint", "number", { isPrimaryKey: true }),
		column("name", "text", "text"),
		column("plan", "text", "text", { columnDefault: "'starter'" }),
		column("seats", "int", "number", { columnDefault: "5" }),
		column("created_at", "timestamptz", "date", { columnDefault: "now()" }),
	],
	rows: [
		{
			id: 1,
			name: "Peridot Labs",
			plan: "scale",
			seats: 24,
			created_at: "2025-11-02T08:15:00.000Z",
		},
		{
			id: 2,
			name: "Acme Analytics",
			plan: "team",
			seats: 8,
			created_at: "2025-12-09T10:00:00.000Z",
		},
		{
			id: 3,
			name: "Orbit Systems",
			plan: "enterprise",
			seats: 120,
			created_at: "2026-01-21T15:20:00.000Z",
		},
		{
			id: 4,
			name: "Small Co",
			plan: "starter",
			seats: 3,
			created_at: "2026-02-27T09:05:00.000Z",
		},
	],
	indexes: [primaryIndex("organizations", "id")],
});

const createProjects = (): DemoTable => ({
	info: { tableName: "projects", schemaName: "public", rowCount: 6 },
	columns: [
		column("id", "bigint", "number", { isPrimaryKey: true }),
		column("org_id", "bigint", "number", {
			isForeignKey: true,
			referencedTable: "organizations",
			referencedSchema: "public",
			referencedColumn: "id",
		}),
		column("name", "text", "text"),
		column("status", "text", "text", { columnDefault: "'active'" }),
		column("created_at", "timestamptz", "date", { columnDefault: "now()" }),
	],
	rows: [
		{
			id: 1,
			org_id: 1,
			name: "On-chain ledger",
			status: "active",
			created_at: "2026-02-03T11:40:00.000Z",
		},
		{
			id: 2,
			org_id: 1,
			name: "Wallet sync",
			status: "paused",
			created_at: "2026-02-08T12:10:00.000Z",
		},
		{
			id: 3,
			org_id: 2,
			name: "Event pipeline",
			status: "active",
			created_at: "2026-02-19T08:55:00.000Z",
		},
		{
			id: 4,
			org_id: 2,
			name: "Schema designer",
			status: "active",
			created_at: "2026-02-24T17:30:00.000Z",
		},
		{
			id: 5,
			org_id: 3,
			name: "Index planner",
			status: "beta",
			created_at: "2026-03-06T09:15:00.000Z",
		},
		{
			id: 6,
			org_id: 4,
			name: "Starter template",
			status: "archived",
			created_at: "2026-03-15T19:45:00.000Z",
		},
	],
	indexes: [primaryIndex("projects", "id"), index("projects", ["org_id"])],
});

const createEvents = (): DemoTable => ({
	info: { tableName: "events", schemaName: "public", rowCount: 8 },
	columns: [
		column("id", "bigint", "number", { isPrimaryKey: true }),
		column("user_id", "bigint", "number", {
			isForeignKey: true,
			referencedTable: "users",
			referencedSchema: "public",
			referencedColumn: "id",
		}),
		column("project_id", "bigint", "number", {
			isForeignKey: true,
			referencedTable: "projects",
			referencedSchema: "public",
			referencedColumn: "id",
		}),
		column("kind", "text", "text"),
		column("payload", "jsonb", "json", { isNullable: true }),
		column("occurred_at", "timestamptz", "date", { columnDefault: "now()" }),
	],
	rows: [
		{
			id: 1,
			user_id: 1,
			project_id: 1,
			kind: "deploy",
			payload: { network: "devnet", slot: 348221904, success: true },
			occurred_at: "2026-03-18T14:05:00.000Z",
		},
		{
			id: 2,
			user_id: 2,
			project_id: 3,
			kind: "schema.change",
			payload: { table: "events", change: "add-column", column: "payload" },
			occurred_at: "2026-03-18T14:32:00.000Z",
		},
		{
			id: 3,
			user_id: 3,
			project_id: 2,
			kind: "wallet.connect",
			payload: { cluster: "devnet", wallet: "Phantom" },
			occurred_at: "2026-03-19T08:10:00.000Z",
		},
		{
			id: 4,
			user_id: 1,
			project_id: 4,
			kind: "index.create",
			payload: { table: "users", index: "users_role_idx" },
			occurred_at: "2026-03-19T09:44:00.000Z",
		},
		{
			id: 5,
			user_id: 4,
			project_id: 3,
			kind: "query.run",
			payload: { statement: "select * from users", rows: 5, duration: 12 },
			occurred_at: "2026-03-20T11:02:00.000Z",
		},
		{
			id: 6,
			user_id: 5,
			project_id: 5,
			kind: "deploy",
			payload: { network: "testnet", slot: 359004117, success: false },
			occurred_at: "2026-03-21T16:26:00.000Z",
		},
		{
			id: 7,
			user_id: 2,
			project_id: 1,
			kind: "row.update",
			payload: { table: "organizations", column: "seats", value: 24 },
			occurred_at: "2026-03-22T10:18:00.000Z",
		},
		{
			id: 8,
			user_id: 1,
			project_id: 6,
			kind: "project.archive",
			payload: { reason: "template moved to docs" },
			occurred_at: "2026-03-23T07:55:00.000Z",
		},
	],
	indexes: [
		primaryIndex("events", "id"),
		index("events", ["user_id"]),
		index("events", ["occurred_at"]),
	],
});

/** A fresh sample database, so a reload or a new client never inherits another session's edits. */
export const createDemoDatabase = (): DemoDatabase => {
	const tables = [createUsers(), createOrganizations(), createProjects(), createEvents()];

	return {
		info: {
			name: "peridot_demo",
			owner: "Demo workspace",
			size: "18.2 KiB",
			encoding: "borsh",
		},
		tables,
		relationships: [
			{
				fromTable: "projects",
				fromColumn: "org_id",
				toTable: "organizations",
				toColumn: "id",
			},
			{ fromTable: "events", fromColumn: "user_id", toTable: "users", toColumn: "id" },
			{
				fromTable: "events",
				fromColumn: "project_id",
				toTable: "projects",
				toColumn: "id",
			},
		],
	};
};
