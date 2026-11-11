/**
 * The Studio's demo data source. It is built only when `VITE_STUDIO_DEMO=true`, and it answers
 * every `PeridotbaseClient` method from sample rows instead of Solana. Nothing here talks to an
 * RPC endpoint, signs a transaction, or claims to be real program data; the shell labels the
 * whole session as a demo.
 */
import type {
	AddColumnPayload,
	AlterColumnPayload,
	BulkInsertResult,
	Capabilities,
	ColumnInfo,
	ColumnRef,
	CreateIndexPayload,
	CreateTablePayload,
	DatabaseInfo,
	DeleteRowsResult,
	ExecuteQueryRequest,
	IndexInfo,
	MutationResult,
	PeridotbaseClient,
	PeridotbaseClientOptions,
	ProtocolHealth,
	QueryResult,
	ReadRowsQuery,
	Relationship,
	RenameColumnPayload,
	RenameTablePayload,
	RowKey,
	RowPage,
	RowRecord,
	RowUpdate,
	TableInfo,
	TableRef,
} from "@peridotbase/sdk";
import {
	createDemoDatabase,
	standardizedType,
	variant,
	type DemoDatabase,
	type DemoTable,
} from "./demo-data";
import { executeDemoSql } from "./demo-sql";

const DEMO_CAPABILITIES: Capabilities = {
	wallet: true,
	discovery: true,
	reads: true,
	writes: true,
	ddl: true,
	queries: true,
	indexes: true,
	live: true,
};

const clone = <T>(value: T): T => structuredClone(value);

const defaultValue = (column: ColumnInfo): unknown => {
	const value = column.columnDefault;

	if (value === null) return null;
	if (value === "true") return true;
	if (value === "false") return false;
	if (value === "now()") return new Date().toISOString();
	if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

	return value.replace(/^'(.*)'$/, "$1");
};

const comparable = (value: unknown): string | number | null => {
	if (value === null || value === undefined) return null;
	if (typeof value === "number") return value;

	return String(value).toLowerCase();
};

const compare = (left: unknown, right: unknown): number => {
	const a = comparable(left);
	const b = comparable(right);

	if (a === null && b === null) return 0;
	if (a === null) return 1;
	if (b === null) return -1;
	if (typeof a === "number" && typeof b === "number") return a - b;

	return String(a).localeCompare(String(b));
};

const likePattern = (pattern: string, caseInsensitive: boolean) => {
	const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const source = `^${escaped.replace(/%/g, ".*").replace(/_/g, ".")}$`;

	return new RegExp(source, caseInsensitive ? "i" : "");
};

const matchesFilter = (row: RowRecord, filter: ReadRowsQuery["filters"][number]): boolean => {
	const value = row[filter.columnName];
	const target = filter.value;
	const op = filter.operator;

	switch (op) {
		case "=":
			return String(comparable(value)) === target.toLowerCase();
		case "!=":
			return String(comparable(value)) !== target.toLowerCase();
		case ">":
			return compare(value, target) > 0;
		case ">=":
			return compare(value, target) >= 0;
		case "<":
			return compare(value, target) < 0;
		case "<=":
			return compare(value, target) <= 0;
		case "is":
			return target.toLowerCase() === "null" ? value === null : String(value) === target;
		case "is not":
			return target.toLowerCase() === "null" ? value !== null : String(value) !== target;
		case "like":
			return likePattern(target, false).test(String(value ?? ""));
		case "not like":
			return !likePattern(target, false).test(String(value ?? ""));
		case "ilike":
			return likePattern(target, true).test(String(value ?? ""));
		case "not ilike":
			return !likePattern(target, true).test(String(value ?? ""));
		default:
			return true;
	}
};

/**
 * The demo client. Every read is derived from one in-memory sample database, and every write
 * updates that database so the walkthrough is interactive; no signature is ever invented.
 */
export class DemoPeridotbaseClient implements PeridotbaseClient {
	readonly capabilities = DEMO_CAPABILITIES;
	readonly rpc;
	readonly wallet;
	readonly programId = null;

	private database: DemoDatabase = createDemoDatabase();

	constructor(options: PeridotbaseClientOptions) {
		this.rpc = options.rpc;
		this.wallet = options.wallet ?? null;
	}

	async getHealth(): Promise<ProtocolHealth> {
		return {
			reachable: true,
			version: "Demo data",
			slot: "local",
			programConfigured: false,
			programReachable: false,
		};
	}

	async listDatabases(): Promise<DatabaseInfo[]> {
		return [clone(this.database.info)];
	}

	async listTables(database: string): Promise<TableInfo[]> {
		this.assertDatabase(database);

		return this.database.tables.map((table) => ({
			...clone(table.info),
			rowCount: table.rows.length,
		}));
	}

	async getTableColumns(ref: TableRef): Promise<ColumnInfo[]> {
		return clone(this.table(ref).columns);
	}

	async getRelationships(database: string): Promise<Relationship[]> {
		this.assertDatabase(database);

		return clone(this.database.relationships);
	}

	async readRows(ref: TableRef, query: ReadRowsQuery): Promise<RowPage> {
		const table = this.table(ref);
		const filtered = table.rows.filter((row) =>
			query.filters.every((filter) => matchesFilter(row, filter)),
		);
		const sorted =
			query.sorts.length > 0
				? [...filtered].sort((a, b) => {
						for (const sort of query.sorts) {
							const order = compare(a[sort.columnName], b[sort.columnName]);
							if (order !== 0) return sort.direction === "desc" ? -order : order;
						}

						return 0;
					})
				: filtered;
		const limit = Math.min(Math.max(query.limit ?? 50, 1), 500);
		const start = Math.max(Number.parseInt(query.cursor ?? "0", 10) || 0, 0);
		const rows = sorted.slice(start, start + limit);
		const end = start + rows.length;
		const total = sorted.length;

		return {
			rows: clone(rows),
			meta: {
				limit,
				total,
				hasNextPage: end < total,
				hasPreviousPage: start > 0,
				nextCursor: end < total ? String(end) : null,
				prevCursor: start > 0 ? String(Math.max(start - limit, 0)) : null,
			},
		};
	}

	async insertRows(ref: TableRef, records: RowRecord[]): Promise<BulkInsertResult> {
		const table = this.table(ref);
		const primaryKey = table.columns.find((column) => column.isPrimaryKey)?.columnName;

		for (const record of records) {
			const row: RowRecord = { ...record };

			if (primaryKey && (row[primaryKey] === undefined || row[primaryKey] === null)) {
				row[primaryKey] = this.nextKey(table, primaryKey);
			}

			for (const column of table.columns) {
				if (row[column.columnName] === undefined && column.columnDefault !== null) {
					row[column.columnName] = defaultValue(column);
				}
			}

			table.rows.push(row);
		}

		return {
			success: true,
			message: `Inserted ${records.length} demo row(s)`,
			successCount: records.length,
			failureCount: 0,
		};
	}

	async updateRows(ref: TableRef, updates: RowUpdate[]): Promise<MutationResult> {
		const table = this.table(ref);
		const primaryKeys = table.columns
			.filter((column) => column.isPrimaryKey)
			.map((column) => column.columnName);
		let updated = 0;

		for (const update of updates) {
			const row = this.findRow(table, update.rowData, primaryKeys);

			if (!row) continue;

			const column = table.columns.find(
				(candidate) => candidate.columnName === update.columnName,
			);

			row[update.columnName] = update.useDefault
				? column
					? defaultValue(column)
					: null
				: update.value;
			updated++;
		}

		return { message: `Updated ${updated} demo row(s)` };
	}

	async deleteRows(ref: TableRef, keys: RowKey[]): Promise<DeleteRowsResult> {
		const table = this.table(ref);
		let deletedCount = 0;

		for (const key of keys) {
			const index = table.rows.findIndex((row) =>
				Object.entries(key).every(([column, value]) => row[column] === value),
			);

			if (index >= 0) {
				table.rows.splice(index, 1);
				deletedCount++;
			}
		}

		return { deletedCount, fkViolation: false, relatedRecords: [] };
	}

	async createTable(database: string, payload: CreateTablePayload): Promise<MutationResult> {
		this.assertDatabase(database);
		const name = payload.tableName.trim();
		const existing = this.database.tables.find(
			(table) => table.info.tableName.toLowerCase() === name.toLowerCase(),
		);

		if (existing) throw new Error(`Demo mode: table "${name}" already exists`);

		const foreignKeys = payload.foreignKeys ?? [];
		const columns: ColumnInfo[] = payload.fields.map((field) => {
			const type = standardizedType(field.columnType);
			const foreignKey = foreignKeys.find((key) => key.columnName === field.columnName);

			return {
				columnName: field.columnName,
				dataType: variant(type),
				dataTypeLabel: type,
				isNullable: field.isNullable,
				columnDefault: field.defaultValue ?? null,
				isPrimaryKey: field.isPrimaryKey,
				isForeignKey: Boolean(foreignKey),
				referencedTable: foreignKey?.referencedTable ?? null,
				referencedSchema: foreignKey ? "public" : undefined,
				referencedColumn: foreignKey?.referencedColumn ?? null,
				enumValues: null,
			};
		});
		const table: DemoTable = {
			info: { tableName: name, schemaName: "public", rowCount: 0 },
			columns,
			rows: [],
			indexes: columns.some((column) => column.isPrimaryKey)
				? [
						{
							indexName: `${name}_pkey`,
							columns: columns
								.filter((column) => column.isPrimaryKey)
								.map((column) => column.columnName),
							isUnique: true,
							method: null,
							kind: "primary",
							definition: `PRIMARY KEY (${columns
								.filter((column) => column.isPrimaryKey)
								.map((column) => column.columnName)
								.join(", ")})`,
						},
					]
				: [],
		};

		this.database.tables.push(table);

		for (const foreignKey of foreignKeys) {
			this.database.relationships.push({
				fromTable: name,
				fromColumn: foreignKey.columnName,
				toTable: foreignKey.referencedTable,
				toColumn: foreignKey.referencedColumn,
			});
		}

		return { message: `Created table "${name}" in demo mode` };
	}

	async renameTable(ref: TableRef, payload: RenameTablePayload): Promise<MutationResult> {
		const table = this.table(ref);
		const previous = table.info.tableName;

		table.info.tableName = payload.newTableName;

		for (const relationship of this.database.relationships) {
			if (relationship.fromTable === previous) relationship.fromTable = payload.newTableName;
			if (relationship.toTable === previous) relationship.toTable = payload.newTableName;
		}

		return { message: `Renamed "${previous}" to "${payload.newTableName}" in demo mode` };
	}

	async dropTable(ref: TableRef): Promise<MutationResult> {
		const name = this.table(ref).info.tableName;

		this.database.tables = this.database.tables.filter(
			(table) => table.info.tableName !== name,
		);
		this.database.relationships = this.database.relationships.filter(
			(relationship) => relationship.fromTable !== name && relationship.toTable !== name,
		);

		return { message: `Dropped table "${name}" in demo mode` };
	}

	async addColumn(ref: TableRef, payload: AddColumnPayload): Promise<MutationResult> {
		const table = this.table(ref);
		const type = standardizedType(payload.columnType);

		table.columns.push({
			columnName: payload.columnName,
			dataType: variant(type),
			dataTypeLabel: type,
			isNullable: payload.isNullable,
			columnDefault: payload.defaultValue ?? null,
			isPrimaryKey: payload.isPrimaryKey,
			isForeignKey: false,
			referencedTable: null,
			referencedColumn: null,
			enumValues: null,
		});

		if (payload.isUnique) {
			table.indexes.push({
				indexName: `${table.info.tableName}_${payload.columnName}_idx`,
				columns: [payload.columnName],
				isUnique: true,
				method: "btree",
				kind: "unique-constraint",
				definition: `CREATE UNIQUE INDEX ${table.info.tableName}_${payload.columnName}_idx ON ${table.info.tableName} USING btree (${payload.columnName})`,
			});
		}

		return {
			message: `Added column "${payload.columnName}" to "${table.info.tableName}" in demo mode`,
		};
	}

	async alterColumn(
		ref: TableRef,
		columnName: string,
		payload: AlterColumnPayload,
	): Promise<MutationResult> {
		const table = this.table(ref);
		const column = table.columns.find((candidate) => candidate.columnName === columnName);

		if (!column) throw new Error(`Demo mode: column "${columnName}" does not exist`);

		const type = standardizedType(payload.columnType);

		column.dataType = variant(type);
		column.dataTypeLabel = type;
		column.isNullable = payload.isNullable;
		column.columnDefault = payload.defaultValue ?? null;

		return {
			message: `Altered column "${columnName}" on "${table.info.tableName}" in demo mode`,
		};
	}

	async dropColumn(ref: ColumnRef): Promise<MutationResult> {
		const table = this.table(ref);

		table.columns = table.columns.filter((column) => column.columnName !== ref.column);
		table.rows = table.rows.map((row) => {
			const next = { ...row };
			delete next[ref.column];

			return next;
		});
		this.database.relationships = this.database.relationships.filter(
			(relationship) =>
				relationship.fromColumn !== ref.column ||
				relationship.fromTable !== table.info.tableName,
		);

		return {
			message: `Dropped column "${ref.column}" from "${table.info.tableName}" in demo mode`,
		};
	}

	async renameColumn(ref: TableRef, payload: RenameColumnPayload): Promise<MutationResult> {
		const table = this.table(ref);
		const column = table.columns.find(
			(candidate) => candidate.columnName === payload.oldColumnName,
		);

		if (!column) {
			throw new Error(`Demo mode: column "${payload.oldColumnName}" does not exist`);
		}

		column.columnName = payload.newColumnName;
		table.rows = table.rows.map((row) => {
			const next = { ...row };
			next[payload.newColumnName] = next[payload.oldColumnName];
			delete next[payload.oldColumnName];

			return next;
		});

		for (const relationship of this.database.relationships) {
			if (
				relationship.fromTable === table.info.tableName &&
				relationship.fromColumn === payload.oldColumnName
			) {
				relationship.fromColumn = payload.newColumnName;
			}

			if (
				relationship.toTable === table.info.tableName &&
				relationship.toColumn === payload.oldColumnName
			) {
				relationship.toColumn = payload.newColumnName;
			}
		}

		for (const index of table.indexes) {
			index.columns = index.columns.map((name) =>
				name === payload.oldColumnName ? payload.newColumnName : name,
			);
		}

		return {
			message: `Renamed column "${payload.oldColumnName}" to "${payload.newColumnName}" in demo mode`,
		};
	}

	async listIndexes(ref: TableRef): Promise<IndexInfo[]> {
		return clone(this.table(ref).indexes);
	}

	async createIndex(ref: TableRef, payload: CreateIndexPayload): Promise<MutationResult> {
		const table = this.table(ref);
		const method = payload.method ?? "btree";

		table.indexes.push({
			indexName: payload.indexName,
			columns: payload.columns,
			isUnique: payload.isUnique,
			method,
			kind: payload.isUnique ? "unique-constraint" : "index",
			definition: `CREATE ${payload.isUnique ? "UNIQUE " : ""}INDEX ${payload.indexName} ON ${table.info.tableName} USING ${method} (${payload.columns.join(", ")})`,
		});

		return { message: `Created index "${payload.indexName}" in demo mode` };
	}

	async dropIndex(ref: TableRef, indexName: string): Promise<MutationResult> {
		const table = this.table(ref);

		table.indexes = table.indexes.filter((index) => index.indexName !== indexName);

		return { message: `Dropped index "${indexName}" in demo mode` };
	}

	async executeQuery(database: string, request: ExecuteQueryRequest): Promise<QueryResult> {
		this.assertDatabase(database);

		return executeDemoSql(this.database, request.statement);
	}

	private assertDatabase(database: string) {
		if (database !== this.database.info.name) {
			throw new Error(
				`Demo mode: "${database}" is not the sample database. Pick "${this.database.info.name}".`,
			);
		}
	}

	private table(ref: TableRef): DemoTable {
		this.assertDatabase(ref.database);
		const table = this.database.tables.find(
			(candidate) => candidate.info.tableName.toLowerCase() === ref.table.toLowerCase(),
		);

		if (!table) throw new Error(`Demo mode: table "${ref.table}" does not exist`);

		return table;
	}

	private nextKey(table: DemoTable, column: string): number {
		return (
			table.rows.reduce((max, row) => {
				const value = Number(row[column]);

				return Number.isFinite(value) ? Math.max(max, value) : max;
			}, 0) + 1
		);
	}

	private findRow(
		table: DemoTable,
		rowData: RowRecord,
		primaryKeys: string[],
	): RowRecord | undefined {
		const keys = primaryKeys.length > 0 ? primaryKeys : Object.keys(rowData);

		return table.rows.find((row) => keys.every((column) => row[column] === rowData[column]));
	}
}
