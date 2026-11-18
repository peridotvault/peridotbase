import { AnchorProvider, Program, utils as anchorUtils, type Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
	PeridotBase,
	bindNameExpr,
	coerceValue,
	displayValue,
	equalityTarget,
	organizationPda,
	parseSql,
	predicatePasses,
	projectPda,
	type ColumnSpec,
	type ColumnTypeName,
	type Statement,
	type SqlValue,
	type Table,
	type TableModel,
	type V3Table,
} from "@peridotvault/peridotbase-core-sdk";
import IDL from "@peridotvault/peridotbase-core-sdk/idl";
import { initV3Storage, loadV3Table } from "./program-v3.js";
import type {
	PeridotbaseClient,
	PeridotbaseClientOptions,
	ProtocolHealth,
	RowUpdate,
} from "./client.js";
import { IntegrationUnavailableError } from "./errors.js";
import type { WalletPort } from "./ports.js";
import { slugify } from "./slug.js";
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
	OrganizationInfo,
	ProjectInfo,
	QueryResult,
	ReadRowsQuery,
	Relationship,
	RenameColumnPayload,
	RenameTablePayload,
	RowKey,
	RowPage,
	RowRecord,
	TableInfo,
	TableRef,
} from "./types/index.js";
import { PROGRAM_NOT_WIRED } from "./types/capabilities.js";

/** Everything the program can serve today. Only fully implemented operations are `true`. */
export const PROGRAM_WIRED: Capabilities = {
	wallet: true,
	discovery: true,
	reads: true,
	writes: true,
	ddl: true,
	queries: true,
	indexes: true,
	live: true,
};

/** The organization/project selection that scopes a session. Slugs, as the Studio routes carry them. */
export type ScopeRef = { organization: string; project: string };

export type ScopeResolver = () => ScopeRef | null;

const COLUMN_TYPES: Record<string, ColumnTypeName> = {
	bool: "bool",
	boolean: "bool",
	i64: "i64",
	int: "i64",
	bigint: "i64",
	smallint: "i64",
	number: "i64",
	decimal: "decimal",
	numeric: "decimal",
	float: "decimal",
	double: "decimal",
	uuid: "uuid",
};

const columnTypeOf = (value: string): ColumnTypeName =>
	COLUMN_TYPES[value.toLowerCase()] ?? "text";

/** Deterministic scope id. FNV-1a keeps slug→u64 derivation sync and dependency-free. */
const scopeId = (slug: string): bigint => {
	let hash = 0xcbf29ce484222325n;
	const mask = (1n << 64n) - 1n;

	for (const byte of new TextEncoder().encode(slug)) {
		hash ^= BigInt(byte);
		hash = (hash * 0x100000001b3n) & mask;
	}

	return hash;
};

const compare = (left: unknown, right: unknown): number => {
	if (typeof left === "bigint" || typeof right === "bigint") {
		try {
			const a = BigInt(String(left));
			const b = BigInt(String(right));
			return a === b ? 0 : a < b ? -1 : 1;
		} catch {
			// Fall through to string comparison.
		}
	}

	return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
		numeric: true,
	});
};

const matches = (cell: unknown, operator: string, value: string): boolean => {
	const text = String(cell ?? "").toLowerCase();
	const target = value.toLowerCase();

	switch (operator) {
		case "=":
		case "==":
			return compare(cell, value) === 0;
		case "!=":
		case "<>":
			return compare(cell, value) !== 0;
		case ">":
			return compare(cell, value) > 0;
		case "<":
			return compare(cell, value) < 0;
		case ">=":
			return compare(cell, value) >= 0;
		case "<=":
			return compare(cell, value) <= 0;
		case "contains":
		case "like":
		case "ilike":
			return text.includes(target);
		default:
			return true;
	}
};

const DATABASE_ENCODING = "on-chain";

/**
 * The client that talks to `peridotbase_core` through Solana RPC. Every method answers from the
 * program or throws; nothing is stubbed. Operations the program has no instruction for keep
 * throwing `IntegrationUnavailableError`, so a screen can explain the gap instead of faking it.
 */
export class ProgramClient implements PeridotbaseClient {
	readonly capabilities = PROGRAM_WIRED;
	readonly rpc;
	readonly wallet: WalletPort | null;
	readonly programId: string | null;

	private readonly connection: Connection;
	private readonly sdk: PeridotBase;
	private readonly resolveScope: ScopeResolver;
	/** Per-database SDK instances, keyed by database name, built on first use. */
	private readonly databases = new Map<string, PeridotBase>();

	constructor(options: PeridotbaseClientOptions) {
		this.rpc = options.rpc;
		this.wallet = options.wallet ?? null;
		this.programId = options.programId ?? null;
		this.resolveScope = options.scope ?? (() => null);

		const address = this.wallet?.wallet?.address;
		const wallet = address ? this.anchorWallet(address) : this.readOnlyWallet();

		this.connection = new Connection(options.rpc.url, "confirmed");

		const provider = new AnchorProvider(this.connection, wallet, {
			commitment: "confirmed",
			preflightCommitment: "confirmed",
		});

		this.sdk = new PeridotBase({
			program: new Program(IDL as never, provider),
		});
	}

	private anchorWallet(address: string): Wallet {
		const port = this.wallet;

		if (!port) throw new Error("Connect a wallet before writing");

		return {
			publicKey: new PublicKey(address),
			// Anchor only signs on the write path; reads never reach this method.
			signTransaction: async (transaction: Transaction) => {
				const [signed] = await port.signTransactions([
					transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
				]);

				return Transaction.from(signed);
			},
			signAllTransactions: async (transactions: Transaction[]) => {
				const signed = await port.signTransactions(
					transactions.map((transaction) =>
						transaction.serialize({
							requireAllSignatures: false,
							verifySignatures: false,
						}),
					),
				);

				return signed.map((bytes) => Transaction.from(bytes));
			},
		} as unknown as Wallet;
	}

	/** Reads still need a `publicKey`; the system program never signs and never owns state. */
	private readOnlyWallet(): Wallet {
		return {
			publicKey: PublicKey.default,
			signTransaction: async () => {
				throw new Error("Connect a wallet before signing");
			},
			signAllTransactions: async () => {
				throw new Error("Connect a wallet before signing");
			},
		} as unknown as Wallet;
	}

	private requireWallet(): PublicKey {
		const address = this.wallet?.wallet?.address;

		if (!address) throw new Error("Connect a wallet to use this workspace");

		return new PublicKey(address);
	}

	/** Organization address for the selected slug, derived from the connected wallet as creator. */
	private async organizationOf(scope: ScopeRef): Promise<PublicKey> {
		const creator = this.requireWallet();
		const organization = organizationPda(creator, scopeId(scope.organization))[0];

		try {
			await this.sdk.organizationInfo(organization);
			return organization;
		} catch {
			await this.sdk.createOrganization({
				organizationId: scopeId(scope.organization),
				name: scope.organization,
				creator,
			});
			return organization;
		}
	}

	private async projectOf(scope: ScopeRef): Promise<PublicKey> {
		const organization = await this.organizationOf(scope);
		const project = projectPda(organization, scopeId(scope.project))[0];

		try {
			await this.sdk.projectInfo(project);
			return project;
		} catch {
			await this.sdk.createProject({
				projectId: scopeId(scope.project),
				name: scope.project,
				organization,
			});
			return project;
		}
	}

	private requireScope(): ScopeRef {
		const scope = this.resolveScope();

		if (!scope) throw new Error("Open an organization and project first");

		return scope;
	}

	/** A database-scoped SDK, so `loadTables`/`table` resolve inside the selected database. */
	private async databaseSdk(name: string): Promise<PeridotBase> {
		const cached = this.databases.get(name);

		if (cached) return cached;

		const scope = this.requireScope();
		const project = await this.projectOf(scope);
		const accounts = await this.sdk.listDatabases(project);
		const match = accounts.find(
			({ account }: { account: { name: string } }) => account.name === name,
		);

		if (!match) throw new Error(`unknown database: ${name}`);

		const scoped = new PeridotBase({
			program: this.sdk.program,
			connection: this.connection,
			databaseId: BigInt(match.account.databaseId.toString()),
			organization: new PublicKey(match.account.organization),
			project,
		});

		this.databases.set(name, scoped);

		return scoped;
	}

	private async tableOf(ref: TableRef): Promise<Table> {
		const sdk = await this.databaseSdk(ref.database);
		await this.requireV3Database(sdk, ref.database);
		return sdk.table(ref.table);
	}

	/** Resolves the table plus its storage layout; every row path branches on this. */
	private async tableContext(ref: TableRef): Promise<{
		sdk: PeridotBase;
		table: Table;
		v3: V3Table | null;
	}> {
		const sdk = await this.databaseSdk(ref.database);
		await this.requireV3Database(sdk, ref.database);
		const table = await sdk.table(ref.table);

		return { sdk, table, v3: await loadV3Table(sdk, table.model.tableId) };
	}

	/**
	 * The program rejects any account whose layout tag is not `LAYOUT_VERSION` (3)
	 * with `IncompatibleAccountVersion`, so databases created before the
	 * record-storage upgrade are frozen on-chain: no instruction may read or write
	 * through their catalogs. Turn that into an actionable error instead of
	 * letting the raw Anchor error escape.
	 */
	private async requireV3Database(sdk: PeridotBase, database: string): Promise<void> {
		const info = await this.connection.getAccountInfo(sdk.databaseAddress(), "confirmed");
		const version = info && info.data.length > 9 ? info.data[9] : -1;

		if (version === 3) return;

		throw new Error(
			`Database "${database}" was created before the record-storage upgrade and is frozen by the program (layout v${version < 0 ? "?" : version}, required v3). ` +
				"Create a new database to keep working; if its organization is also frozen, create a new organization first.",
		);
	}

	/** Same freeze check for org/project catalogs, which gate `createDatabase`. */
	private async requireV3Account(address: PublicKey, label: string): Promise<void> {
		const info = await this.connection.getAccountInfo(address, "confirmed");
		const version = info && info.data.length > 9 ? info.data[9] : -1;

		if (version === 3) return;

		throw new Error(
			`This ${label} was created before the record-storage upgrade and is frozen by the program (layout v${version < 0 ? "?" : version}, required v3). ` +
				"Create a new organization and project to keep working.",
		);
	}

	async getHealth(): Promise<ProtocolHealth> {
		let slot: string | undefined;
		let version: string | undefined;
		let reachable: boolean;

		try {
			[slot, version] = await Promise.all([
				this.rpc.getSlot().then(String),
				this.rpc.getVersion(),
			]);
			reachable = true;
		} catch {
			reachable = false;
		}

		let programReachable = false;

		if (this.programId && reachable) {
			try {
				const info = await this.connection.getAccountInfo(new PublicKey(this.programId));
				programReachable = info !== null;
			} catch {
				programReachable = false;
			}
		}

		return {
			reachable,
			slot,
			version,
			programConfigured: Boolean(this.programId),
			programReachable,
		};
	}

	/**
	 * Organizations this wallet created. The program has no global index, so discovery is scoped
	 * to the connected creator; an organization minted by another wallet stays invisible.
	 */
	async listOrganizations(): Promise<OrganizationInfo[]> {
		const creator = this.requireWallet();
		const accounts = (await this.sdk.listOrganizations(creator)) as Array<{
			account: { name: string; owner: unknown };
			publicKey: { toBase58: () => string };
		}>;

		return accounts.map(({ account, publicKey }) => ({
			slug: account.name,
			name: account.name,
			address: publicKey.toBase58(),
			owner: new PublicKey(account.owner as never).toBase58(),
		}));
	}

	async createOrganization(name: string): Promise<OrganizationInfo> {
		const slug = slugify(name);

		if (!slug) throw new Error("Name your organization first");

		const creator = this.requireWallet();
		const organizationId = scopeId(slug);

		await this.sdk.createOrganization({ organizationId, name: slug, creator });

		return {
			slug,
			name: slug,
			address: organizationPda(creator, organizationId)[0].toBase58(),
			owner: creator.toBase58(),
		};
	}

	async listProjects(organization: string): Promise<ProjectInfo[]> {
		const creator = this.requireWallet();
		const organizationAddress = organizationPda(creator, scopeId(organization))[0];
		const accounts = (await this.sdk.listProjects(organizationAddress)) as Array<{
			account: { name: string };
			publicKey: { toBase58: () => string };
		}>;

		return accounts.map(({ account, publicKey }) => ({
			slug: account.name,
			name: account.name,
			organization,
			address: publicKey.toBase58(),
		}));
	}

	async createProject(organization: string, name: string): Promise<ProjectInfo> {
		const slug = slugify(name);

		if (!slug) throw new Error("Name your project first");

		const organizationAddress = await this.organizationOf({ organization, project: slug });
		const projectId = scopeId(slug);

		await this.sdk.createProject({ projectId, name: slug, organization: organizationAddress });

		return {
			slug,
			name: slug,
			organization,
			address: projectPda(organizationAddress, projectId)[0].toBase58(),
		};
	}

	async listDatabases(): Promise<DatabaseInfo[]> {
		const scope = this.requireScope();
		const project = await this.projectOf(scope);
		const accounts = await this.sdk.listDatabases(project);

		return accounts
			.filter(({ account }: { account: { mode: unknown } }) => {
				// Anchor decodes a unit enum variant as `{ variant: {} }`.
				const mode =
					typeof account.mode === "string"
						? account.mode
						: Object.keys(account.mode as object)[0];
				return mode !== "closed";
			})
			.map(
				({
					account,
				}: {
					account: { name: string; organization: unknown; tableCount?: number };
				}): DatabaseInfo => ({
					name: account.name,
					owner: new PublicKey(account.organization as never).toBase58(),
					size: `${account.tableCount ?? 0} tables`,
					encoding: DATABASE_ENCODING,
				}),
			);
	}

	async createDatabase(name: string): Promise<DatabaseInfo> {
		const scope = this.requireScope();
		const project = await this.projectOf(scope);
		await this.requireV3Account(project, "project");
		const existing = await this.sdk.listDatabases(project);
		const nextId =
			existing.reduce(
				(max: bigint, entry: { account: { databaseId: unknown } }) =>
					BigInt(String(entry.account.databaseId)) > max
						? BigInt(String(entry.account.databaseId))
						: max,
				0n,
			) + 1n;

		await this.sdk.createDatabase({ name, databaseId: nextId, project });
		this.databases.delete(name);

		return {
			name,
			owner: new PublicKey(this.requireWallet()).toBase58(),
			size: "0",
			encoding: DATABASE_ENCODING,
		} as DatabaseInfo;
	}

	async listTables(database: string): Promise<TableInfo[]> {
		const sdk = await this.databaseSdk(database);
		let entries: TableInfo[];

		try {
			entries = (await sdk.loadTables())
				.filter((model) => model.status === "active")
				.map((model) => ({
					tableName: model.name,
					rowCount: Number(model.rowCount),
				}));
		} catch {
			// Table catalogs written before layout versioning cannot be decoded by
			// the v3 IDL, and Anchor's `all()` aborts the whole scan on the first
			// one. Read them raw so one stale table cannot blank the sidebar; rows
			// are unavailable, so the count is an estimate.
			entries = await this.legacyTables(sdk);
		}

		return entries;
	}

	/** The IDL types the program namespace loosely; this is the slice we need. */
	private rawProgram(): {
		programId: PublicKey;
		account: { tableCatalog: { discriminator: number[] } };
	} {
		const program = this.sdk.program as unknown as {
			programId: PublicKey;
			account: { tableCatalog: { discriminator: number[] } };
		};
		return program;
	}

	/** Scans table catalogs raw and decodes the pre-versioning layout by hand. */
	private async legacyTables(sdk: PeridotBase): Promise<TableInfo[]> {
		const anyProgram = this.rawProgram();
		const raw = await this.connection.getProgramAccounts(anyProgram.programId, {
			filters: [
				{
					memcmp: {
						offset: 0,
						bytes: anchorUtils.bytes.bs58.encode(
							Buffer.from(anyProgram.account.tableCatalog.discriminator),
						),
					},
				},
			],
		});
		const database = sdk.databaseAddress();

		const entries: TableInfo[] = [];

		for (const { account } of raw) {
			const data: Buffer = account.data;

			// Pre-versioning layout: bump @8, database @9, table_id @41,
			// name length @50, name @54.
			if (!new PublicKey(data.slice(9, 41)).equals(database)) continue;

			const length = data.readUInt32LE(50);
			if (length === 0 || length > 64 || 54 + length + 5 > data.length) continue;

			const name = data.slice(54, 54 + length).toString("utf8");
			const status = data[54 + length + 4]; // after schema_version (u32)
			if (!/^[\x20-\x7e]+$/.test(name) || status !== 0) continue;

			entries.push({ tableName: name, rowCount: 0, rowCountEstimated: true });
		}

		return entries;
	}

	async getTableColumns(ref: TableRef): Promise<ColumnInfo[]> {
		const table = await this.tableOf(ref);
		return this.columnsOf(table.model);
	}

	private columnsOf(model: TableModel): ColumnInfo[] {
		return model.columns.map((column, index) => {
			const notNull = model.constraints.some(
				(constraint) => constraint.kind === "notNull" && constraint.column === index,
			);

			return {
				columnName: column.name,
				dataType: this.cellTypeOf(column.type),
				dataTypeLabel: this.labelOf(column.type),
				isNullable: Boolean(column.nullable) && !notNull && index !== model.primaryKey,
				columnDefault: null,
				isPrimaryKey: index === model.primaryKey,
				isForeignKey: false,
				referencedTable: null,
				referencedColumn: null,
				enumValues: null,
			};
		});
	}

	private cellTypeOf(type: ColumnTypeName): ColumnInfo["dataType"] {
		if (type === "bool") return "boolean";
		if (type === "i64" || type === "decimal") return "number";
		return "text";
	}

	private labelOf(type: ColumnTypeName): ColumnInfo["dataTypeLabel"] {
		switch (type) {
			case "bool":
				return "boolean";
			case "i64":
				return "bigint";
			case "decimal":
				return "numeric";
			case "uuid":
				return "uuid";
			default:
				return "varchar";
		}
	}

	async getRelationships(_database: string): Promise<Relationship[]> {
		// The program has no foreign keys: nothing to draw, and nothing invented.
		return [];
	}

	async readRows(ref: TableRef, query: ReadRowsQuery): Promise<RowPage> {
		const { table, v3 } = await this.tableContext(ref);
		const columns = v3 ? v3.columns : table.model.columns;
		const rows = v3
			? (await v3.scanAll({ cap: 10_000 }))
					.filter((row) => row.live)
					.map((row) => ({
						record: this.rowRecord(v3.columns, row.values),
						values: row.values,
					}))
			: (await table.select()).map((values) => {
					const record: RowRecord = {};
					columns.forEach((column, index) => {
						record[column.name] = displayValue(values[index], column as ColumnSpec);
					});
					return { record, values };
				});

		const filtered = rows.filter(({ record }) =>
			query.filters.every((filter) => {
				const index = columns.findIndex((column) => column.name === filter.columnName);
				const cell = index >= 0 ? record[filter.columnName] : undefined;
				return matches(cell, filter.operator, filter.value);
			}),
		);

		const sorted = [...filtered];

		if (query.sorts.length > 0) {
			sorted.sort((left, right) => {
				for (const sort of query.sorts) {
					const order = compare(left.record[sort.columnName], right.record[sort.columnName]);
					if (order !== 0) return sort.direction === "desc" ? -order : order;
				}
				return 0;
			});
		}

		if (query.direction === "desc") sorted.reverse();

		const offset = Number.parseInt(query.cursor ?? "0", 10);
		const start = Number.isFinite(offset) && offset > 0 ? offset : 0;
		const page = sorted.slice(start, start + query.limit);
		const nextOffset = start + page.length;

		return {
			rows: page.map(({ record }) => record),
			meta: {
				limit: query.limit,
				total: sorted.length,
				totalEstimated: false,
				hasNextPage: nextOffset < sorted.length,
				hasPreviousPage: start > 0,
				nextCursor: nextOffset < sorted.length ? String(nextOffset) : null,
				prevCursor: start > 0 ? String(Math.max(0, start - query.limit)) : null,
			},
		};
	}

	async insertRows(ref: TableRef, records: RowRecord[]): Promise<BulkInsertResult> {
		const { table, v3 } = await this.tableContext(ref);
		const errors: Array<{ recordIndex: number; error: string }> = [];
		let successCount = 0;

		for (const [recordIndex, record] of records.entries()) {
			try {
				if (v3) await v3.insert(this.coerceColumns(v3.columns, record));
				else await table.insert([this.coerceRecord(table.model, record)]);
				successCount += 1;
			} catch (error) {
				errors.push({
					recordIndex,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return {
			success: errors.length === 0,
			message:
				errors.length === 0
					? `Inserted ${successCount} row${successCount === 1 ? "" : "s"}`
					: `Inserted ${successCount}, failed ${errors.length}`,
			successCount,
			failureCount: errors.length,
			errors: errors.length > 0 ? errors : undefined,
		};
	}

	private coerceRecord(model: TableModel, record: RowRecord): Record<string, SqlValue> {
		return this.coerceColumns(model.columns, record);
	}

	private coerceColumns(
		columns: ReadonlyArray<{ name: string; type: ColumnTypeName }>,
		record: RowRecord,
	): Record<string, SqlValue> {
		const out: Record<string, SqlValue> = {};

		for (const column of columns) {
			const value = record[column.name];
			out[column.name] = coerceValue(
				value === undefined || value === "" ? null : (value as SqlValue),
				column as ColumnSpec,
			);
		}

		return out;
	}

	private primaryKeyOf(
		columns: ReadonlyArray<{ name: string; type: ColumnTypeName }>,
		primaryKey: number,
		record: RowRecord,
	): SqlValue {
		const column = columns[primaryKey];
		const primary = (record as Record<string, unknown>)[column.name];

		return coerceValue(primary as SqlValue, column as ColumnSpec);
	}

	async updateRows(ref: TableRef, updates: RowUpdate[]): Promise<MutationResult> {
		const { table, v3 } = await this.tableContext(ref);
		const columns = v3 ? v3.columns : table.model.columns;
		let updated = 0;

		for (const update of updates) {
			const column = columns.findIndex((entry) => entry.name === update.columnName);

			if (column < 0) throw new Error(`unknown column: ${update.columnName}`);

			const value = update.useDefault
				? (columns[column].default ?? null)
				: coerceValue(update.value as SqlValue, columns[column] as ColumnSpec);

			const primaryKey = this.primaryKeyOf(
				columns,
				v3 ? v3.primaryKey : table.model.primaryKey,
				update.rowData,
			);

			if (v3) {
				await v3.update(primaryKey, [{ column: update.columnName, value }]);
			} else {
				await table.updateByKey(primaryKey, [{ column, value }]);
			}
			updated += 1;
		}

		return { message: `Updated ${updated} row${updated === 1 ? "" : "s"}` };
	}

	async deleteRows(ref: TableRef, keys: RowKey[]): Promise<DeleteRowsResult> {
		const { table, v3 } = await this.tableContext(ref);
		const columns = v3 ? v3.columns : table.model.columns;

		for (const key of keys) {
			const primaryKey = this.primaryKeyOf(
				columns,
				v3 ? v3.primaryKey : table.model.primaryKey,
				key,
			);

			if (v3) await v3.delete(primaryKey);
			else await table.softDeleteByKey(primaryKey);
		}

		return {
			deletedCount: keys.length,
			fkViolation: false,
			relatedRecords: [],
		} as DeleteRowsResult;
	}

	async createTable(database: string, payload: CreateTablePayload): Promise<MutationResult> {
		const sdk = await this.databaseSdk(database);
		await this.requireV3Database(sdk, database);
		const models = await sdk.loadTables();
		const tableId =
			models.reduce((max, model) => (model.tableId > max ? model.tableId : max), 0n) + 1n;

		const columns: ColumnSpec[] = payload.fields.map((field) => ({
			name: field.columnName,
			type: columnTypeOf(field.columnType),
			nullable: field.isNullable,
		}));

		const constraints: NonNullable<Parameters<PeridotBase["createTable"]>[0]["constraints"]> =
			[];

		for (const field of payload.fields) {
			if (field.isPrimaryKey)
				constraints.push({ kind: "primaryKey", column: field.columnName });
			else if (!field.isNullable)
				constraints.push({ kind: "notNull", column: field.columnName });
		}

		const indexes = payload.fields
			.filter((field) => field.isUnique && !field.isPrimaryKey)
			.map((field) => ({
				name: `${payload.tableName}_${field.columnName}_key`,
				column: field.columnName,
				unique: true,
				// v3 derives claim/posting PDAs itself; the v2 bucket chain is unused.
				bucketCount: 1,
			}));

		await sdk.createTable({ tableId, name: payload.tableName, columns, constraints, indexes });
		await initV3Storage(sdk, tableId);

		return { message: `Created table ${payload.tableName}` };
	}

	renameTable(_ref: TableRef, _payload: RenameTablePayload): Promise<MutationResult> {
		throw new IntegrationUnavailableError("renameTable");
	}

	async dropTable(ref: TableRef): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database);
		await this.requireV3Database(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const signature = await sdk.softDropTable(table.model.tableId);
		return { message: `Dropped table ${ref.table}`, signature };
	}

	async addColumn(ref: TableRef, payload: AddColumnPayload): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database);
		await this.requireV3Database(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const signature = await sdk.alterTable(table.model.tableId, [
			{
				name: payload.columnName,
				type: columnTypeOf(payload.columnType),
				nullable: payload.isNullable,
			},
		]);

		return { message: `Added column ${payload.columnName}`, signature };
	}

	alterColumn(
		_ref: TableRef,
		_column: string,
		_payload: AlterColumnPayload,
	): Promise<MutationResult> {
		throw new IntegrationUnavailableError("alterColumn");
	}

	dropColumn(_ref: ColumnRef): Promise<MutationResult> {
		throw new IntegrationUnavailableError("dropColumn");
	}

	renameColumn(_ref: TableRef, _payload: RenameColumnPayload): Promise<MutationResult> {
		throw new IntegrationUnavailableError("renameColumn");
	}

	async listIndexes(ref: TableRef): Promise<IndexInfo[]> {
		const table = await this.tableOf(ref);
		const model = table.model;

		return model.indexes.map((index) => ({
			indexName: index.name,
			columns: [model.columns[index.column]?.name ?? ""],
			isUnique: index.unique,
			method: null,
			kind: index.unique ? "unique-constraint" : "index",
			definition: null,
		}));
	}

	async createIndex(ref: TableRef, payload: CreateIndexPayload): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database);
		await this.requireV3Database(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const column = table.model.columns.findIndex((entry) => entry.name === payload.columns[0]);

		if (column < 0) throw new Error(`unknown column: ${payload.columns[0]}`);

		const indexId =
			table.model.indexes.reduce(
				(max, index) => (index.indexId > max ? index.indexId : max),
				0n,
			) + 1n;

		const signature = await sdk.createIndex(table.model.tableId, {
			indexId,
			name: payload.indexName,
			column,
			unique: payload.isUnique,
		});

		return { message: `Created index ${payload.indexName}`, signature };
	}

	dropIndex(_ref: TableRef, _indexName: string): Promise<MutationResult> {
		throw new IntegrationUnavailableError("dropIndex");
	}

	async executeQuery(database: string, request: ExecuteQueryRequest): Promise<QueryResult> {
		const started = performance.now();
		const statements = parseSql(request.statement);
		const sdk = await this.databaseSdk(database);
		const createdTables = new Set<string>();
		let last: StatementResult | null = null;
		let transactions = 0;

		try {
			// Batch mode: every write below stages an unsigned transaction and
			// `flushBatch` packs them into as few signed transactions as the 1232
			// byte packet allows, all under one wallet approval.
			sdk.beginBatch();

			// Staged creations are invisible to chain scans, so the script's table
			// and index ids must come from these counters, not per-statement
			// chain scans.
			const models = await sdk.loadTables();
			const ids = {
				tableIdSeed:
					models.reduce((max, model) => (model.tableId > max ? model.tableId : max), 0n) + 1n,
				indexSeeds: new Map<bigint, bigint>(),
			};

			for (const statement of statements) {
				// Staged DDL is invisible to chain reads, so a script that mixes DDL
				// with SELECT or with writes against a table it just created must
				// land the staged transactions first.
				const targetsNewTable =
					"table" in statement && createdTables.has(statement.table as string);
				if (statement.kind === "select" || targetsNewTable) {
					transactions += (await sdk.flushBatch()).length;
					sdk.beginBatch();
				}

				last = await this.runStatement(database, statement, ids);

				if (statement.kind === "createTable") createdTables.add(statement.name);
				if (statement.kind === "select" || targetsNewTable) {
					// A flush re-reads the chain, so re-seed the id counter from it.
					const landed = await sdk.loadTables();
					ids.tableIdSeed =
						landed.reduce((max, model) => (model.tableId > max ? model.tableId : max), 0n) +
						1n;
				}
			}

			if (sdk.batching) transactions += (await sdk.flushBatch()).length;
		} catch (error) {
			if (sdk.batching) sdk.discardBatch();
			throw error;
		}

		const duration = Math.round(performance.now() - started);
		const rows = last?.rows ?? [];

		return {
			columns: last?.columns ?? [],
			rows,
			rowCount: rows.length,
			duration,
			message:
				(last?.message ?? "Statement submitted") +
				(transactions > 0
					? ` (${transactions} transaction${transactions === 1 ? "" : "s"})`
					: ""),
		};
	}

	private async runStatement(
		database: string,
		statement: Statement,
		ids: { tableIdSeed: bigint; indexSeeds: Map<bigint, bigint> },
	): Promise<StatementResult> {
		switch (statement.kind) {
			case "createDatabase":
				await this.createDatabase(statement.name);
				return { columns: [], rows: [], message: `Created database ${statement.name}` };
			case "createTable":
				return this.createTableFromStatement(database, statement, ids);
			case "createIndex":
				return this.createIndexFromStatement(database, statement, ids);
			case "alterTable": {
				const sdk = await this.databaseSdk(database);
				await this.requireV3Database(sdk, database);
				const table = await sdk.table(statement.table);
				await sdk.alterTable(table.model.tableId, statement.addColumns);
				return { columns: [], rows: [], message: `Altered table ${statement.table}` };
			}
			case "insert":
			case "select":
			case "update":
			case "delete":
				return this.runDml(database, statement);
			default:
				throw new IntegrationUnavailableError(statement.kind);
		}
	}

	/** Mirrors the core SQL executor, but creates the v3 descriptor after the catalog. */
	private async createTableFromStatement(
		database: string,
		statement: Extract<Statement, { kind: "createTable" }>,
		ids: { tableIdSeed: bigint },
	): Promise<StatementResult> {
		const sdk = await this.databaseSdk(database);
		await this.requireV3Database(sdk, database);
		const tableId = ids.tableIdSeed++;

		const constraints = statement.constraints.map((constraint) => {
			if (constraint.kind === "check") {
				return {
					kind: "check" as const,
					expr: bindNameExpr(constraint.expr, statement.columns),
				};
			}

			return constraint;
		});

		await sdk.createTable({
			tableId,
			name: statement.name,
			columns: statement.columns,
			constraints,
			indexes: constraints
				.filter((constraint) => constraint.kind === "unique")
				.map((constraint) => ({
					name: `uq_${(constraint as { column: string }).column}`,
					column: (constraint as { column: string }).column,
					unique: true,
					bucketCount: 1,
				})),
		});
		await initV3Storage(sdk, tableId);

		return { columns: [], rows: [], message: `Created table ${statement.name}` };
	}

	private async createIndexFromStatement(
		database: string,
		statement: Extract<Statement, { kind: "createIndex" }>,
		ids: { indexSeeds: Map<bigint, bigint> },
	): Promise<StatementResult> {
		const sdk = await this.databaseSdk(database);
		await this.requireV3Database(sdk, database);
		const table = await sdk.table(statement.table);
		const column = table.model.columns.findIndex((entry) => entry.name === statement.column);

		if (column < 0) throw new Error(`unknown column: ${statement.column}`);

		// Staged indexes are invisible to chain reads, so a second CREATE INDEX on
		// the same table inside one script needs this per-run seed.
		let indexId = ids.indexSeeds.get(table.model.tableId);
		if (indexId === undefined) {
			indexId =
				table.model.indexes.reduce(
					(max, index) => (index.indexId > max ? index.indexId : max),
					0n,
				) + 1n;
		}
		ids.indexSeeds.set(table.model.tableId, indexId + 1n);

		await sdk.createIndex(table.model.tableId, {
			indexId,
			name: statement.name,
			column,
			unique: statement.unique,
			bucketCount: 1,
		});

		return { columns: [], rows: [], message: `Created index ${statement.name}` };
	}

	private async runDml(
		database: string,
		statement: Extract<Statement, { kind: "insert" | "select" | "update" | "delete" }>,
	): Promise<StatementResult> {
		const { table, v3 } = await this.tableContext({ database, table: statement.table });
		const columns = v3 ? v3.columns : table.model.columns;
		const specs = columns as unknown as ColumnSpec[];
		const primaryKey = v3 ? v3.primaryKey : table.model.primaryKey;

		if (statement.kind === "select") {
			const predicate = statement.where ? bindNameExpr(statement.where, specs) : undefined;
			const projected =
				statement.columns === "*" ? columns.map((c) => c.name) : statement.columns;
			const rows: Record<string, unknown>[] = [];
			const limit = statement.limit ?? Number.POSITIVE_INFINITY;

			const take = (values: readonly SqlValue[]) => {
				if (!predicatePasses(predicate, values as SqlValue[])) return false;

				const record = this.rowRecord(columns, values);
				rows.push(
					statement.columns === "*"
						? record
						: Object.fromEntries(projected.map((name) => [name, record[name]])),
				);

				return rows.length >= limit;
			};

			if (v3) {
				let cursor = null;
				for (;;) {
					const page = await v3.scan({ limit: 200, cursor });
					let done = false;
					for (const row of page.rows) {
						if (!row.live) continue;
						if (take(row.values)) {
							done = true;
							break;
						}
					}
					if (done) break;
					cursor = page.cursor;
					if (!page.cursor) break;
				}
			} else {
				for (const values of await table.select()) if (take(values)) break;
			}

			return {
				columns: projected,
				rows,
				message: `${rows.length} row${rows.length === 1 ? "" : "s"}`,
			};
		}

		if (statement.kind === "insert") {
			const names = statement.columns ?? columns.map((c) => c.name);
			const records = statement.rows.map((row) =>
				Object.fromEntries(names.map((name, index) => [name, row[index]])),
			);

			if (v3) {
				for (const record of records) await v3.insert(this.coerceColumns(columns, record));
			} else {
				await table.insert(records.map((record) => this.coerceRecord(table.model, record)));
			}

			return {
				columns: [],
				rows: [],
				message: `Inserted ${records.length} row${records.length === 1 ? "" : "s"}`,
			};
		}

		const target = equalityTarget(statement.where, statement.table);

		if (!target || target.column !== columns[primaryKey].name) {
			throw new Error(
				`${statement.kind.toUpperCase()} requires WHERE ${columns[primaryKey].name} = <literal>`,
			);
		}

		const key = coerceValue(target.value as SqlValue, columns[primaryKey] as ColumnSpec);

		if (statement.kind === "update") {
			if (v3) {
				await v3.update(key, statement.assignments);
			} else {
				await table.updateByKey(
					key,
					statement.assignments.map((assignment) => ({
						column: table.model.columns.findIndex((entry) => entry.name === assignment.column),
						value: coerceValue(
							assignment.value as SqlValue,
							specs.find((c) => c.name === assignment.column)!,
						),
					})),
				);
			}

			return { columns: [], rows: [], message: `Updated 1 row` };
		}

		if (v3) await v3.delete(key);
		else await table.softDeleteByKey(key);

		return { columns: [], rows: [], message: `Deleted 1 row` };
	}

	private rowRecord(
		columns: ReadonlyArray<{ name: string; type: ColumnTypeName }>,
		values: readonly SqlValue[],
	): RowRecord {
		const record: RowRecord = {};
		columns.forEach((column, index) => {
			record[column.name] = displayValue(values[index], column as ColumnSpec);
		});
		return record;
	}
}

type StatementResult = {
	columns: string[];
	rows: Record<string, unknown>[];
	message: string;
};

export { PROGRAM_NOT_WIRED };
