import type { RpcPort, WalletPort } from "./ports.js";
import type { ScopeResolver } from "./program-client.js";
import type {
	AddColumnPayload,
	AlterColumnPayload,
	BulkInsertResult,
	Capabilities,
	ColumnInfo,
	CreateIndexPayload,
	CreateTablePayload,
	DatabaseAudit,
	DatabaseInfo,
	DatabaseGrant,
	AuditVerification,
	OrganizationActionPayload,
	OrganizationPolicyInfo,
	OrganizationPolicyPayload,
	OrganizationProposalInfo,
	AuditEvent,
	CreateDomainPayload,
	CreateEnumPayload,
	CreateSponsorAllowancePayload,
	DatabaseTypeInfo,
	SchemaCatalogInfo,
	SponsorAllowance,
	TopUpSponsorAllowancePayload,
	DeleteRowsResult,
	ExecuteQueryRequest,
	QueryRunStepEvent,
	IndexInfo,
	MutationResult,
	OrganizationInfo,
	OrganizationMemberInfo,
	OrganizationMemberRole,
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
	TableGuards,
	TableStorage,
	TablePolicies,
	TablePolicyWrite,
	ExtensionPolicyInfo,
	PolicyProposalInfo,
	SetTablePartitioningPayload,
	ColumnRef,
} from "./types/index.js";

export type RowUpdate = {
	rowData: RowRecord;
	columnName: string;
	value: unknown;
	/** Sets the column to its declared default; `value` is ignored. */
	useDefault?: boolean;
};

export type ProtocolHealth = {
	/** The RPC endpoint answered. */
	reachable: boolean;
	slot?: string;
	version?: string;
	/** A program ID is configured, which is the prerequisite for any account read. */
	programConfigured: boolean;
	/** The configured program answers `getAccountInfo`. */
	programReachable: boolean;
};

/**
 * The single contract between the Studio and Peridotbase. Every implementation either talks to
 * the program through Solana RPC or throws `IntegrationUnavailableError`; there is deliberately
 * no HTTP fallback.
 */
export type PeridotbaseClient = {
	readonly capabilities: Capabilities;
	readonly rpc: RpcPort;
	readonly wallet: WalletPort | null;
	readonly programId: string | null;

	getHealth: () => Promise<ProtocolHealth>;
	/** Organizations the connected wallet created. Empty without a wallet. */
	listOrganizations: () => Promise<OrganizationInfo[]>;
	createOrganization: (name: string) => Promise<OrganizationInfo>;
	listProjects: (organization: string) => Promise<ProjectInfo[]>;
	createProject: (organization: string, name: string) => Promise<ProjectInfo>;
	/** The owner plus every active on-chain membership for the organization. */
	listOrganizationMembers: (organization: string) => Promise<OrganizationMemberInfo[]>;
	/** Guarded actions take the approved proposal id when a policy exists. */
	addOrganizationMember: (
		organization: string,
		principal: string,
		role: Exclude<OrganizationMemberRole, "owner">,
		proposalId?: string,
	) => Promise<MutationResult>;
	updateOrganizationMember: (
		organization: string,
		principal: string,
		role: Exclude<OrganizationMemberRole, "owner">,
		proposalId?: string,
	) => Promise<MutationResult>;
	removeOrganizationMember: (
		organization: string,
		principal: string,
		proposalId?: string,
	) => Promise<MutationResult>;
	/** Irreversible: hands the organization to another wallet. */
	transferOrganizationOwner: (
		organization: string,
		newOwner: string,
		proposalId?: string,
	) => Promise<MutationResult>;
	/** The optional org multisig policy, or null when the org has none. */
	getOrganizationPolicy: (organization: string) => Promise<OrganizationPolicyInfo | null>;
	/** Creates or replaces the policy; guarded once one exists. */
	setOrganizationPolicy: (
		organization: string,
		payload: OrganizationPolicyPayload,
		proposalId?: string,
	) => Promise<MutationResult>;
	listOrganizationProposals: (organization: string) => Promise<OrganizationProposalInfo[]>;
	/** First approval; the id must equal the policy counter. */
	proposeOrganizationAction: (
		organization: string,
		payload: OrganizationActionPayload & { proposalId: string; expiresAt?: number },
	) => Promise<MutationResult>;
	approveOrganizationAction: (
		organization: string,
		proposalId: string,
	) => Promise<MutationResult>;
	closeOrganizationProposal: (
		organization: string,
		proposalId: string,
	) => Promise<MutationResult>;
	initiateOrganizationRecovery: (organization: string) => Promise<MutationResult>;
	cancelOrganizationRecovery: (organization: string) => Promise<MutationResult>;
	executeOrganizationRecovery: (
		organization: string,
		signers: string[],
		threshold: number,
	) => Promise<MutationResult>;
	listDatabases: () => Promise<DatabaseInfo[]>;
	createDatabase: (name: string) => Promise<DatabaseInfo>;
	/** Audit enforcement flag plus the sequence of the trail head. */
	getDatabaseAudit: (database: string) => Promise<DatabaseAudit>;
	/** Enabling is immediate; disabling stops enforcement but keeps the trail. */
	setDatabaseAuditRequired: (database: string, required: boolean) => Promise<MutationResult>;
	listAuditEvents: (database: string) => Promise<AuditEvent[]>;
	/** Recomputes the audit hash chain and Merkle root in the browser. */
	verifyAuditTrail: (database: string) => Promise<AuditVerification>;
	/** Allowances where the connected wallet is the sponsor. */
	listSponsorAllowances: () => Promise<SponsorAllowance[]>;
	createSponsorAllowance: (payload: CreateSponsorAllowancePayload) => Promise<MutationResult>;
	topUpSponsorAllowance: (payload: TopUpSponsorAllowancePayload) => Promise<MutationResult>;
	/** Revokes the allowance and refunds the remaining cap to the sponsor. */
	closeSponsorAllowance: (grantee: string) => Promise<MutationResult>;
	/** Staged close: seats every table and the database catalog, then finishes. */
	deleteDatabase: (database: string, proposalId?: string) => Promise<MutationResult>;
	/** Cancels a staged close before any content was closed. */
	cancelCloseDatabase: (database: string) => Promise<MutationResult>;
	/** Irreversible: drops the wallet's authority over the database. */
	renounceDatabaseAuthority: (database: string) => Promise<MutationResult>;
	/** Project-level role grants recorded for the database. */
	listDatabaseGrants: (database: string) => Promise<DatabaseGrant[]>;
	grantDatabaseRole: (
		database: string,
		principal: string,
		role: "admin" | "member",
	) => Promise<MutationResult>;
	revokeDatabaseRole: (database: string, principal: string) => Promise<MutationResult>;
	/** Schema namespaces created in the database. `pgsql` is implicit. */
	listSchemas: (database: string) => Promise<SchemaCatalogInfo[]>;
	createSchema: (database: string, name: string) => Promise<MutationResult>;
	/** ENUM and DOMAIN catalogs the tables can reference. */
	listDatabaseTypes: (database: string) => Promise<DatabaseTypeInfo[]>;
	createEnum: (database: string, payload: CreateEnumPayload) => Promise<MutationResult>;
	createDomain: (database: string, payload: CreateDomainPayload) => Promise<MutationResult>;
	listTables: (database: string) => Promise<TableInfo[]>;
	/** Tables whose catalog is soft-dropped; they keep their rows and can be restored. */
	listDroppedTables: (database: string) => Promise<TableInfo[]>;
	getTableColumns: (ref: TableRef) => Promise<ColumnInfo[]>;
	/** Live tables plus their columns from one catalog scan (used by the visualizer). */
	listTablesWithColumns: (
		database: string,
	) => Promise<Array<TableInfo & { columns: ColumnInfo[] }>>;
	getRelationships: (database: string) => Promise<Relationship[]>;
	/** Adds a single-column FK to the parent primary key or a unique column. */
	createForeignKey: (
		ref: TableRef,
		payload: { column: string; parentTable: string; parentColumn?: string },
	) => Promise<MutationResult>;
	/** Adds a multi-column FK onto a UNIQUE index of the parent table. */
	createCompositeForeignKey: (
		ref: TableRef,
		payload: {
			childColumns: string[];
			parentTable: string;
			parentIndexId?: string;
			match?: "simple" | "full";
		},
	) => Promise<MutationResult>;
	dropForeignKey: (
		ref: TableRef,
		payload: { fkId: string; parentTable: string },
	) => Promise<MutationResult>;
	readRows: (ref: TableRef, query: ReadRowsQuery) => Promise<RowPage>;
	insertRows: (ref: TableRef, records: RowRecord[]) => Promise<BulkInsertResult>;
	updateRows: (ref: TableRef, updates: RowUpdate[]) => Promise<MutationResult>;
	deleteRows: (ref: TableRef, keys: RowKey[]) => Promise<DeleteRowsResult>;
	createTable: (database: string, payload: CreateTablePayload) => Promise<MutationResult>;
	renameTable: (ref: TableRef, payload: RenameTablePayload) => Promise<MutationResult>;
	dropTable: (ref: TableRef) => Promise<MutationResult>;
	/** Copies the schema (not rows) into a new table with a fresh id. */
	duplicateTable: (ref: TableRef, newTableName: string) => Promise<MutationResult>;
	restoreTable: (ref: TableRef) => Promise<MutationResult>;
	getTableComment: (ref: TableRef) => Promise<string | null>;
	setTableComment: (ref: TableRef, comment: string) => Promise<MutationResult>;
	getTableGuards: (ref: TableRef) => Promise<TableGuards>;
	/** Enables guards; the program refuses any request that would clear one. */
	setTableGuards: (ref: TableRef, guards: Partial<TableGuards>) => Promise<MutationResult>;
	/** v3 storage descriptor: history retention and partition routing. */
	getTableStorage: (ref: TableRef) => Promise<TableStorage>;
	/** Retained revisions per record; 0 disables append-only history. */
	setTableHistoryLimit: (ref: TableRef, limit: number) => Promise<MutationResult>;
	setTablePartitioning: (
		ref: TableRef,
		payload: SetTablePartitioningPayload,
	) => Promise<MutationResult>;
	/** RLS-style policies plus the timelock and multisig flags on the table. */
	getTablePolicies: (ref: TableRef) => Promise<TablePolicies>;
	/** Replaces every policy. Policies with predicates cannot be rewritten from Studio. */
	setTablePolicies: (ref: TableRef, policies: TablePolicyWrite[]) => Promise<MutationResult>;
	/** Irreversible timelock in seconds for policy changes. */
	setTablePolicyTimelock: (ref: TableRef, delaySeconds: number) => Promise<MutationResult>;
	/** Installs the irreversible M-of-N signer set for policy changes. */
	setTablePolicyMultisig: (
		ref: TableRef,
		signers: string[],
		threshold: number,
	) => Promise<MutationResult>;
	listPolicyProposals: (ref: TableRef) => Promise<PolicyProposalInfo[]>;
	proposePolicy: (
		ref: TableRef,
		payload: {
			proposalId: string;
			policies: TablePolicyWrite[];
		},
	) => Promise<MutationResult>;
	approvePolicy: (ref: TableRef, proposalId: string) => Promise<MutationResult>;
	applyPolicy: (ref: TableRef, proposalId: string) => Promise<MutationResult>;
	cancelPolicy: (ref: TableRef, proposalId: string) => Promise<MutationResult>;
	/** The opt-in CPI extension pinned to this table, or null. */
	getTableExtensionPolicy: (ref: TableRef) => Promise<ExtensionPolicyInfo | null>;
	setTableExtensionPolicy: (
		ref: TableRef,
		payload: ExtensionPolicyInfo,
	) => Promise<MutationResult>;
	clearTableExtensionPolicy: (ref: TableRef) => Promise<MutationResult>;
	/** Calls the pinned extension with hex data under its fixed account list. */
	invokeTableExtension: (ref: TableRef, dataHex: string) => Promise<MutationResult>;
	addColumn: (ref: TableRef, payload: AddColumnPayload) => Promise<MutationResult>;
	alterColumn: (
		ref: TableRef,
		column: string,
		payload: AlterColumnPayload,
	) => Promise<MutationResult>;
	dropColumn: (ref: ColumnRef) => Promise<MutationResult>;
	renameColumn: (ref: TableRef, payload: RenameColumnPayload) => Promise<MutationResult>;
	listIndexes: (ref: TableRef) => Promise<IndexInfo[]>;
	createIndex: (ref: TableRef, payload: CreateIndexPayload) => Promise<MutationResult>;
	dropIndex: (ref: TableRef, indexName: string) => Promise<MutationResult>;
	/** Flips `NULLS NOT DISTINCT` on an existing index before rows exist. */
	setIndexNullsNotDistinct: (
		ref: TableRef,
		indexName: string,
		nullsNotDistinct: boolean,
	) => Promise<MutationResult>;
	executeQuery: (
		database: string,
		request: ExecuteQueryRequest,
		onStep?: (event: QueryRunStepEvent) => void,
	) => Promise<QueryResult>;
};

export type PeridotbaseClientOptions = {
	rpc: RpcPort;
	wallet?: WalletPort | null;
	/** Deployed `peridotbase_core` address. Without it every program read is refused. */
	programId?: string | null;
	/** Organization/project selection the Studio route carries; scopes every program call. */
	scope?: ScopeResolver;
};
