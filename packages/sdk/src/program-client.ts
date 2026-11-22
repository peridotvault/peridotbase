import { AnchorProvider, Program, type Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
	LAYOUT_VERSION,
	PeridotBase,
	addMemberDigest,
	bindNameExpr,
	callFunction,
	castValue,
	coerceValue,
	closeDatabaseDigest,
	compareValues,
	databasePda,
	displayValue,
	evalArithmetic,
	evalRangeOp,
	expr,
	equalityTarget,
	organizationPda,
	parseSql,
	predicatePasses,
	projectPda,
	removeMemberDigest,
	renameDigest,
	storagePdaV3,
	transferOwnerDigest,
	updateMemberDigest,
	type AggregateFn,
	type ForeignKeySpec,
	type ColumnSpec,
	type ColumnTypeName,
	type NameExpr,
	type SelectItem,
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
	AuditAction,
	AuditEvent,
	CreateDomainPayload,
	CreateEnumPayload,
	CreateSponsorAllowancePayload,
	DatabaseTypeInfo,
	SchemaCatalogInfo,
	DatabaseAudit,
	DatabaseInfo,
	DatabaseGrant,
	AuditVerification,
	DeleteRowsResult,
	ExecuteQueryRequest,
	IndexInfo,
	MutationResult,
	OrganizationInfo,
	OrganizationActionPayload,
	OrganizationMemberInfo,
	OrganizationMemberRole,
	OrganizationPolicyInfo,
	OrganizationPolicyPayload,
	OrganizationProposalInfo,
	ProjectInfo,
	QueryResult,
	QueryRunStepEvent,
	ReadRowsQuery,
	Relationship,
	RenameColumnPayload,
	RenameTablePayload,
	RowKey,
	RowPage,
	RowRecord,
	TableInfo,
	TableRef,
	TableGuards,
	TableStorage,
	TablePolicies,
	TablePolicy,
	TablePolicyWrite,
	ExtensionPolicyInfo,
	PolicyProposalInfo,
	SetTablePartitioningPayload,
	SponsorAllowance,
	TopUpSponsorAllowancePayload,
} from "./types/index.js";
import { PROGRAM_NOT_WIRED } from "./types/capabilities.js";
import { ORGANIZATION_ACTIONS, ORGANIZATION_ACTION_BITS } from "./types/workspace.js";

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
	integer: "i64",
	bigint: "i64",
	smallint: "i64",
	number: "i64",
	decimal: "decimal",
	numeric: "decimal",
	real: "decimal",
	float: "decimal",
	double: "decimal",
	"double precision": "decimal",
	money: "decimal",
	uuid: "uuid",
	text: "text",
	varchar: "text",
	char: "text",
	"character varying": "text",
	timestamp: "timestamp",
	timestamptz: "timestamp",
	"timestamp with time zone": "timestamp",
	"timestamp without time zone": "timestamp",
	date: "date",
	time: "time",
	timetz: "time",
	interval: "interval",
	address: "address",
	inet: "inet",
	cidr: "cidr",
	macaddr: "macaddr",
	macaddr8: "macaddr",
	bit: "bit",
	varbit: "varbit",
	range: "range",
	numrange: "numrange",
	tsrange: "tsrange",
	daterange: "daterange",
};

/** SQL `DEFAULT` generators the program/SDK can produce without a literal. */
const DEFAULT_EXPRS: Record<string, NonNullable<ColumnSpec["defaultExpr"]>> = {
	"uuidv7()": "uuidv7",
	"gen_random_uuid()": "uuidv7",
	"uuid_generate_v4()": "uuidv7",
	"now()": "now",
	current_timestamp: "now",
	"current_timestamp()": "now",
	"current_signer()": "currentSigner",
	"auth.uid()": "currentSigner",
};

const columnTypeOf = (value: string): ColumnTypeName => {
	const type = COLUMN_TYPES[value.toLowerCase()];
	if (!type) {
		throw new Error(`unsupported column type: ${value}`);
	}
	return type;
};

/** `DEFAULT` text → literal value or generator marker. */
const columnDefaultOf = (
	value: string | undefined,
	column: ColumnSpec,
): Partial<ColumnSpec> => {
	const raw = value?.trim();
	if (!raw) return {};
	const expr = DEFAULT_EXPRS[raw.toLowerCase().replace(/\s+/g, "")];
	if (expr) {
		const expected =
			expr === "uuidv7" ? "uuid" : expr === "currentSigner" ? "address" : "timestamp";
		if (
			expr === "now" ? !["timestamp", "i64"].includes(column.type) : column.type !== expected
		) {
			throw new Error(`DEFAULT ${raw} needs a ${expected} column, not ${column.type}`);
		}
		return { defaultExpr: expr };
	}
	return { default: coerceValue(raw, column) };
};

const POLICY_OPS = { insert: 0x01, update: 0x02, delete: 0x04, select: 0x08 } as const;

const toPolicyDef = (policy: TablePolicyWrite) => ({
	policyId: BigInt(policy.policyId),
	role: policy.role,
	ops: policy.ops.reduce((mask, op) => mask | POLICY_OPS[op], 0),
});

type ProgramPolicyProposal = {
	proposalId: { toString(): string };
	proposer: PublicKey;
	eta: { toString(): string };
	policies: Array<{
		policyId: { toString(): string };
		role: Record<string, unknown>;
		ops: number;
		predicate: number[];
	}>;
	approvals: PublicKey[];
	createdAt: { toString(): string };
};

const policyFromModel = (policy: {
	policyId: bigint;
	role: string;
	ops: number;
	predicate: Buffer;
}): TablePolicy => ({
	policyId: policy.policyId.toString(),
	role: policy.role === "admin" || policy.role === "owner" ? policy.role : ("member" as const),
	ops: (Object.keys(POLICY_OPS) as Array<keyof typeof POLICY_OPS>).filter(
		(op) => (policy.ops & POLICY_OPS[op]) !== 0,
	),
	predicate: policy.predicate.toString("hex"),
});

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

/** Encoded length of a `ForeignKeyRef` body: table, id, actions, parent column, index id. */
const FK_EXPR_LEN = 32 + 8 + 1 + 1 + 1 + 8;

/** Audit payloads are caller commitments; render text when possible, base64 otherwise. */
const auditPayload = (bytes: Uint8Array): string | null => {
	if (bytes.length === 0) return null;
	const buffer = Buffer.from(bytes);
	const text = buffer.toString("utf8");

	return /^[\t\n\r\x20-\x7e]*$/.test(text) ? text : buffer.toString("base64");
};

/**
 * Catalog shape the key planner needs for a table that is still only staged in a batch: the
 * columns, the primary key and the unique indexes `createTable` will mint, in the same ids.
 */
const stagedModel = (
	statement: Extract<Statement, { kind: "createTable" }>,
	tableId: bigint,
): TableModel => {
	const position = (name: string) => {
		const index = statement.columns.findIndex((column) => column.name === name);

		if (index < 0) throw new Error(`unknown column: ${name}`);

		return index;
	};
	const compositePrimaryKey = statement.constraints.find(
		(constraint) => constraint.kind === "compositePrimaryKey",
	) as { columns: string[] } | undefined;
	const primaryKey = statement.constraints.find(
		(constraint) => constraint.kind === "primaryKey",
	) as { column: string } | undefined;
	const unique = statement.constraints.filter(
		(constraint) => constraint.kind === "unique" || constraint.kind === "compositeUnique",
	) as Array<
		{ kind: "unique"; column: string } | { kind: "compositeUnique"; columns: string[] }
	>;

	return {
		name: statement.name,
		tableId,
		columns: statement.columns,
		primaryKeyColumns: compositePrimaryKey
			? compositePrimaryKey.columns.map(position)
			: [primaryKey ? position(primaryKey.column) : 0],
		indexes: unique.map((constraint, offset) => ({
			indexId: BigInt(offset + 1),
			unique: true,
			columns:
				constraint.kind === "unique"
					? [position(constraint.column)]
					: constraint.columns.map(position),
		})),
	} as unknown as TableModel;
};

type DecodedForeignKey = {
	fkId: bigint;
	parentTable: PublicKey;
	childColumn: number;
	parentColumn: number;
	parentIndexId: bigint;
	childColumns: number[];
};

/**
 * `ConstraintDef.expr` for a foreign key is the serialized `ForeignKeyRef`: parent table, FK id,
 * actions, parent column, UNIQUE index id, then the ordered child columns for composite keys.
 */
const decodeForeignKey = (column: number, expr: Uint8Array): DecodedForeignKey | null => {
	const bytes = Buffer.from(expr);

	if (bytes.length < FK_EXPR_LEN) return null;

	const parentColumn = bytes[42];
	const parentIndexId = bytes.readBigUInt64LE(43);
	const childColumns =
		bytes.length > FK_EXPR_LEN ? Array.from(bytes.subarray(53, 53 + bytes[52])) : [column];

	if (bytes.length > FK_EXPR_LEN && childColumns.length < 2) return null;

	return {
		fkId: bytes.readBigUInt64LE(32),
		parentTable: new PublicKey(bytes.subarray(0, 32)),
		childColumn: column,
		parentColumn,
		parentIndexId,
		childColumns,
	};
};

/** The column a single-column FK points at. */
const parentColumnOf = (foreignKey: DecodedForeignKey): number => foreignKey.parentColumn;

/**
 * The program freezes any account whose layout tag is not `LAYOUT_VERSION`. Anchor still
 * decodes those accounts in `.all()` and throws `Invalid bool: N`, because a stale catalog
 * has a different field order at the same discriminator. Filter in the RPC query instead.
 *
 * Every versioned catalog writes `bump` at offset 8 and `version` at offset 9.
 */
/** Base58 digits; a single-byte value below 58 encodes to its own digit. */
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const CURRENT_LAYOUT_FILTER = {
	memcmp: { offset: 9, bytes: BASE58[LAYOUT_VERSION] },
};

/**
 * Human label for one statement in the runner stepper. The wait is on-chain, so the label says
 * what is being done rather than repeating the SQL the user already wrote.
 */
const statementLabel = (statement: Statement): string => {
	switch (statement.kind) {
		case "createDatabase":
			return `CREATE DATABASE ${statement.name}`;
		case "createTable":
			return `CREATE TABLE ${statement.name}`;
		case "createIndex":
			return `CREATE INDEX ${statement.name}`;
		case "alterTable":
			return `ALTER TABLE ${statement.table}`;
		case "insert":
			return `INSERT INTO ${statement.table}`;
		case "select":
			return `SELECT from ${statement.table}`;
		case "update":
			return `UPDATE ${statement.table}`;
		case "delete":
			return `DELETE from ${statement.table}`;
		case "createView":
			return `CREATE VIEW ${statement.name}`;
		case "dropView":
			return `DROP VIEW ${statement.name}`;
		case "explain":
			return "EXPLAIN";
		case "setOp":
			return statement.op.toUpperCase();
		case "with":
			return "WITH";
	}
};

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
	/** In-flight catalog scans, so parallel callers share one `getProgramAccounts`. */
	private readonly catalogScans = new Map<string, Promise<unknown>>();

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

		const info = await this.connection.getAccountInfo(organization, "confirmed");

		if (!info) {
			await this.sdk.createOrganization({
				organizationId: scopeId(scope.organization),
				name: scope.organization,
				creator,
			});
			return organization;
		}

		// Exists but may predate the current layout; never decode it then.
		await this.requireCurrentLayout(organization, "Organization", scope.organization);
		return organization;
	}

	private async projectOf(scope: ScopeRef): Promise<PublicKey> {
		const organization = await this.organizationOf(scope);
		const project = projectPda(organization, scopeId(scope.project))[0];

		const info = await this.connection.getAccountInfo(project, "confirmed");

		if (!info) {
			await this.sdk.createProject({
				projectId: scopeId(scope.project),
				name: scope.project,
				organization,
			});
			return project;
		}

		await this.requireCurrentLayout(project, "Project", scope.project);
		return project;
	}

	private requireScope(): ScopeRef {
		const scope = this.resolveScope();

		if (!scope) throw new Error("Open an organization and project first");

		return scope;
	}

	/**
	 * The best active allowance this wallet is a grantee of, so v3 mutations charge the
	 * sponsor until the cap is spent. Looked up once per client; a new session re-reads.
	 */
	private async grantedAllowance(): Promise<PublicKey | undefined> {
		const grantee = this.wallet?.wallet?.address;
		if (!grantee) return undefined;

		const program = this.sdk.program as unknown as {
			account: {
				sponsorAllowance: {
					all: (filters: Array<{ memcmp: { offset: number; bytes: string } }>) => Promise<
						Array<{
							publicKey: PublicKey;
							account: {
								cap: { toString(): string };
								spent: { toString(): string };
								expiresAt: { toString(): string };
							};
						}>
					>;
				};
			};
		};

		// Layout: 8-byte discriminator, bump, version, sponsor, then grantee.
		const entries = await program.account.sponsorAllowance.all([
			CURRENT_LAYOUT_FILTER,
			{ memcmp: { offset: 42, bytes: grantee } },
		]);
		const now = Math.floor(Date.now() / 1000);
		const active = entries
			.filter(({ account }) => {
				const expiresAt = Number(account.expiresAt.toString());
				return (
					(expiresAt === 0 || expiresAt > now) &&
					Number(account.cap.toString()) > Number(account.spent.toString())
				);
			})
			.sort(
				(a, b) =>
					Number(b.account.cap.toString()) -
					Number(b.account.spent.toString()) -
					(Number(a.account.cap.toString()) - Number(a.account.spent.toString())),
			);

		return active[0]?.publicKey;
	}

	/** Every database of a project that the current program build can decode. */
	private async currentDatabases(project: PublicKey): Promise<
		Array<{
			account: {
				name: string;
				project: PublicKey;
				databaseId: { toString(): string };
				organization: PublicKey;
				mode: unknown;
				tableCount?: number;
			};
		}>
	> {
		const program = this.sdk.program as unknown as {
			account: {
				databaseCatalog: {
					all: (filters: unknown[]) => Promise<
						Array<{
							account: {
								name: string;
								project: PublicKey;
								databaseId: { toString(): string };
								organization: PublicKey;
								mode: unknown;
								tableCount?: number;
							};
						}>
					>;
				};
			};
		};
		// Layout: bump@8, version@9, project@10. Filter server-side so a project page never
		// downloads every catalog in the program; devnet throttles `getProgramAccounts` hard.
		// The scan is also shared: parallel screens must not each repeat it and trigger a 429.
		const scanKey = `databases:${project.toBase58()}`;
		let scan = this.catalogScans.get(scanKey) as
			| Promise<
					Array<{
						account: {
							name: string;
							project: PublicKey;
							databaseId: { toString(): string };
							organization: PublicKey;
							mode: unknown;
							tableCount?: number;
						};
					}>
			  >
			| undefined;

		if (!scan) {
			scan = program.account.databaseCatalog.all([
				CURRENT_LAYOUT_FILTER,
				{ memcmp: { offset: 10, bytes: project.toBase58() } },
			]);
			this.catalogScans.set(scanKey, scan);
			scan.catch(() => this.catalogScans.delete(scanKey));
			void scan.then(() => this.catalogScans.delete(scanKey));
		}

		const entries = await scan;

		return entries.filter(({ account }) => account.project.equals(project));
	}

	/** A database-scoped SDK, so `loadTables`/`table` resolve inside the selected database. */
	private async databaseSdk(name: string, schema?: string): Promise<PeridotBase> {
		const cacheKey = `${name}::${schema ?? ""}`;
		const cached = this.databases.get(cacheKey);

		if (cached) return cached;

		const scope = this.requireScope();
		const project = await this.projectOf(scope);
		const accounts = await this.currentDatabases(project);
		// Duplicates predate the create guard. Resolve the newest one instead of whichever
		// account the RPC returned first: that keeps every screen on the same database.
		const match = accounts
			.filter(({ account }: { account: { name: string } }) => account.name === name)
			.reduce<(typeof accounts)[number] | undefined>(
				(newest, entry) =>
					!newest ||
					BigInt(entry.account.databaseId.toString()) >
						BigInt(newest.account.databaseId.toString())
						? entry
						: newest,
				undefined,
			);

		if (!match) {
			throw new Error(
				`unknown database: ${name}. A database created by an older program build cannot be read; create a new one.`,
			);
		}

		const scoped = new PeridotBase({
			program: this.sdk.program,
			connection: this.connection,
			databaseId: BigInt(match.account.databaseId.toString()),
			organization: new PublicKey(match.account.organization),
			project,
			schema,
			// A named schema still sees the default one, so existing names keep resolving.
			searchPath: schema && schema !== "public" ? [schema, "public"] : undefined,
			sponsorAllowance: await this.grantedAllowance(),
		});

		this.databases.set(cacheKey, scoped);

		return scoped;
	}

	private async tableOf(ref: TableRef): Promise<Table> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		return sdk.table(ref.table);
	}

	/** Resolves the table plus its v3 storage layout. The Studio is v3-only. */
	private async tableContext(ref: TableRef): Promise<{
		sdk: PeridotBase;
		table: Table;
		v3: V3Table;
	}> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const v3 = await loadV3Table(sdk, table.model.tableId);

		if (!v3) {
			throw new Error(
				`Table "${ref.table}" has no v3 record storage. The Studio only reads and writes v3 tables; recreate it.`,
			);
		}

		return { sdk, table, v3 };
	}

	/**
	 * The program rejects any account whose layout tag is not the current `LAYOUT_VERSION` with
	 * `IncompatibleAccountVersion`, so catalogs written by an older program build are frozen
	 * on-chain. Compare against the SDK constant, never a literal: the program bumps it.
	 */
	private async requireCurrentLayout(
		address: PublicKey,
		kind: string,
		name: string,
	): Promise<void> {
		const info = await this.connection.getAccountInfo(address, "confirmed");
		const version = info && info.data.length > 9 ? info.data[9] : -1;

		if (version === LAYOUT_VERSION) return;

		throw new Error(
			`${kind} "${name}" uses layout v${version < 0 ? "?" : version}, but the program requires v${LAYOUT_VERSION}. ` +
				"It was created by an older program build; create a new one to keep working.",
		);
	}

	private async requireCurrentDatabase(sdk: PeridotBase, database: string): Promise<void> {
		await this.requireCurrentLayout(sdk.databaseAddress(), "Database", database);
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

	async transferOrganizationOwner(
		organization: string,
		newOwner: string,
		proposalId?: string,
	): Promise<MutationResult> {
		const address = this.organizationBySlug(organization);
		const signature = await this.sdk.transferOrganizationOwner(
			address,
			new PublicKey(newOwner),
			proposalId === undefined ? undefined : Number(proposalId),
		);

		return { message: `Transferred ${organization} to ${newOwner}`, signature };
	}

	async getOrganizationPolicy(organization: string): Promise<OrganizationPolicyInfo | null> {
		const address = this.organizationBySlug(organization);
		const policy = await this.sdk.organizationPolicyInfo(address);

		if (!policy) return null;

		const guarded = Number(policy.guardedActions);
		const recovery = (policy.recoveryAuthority as PublicKey).toBase58();
		const readyAt = Number(policy.recoveryReadyAt.toString());

		return {
			signers: (policy.signers as PublicKey[]).map((signer) => signer.toBase58()),
			threshold: Number(policy.threshold),
			guardedActions: ORGANIZATION_ACTIONS.filter(
				(action) => (guarded & ORGANIZATION_ACTION_BITS[action]) !== 0,
			),
			recoveryAuthority: recovery === PublicKey.default.toBase58() ? null : recovery,
			recoveryDelaySeconds: Number(policy.recoveryDelaySecs),
			recoveryReadyAt: readyAt === 0 ? null : readyAt,
			epoch: policy.epoch.toString(),
			proposalCounter: policy.proposalCounter.toString(),
			createdAt: Number(policy.createdAt.toString()),
		};
	}

	async setOrganizationPolicy(
		organization: string,
		payload: OrganizationPolicyPayload,
		proposalId?: string,
	): Promise<MutationResult> {
		const address = this.organizationBySlug(organization);
		const signature = await this.sdk.setOrganizationPolicy(
			address,
			{
				signers: payload.signers.map((signer) => new PublicKey(signer)),
				threshold: payload.threshold,
				guardedActions: payload.guardedActions.reduce(
					(mask, action) => mask | ORGANIZATION_ACTION_BITS[action],
					0,
				),
				recoveryAuthority: payload.recoveryAuthority
					? new PublicKey(payload.recoveryAuthority)
					: undefined,
				recoveryDelaySecs: payload.recoveryDelaySeconds,
			},
			proposalId === undefined ? undefined : Number(proposalId),
		);

		return {
			message: `Installed a ${payload.threshold}-of-${payload.signers.length} policy`,
			signature,
		};
	}

	async listOrganizationProposals(organization: string): Promise<OrganizationProposalInfo[]> {
		const address = this.organizationBySlug(organization);
		const program = this.sdk.program as unknown as {
			account: {
				organizationProposal: {
					all: (filters: Array<{ memcmp: { offset: number; bytes: string } }>) => Promise<
						Array<{
							account: {
								proposalId: { toString(): string };
								action: number;
								digest: number[];
								approvers: PublicKey[];
								expiresAt: { toString(): string };
								executed: boolean;
								createdAt: { toString(): string };
							};
						}>
					>;
				};
			};
		};

		// Layout: discriminator, bump, version, then the organization key.
		const entries = await program.account.organizationProposal.all([
			CURRENT_LAYOUT_FILTER,
			{ memcmp: { offset: 10, bytes: address.toBase58() } },
		]);

		return entries
			.map(({ account }) => ({
				proposalId: account.proposalId.toString(),
				action:
					ORGANIZATION_ACTIONS.find(
						(action) => (account.action & ORGANIZATION_ACTION_BITS[action]) !== 0,
					) ?? `0x${Number(account.action).toString(16)}`,
				digest: Buffer.from(account.digest).toString("hex"),
				approvers: account.approvers.map((signer) => signer.toBase58()),
				expiresAt: Number(account.expiresAt.toString()),
				executed: account.executed,
				createdAt: Number(account.createdAt.toString()),
			}))
			.sort((a, b) => Number(a.proposalId) - Number(b.proposalId));
	}

	async proposeOrganizationAction(
		organization: string,
		payload: OrganizationActionPayload & { proposalId: string; expiresAt?: number },
	): Promise<MutationResult> {
		const address = this.organizationBySlug(organization);
		const digest = await this.organizationDigest(organization, payload);

		const signature = await this.sdk.proposeOrganizationAction(address, {
			proposalId: Number(payload.proposalId),
			action: ORGANIZATION_ACTION_BITS[payload.action],
			digest,
			expiresAt: payload.expiresAt,
		});

		return { message: `Proposed ${payload.action} as ${payload.proposalId}`, signature };
	}

	private async organizationDigest(
		organization: string,
		payload: OrganizationActionPayload,
	): Promise<Buffer> {
		const address = this.organizationBySlug(organization);

		switch (payload.action) {
			case "transferOwner":
				return transferOwnerDigest(address, new PublicKey(payload.newOwner));
			case "rename":
				return renameDigest(address, payload.name);
			case "addMember":
				return addMemberDigest(address, new PublicKey(payload.principal), payload.role);
			case "removeMember":
				return removeMemberDigest(address, new PublicKey(payload.principal));
			case "updateMember":
				return updateMemberDigest(address, new PublicKey(payload.principal), payload.role);
			case "closeDatabase": {
				const sdk = await this.databaseSdk(payload.database);

				return closeDatabaseDigest(address, sdk.databaseAddress());
			}
		}
	}

	async approveOrganizationAction(
		organization: string,
		proposalId: string,
	): Promise<MutationResult> {
		const signature = await this.sdk.approveOrganizationAction(
			this.organizationBySlug(organization),
			Number(proposalId),
		);

		return { message: `Approved proposal ${proposalId}`, signature };
	}

	async closeOrganizationProposal(
		organization: string,
		proposalId: string,
	): Promise<MutationResult> {
		const signature = await this.sdk.closeOrganizationProposal(
			this.organizationBySlug(organization),
			Number(proposalId),
		);

		return { message: `Closed proposal ${proposalId}`, signature };
	}

	async initiateOrganizationRecovery(organization: string): Promise<MutationResult> {
		const signature = await this.sdk.initiateOrganizationRecovery(
			this.organizationBySlug(organization),
		);

		return { message: "Recovery started", signature };
	}

	async cancelOrganizationRecovery(organization: string): Promise<MutationResult> {
		const signature = await this.sdk.cancelOrganizationRecovery(
			this.organizationBySlug(organization),
		);

		return { message: "Recovery cancelled", signature };
	}

	async executeOrganizationRecovery(
		organization: string,
		signers: string[],
		threshold: number,
	): Promise<MutationResult> {
		const signature = await this.sdk.executeOrganizationRecovery(
			this.organizationBySlug(organization),
			{ signers: signers.map((signer) => new PublicKey(signer)), threshold },
		);

		return { message: `Recovered the organization with ${signers.length} signers`, signature };
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
		await this.requireCurrentLayout(organizationAddress, "Organization", organization);
		const projectId = scopeId(slug);

		await this.sdk.createProject({ projectId, name: slug, organization: organizationAddress });

		return {
			slug,
			name: slug,
			organization,
			address: projectPda(organizationAddress, projectId)[0].toBase58(),
		};
	}

	private organizationBySlug(slug: string): PublicKey {
		return organizationPda(this.requireWallet(), scopeId(slug))[0];
	}

	/**
	 * The organization account stores the owner; every other principal has a separate membership
	 * account. Anchor has no reverse index, so this scans the membership accounts and filters.
	 */
	async listOrganizationMembers(organization: string): Promise<OrganizationMemberInfo[]> {
		const address = this.organizationBySlug(organization);

		if (!(await this.connection.getAccountInfo(address, "confirmed"))) return [];

		await this.requireCurrentLayout(address, "Organization", organization);
		const account = await this.sdk.organizationInfo(address);

		const program = this.sdk.program as unknown as {
			account: { organizationMember: { all: (filters: unknown[]) => Promise<unknown[]> } };
		};
		const memberships = (await program.account.organizationMember.all([
			CURRENT_LAYOUT_FILTER,
			{ memcmp: { offset: 10, bytes: address.toBase58() } },
		])) as Array<{
			account: {
				organization: unknown;
				principal: unknown;
				role: unknown;
				generation: unknown;
			};
		}>;

		return [
			{
				principal: new PublicKey(account.owner as never).toBase58(),
				role: "owner",
				generation: null,
			},
			...memberships
				.filter(({ account: member }) =>
					new PublicKey(member.organization as never).equals(address),
				)
				.map(({ account: member }) => ({
					principal: new PublicKey(member.principal as never).toBase58(),
					role: (typeof member.role === "string"
						? member.role
						: Object.keys(member.role as object)[0]) as OrganizationMemberRole,
					generation: Number(member.generation),
				})),
		];
	}

	private memberPrincipal(principal: string): PublicKey {
		try {
			return new PublicKey(principal);
		} catch {
			throw new Error("Enter a valid Solana wallet address");
		}
	}

	async addOrganizationMember(
		organization: string,
		principal: string,
		role: Exclude<OrganizationMemberRole, "owner">,
		proposalId?: string,
	): Promise<MutationResult> {
		const address = this.organizationBySlug(organization);
		const signature = await this.sdk.addOrganizationMember(
			address,
			this.memberPrincipal(principal),
			role,
			proposalId === undefined ? undefined : Number(proposalId),
		);

		return { message: `Added ${principal} as ${role}`, signature };
	}

	async updateOrganizationMember(
		organization: string,
		principal: string,
		role: Exclude<OrganizationMemberRole, "owner">,
		proposalId?: string,
	): Promise<MutationResult> {
		const address = this.organizationBySlug(organization);
		const signature = await this.sdk.updateOrganizationMember(
			address,
			this.memberPrincipal(principal),
			role,
			proposalId === undefined ? undefined : Number(proposalId),
		);

		return { message: `Updated ${principal} to ${role}`, signature };
	}

	async removeOrganizationMember(
		organization: string,
		principal: string,
		proposalId?: string,
	): Promise<MutationResult> {
		const address = this.organizationBySlug(organization);
		const signature = await this.sdk.removeOrganizationMember(
			address,
			this.memberPrincipal(principal),
			proposalId === undefined ? undefined : Number(proposalId),
		);

		return { message: `Removed ${principal}`, signature };
	}

	async listDatabases(): Promise<DatabaseInfo[]> {
		const scope = this.requireScope();
		const project = await this.projectOf(scope);
		const accounts = await this.currentDatabases(project);

		return accounts
			.filter(({ account }: { account: { mode: unknown } }) => {
				// Anchor decodes a unit enum variant as `{ variant: {} }`.
				const mode =
					typeof account.mode === "string"
						? account.mode
						: Object.keys(account.mode as object)[0];
				// Anchor keeps the Rust variant case (`Closed`), so compare loosely.
				return mode.toLowerCase() !== "closed";
			})
			.map(
				({
					account,
				}: {
					account: { name: string; organization: unknown; tableCount?: number };
				}): DatabaseInfo => ({
					name: account.name,
					owner: new PublicKey(account.organization as never).toBase58(),
					// `table_count` is a lifetime counter: dropped and closed tables still count.
					// Live counts come from `listTables`; the Studio never renders this as live.
					size: `${account.tableCount ?? 0} created`,
					encoding: DATABASE_ENCODING,
				}),
			);
	}

	async createDatabase(name: string): Promise<DatabaseInfo> {
		const scope = this.requireScope();
		const project = await this.projectOf(scope);
		await this.requireCurrentLayout(project, "Project", scope.project);
		await this.requireCurrentLayout(
			this.organizationBySlug(scope.organization),
			"Organization",
			scope.organization,
		);
		const existing = await this.currentDatabases(project);
		const trimmed = name.trim();

		if (!trimmed) throw new Error("A database needs a name");

		// The name is how every screen addresses a database, so two databases with one name make
		// selection ambiguous. The program claims the name case-folded; matching that here turns
		// the on-chain rejection into a message the user can act on.
		if (existing.some((entry) => entry.account.name.toLowerCase() === trimmed.toLowerCase())) {
			throw new Error(
				`Database "${trimmed}" already exists in this project. Open it from the sidebar, or choose a different name.`,
			);
		}

		let nextId =
			existing.reduce(
				(max: bigint, entry: { account: { databaseId: unknown } }) =>
					BigInt(String(entry.account.databaseId)) > max
						? BigInt(String(entry.account.databaseId))
						: max,
				0n,
			) + 1n;

		// A database created by an older program build still owns its PDA and cannot be
		// decoded, so skip the ids it holds instead of colliding on create.
		while (
			await this.connection.getAccountInfo(
				databasePda(project, nextId, this.sdk.program.programId)[0],
				"confirmed",
			)
		) {
			nextId += 1n;
		}

		await this.sdk.createDatabase({ name: trimmed, databaseId: nextId, project });
		for (const key of this.databases.keys()) {
			if (key === trimmed || key.startsWith(`${trimmed}::`)) this.databases.delete(key);
		}

		return {
			name: trimmed,
			owner: new PublicKey(this.requireWallet()).toBase58(),
			// Fresh catalog: the program's lifetime counter starts at zero.
			size: "0 created",
			encoding: DATABASE_ENCODING,
		} as DatabaseInfo;
	}

	async getDatabaseAudit(database: string): Promise<DatabaseAudit> {
		const sdk = await this.databaseSdk(database);
		const info = await sdk.databaseInfo();
		const trail = await sdk.auditTrail();

		return { required: Boolean(info.requireAudit), sequence: Number(trail?.sequence ?? 0n) };
	}

	async setDatabaseAuditRequired(
		database: string,
		required: boolean,
	): Promise<MutationResult> {
		const sdk = await this.databaseSdk(database);
		await this.requireCurrentDatabase(sdk, database);
		const signature = await sdk.setDatabaseAuditRequired(required);

		return {
			message: required
				? "Audit events are now required for every write"
				: "Audit events are no longer required; existing events stay",
			signature,
		};
	}

	async listAuditEvents(database: string): Promise<AuditEvent[]> {
		const sdk = await this.databaseSdk(database);
		const actions: AuditAction[] = ["insert", "update", "delete", "ddl", "custom"];

		return (await sdk.listAuditEvents()).map((event) => ({
			sequence: Number(event.sequence),
			tableId: event.tableId.toString(),
			actor: event.actor.toBase58(),
			action: actions[event.action - 1] ?? "custom",
			payload: auditPayload(event.payload),
			createdAt: Number(event.createdAt),
		}));
	}

	async listSponsorAllowances(): Promise<SponsorAllowance[]> {
		const sponsor = this.requireWallet().toBase58();
		const program = this.sdk.program as unknown as {
			account: {
				sponsorAllowance: {
					all: (filters: Array<{ memcmp: { offset: number; bytes: string } }>) => Promise<
						Array<{
							publicKey: PublicKey;
							account: {
								sponsor: PublicKey;
								grantee: PublicKey;
								cap: { toString(): string };
								spent: { toString(): string };
								expiresAt: { toString(): string };
								createdAt: { toString(): string };
							};
						}>
					>;
				};
			};
		};

		// Layout: 8-byte discriminator, bump, version, then sponsor and grantee.
		const entries = await program.account.sponsorAllowance.all([
			CURRENT_LAYOUT_FILTER,
			{ memcmp: { offset: 10, bytes: sponsor } },
		]);

		return entries.map(({ publicKey, account }) => ({
			address: publicKey.toBase58(),
			sponsor: account.sponsor.toBase58(),
			grantee: account.grantee.toBase58(),
			cap: Number(account.cap.toString()),
			spent: Number(account.spent.toString()),
			expiresAt: Number(account.expiresAt.toString()),
			createdAt: Number(account.createdAt.toString()),
		}));
	}

	async createSponsorAllowance(
		payload: CreateSponsorAllowancePayload,
	): Promise<MutationResult> {
		this.requireWallet();
		const grantee = new PublicKey(payload.grantee);
		const signature = await this.sdk.createSponsorAllowance({
			grantee,
			cap: BigInt(Math.trunc(payload.cap)),
			expiresAt: BigInt(Math.trunc(payload.expiresAt ?? 0)),
		});

		return { message: `Allowance created for ${grantee.toBase58()}`, signature };
	}

	async topUpSponsorAllowance(payload: TopUpSponsorAllowancePayload): Promise<MutationResult> {
		this.requireWallet();
		const grantee = new PublicKey(payload.grantee);
		const signature = await this.sdk.topUpSponsorAllowance({
			grantee,
			amount: BigInt(Math.trunc(payload.amount)),
			expiresAt:
				payload.expiresAt === undefined ? undefined : BigInt(Math.trunc(payload.expiresAt)),
		});

		return { message: `Allowance topped up for ${grantee.toBase58()}`, signature };
	}

	async closeSponsorAllowance(grantee: string): Promise<MutationResult> {
		this.requireWallet();
		const signature = await this.sdk.closeSponsorAllowance(new PublicKey(grantee));

		return { message: `Allowance closed for ${grantee}`, signature };
	}

	async deleteDatabase(database: string, proposalId?: string): Promise<MutationResult> {
		const sdk = await this.databaseSdk(database);
		await sdk.beginCloseDatabase(
			undefined,
			proposalId === undefined
				? undefined
				: sdk.organizationProposalAddress(sdk.organization, Number(proposalId)),
		);
		const result = await sdk.closeDatabaseContents();

		return {
			message: `Closed ${database}: ${result.tables} tables in ${result.batches} batches`,
			signature: result.finished,
		};
	}

	async cancelCloseDatabase(database: string): Promise<MutationResult> {
		const sdk = await this.databaseSdk(database);
		const signature = await sdk.cancelCloseDatabase();

		return { message: `Cancelled the staged close of ${database}`, signature };
	}

	async renounceDatabaseAuthority(database: string): Promise<MutationResult> {
		const sdk = await this.databaseSdk(database);
		const signature = await sdk.renounceDatabaseAuthority();

		return { message: `Renounced authority over ${database}`, signature };
	}

	async listDatabaseGrants(database: string): Promise<DatabaseGrant[]> {
		const sdk = await this.databaseSdk(database);
		const program = sdk.program as unknown as {
			account: {
				roleGrant: {
					all: (filters: Array<{ memcmp: { offset: number; bytes: string } }>) => Promise<
						Array<{
							account: {
								principal: PublicKey;
								role: Record<string, unknown>;
								grantedBy: PublicKey;
								grantedAt: { toString(): string };
							};
						}>
					>;
				};
			};
		};

		// Layout: 8-byte discriminator, bump, version, then the database key.
		const entries = await program.account.roleGrant.all([
			CURRENT_LAYOUT_FILTER,
			{ memcmp: { offset: 10, bytes: sdk.databaseAddress().toBase58() } },
		]);

		return entries
			.map(({ account }) => ({
				principal: account.principal.toBase58(),
				role:
					Object.keys(account.role)[0] === "admin" ? ("admin" as const) : ("member" as const),
				grantedBy: account.grantedBy.toBase58(),
				grantedAt: Number(account.grantedAt.toString()),
			}))
			.sort((a, b) => a.principal.localeCompare(b.principal));
	}

	async grantDatabaseRole(
		database: string,
		principal: string,
		role: "admin" | "member",
	): Promise<MutationResult> {
		const sdk = await this.databaseSdk(database);
		const signature = await sdk.grantRole(new PublicKey(principal), role);

		return { message: `Granted ${role} on ${database}`, signature };
	}

	async revokeDatabaseRole(database: string, principal: string): Promise<MutationResult> {
		const sdk = await this.databaseSdk(database);
		const signature = await sdk.revokeRole(new PublicKey(principal));

		return { message: `Revoked the grant for ${principal}`, signature };
	}

	async verifyAuditTrail(database: string): Promise<AuditVerification> {
		const sdk = await this.databaseSdk(database);

		return sdk.verifyAuditTrail();
	}

	async listSchemas(database: string): Promise<SchemaCatalogInfo[]> {
		const sdk = await this.databaseSdk(database);
		const program = sdk.program as unknown as {
			account: {
				schemaCatalog: {
					all: (
						filters: Array<{ memcmp: { offset: number; bytes: string } }>,
					) => Promise<
						Array<{ account: { name: string; createdAt: { toString(): string } } }>
					>;
				};
			};
		};

		// Layout: 8-byte discriminator, bump, version, then the database key.
		const entries = await program.account.schemaCatalog.all([
			CURRENT_LAYOUT_FILTER,
			{ memcmp: { offset: 10, bytes: sdk.databaseAddress().toBase58() } },
		]);

		return entries
			.map(({ account }) => ({
				schemaName: account.name,
				createdAt: Number(account.createdAt.toString()),
			}))
			.sort((a, b) => a.schemaName.localeCompare(b.schemaName));
	}

	async createSchema(database: string, name: string): Promise<MutationResult> {
		const sdk = await this.databaseSdk(database);
		await this.requireCurrentDatabase(sdk, database);
		const signature = await sdk.createSchema(name);

		return { message: `Created schema ${name}`, signature };
	}

	async listDatabaseTypes(database: string): Promise<DatabaseTypeInfo[]> {
		const sdk = await this.databaseSdk(database);
		const program = sdk.program as unknown as {
			account: {
				typeCatalog: {
					all: (filters: Array<{ memcmp: { offset: number; bytes: string } }>) => Promise<
						Array<{
							account: {
								name: string;
								kind: Record<string, unknown>;
								base: Record<string, unknown>;
								scale: number;
								enumValues: unknown[];
								createdAt: { toString(): string };
							};
						}>
					>;
				};
			};
		};

		const entries = await program.account.typeCatalog.all([
			CURRENT_LAYOUT_FILTER,
			{ memcmp: { offset: 10, bytes: sdk.databaseAddress().toBase58() } },
		]);

		return entries
			.map(({ account }) => {
				const kind: "enum" | "domain" =
					Object.keys(account.kind)[0] === "domain" ? "domain" : "enum";
				const base = Object.keys(account.base)[0] ?? "text";

				return {
					typeName: account.name,
					kind,
					base,
					scale: account.scale,
					enumValues: account.enumValues
						.map((value) => displayValue(value as never, { type: base as ColumnTypeName }))
						.filter((value): value is string => value !== null),
					createdAt: Number(account.createdAt.toString()),
				};
			})
			.sort((a, b) => a.typeName.localeCompare(b.typeName));
	}

	async createEnum(database: string, payload: CreateEnumPayload): Promise<MutationResult> {
		const sdk = await this.databaseSdk(database);
		await this.requireCurrentDatabase(sdk, database);
		const signature = await sdk.createEnum(payload.typeName, payload.values);

		return { message: `Created enum ${payload.typeName}`, signature };
	}

	async createDomain(database: string, payload: CreateDomainPayload): Promise<MutationResult> {
		const sdk = await this.databaseSdk(database);
		await this.requireCurrentDatabase(sdk, database);
		const base = payload.base as ColumnTypeName;
		const value = coerceValue(payload.value, { type: base, scale: payload.scale });
		const left = expr.col(0);
		const right = expr.lit(value);
		const check =
			payload.operator === "gt"
				? expr.gt(left, right)
				: payload.operator === "ge"
					? expr.ge(left, right)
					: payload.operator === "lt"
						? expr.lt(left, right)
						: payload.operator === "le"
							? expr.le(left, right)
							: payload.operator === "eq"
								? expr.eq(left, right)
								: expr.ne(left, right);
		const signature = await sdk.createDomain(payload.typeName, {
			base,
			scale: payload.scale,
			check,
		});

		return { message: `Created domain ${payload.typeName}`, signature };
	}

	async listTables(database: string): Promise<TableInfo[]> {
		const sdk = await this.databaseSdk(database);
		const models = await sdk.loadTables();
		const names = await this.schemaNames(sdk, models);

		return models
			.filter((model) => model.status === "active")
			.map((model) => ({
				tableName: model.name,
				schemaName: names.get(model.schema?.toBase58() ?? "") ?? "public",
				rowCount: Number(model.rowCount),
			}));
	}

	/** Soft-dropped catalogs; the row data is still on chain until the table is closed. */
	async listDroppedTables(database: string): Promise<TableInfo[]> {
		const sdk = await this.databaseSdk(database);
		const models = await sdk.loadTables();
		const names = await this.schemaNames(sdk, models);

		return models
			.filter((model) => model.status === "dropped")
			.map((model) => ({
				tableName: model.name,
				schemaName: names.get(model.schema?.toBase58() ?? "") ?? "public",
				rowCount: Number(model.rowCount),
				status: "dropped" as const,
			}));
	}

	/** Schema address -> name for every namespace in the database (default included). */
	private async schemaNames(
		sdk: PeridotBase,
		models: TableModel[],
	): Promise<Map<string, string>> {
		const names = new Map<string, string>();
		const defaultSchema = (await sdk.schemaAddress()).toBase58();
		names.set(defaultSchema, "public");
		const addresses = new Set(
			models
				.map((model) => model.schema?.toBase58())
				.filter((value): value is string => Boolean(value)),
		);
		// The default namespace is already named above; do not fetch it again.
		addresses.delete(defaultSchema);
		const program = sdk.program as unknown as {
			account: {
				schemaCatalog: {
					fetchNullable: (address: PublicKey) => Promise<{ name: string } | null>;
				};
			};
		};

		await Promise.all(
			[...addresses].map(async (address) => {
				const info = await program.account.schemaCatalog
					.fetchNullable(new PublicKey(address))
					.catch(() => null);

				if (info) names.set(address, info.name);
			}),
		);

		return names;
	}

	async getTableColumns(ref: TableRef): Promise<ColumnInfo[]> {
		const table = await this.tableOf(ref);
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		const models = await sdk.loadTables();
		const byAddress = new Map(models.map((model) => [model.address.toBase58(), model]));

		return this.columnsOf(table.model, byAddress, await this.schemaNames(sdk, models));
	}

	/**
	 * Live tables plus their columns from a single catalog scan. `getTableColumns` per table
	 * rescans the whole catalog every call, which the visualizer did N times.
	 */
	async listTablesWithColumns(
		database: string,
	): Promise<Array<TableInfo & { columns: ColumnInfo[] }>> {
		const sdk = await this.databaseSdk(database);
		const models = await sdk.loadTables();
		const names = await this.schemaNames(sdk, models);
		const byAddress = new Map(models.map((model) => [model.address.toBase58(), model]));

		return models
			.filter((model) => model.status === "active")
			.map((model) => ({
				tableName: model.name,
				schemaName: names.get(model.schema?.toBase58() ?? "") ?? "public",
				rowCount: Number(model.rowCount),
				columns: this.columnsOf(model, byAddress, names),
			}));
	}

	private columnsOf(
		model: TableModel,
		byAddress: Map<string, TableModel> = new Map(),
		schemaNames: Map<string, string> = new Map(),
	): ColumnInfo[] {
		return model.columns.map((column, index) => {
			const notNull = model.constraints.some(
				(constraint) => constraint.kind === "notNull" && constraint.column === index,
			);
			const foreignKeyConstraint = model.constraints.find(
				(constraint) =>
					constraint.kind === "foreignKey" &&
					(constraint.column === index ||
						decodeForeignKey(constraint.column, constraint.expr)?.childColumns.includes(
							index,
						)),
			);
			const foreignKey = foreignKeyConstraint
				? decodeForeignKey(foreignKeyConstraint.column, foreignKeyConstraint.expr)
				: null;
			const parent = foreignKey ? byAddress.get(foreignKey.parentTable.toBase58()) : null;
			const parentIndex = parent?.indexes.find(
				(candidate) => candidate.indexId === foreignKey?.parentIndexId,
			);
			const parentColumnIndex = foreignKey
				? parentIndex && foreignKey.childColumns.length > 1
					? (parentIndex.columns[foreignKey.childColumns.indexOf(index)] ??
						parentIndex.columns[0])
					: parent
						? parentColumnOf(foreignKey)
						: null
				: null;

			return {
				columnName: column.name,
				dataType: this.cellTypeOf(column.type),
				dataTypeLabel: this.labelOf(column.type),
				isNullable:
					Boolean(column.nullable) && !notNull && !model.primaryKeyColumns.includes(index),
				columnDefault:
					column.defaultExpr === "uuidv7"
						? "uuidv7()"
						: column.defaultExpr === "now"
							? "now()"
							: column.defaultExpr === "currentSigner"
								? "current_signer()"
								: column.default === undefined
									? null
									: (displayValue(column.default, column as ColumnSpec) as string),
				isPrimaryKey: model.primaryKeyColumns.includes(index),
				isForeignKey: Boolean(foreignKey),
				referencedTable: parent?.name ?? null,
				// Resolve the parent's schema from its catalog: the FK stores only the
				// parent address, and same-named tables in two schemas must not collide.
				referencedSchema: parent
					? schemaNames.get(parent.schema?.toBase58() ?? "")
					: undefined,
				referencedColumn:
					parent && parentColumnIndex !== null && parentColumnIndex !== undefined
						? (parent.columns[parentColumnIndex]?.name ?? null)
						: null,
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

	async createForeignKey(
		ref: TableRef,
		payload: { column: string; parentTable: string; parentColumn?: string },
	): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const parent = await sdk.table(payload.parentTable);
		const fkId = table.model.constraints.reduce((max, constraint) => {
			if (constraint.kind !== "foreignKey") return max;
			const decoded = decodeForeignKey(constraint.column, constraint.expr);
			return decoded && decoded.fkId >= max ? decoded.fkId + 1n : max;
		}, 1n);
		const signature = await sdk.createForeignKey(table.model.tableId, {
			fkId,
			childColumn: payload.column,
			parentTableId: parent.model.tableId,
			parentColumn: payload.parentColumn,
		});

		return {
			message: `Linked ${ref.table}.${payload.column} to ${payload.parentTable}`,
			signature,
		};
	}

	async createCompositeForeignKey(
		ref: TableRef,
		payload: {
			childColumns: string[];
			parentTable: string;
			parentIndexId?: string;
			match?: "simple" | "full";
		},
	): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const parent = await sdk.table(payload.parentTable);
		const fkId = table.model.constraints.reduce((max, constraint) => {
			if (constraint.kind !== "foreignKey") return max;
			const decoded = decodeForeignKey(constraint.column, constraint.expr);
			return decoded && decoded.fkId >= max ? decoded.fkId + 1n : max;
		}, 1n);
		const signature = await sdk.createCompositeForeignKey(table.model.tableId, {
			fkId,
			childColumns: payload.childColumns,
			parentTableId: parent.model.tableId,
			...(payload.parentIndexId ? { parentIndexId: BigInt(payload.parentIndexId) } : {}),
			...(payload.match ? { match: payload.match } : {}),
		});

		return {
			message: `Linked ${ref.table}(${payload.childColumns.join(", ")}) to ${payload.parentTable}`,
			signature,
		};
	}

	async dropForeignKey(
		ref: TableRef,
		payload: { fkId: string; parentTable: string },
	): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const parent = await sdk.table(payload.parentTable);
		const signature = await sdk.dropForeignKey(table.model.tableId, {
			fkId: BigInt(payload.fkId),
			parentTableId: parent.model.tableId,
		});

		return { message: `Dropped foreign key ${payload.fkId} on ${ref.table}`, signature };
	}

	async duplicateTable(ref: TableRef, newTableName: string): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const created = await sdk.createTableLike(ref.table, {
			tableId: await sdk.nextTableId(),
			name: newTableName,
		});
		// New tables are v3-only in the Studio: without the descriptor every read and
		// write rejects with "no v3 record storage".
		await initV3Storage(sdk, created.model.tableId);

		return { message: `Duplicated ${ref.table} as ${created.model.name}` };
	}

	async getRelationships(database: string): Promise<Relationship[]> {
		const sdk = await this.databaseSdk(database);
		const models = (await sdk.loadTables()).filter((model) => model.status === "active");
		const names = await this.schemaNames(sdk, models);
		const schemaOf = (model: TableModel): string =>
			names.get(model.schema?.toBase58() ?? "") ?? "public";
		const byAddress = new Map(models.map((model) => [model.address.toBase58(), model]));
		const relationships: Relationship[] = [];

		for (const model of models) {
			for (const constraint of model.constraints) {
				if (constraint.kind !== "foreignKey") continue;

				const foreignKey = decodeForeignKey(constraint.column, constraint.expr);
				const parent = foreignKey ? byAddress.get(foreignKey.parentTable.toBase58()) : null;

				if (!foreignKey || !parent) continue;

				const parentIndex = parent.indexes.find(
					(candidate) => candidate.indexId === foreignKey.parentIndexId,
				);
				const parentColumns =
					parentIndex && foreignKey.childColumns.length > 1
						? parentIndex.columns
						: [parentColumnOf(foreignKey)];

				foreignKey.childColumns.forEach((childColumn, position) => {
					const fromColumn = model.columns[childColumn]?.name;
					const toColumn = parent.columns[parentColumns[position] ?? parentColumns[0]]?.name;

					if (!fromColumn || !toColumn) return;

					relationships.push({
						fromTable: model.name,
						fromColumn,
						fromSchema: schemaOf(model),
						toTable: parent.name,
						toColumn,
						toSchema: schemaOf(parent),
						fkId: foreignKey.fkId.toString(),
					});
				});
			}
		}

		return relationships;
	}

	async readRows(ref: TableRef, query: ReadRowsQuery): Promise<RowPage> {
		const { v3 } = await this.tableContext(ref);
		const columns = v3.columns;
		const rows = (await v3.scanAll({ cap: 10_000 }))
			.filter((row) => row.live)
			.map((row) => ({
				record: this.rowRecord(v3.columns, row.values),
				values: row.values,
			}));

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
		const { v3 } = await this.tableContext(ref);
		const errors: Array<{ recordIndex: number; error: string }> = [];
		let successCount = 0;

		for (const [recordIndex, record] of records.entries()) {
			try {
				await v3.insert(this.coerceColumns(v3.columns, record));
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

	private coerceColumns(
		columns: ReadonlyArray<{ name: string; type: ColumnTypeName }>,
		record: RowRecord,
	): Record<string, SqlValue> {
		const out: Record<string, SqlValue> = {};

		for (const column of columns) {
			const value = record[column.name];
			// Leave omitted columns out so the SDK can apply the declared DEFAULT
			// (uuidv7/now/current_signer/literal) instead of sending NULL.
			if (value === undefined) continue;
			out[column.name] = coerceValue(
				value === "" ? null : (value as SqlValue),
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
		const { v3 } = await this.tableContext(ref);
		const columns = v3.columns;
		let updated = 0;

		for (const update of updates) {
			const column = columns.findIndex((entry) => entry.name === update.columnName);

			if (column < 0) throw new Error(`unknown column: ${update.columnName}`);

			const value = update.useDefault
				? (columns[column].default ?? null)
				: coerceValue(update.value as SqlValue, columns[column] as ColumnSpec);

			const primaryKey = this.primaryKeyOf(columns, v3.primaryKey, update.rowData);

			await v3.update(primaryKey, [{ column: update.columnName, value }]);
			updated += 1;
		}

		return { message: `Updated ${updated} row${updated === 1 ? "" : "s"}` };
	}

	async deleteRows(ref: TableRef, keys: RowKey[]): Promise<DeleteRowsResult> {
		const { v3 } = await this.tableContext(ref);
		const columns = v3.columns;

		for (const key of keys) {
			const primaryKey = this.primaryKeyOf(columns, v3.primaryKey, key);

			await v3.delete(primaryKey);
		}

		return {
			deletedCount: keys.length,
			fkViolation: false,
			relatedRecords: [],
		} as DeleteRowsResult;
	}

	async createTable(database: string, payload: CreateTablePayload): Promise<MutationResult> {
		const sdk = await this.databaseSdk(database, payload.schemaName);
		await this.requireCurrentDatabase(sdk, database);
		const models = await sdk.loadTables();
		const tableId =
			models.reduce((max, model) => (model.tableId > max ? model.tableId : max), 0n) + 1n;

		if (!payload.fields.some((field) => field.isPrimaryKey)) {
			throw new Error(
				"A primary key is required: every row is addressed by its key. " +
					"Add `id UUID PRIMARY KEY DEFAULT uuidv7()`.",
			);
		}

		const columns: ColumnSpec[] = payload.fields.map((field) => {
			const type = columnTypeOf(field.columnType);
			const spec: ColumnSpec = {
				name: field.columnName,
				type,
				// A PRIMARY KEY is the record address and can never be null.
				nullable: field.isPrimaryKey ? false : field.isNullable,
				...(field.typeName ? { typeName: field.typeName } : {}),
			};
			return { ...spec, ...columnDefaultOf(field.defaultValue, spec) };
		});

		const constraints: NonNullable<Parameters<PeridotBase["createTable"]>[0]["constraints"]> =
			[];

		for (const field of payload.fields) {
			if (field.isPrimaryKey)
				constraints.push({ kind: "primaryKey", column: field.columnName });
			else if (!field.isNullable)
				constraints.push({ kind: "notNull", column: field.columnName });
		}

		// The program cannot add a composite index after `create_table`, so the
		// declared ones share the same id space as the unique-column indexes.
		const indexes = [
			...payload.fields
				.filter((field) => field.isUnique && !field.isPrimaryKey)
				.map((field) => ({
					name: `${payload.tableName}_${field.columnName}_key`,
					column: field.columnName,
					unique: true,
					// v3 derives claim/posting PDAs itself; the v2 bucket chain is unused.
					bucketCount: 1,
				})),
			...(payload.indexes ?? []).map((index) => ({
				name: index.indexName,
				columns: index.columns,
				unique: index.isUnique,
				bucketCount: 1,
			})),
		].map((index, position) => ({ ...index, indexId: position + 1 }));

		const foreignKeys = this.planForeignKeys(payload, models);

		// Two wallet approvals whatever the key count: the catalog lands first, then every key
		// and the v3 descriptor go together. `flushBatch` packs each phase by packet size.
		sdk.beginBatch();
		try {
			await sdk.createTable({
				tableId,
				name: payload.tableName,
				columns,
				constraints,
				indexes,
			});

			// The program only accepts a foreign key while the child is empty and has no v3
			// descriptor, so this has to run between the catalog and `init_storage_v3`.
			await sdk.flushBatch();
			sdk.beginBatch();

			for (const [position, foreignKey] of foreignKeys.entries()) {
				await sdk.createForeignKey(tableId, {
					fkId: position + 1,
					childColumn: foreignKey.columnName,
					parentTableId: foreignKey.parentTableId,
					parentColumn: foreignKey.referencedColumn,
					onDelete: foreignKey.onDelete,
					onUpdate: foreignKey.onUpdate,
				});
			}

			await initV3Storage(sdk, tableId);
			await sdk.flushBatch();
		} catch (error) {
			if (sdk.batching) sdk.discardBatch();
			throw error;
		}

		return { message: `Created table ${payload.tableName}` };
	}

	/**
	 * Validates every declared foreign key before the table is minted. The program supports only
	 * immediate actions and a single-column target; refusing here keeps a failed create from
	 * leaving a catalog without storage.
	 */
	private planForeignKeys(
		payload: CreateTablePayload,
		models: TableModel[],
	): Array<{
		columnName: string;
		parentTableId: bigint;
		referencedColumn: string;
		onDelete: "restrict" | "noAction";
		onUpdate: "restrict" | "noAction";
	}> {
		const action = (value: string): "restrict" | "noAction" => {
			if (value === "RESTRICT") return "restrict";
			if (value === "NO ACTION") return "noAction";
			throw new IntegrationUnavailableError(
				`foreign key action ${value} (only NO ACTION and RESTRICT are on-chain)`,
			);
		};

		return (payload.foreignKeys ?? []).map((foreignKey) => {
			const child = payload.fields.find((field) => field.columnName === foreignKey.columnName);

			if (!child) throw new Error(`unknown child column: ${foreignKey.columnName}`);

			const parent = models.find((model) => model.name === foreignKey.referencedTable);

			if (!parent) {
				throw new Error(
					`referenced table ${foreignKey.referencedTable} does not exist in this database`,
				);
			}

			const parentColumn = parent.columns.find(
				(column) => column.name === foreignKey.referencedColumn,
			);

			if (!parentColumn) {
				throw new Error(
					`referenced column ${foreignKey.referencedTable}.${foreignKey.referencedColumn} does not exist`,
				);
			}

			if (
				parent.primaryKeyColumns[0] !== parent.columns.indexOf(parentColumn) &&
				!parent.indexes.some(
					(index) =>
						index.unique &&
						index.columns.length === 1 &&
						index.columns[0] === parent.columns.indexOf(parentColumn),
				)
			) {
				throw new Error(
					`${foreignKey.referencedTable}.${foreignKey.referencedColumn} needs a UNIQUE index before it can be referenced`,
				);
			}

			return {
				columnName: foreignKey.columnName,
				parentTableId: parent.tableId,
				referencedColumn: foreignKey.referencedColumn,
				onDelete: action(foreignKey.onDelete),
				onUpdate: action(foreignKey.onUpdate),
			};
		});
	}

	async renameTable(ref: TableRef, payload: RenameTablePayload): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const signature = await sdk.renameTable(table.model.tableId, payload.newTableName);

		return { message: `Renamed table to ${payload.newTableName}`, signature };
	}

	async dropTable(ref: TableRef): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const signature = await sdk.softDropTable(table.model.tableId);
		return { message: `Dropped table ${ref.table}`, signature };
	}

	async restoreTable(ref: TableRef): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const schema = await sdk.schemaAddress();
		// A table name is unique per schema only; restoring the wrong namespace would fail
		// with "not dropped" or bring back the wrong table.
		const model = (await sdk.loadTables()).find(
			(entry) => entry.name === ref.table && (!entry.schema || entry.schema.equals(schema)),
		);

		if (!model) throw new Error(`unknown table: ${ref.table}`);
		if (model.status !== "dropped") throw new Error(`${ref.table} is not dropped`);

		const signature = await sdk.restoreTable(model.tableId);

		return { message: `Restored table ${ref.table}`, signature };
	}

	async getTableComment(ref: TableRef): Promise<string | null> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		const table = await sdk.table(ref.table);

		return sdk.tableComment(table.model.tableId);
	}

	async setTableComment(ref: TableRef, comment: string): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const signature = await sdk.setTableComment(table.model.tableId, comment);

		return {
			message: comment.trim() ? "Table comment saved" : "Table comment cleared",
			signature,
		};
	}

	async getTableGuards(ref: TableRef): Promise<TableGuards> {
		const table = await this.tableOf(ref);

		return table.model.constraints.reduce<TableGuards>(
			(guards, constraint) => {
				if (constraint.kind === "appendOnly") guards.appendOnly = true;
				if (constraint.kind === "denyDelete") guards.denyDelete = true;
				if (constraint.kind === "denyUpdate") guards.denyUpdate = true;
				if (constraint.kind === "immutable") guards.immutable = true;
				if (constraint.kind === "freezePolicies") guards.freezePolicies = true;
				return guards;
			},
			{
				appendOnly: false,
				denyDelete: false,
				denyUpdate: false,
				immutable: false,
				freezePolicies: false,
			},
		);
	}

	async setTableGuards(ref: TableRef, guards: Partial<TableGuards>): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const signature = await sdk.setTableGuard(table.model.tableId, guards);

		return { message: `Updated guards for ${ref.table}`, signature };
	}

	async getTableStorage(ref: TableRef): Promise<TableStorage> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const [storage] = storagePdaV3(table.model.address, sdk.program.programId);
		const descriptor = await (
			this.sdk.program as unknown as {
				account: {
					storageDescriptorV3: {
						fetch: (address: PublicKey) => Promise<{
							historyLimit: number;
							partitionStrategy: number;
							partitionColumn: number;
							partitionBoundsLen: number;
							partitionDefault: boolean;
							partitionBounds: Array<{ toString(): string }>;
						}>;
					};
				};
			}
		).account.storageDescriptorV3.fetch(storage);
		const strategy =
			descriptor.partitionStrategy === 1
				? ("range" as const)
				: descriptor.partitionStrategy === 2
					? ("list" as const)
					: ("none" as const);

		return {
			historyLimit: descriptor.historyLimit,
			partition: {
				strategy,
				column: descriptor.partitionColumn,
				bounds: descriptor.partitionBounds
					.slice(0, descriptor.partitionBoundsLen)
					.map((bound) => bound.toString()),
				hasDefault: descriptor.partitionDefault,
			},
		};
	}

	async setTableHistoryLimit(ref: TableRef, limit: number): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const signature = await sdk.setTableHistoryLimit(table.model.tableId, limit);

		return { message: `Set history retention to ${limit} for ${ref.table}`, signature };
	}

	async setTablePartitioning(
		ref: TableRef,
		payload: SetTablePartitioningPayload,
	): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const signature = await sdk.setTablePartitioning(table.model.tableId, {
			strategy: payload.strategy,
			column: payload.column,
			bounds: payload.bounds,
			defaultPartition: payload.defaultPartition,
		});

		return { message: `Updated partitioning for ${ref.table}`, signature };
	}

	async getTablePolicies(ref: TableRef): Promise<TablePolicies> {
		const table = await this.tableOf(ref);
		const constraints = table.model.constraints;

		return {
			policies: table.model.policies
				.map((policy) => policyFromModel(policy))
				.sort((a, b) => Number(BigInt(a.policyId) - BigInt(b.policyId))),
			timelockSeconds:
				constraints
					.find((constraint) => constraint.kind === "policyTimelock")
					?.expr.readBigUInt64LE() !== undefined
					? Number(
							constraints
								.find((constraint) => constraint.kind === "policyTimelock")!
								.expr.readBigUInt64LE(),
						)
					: null,
			requiresMultisig: constraints.some((constraint) => constraint.kind === "policyMultisig"),
			frozen: constraints.some((constraint) => constraint.kind === "freezePolicies"),
		};
	}

	async setTablePolicies(
		ref: TableRef,
		policies: TablePolicyWrite[],
	): Promise<MutationResult> {
		const table = await this.tableOf(ref);

		if (table.model.policies.some((policy) => policy.predicate.length > 0)) {
			throw new IntegrationUnavailableError("setTablePolicies");
		}

		const signature = await (
			await this.databaseSdk(ref.database, ref.schema)
		).setPolicy(table.model.tableId, policies.map(toPolicyDef));

		return { message: `Replaced policies for ${ref.table}`, signature };
	}

	async setTablePolicyTimelock(ref: TableRef, delaySeconds: number): Promise<MutationResult> {
		const table = await this.tableOf(ref);
		const signature = await (
			await this.databaseSdk(ref.database, ref.schema)
		).setPolicyTimelock(table.model.tableId, delaySeconds);

		return { message: `Timelocked policy changes by ${delaySeconds}s`, signature };
	}

	async setTablePolicyMultisig(
		ref: TableRef,
		signers: string[],
		threshold: number,
	): Promise<MutationResult> {
		const table = await this.tableOf(ref);
		const signature = await (
			await this.databaseSdk(ref.database, ref.schema)
		).setPolicyMultisig(
			table.model.tableId,
			signers.map((signer) => new PublicKey(signer)),
			threshold,
		);

		return {
			message: `Installed ${threshold}-of-${signers.length} policy signers`,
			signature,
		};
	}

	async listPolicyProposals(ref: TableRef): Promise<PolicyProposalInfo[]> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const program = sdk.program as unknown as {
			account: {
				policyProposal: {
					all: (
						filters: Array<{ memcmp: { offset: number; bytes: string } }>,
					) => Promise<Array<{ account: ProgramPolicyProposal }>>;
				};
			};
		};

		const entries = await program.account.policyProposal.all([
			CURRENT_LAYOUT_FILTER,
			{ memcmp: { offset: 10, bytes: table.model.address.toBase58() } },
		]);

		return entries
			.map(({ account }) => ({
				proposalId: account.proposalId.toString(),
				proposer: (account.proposer as PublicKey).toBase58(),
				eta: Number(account.eta.toString()),
				policies: account.policies.map((policy) =>
					policyFromModel({
						policyId: BigInt(policy.policyId.toString()),
						role: Object.keys(policy.role)[0],
						ops: policy.ops,
						predicate: Buffer.from(policy.predicate),
					}),
				),
				approvals: (account.approvals as PublicKey[]).map((signer) => signer.toBase58()),
				createdAt: Number(account.createdAt.toString()),
			}))
			.sort((a, b) => Number(BigInt(a.proposalId) - BigInt(b.proposalId)));
	}

	async proposePolicy(
		ref: TableRef,
		payload: { proposalId: string; policies: TablePolicyWrite[] },
	): Promise<MutationResult> {
		const table = await this.tableOf(ref);
		const signature = await (
			await this.databaseSdk(ref.database, ref.schema)
		).proposePolicy(table.model.tableId, {
			proposalId: BigInt(payload.proposalId),
			policies: payload.policies.map(toPolicyDef),
		});

		return { message: `Proposed policies for ${ref.table}`, signature };
	}

	async approvePolicy(ref: TableRef, proposalId: string): Promise<MutationResult> {
		const table = await this.tableOf(ref);
		const signature = await (
			await this.databaseSdk(ref.database, ref.schema)
		).approvePolicy(table.model.tableId, BigInt(proposalId));

		return { message: `Approved proposal ${proposalId}`, signature };
	}

	async applyPolicy(ref: TableRef, proposalId: string): Promise<MutationResult> {
		const table = await this.tableOf(ref);
		const signature = await (
			await this.databaseSdk(ref.database, ref.schema)
		).applyPolicy(table.model.tableId, BigInt(proposalId));

		return { message: `Applied proposal ${proposalId}`, signature };
	}

	async cancelPolicy(ref: TableRef, proposalId: string): Promise<MutationResult> {
		const table = await this.tableOf(ref);
		const signature = await (
			await this.databaseSdk(ref.database, ref.schema)
		).cancelPolicy(table.model.tableId, BigInt(proposalId));

		return { message: `Cancelled proposal ${proposalId}`, signature };
	}

	async getTableExtensionPolicy(ref: TableRef): Promise<ExtensionPolicyInfo | null> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const program = sdk.program as unknown as {
			account: {
				extensionPolicy: {
					fetchNullable: (address: PublicKey) => Promise<{
						program: PublicKey;
						instruction: number[];
						accounts: Array<{ key: PublicKey; writable: boolean; signer: boolean }>;
					} | null>;
				};
			};
		};
		const info = await program.account.extensionPolicy
			.fetchNullable(sdk.extensionPolicyAddress(table.model.address))
			.catch(() => null);

		if (!info) return null;

		return {
			program: info.program.toBase58(),
			discriminator: Buffer.from(info.instruction).toString("hex"),
			accounts: info.accounts.map((account) => ({
				key: account.key.toBase58(),
				writable: account.writable,
				signer: account.signer,
			})),
		};
	}

	async setTableExtensionPolicy(
		ref: TableRef,
		payload: ExtensionPolicyInfo,
	): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const signature = await sdk.setExtensionPolicy(table.model.tableId, {
			program: new PublicKey(payload.program),
			discriminator: Buffer.from(payload.discriminator, "hex"),
			accounts: payload.accounts.map((account) => ({
				key: new PublicKey(account.key),
				writable: account.writable,
				signer: account.signer,
			})),
		});

		return { message: `Pinned an extension to ${ref.table}`, signature };
	}

	async clearTableExtensionPolicy(ref: TableRef): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const signature = await sdk.clearExtensionPolicy(table.model.tableId);

		return { message: `Cleared the extension on ${ref.table}`, signature };
	}

	async invokeTableExtension(ref: TableRef, dataHex: string): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const program = sdk.program as unknown as {
			account: {
				extensionPolicy: {
					fetch: (address: PublicKey) => Promise<{
						program: PublicKey;
						accounts: Array<{ key: PublicKey; writable: boolean; signer: boolean }>;
					}>;
				};
			};
		};
		const policy = await program.account.extensionPolicy.fetch(
			sdk.extensionPolicyAddress(table.model.address),
		);
		const signature = await sdk.invokeExtension(
			table.model.tableId,
			policy.program,
			Buffer.from(dataHex, "hex"),
			policy.accounts.map((account) => ({
				key: account.key,
				writable: account.writable,
				signer: account.signer,
			})),
		);

		return { message: `Invoked the extension on ${ref.table}`, signature };
	}

	async addColumn(ref: TableRef, payload: AddColumnPayload): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const type = columnTypeOf(payload.columnType);
		const spec: ColumnSpec = {
			name: payload.columnName,
			type,
			nullable: payload.isNullable,
		};
		const defaults = columnDefaultOf(payload.defaultValue, spec);
		if (defaults.defaultExpr) {
			throw new IntegrationUnavailableError(
				"alter table add column with a generator default; the program only stores literal defaults on ALTER",
			);
		}
		const signature = await sdk.alterTable(table.model.tableId, [{ ...spec, ...defaults }]);

		return { message: `Added column ${payload.columnName}`, signature };
	}

	async alterColumn(
		ref: TableRef,
		column: string,
		payload: AlterColumnPayload,
	): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const index = table.model.columns.findIndex((entry) => entry.name === column);

		if (index < 0) throw new Error(`unknown column: ${column}`);

		const spec = table.model.columns[index];

		if (columnTypeOf(payload.columnType) !== spec.type) {
			throw new IntegrationUnavailableError(
				`alter column type (${spec.type} → ${payload.columnType}); the program only changes defaults`,
			);
		}

		const notNull = table.model.constraints.some(
			(constraint) => constraint.kind === "notNull" && constraint.column === index,
		);
		const nullable =
			Boolean(spec.nullable) && !notNull && !table.model.primaryKeyColumns.includes(index);

		if (payload.isNullable !== nullable) {
			throw new IntegrationUnavailableError(
				"alter column nullability; the program only changes defaults",
			);
		}

		if (payload.defaultValue === undefined) {
			return { message: `No change for column ${column}` };
		}

		const signature = await sdk.alterColumnDefault(
			table.model.tableId,
			column,
			payload.defaultValue,
		);

		return { message: `Updated the default for ${column}`, signature };
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
			columns: index.columns.map((column) => model.columns[column]?.name ?? ""),
			isUnique: index.unique,
			method: null,
			kind: index.unique ? "unique-constraint" : "index",
			definition: null,
			indexId: index.indexId.toString(),
			nullsNotDistinct: index.nullsNotDistinct,
		}));
	}

	async createIndex(ref: TableRef, payload: CreateIndexPayload): Promise<MutationResult> {
		if (payload.columns.length > 1) {
			throw new IntegrationUnavailableError(
				"composite index after CREATE TABLE (declare it while creating the table)",
			);
		}

		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
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

	async setIndexNullsNotDistinct(
		ref: TableRef,
		indexName: string,
		nullsNotDistinct: boolean,
	): Promise<MutationResult> {
		const sdk = await this.databaseSdk(ref.database, ref.schema);
		await this.requireCurrentDatabase(sdk, ref.database);
		const table = await sdk.table(ref.table);
		const index = table.model.indexes.find((entry) => entry.name === indexName);

		if (!index) throw new Error(`unknown index: ${indexName}`);

		const signature = await sdk.setIndexNullsNotDistinct(
			table.model.tableId,
			index.indexId,
			nullsNotDistinct,
		);

		return {
			message: `${indexName} ${nullsNotDistinct ? "treats" : "no longer treats"} NULLs as equal`,
			signature,
		};
	}

	async executeQuery(
		database: string,
		request: ExecuteQueryRequest,
		onStep?: (event: QueryRunStepEvent) => void,
	): Promise<QueryResult> {
		const started = performance.now();
		const statements = parseSql(request.statement);
		// Comments or whitespace only: nothing was submitted, so do not report success.
		if (statements.length === 0) throw new Error("No SQL statement found");
		const total = statements.length;
		const sdk = await this.databaseSdk(database);
		const createdTables = new Set<string>();
		let last: StatementResult | null = null;
		let transactions = 0;
		// Echoed back as failed so the stepper does not keep spinning on the step that threw.
		let active: { index: number; label: string } | null = null;
		let stepTotal = total;
		const report = (index: number, label: string, status: QueryRunStepEvent["status"]) => {
			if (status !== "done") active = { index, label };
			onStep?.({ index, total: stepTotal, label, status });
		};

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

			const ddlOnly =
				statements.length > 0 &&
				statements.every((statement) => statement.kind === "createTable");

			if (ddlOnly) {
				stepTotal = total + 1;
				last = await this.runCreateTableScript(
					sdk,
					statements as Array<Extract<Statement, { kind: "createTable" }>>,
					ids,
					models,
					(step) => {
						if (step.status !== "done") active = { index: step.index, label: step.label };
						onStep?.({ ...step, total: stepTotal });
					},
				);
				transactions += last.transactions ?? 0;
			} else {
				for (const [index, statement] of statements.entries()) {
					const label = statementLabel(statement);
					report(index, label, "active");
					// Staged DDL is invisible to chain reads, so a script that mixes DDL
					// with SELECT or with writes against a table it just created must
					// land the staged transactions first.
					const readOnly =
						statement.kind === "select" ||
						statement.kind === "with" ||
						statement.kind === "setOp" ||
						statement.kind === "explain";
					const targetsNewTable =
						"table" in statement && createdTables.has(statement.table as string);
					if (readOnly || targetsNewTable) {
						transactions += (await sdk.flushBatch()).length;
						sdk.beginBatch();
					}

					last = await this.runStatement(database, statement, ids);
					transactions += last.transactions ?? 0;
					report(index, last.message ?? label, "done");

					if (statement.kind === "createTable") createdTables.add(statement.name);
					if (readOnly || targetsNewTable) {
						// A flush re-reads the chain, so re-seed the id counter from it.
						const landed = await sdk.loadTables();
						ids.tableIdSeed =
							landed.reduce((max, model) => (model.tableId > max ? model.tableId : max), 0n) +
							1n;
					}
				}

				if (sdk.batching) transactions += (await sdk.flushBatch()).length;
			}
		} catch (error) {
			if (sdk.batching) sdk.discardBatch();
			const failedStep = active as { index: number; label: string } | null;
			if (failedStep) {
				onStep?.({
					index: failedStep.index,
					label: failedStep.label,
					total: stepTotal,
					status: "failed",
				});
			}

			// A batch is sent as several packets, so a later packet failing leaves the earlier
			// ones landed. Say so: those tables exist and an FK can no longer be added to them.
			const landed = (error as { landed?: number }).landed ?? 0;

			if (landed > 0 && error instanceof Error) {
				error.message +=
					`\n\n${landed} transaction${landed === 1 ? "" : "s"} landed before this failure.` +
					" A table that landed without its foreign keys cannot be linked later: drop" +
					" the partially created tables and run the script again.";
			}

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
				await this.requireCurrentDatabase(sdk, database);
				const table = await sdk.table(statement.table);
				await sdk.alterTable(table.model.tableId, statement.addColumns);
				return { columns: [], rows: [], message: `Altered table ${statement.table}` };
			}
			case "select":
				return this.runSelectStatement(database, statement);
			case "with":
				return this.runWithStatement(database, statement);
			case "setOp":
				return this.runSetOpStatement(database, statement);
			case "explain":
				return this.runExplainStatement(database, statement);
			case "insert":
			case "update":
			case "delete":
				return this.runDml(database, statement);
			case "createView":
			case "dropView":
				throw new Error(
					`${statement.kind === "createView" ? "CREATE VIEW" : "DROP VIEW"} is not supported by the Studio query runner. Run the view's SELECT directly.`,
				);
			default:
				throw new Error("Unsupported SQL statement");
		}
	}

	/** Stages only the `CREATE TABLE` catalog: columns, constraints and unique indexes. */
	private stageCreateTable(
		sdk: PeridotBase,
		statement: Extract<Statement, { kind: "createTable" }>,
		tableId: bigint,
	): Promise<unknown> {
		const constraints = statement.constraints.map((constraint) => {
			if (constraint.kind === "check") {
				return {
					kind: "check" as const,
					expr: bindNameExpr(constraint.expr, statement.columns),
				};
			}

			return constraint;
		});

		return sdk.createTable({
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
	}

	/**
	 * A script made only of `CREATE TABLE` statements: one wallet approval for any table count.
	 *
	 * The program refuses a key once the child has a v3 descriptor, and a key needs its parent
	 * descriptor to exist. Both hold inside a single transaction as long as instructions are
	 * ordered parent-first, so everything is staged in one batch: every catalog, then, per table
	 * in dependency order, its keys and its descriptor. `flushBatch` packs that batch up to the
	 * 1232-byte packet limit, so the approval count never grows; only the transaction count does.
	 */
	private async runCreateTableScript(
		sdk: PeridotBase,
		statements: Array<Extract<Statement, { kind: "createTable" }>>,
		ids: { tableIdSeed: bigint },
		landed: TableModel[],
		onStep?: (event: Omit<QueryRunStepEvent, "total">) => void,
	): Promise<StatementResult> {
		const plans = statements.map((statement) => ({
			statement,
			tableId: ids.tableIdSeed++,
		}));

		for (const [index, { statement, tableId }] of plans.entries()) {
			onStep?.({ index, label: `CREATE TABLE ${statement.name}`, status: "active" });
			await this.stageCreateTable(sdk, statement, tableId);
			onStep?.({ index, label: `CREATE TABLE ${statement.name}`, status: "done" });
		}

		// Staged catalogs are invisible to `loadTables`, so the key planner gets them from here.
		const known = [
			...landed,
			...plans.map(({ statement, tableId }) => stagedModel(statement, tableId)),
		];

		// The program needs the parent's descriptor to exist before the key, and the child's
		// descriptor to be absent, so each table is finished in dependency order: its keys,
		// then its own descriptor. Instruction order inside the batch keeps that sequence.
		const pending = [...plans];
		const ready = new Set<string>();

		while (pending.length > 0) {
			const index = pending.findIndex(({ statement }) =>
				statement.foreignKeys.every(
					(foreignKey) =>
						!plans.some((plan) => plan.statement.name === foreignKey.referencedTable) ||
						ready.has(foreignKey.referencedTable),
				),
			);

			if (index < 0) {
				throw new Error(
					`SQL not supported: foreign keys form a cycle (${pending
						.map(({ statement }) => statement.name)
						.join(", ")}); the program needs a parent's storage before a child's key.`,
				);
			}

			const [{ statement, tableId }] = pending.splice(index, 1);

			await this.createForeignKeys(sdk, tableId, statement.foreignKeys, known);
			await initV3Storage(sdk, tableId);
			ready.add(statement.name);
		}

		const flushIndex = plans.length;
		onStep?.({ index: flushIndex, label: "Sending transaction batch", status: "active" });
		const transactions = (await sdk.flushBatch()).length;
		onStep?.({
			index: flushIndex,
			label: `Confirmed ${transactions} transaction${transactions === 1 ? "" : "s"}`,
			status: "done",
		});

		return {
			columns: [],
			rows: [],
			message: `Created ${plans.length} table${plans.length === 1 ? "" : "s"}`,
			transactions,
		};
	}

	/** Mirrors the core SQL executor, but creates the v3 descriptor after the catalog. */
	private async createTableFromStatement(
		database: string,
		statement: Extract<Statement, { kind: "createTable" }>,
		ids: { tableIdSeed: bigint },
	): Promise<StatementResult> {
		const sdk = await this.databaseSdk(database);
		await this.requireCurrentDatabase(sdk, database);
		const tableId = ids.tableIdSeed++;

		await this.stageCreateTable(sdk, statement, tableId);

		let flushed = 0;

		if (statement.foreignKeys.length > 0) {
			// The program accepts a foreign key only between landed catalogs with no storage
			// descriptor yet, so land this table, create the keys, then reopen the batch.
			flushed = (await sdk.flushBatch()).length;
			sdk.beginBatch();
			await this.createForeignKeys(sdk, tableId, statement.foreignKeys);
		}

		await initV3Storage(sdk, tableId);

		return {
			columns: [],
			rows: [],
			message: `Created table ${statement.name}`,
			transactions: flushed,
		};
	}

	/**
	 * Creates the declared foreign keys on a table whose storage descriptor does not exist yet,
	 * i.e. before `initV3Storage`. The program only accepts a reference to a landed parent with
	 * a unique key over the referenced columns, so the target is validated here instead of
	 * leaving a half-created table behind.
	 */
	private async createForeignKeys(
		sdk: PeridotBase,
		tableId: bigint,
		foreignKeys: ForeignKeySpec[],
		known?: TableModel[],
	): Promise<void> {
		if (foreignKeys.length === 0) return;

		const models = known ?? (await sdk.loadTables());
		const byName = new Map(models.map((model) => [model.name, model]));
		let fkId = 1n;

		if (!known) {
			const table = await sdk.loadTable(tableId, true);
			fkId = table.model.constraints.reduce((max, constraint) => {
				if (constraint.kind !== "foreignKey") return max;
				const decoded = decodeForeignKey(constraint.column, constraint.expr);
				return decoded && decoded.fkId >= max ? decoded.fkId + 1n : max;
			}, 1n);
		}

		for (const foreignKey of foreignKeys) {
			const parent = byName.get(foreignKey.referencedTable);

			if (!parent) {
				throw new Error(
					`referenced table ${foreignKey.referencedTable} does not exist in this database`,
				);
			}

			const parentColumns = foreignKey.referencedColumns.map((name) => {
				const index = parent.columns.findIndex((column) => column.name === name);

				if (index < 0) {
					throw new Error(
						`referenced column ${foreignKey.referencedTable}.${name} does not exist`,
					);
				}

				return index;
			});

			if (foreignKey.columns.length === 1) {
				const parentColumn = parentColumns[0];

				if (
					parent.primaryKeyColumns[0] !== parentColumn &&
					!parent.indexes.some(
						(index) =>
							index.unique && index.columns.length === 1 && index.columns[0] === parentColumn,
					)
				) {
					throw new Error(
						`${foreignKey.referencedTable}.${foreignKey.referencedColumns[0]} needs a UNIQUE index before it can be referenced`,
					);
				}

				await sdk.createForeignKey(tableId, {
					fkId,
					childColumn: foreignKey.columns[0],
					parentTableId: parent.tableId,
					parentColumn: foreignKey.referencedColumns[0],
					onDelete: foreignKey.onDelete,
					onUpdate: foreignKey.onUpdate,
				});
			} else {
				const unique = parent.indexes.find(
					(index) =>
						index.unique &&
						index.columns.length === parentColumns.length &&
						parentColumns.every((column) => index.columns.includes(column)),
				);

				if (!unique) {
					throw new Error(
						`${foreignKey.referencedTable}(${foreignKey.referencedColumns.join(", ")}) needs a ` +
							"UNIQUE index over those columns before it can be referenced",
					);
				}

				await sdk.createCompositeForeignKey(tableId, {
					fkId,
					childColumns: foreignKey.columns,
					parentTableId: parent.tableId,
					parentIndexId: unique.indexId,
					match: foreignKey.match,
					onDelete: foreignKey.onDelete,
					onUpdate: foreignKey.onUpdate,
				});
			}

			fkId += 1n;
		}
	}

	private async createIndexFromStatement(
		database: string,
		statement: Extract<Statement, { kind: "createIndex" }>,
		ids: { indexSeeds: Map<bigint, bigint> },
	): Promise<StatementResult> {
		const sdk = await this.databaseSdk(database);
		await this.requireCurrentDatabase(sdk, database);
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

	private async runSelectStatement(
		database: string,
		statement: Extract<Statement, { kind: "select" }>,
		ctes?: Map<string, SelectSource>,
	): Promise<StatementResult> {
		const source =
			ctes?.get(statement.table) ??
			(await this.selectSource(database, statement.table, statement.alias));
		let rows = source.rows;
		let columns = source.columns;

		if (statement.join) {
			const right =
				ctes?.get(statement.join.table) ??
				(await this.selectSource(database, statement.join.table, statement.join.alias));
			const on = statement.join.on;
			const leftExpr = on.k === "cmp" ? on.a : undefined;
			const rightExpr = on.k === "cmp" ? on.b : undefined;

			if (on.k !== "cmp" || on.op !== "eq" || leftExpr?.k !== "id" || rightExpr?.k !== "id") {
				throw new IntegrationUnavailableError("JOIN ON other than column = column");
			}

			let leftIndex = columns.findIndex((column) => column.name === leftExpr.name);
			let rightIndex = right.columns.findIndex((column) => column.name === rightExpr.name);
			if (leftIndex < 0 || rightIndex < 0) {
				leftIndex = columns.findIndex((column) => column.name === rightExpr.name);
				rightIndex = right.columns.findIndex((column) => column.name === leftExpr.name);
			}
			if (leftIndex < 0 || rightIndex < 0) {
				throw new Error("JOIN ON references an unknown column");
			}

			const limitCap = 10_000;
			const index = new Map<string, SqlValue[][]>();
			for (const row of right.rows) {
				const key = valueKey(row[rightIndex] ?? null);
				const group = index.get(key) ?? [];
				group.push(row);
				index.set(key, group);
			}

			const joined: SqlValue[][] = [];
			if (statement.join.kind === "right") {
				const leftIndexMap = new Map<string, SqlValue[][]>();
				for (const row of rows) {
					const key = valueKey(row[leftIndex] ?? null);
					const group = leftIndexMap.get(key) ?? [];
					group.push(row);
					leftIndexMap.set(key, group);
				}
				for (const rightRow of right.rows) {
					const matches = leftIndexMap.get(valueKey(rightRow[rightIndex] ?? null)) ?? [];
					if (matches.length === 0) {
						joined.push([...columns.map(() => null), ...rightRow]);
					}
					for (const match of matches) {
						joined.push([...match, ...rightRow]);
						if (joined.length > limitCap) {
							throw new Error(`JOIN result exceeds ${limitCap} rows; add a WHERE or LIMIT`);
						}
					}
				}
			} else {
				for (const row of rows) {
					const matches = index.get(valueKey(row[leftIndex] ?? null)) ?? [];
					if (matches.length === 0 && statement.join.kind === "left") {
						joined.push([...row, ...right.columns.map(() => null)]);
					}
					for (const match of matches) {
						joined.push([...row, ...match]);
						if (joined.length > limitCap) {
							throw new Error(`JOIN result exceeds ${limitCap} rows; add a WHERE or LIMIT`);
						}
					}
				}
			}

			rows = joined;
			columns = [...columns, ...right.columns];
		}

		return this.projectSelect(statement, rows, columns);
	}

	private async selectSource(
		database: string,
		table: string,
		alias?: string,
	): Promise<SelectSource> {
		const { v3 } = await this.tableContext({ database, table });
		const columns = (v3.columns as unknown as ColumnSpec[]).slice();
		const rows = (await v3.scanAll({ cap: 10_000 }))
			.filter((row) => row.live)
			.map((row) => row.values as SqlValue[]);

		return { columns: aliasedColumns(columns, alias), rows };
	}

	private async projectSelect(
		statement: Extract<Statement, { kind: "select" }>,
		rows: SqlValue[][],
		columns: ColumnSpec[],
	): Promise<StatementResult> {
		const filtered = statement.where
			? rows.filter((row) => predicatePasses(bindNameExpr(statement.where!, columns), row))
			: rows;

		const items: SelectItem[] =
			statement.selectItems ??
			(statement.columns === "*"
				? columns.map((column) => ({ kind: "column" as const, name: column.name }))
				: (statement.columns as string[]).map((name) => ({ kind: "column" as const, name })));

		const hasAggregates = items.some((item) => item.kind === "aggregate");
		const groups = new Map<string, SqlValue[][]>();
		if (statement.groupBy) {
			const index = columns.findIndex((column) => column.name === statement.groupBy);
			if (index < 0) throw new Error(`unknown GROUP BY column: ${statement.groupBy}`);
			for (const row of filtered) {
				const key = valueKey(row[index] ?? null);
				const group = groups.get(key) ?? [];
				group.push(row);
				groups.set(key, group);
			}
		} else if (hasAggregates) {
			groups.set("all", filtered);
		} else {
			filtered.forEach((row, index) => groups.set(`row:${index}`, [row]));
		}

		const output: string[] = [];
		for (const item of items) {
			output.push(
				item.kind === "column"
					? (item.alias ?? simpleColumnName(item.name))
					: item.kind === "expr"
						? item.alias
						: (item.alias ?? item.fn),
			);
		}

		const projected: Record<string, unknown>[] = [];
		for (const group of groups.values()) {
			const sample = group[0] ?? columns.map(() => null);
			if (statement.having && !this.evalSelect(statement.having, sample, group, columns)) {
				continue;
			}

			const out: Record<string, unknown> = {};
			for (const item of items) {
				if (item.kind === "column") {
					const index = columns.findIndex((column) => column.name === item.name);
					if (index < 0) throw new Error(`unknown column: ${item.name}`);
					out[item.alias ?? simpleColumnName(item.name)] = displayValue(
						sample[index] ?? null,
						columns[index],
					);
				} else if (item.kind === "expr") {
					out[item.alias] = displayValue(
						this.evalSelect(item.expr, sample, group, columns),
						undefined as unknown as ColumnSpec,
					);
				} else {
					out[item.alias ?? item.fn] = displayValue(
						this.aggregateSelectValue(item.fn, item.column, group, columns, item.filter),
						undefined as unknown as ColumnSpec,
					);
				}
			}
			projected.push(out);
		}

		let ordered = projected;
		if (statement.orderBy && statement.orderBy.length > 0) {
			ordered = projected.slice().sort((a, b) => {
				for (const term of statement.orderBy!) {
					const key = term.column in a ? term.column : simpleColumnName(term.column);
					const left = a[key];
					const right = b[key];
					if (left === right) continue;
					if (left === null || left === undefined) return 1;
					if (right === null || right === undefined) return -1;
					const cmp = String(left) < String(right) ? -1 : 1;
					return term.direction === "asc" ? cmp : -cmp;
				}
				return 0;
			});
		}

		const offset = statement.offset ?? 0;
		const windowed = ordered.slice(offset);
		const limited =
			statement.limit === undefined ? windowed : windowed.slice(0, statement.limit);

		return {
			columns: output,
			rows: limited,
			message: `${limited.length} row${limited.length === 1 ? "" : "s"}`,
		};
	}

	private aggregateSelectValue(
		fn: AggregateFn,
		column: string | undefined,
		rows: SqlValue[][],
		columns: ColumnSpec[],
		filter?: NameExpr,
	): SqlValue {
		if (filter) {
			const bound = bindNameExpr(filter, columns);
			rows = rows.filter((row) => predicatePasses(bound, row));
		}

		const index =
			column === undefined ? -1 : columns.findIndex((candidate) => candidate.name === column);
		if (column !== undefined && index < 0) throw new Error(`unknown column: ${column}`);

		const values =
			index < 0
				? []
				: rows
						.map((row) => row[index])
						.filter((value) => value !== null && value !== undefined);

		if (fn === "count") return BigInt(index < 0 ? rows.length : values.length);
		if (values.length === 0) return null;
		if (fn === "min" || fn === "max") {
			let best = values[0];
			for (const value of values.slice(1)) {
				const cmp = compareValues(value, best) ?? 0;
				if (fn === "min" ? cmp < 0 : cmp > 0) best = value;
			}
			return best;
		}

		let sum = 0n;
		for (const value of values) {
			if (typeof value === "bigint") sum += value;
			else if (typeof value === "number") sum += BigInt(Math.trunc(value));
			else if (value && typeof value === "object" && "decimal" in value) {
				sum += BigInt((value as unknown as { decimal: bigint }).decimal);
			} else throw new Error(`${fn} requires a numeric column`);
		}

		return fn === "avg" ? sum / BigInt(values.length) : sum;
	}

	private evalSelect(
		node: NameExpr,
		row: SqlValue[],
		group: SqlValue[][],
		columns: ColumnSpec[],
	): SqlValue {
		switch (node.k) {
			case "lit":
				return node.value;
			case "agg":
				return this.aggregateSelectValue(node.fn, node.column, group, columns);
			case "id": {
				const index = columns.findIndex((column) => column.name === node.name);
				if (index < 0) throw new Error(`unknown column: ${node.name}`);
				return row[index] ?? null;
			}
			case "signer":
				return null;
			case "rangep":
				return evalRangeOp(
					node.op,
					this.evalSelect(node.a, row, group, columns),
					this.evalSelect(node.b, row, group, columns),
				);
			case "cmp": {
				const left = this.evalSelect(node.a, row, group, columns);
				const right = this.evalSelect(node.b, row, group, columns);
				const cmp = compareValues(left, right);
				if (cmp === null) return null;
				return node.op === "eq"
					? cmp === 0
					: node.op === "ne"
						? cmp !== 0
						: node.op === "lt"
							? cmp < 0
							: node.op === "le"
								? cmp <= 0
								: node.op === "gt"
									? cmp > 0
									: cmp >= 0;
			}
			case "and":
			case "or": {
				const left = this.evalSelect(node.a, row, group, columns);
				const right = this.evalSelect(node.b, row, group, columns);
				const l = left === null ? null : Boolean(left);
				const r = right === null ? null : Boolean(right);
				if (node.k === "and") {
					if (l === false || r === false) return false;
					return l === null || r === null ? null : true;
				}
				if (l === true || r === true) return true;
				return l === null || r === null ? null : false;
			}
			case "not": {
				const value = this.evalSelect(node.a, row, group, columns);
				return value === null ? null : !value;
			}
			case "isnull":
				return this.evalSelect(node.a, row, group, columns) === null;
			case "isnotnull":
				return this.evalSelect(node.a, row, group, columns) !== null;
			case "between": {
				const value = this.evalSelect(node.a, row, group, columns);
				const low = this.evalSelect(node.low, row, group, columns);
				const high = this.evalSelect(node.high, row, group, columns);
				const lower = compareValues(value, low);
				const upper = compareValues(value, high);
				if (lower === null || upper === null) return null;
				const inside = lower >= 0 && upper <= 0;
				return node.negated ? !inside : inside;
			}
			case "in": {
				const value = this.evalSelect(node.a, row, group, columns);
				if (value === null || value === undefined) return null;
				let sawNull = false;
				for (const candidate of node.values) {
					const other = this.evalSelect(candidate, row, group, columns);
					if (other === null || other === undefined) {
						sawNull = true;
						continue;
					}
					if (compareValues(value, other) === 0) return node.negated ? false : true;
				}
				return sawNull ? null : node.negated ? true : false;
			}
			case "arith": {
				const a = this.evalSelect(node.a, row, group, columns);
				const b = this.evalSelect(node.b, row, group, columns);
				if (a === null || a === undefined || b === null || b === undefined) return null;
				return evalArithmetic(node.op, a, b);
			}
			case "case": {
				if (node.operand) {
					const operand = this.evalSelect(node.operand, row, group, columns);
					for (const entry of node.whens) {
						if (
							compareValues(operand, this.evalSelect(entry.when, row, group, columns)) === 0
						) {
							return this.evalSelect(entry.then, row, group, columns);
						}
					}
				} else {
					for (const entry of node.whens) {
						if (this.evalSelect(entry.when, row, group, columns) === true) {
							return this.evalSelect(entry.then, row, group, columns);
						}
					}
				}
				return node.otherwise ? this.evalSelect(node.otherwise, row, group, columns) : null;
			}
			case "coalesce":
				for (const arg of node.args) {
					const value = this.evalSelect(arg, row, group, columns);
					if (value !== null && value !== undefined) return value;
				}
				return null;
			case "nullif": {
				const a = this.evalSelect(node.a, row, group, columns);
				const b = this.evalSelect(node.b, row, group, columns);
				return compareValues(a, b) === 0 ? null : a;
			}
			case "cast":
				return castValue(this.evalSelect(node.a, row, group, columns), node);
			case "func":
				return callFunction(
					node.fn,
					node.args.map((arg) => this.evalSelect(arg, row, group, columns)),
				);
			case "subquery":
				throw new IntegrationUnavailableError("subquery in Studio SQL");
		}
	}

	private async runWithStatement(
		database: string,
		statement: Extract<Statement, { kind: "with" }>,
		ctes?: Map<string, SelectSource>,
	): Promise<StatementResult> {
		const scope = new Map<string, SelectSource>(ctes ?? []);

		for (const cte of statement.ctes) {
			const inherited = scope.get(cte.query.table);
			const source =
				inherited ?? (await this.selectSource(database, cte.query.table, cte.query.alias));
			const names =
				cte.columns ??
				(cte.query.columns === "*"
					? source.columns.map((column) => column.name)
					: (cte.query.columns as string[]));
			const resolved: ColumnSpec[] = names.map(
				(name) =>
					source.columns.find((column) => column.name === name) ?? {
						name,
						type: "text" as ColumnSpec["type"],
					},
			);
			const result = await this.runSelectStatement(database, cte.query, scope);
			const rows: SqlValue[][] = result.rows.map((row) =>
				names.map((name, index) => coerceValue(row[name] as SqlValue, resolved[index])),
			);

			scope.set(cte.name, { columns: resolved, rows });
		}

		switch (statement.body.kind) {
			case "select":
				return this.runSelectStatement(database, statement.body, scope);
			case "setOp":
				return this.runSetOpStatement(database, statement.body, scope);
			case "with":
				return this.runWithStatement(database, statement.body, scope);
			default:
				throw new IntegrationUnavailableError(`${statement.body.kind} inside WITH`);
		}
	}

	private async runSetOpStatement(
		database: string,
		statement: Extract<Statement, { kind: "setOp" }>,
		ctes?: Map<string, SelectSource>,
	): Promise<StatementResult> {
		const left = await this.runSelectStatement(database, statement.left, ctes);
		const right = await this.runSelectStatement(database, statement.right, ctes);
		const key = (row: Record<string, unknown>) => JSON.stringify(row);
		const rightKeys = new Set(right.rows.map(key));

		let rows: Record<string, unknown>[];
		if (statement.op === "unionAll") rows = [...left.rows, ...right.rows];
		else if (statement.op === "union") {
			const seen = new Set<string>();
			rows = [...left.rows, ...right.rows].filter((row) => {
				const value = key(row);
				if (seen.has(value)) return false;
				seen.add(value);
				return true;
			});
		} else if (statement.op === "intersect") {
			const seen = new Set<string>();
			rows = left.rows.filter((row) => {
				const value = key(row);
				if (!rightKeys.has(value) || seen.has(value)) return false;
				seen.add(value);
				return true;
			});
		} else {
			const seen = new Set<string>();
			rows = left.rows.filter((row) => {
				const value = key(row);
				if (rightKeys.has(value) || seen.has(value)) return false;
				seen.add(value);
				return true;
			});
		}

		return {
			columns: left.columns,
			rows,
			message: `${rows.length} row${rows.length === 1 ? "" : "s"}`,
		};
	}

	private async runExplainStatement(
		database: string,
		statement: Extract<Statement, { kind: "explain" }>,
	): Promise<StatementResult> {
		const select = statement.statement;
		const target = select.where ? equalityTarget(select.where, select.table) : null;
		const plan = target
			? { strategy: "PRIMARY_KEY_LOOKUP", column: target.column, operator: "=" }
			: { strategy: "TABLE_SCAN", column: "", operator: "=" };

		await this.selectSource(database, select.table, select.alias);

		return {
			columns: ["plan"],
			rows: [{ plan: JSON.stringify(plan) }],
			message: statement.analyze ? "EXPLAIN ANALYZE" : "EXPLAIN",
		};
	}

	private async runDml(
		database: string,
		statement: Extract<Statement, { kind: "insert" | "update" | "delete" }>,
	): Promise<StatementResult> {
		const { v3 } = await this.tableContext({ database, table: statement.table });
		const columns = v3.columns;
		const specs = columns as unknown as ColumnSpec[];
		const primaryKey = v3.primaryKey;

		const pkName = columns[primaryKey].name;

		if (statement.kind === "insert") {
			const names = statement.columns ?? columns.map((c) => c.name);
			const records = statement.rows.map((row) =>
				Object.fromEntries(names.map((name, index) => [name, row[index]])),
			);

			let toInsert = records;
			let skipped = 0;
			const returningValues: SqlValue[][] = [];

			if (statement.onConflict) {
				toInsert = [];
				for (const record of records) {
					const rawKey = record[pkName];
					const key =
						rawKey === undefined || rawKey === null
							? null
							: coerceValue(rawKey as SqlValue, specs[primaryKey]);
					const existing = key === null ? null : await v3.get(key);

					if (!existing) {
						toInsert.push(record);
						if (statement.returning) {
							returningValues.push(this.coerceRow(specs, record));
						}
						continue;
					}

					if (statement.onConflict.action === "nothing") {
						skipped += 1;
						continue;
					}

					await v3.update(key!, statement.onConflict.assignments);
					if (statement.returning) {
						const after = await this.readRow(v3, key!);
						if (after) returningValues.push(after);
					}
				}
			}

			for (const record of toInsert) {
				await v3.insert(this.coerceColumns(columns, record));
				if (statement.returning && !statement.onConflict) {
					returningValues.push(this.coerceRow(specs, record));
				}
			}

			const returned = this.returningRows(statement.returning, specs, returningValues);

			return {
				columns: returned.columns,
				rows: returned.rows,
				message:
					`Inserted ${toInsert.length} row${toInsert.length === 1 ? "" : "s"}` +
					(skipped > 0 ? `, skipped ${skipped}` : ""),
			};
		}

		const target = equalityTarget(statement.where, statement.table);

		if (!target || target.column !== pkName) {
			throw new Error(`${statement.kind.toUpperCase()} requires WHERE ${pkName} = <literal>`);
		}

		const key = coerceValue(target.value as SqlValue, specs[primaryKey]);
		const before = statement.returning ? await this.readRow(v3, key) : null;

		if (statement.kind === "update") {
			await v3.update(key, statement.assignments);

			const after = statement.returning ? await this.readRow(v3, key) : null;
			const returned = this.returningRows(statement.returning, specs, after ? [after] : []);

			return { columns: returned.columns, rows: returned.rows, message: `Updated 1 row` };
		}

		await v3.delete(key);

		const returned = this.returningRows(statement.returning, specs, before ? [before] : []);

		return { columns: returned.columns, rows: returned.rows, message: `Deleted 1 row` };
	}

	/** Canonical row values for a primary key, or null when the row is missing. */
	private async readRow(v3: V3Table, key: SqlValue): Promise<SqlValue[] | null> {
		const record = await v3.get(key);

		return record && record.live ? (record.values as SqlValue[]) : null;
	}

	/** Coerces a record into a canonical row, filling defaults. */
	private coerceRow(columns: ColumnSpec[], record: RowRecord): SqlValue[] {
		return columns.map(
			(column) =>
				coerceValue(
					record[column.name] === undefined
						? (column.default ?? null)
						: (record[column.name] as SqlValue),
					column,
				) as SqlValue,
		);
	}

	/** Projects RETURNING rows (or nothing) for a DML result. */
	private returningRows(
		returning: string[] | "*" | undefined,
		columns: ColumnSpec[],
		rows: SqlValue[][],
	): { columns: string[]; rows: Record<string, unknown>[] } {
		if (!returning) return { columns: [], rows: [] };

		const names =
			returning === "*"
				? columns.map((column) => column.name)
				: returning.map(simpleColumnName);
		const records = rows.map((values) => {
			const full = this.rowRecord(columns, values);
			const out: Record<string, unknown> = {};
			for (const name of names) {
				if (!(name in full)) throw new Error(`unknown column: ${name}`);
				out[name] = full[name];
			}

			return out;
		});

		return { columns: names, rows: records };
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
	/** Signed transactions a single statement flushed on its own (bulk funding, foreign keys). */
	transactions?: number;
};

/** Strips a table-alias qualifier: `a.id` -> `id`. */
const simpleColumnName = (name: string): string => {
	const dot = name.lastIndexOf(".");

	return dot < 0 ? name : name.slice(dot + 1);
};

/** Prefixes a table's column names with its alias so `a.id` resolves. */
const aliasedColumns = (columns: ColumnSpec[], alias?: string): ColumnSpec[] =>
	alias ? columns.map((column) => ({ ...column, name: `${alias}.${column.name}` })) : columns;

const valueKey = (value: SqlValue): string => {
	if (value === null || value === undefined) return "null";
	if (typeof value === "bigint") return `i:${value}`;
	if (typeof value === "number") return `n:${value}`;
	if (typeof value === "boolean") return `b:${value}`;
	if (typeof value === "string") return `s:${value}`;
	if (value instanceof Uint8Array) return `x:${Buffer.from(value).toString("hex")}`;
	if (typeof value === "object" && "decimal" in value) {
		const decimal = value as unknown as { decimal: bigint; scale: number };
		return `d:${decimal.decimal}:${decimal.scale}`;
	}

	return `o:${JSON.stringify(value)}`;
};

type SelectSource = { columns: ColumnSpec[]; rows: SqlValue[][] };

export { PROGRAM_NOT_WIRED };
