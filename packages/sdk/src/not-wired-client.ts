import type {
	PeridotbaseClient,
	PeridotbaseClientOptions,
	ProtocolHealth,
	RowUpdate,
} from "./client.js";
import { IntegrationUnavailableError } from "./errors.js";
import { PROGRAM_NOT_WIRED } from "./types/capabilities.js";
import type {
	AddColumnPayload,
	AlterColumnPayload,
	BulkInsertResult,
	ColumnInfo,
	ColumnRef,
	CreateIndexPayload,
	AuditEvent,
	CreateDomainPayload,
	CreateEnumPayload,
	CreateSponsorAllowancePayload,
	DatabaseTypeInfo,
	SchemaCatalogInfo,
	SponsorAllowance,
	TopUpSponsorAllowancePayload,
	CreateTablePayload,
	DatabaseAudit,
	DatabaseInfo,
	DatabaseGrant,
	AuditVerification,
	OrganizationActionPayload,
	OrganizationPolicyInfo,
	OrganizationPolicyPayload,
	OrganizationProposalInfo,
	DeleteRowsResult,
	ExecuteQueryRequest,
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
} from "./types/index.js";

/**
 * The client that ships today. It exposes the whole `PeridotbaseClient` surface so the Studio can
 * wire every screen against it, but only the RPC and wallet plumbing is implemented.
 *
 * Each unimplemented method throws `IntegrationUnavailableError`, naming the operation and the
 * missing piece. Nothing returns placeholder rows, empty-but-successful results, or fake
 * signatures: a caller either receives real program data or a typed refusal.
 */
export class ProgramNotWiredClient implements PeridotbaseClient {
	readonly capabilities = PROGRAM_NOT_WIRED;
	readonly rpc;
	readonly wallet;
	readonly programId;

	constructor(options: PeridotbaseClientOptions) {
		this.rpc = options.rpc;
		this.wallet = options.wallet ?? null;
		this.programId = options.programId ?? null;
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

		return {
			reachable,
			slot,
			version,
			programConfigured: Boolean(this.programId),
			programReachable: false,
		};
	}

	listDatabases(): Promise<DatabaseInfo[]> {
		throw new IntegrationUnavailableError("listDatabases");
	}

	listOrganizations(): Promise<OrganizationInfo[]> {
		throw new IntegrationUnavailableError("listOrganizations");
	}

	createOrganization(_name: string): Promise<OrganizationInfo> {
		void _name;
		throw new IntegrationUnavailableError("createOrganization");
	}

	listProjects(_organization: string): Promise<ProjectInfo[]> {
		void _organization;
		throw new IntegrationUnavailableError("listProjects");
	}

	createProject(_organization: string, _name: string): Promise<ProjectInfo> {
		void _organization;
		void _name;
		throw new IntegrationUnavailableError("createProject");
	}

	listOrganizationMembers(_organization: string): Promise<OrganizationMemberInfo[]> {
		void _organization;
		throw new IntegrationUnavailableError("listOrganizationMembers");
	}

	addOrganizationMember(
		_organization: string,
		_principal: string,
		_role: Exclude<OrganizationMemberRole, "owner">,
		_proposalId?: string,
	): Promise<MutationResult> {
		void _organization;
		void _principal;
		void _role;
		void _proposalId;
		throw new IntegrationUnavailableError("addOrganizationMember");
	}

	updateOrganizationMember(
		_organization: string,
		_principal: string,
		_role: Exclude<OrganizationMemberRole, "owner">,
		_proposalId?: string,
	): Promise<MutationResult> {
		void _organization;
		void _principal;
		void _role;
		void _proposalId;
		throw new IntegrationUnavailableError("updateOrganizationMember");
	}

	removeOrganizationMember(
		_organization: string,
		_principal: string,
		_proposalId?: string,
	): Promise<MutationResult> {
		void _organization;
		void _principal;
		void _proposalId;
		throw new IntegrationUnavailableError("removeOrganizationMember");
	}

	transferOrganizationOwner(
		_organization: string,
		_newOwner: string,
		_proposalId?: string,
	): Promise<MutationResult> {
		void _organization;
		void _newOwner;
		void _proposalId;
		throw new IntegrationUnavailableError("transferOrganizationOwner");
	}

	getOrganizationPolicy(_organization: string): Promise<OrganizationPolicyInfo | null> {
		void _organization;
		throw new IntegrationUnavailableError("getOrganizationPolicy");
	}

	setOrganizationPolicy(
		_organization: string,
		_payload: OrganizationPolicyPayload,
		_proposalId?: string,
	): Promise<MutationResult> {
		void _organization;
		void _payload;
		void _proposalId;
		throw new IntegrationUnavailableError("setOrganizationPolicy");
	}

	listOrganizationProposals(_organization: string): Promise<OrganizationProposalInfo[]> {
		void _organization;
		throw new IntegrationUnavailableError("listOrganizationProposals");
	}

	proposeOrganizationAction(
		_organization: string,
		_payload: OrganizationActionPayload & { proposalId: string; expiresAt?: number },
	): Promise<MutationResult> {
		void _organization;
		void _payload;
		throw new IntegrationUnavailableError("proposeOrganizationAction");
	}

	approveOrganizationAction(
		_organization: string,
		_proposalId: string,
	): Promise<MutationResult> {
		void _organization;
		void _proposalId;
		throw new IntegrationUnavailableError("approveOrganizationAction");
	}

	closeOrganizationProposal(
		_organization: string,
		_proposalId: string,
	): Promise<MutationResult> {
		void _organization;
		void _proposalId;
		throw new IntegrationUnavailableError("closeOrganizationProposal");
	}

	initiateOrganizationRecovery(_organization: string): Promise<MutationResult> {
		void _organization;
		throw new IntegrationUnavailableError("initiateOrganizationRecovery");
	}

	cancelOrganizationRecovery(_organization: string): Promise<MutationResult> {
		void _organization;
		throw new IntegrationUnavailableError("cancelOrganizationRecovery");
	}

	executeOrganizationRecovery(
		_organization: string,
		_signers: string[],
		_threshold: number,
	): Promise<MutationResult> {
		void _organization;
		void _signers;
		void _threshold;
		throw new IntegrationUnavailableError("executeOrganizationRecovery");
	}

	createDatabase(_name: string): Promise<DatabaseInfo> {
		void _name;
		throw new IntegrationUnavailableError("createDatabase");
	}

	getDatabaseAudit(_database: string): Promise<DatabaseAudit> {
		void _database;
		throw new IntegrationUnavailableError("getDatabaseAudit");
	}

	setDatabaseAuditRequired(_database: string, _required: boolean): Promise<MutationResult> {
		void _database;
		void _required;
		throw new IntegrationUnavailableError("setDatabaseAuditRequired");
	}

	listAuditEvents(_database: string): Promise<AuditEvent[]> {
		void _database;
		throw new IntegrationUnavailableError("listAuditEvents");
	}

	listSponsorAllowances(): Promise<SponsorAllowance[]> {
		throw new IntegrationUnavailableError("listSponsorAllowances");
	}

	createSponsorAllowance(_payload: CreateSponsorAllowancePayload): Promise<MutationResult> {
		void _payload;
		throw new IntegrationUnavailableError("createSponsorAllowance");
	}

	topUpSponsorAllowance(_payload: TopUpSponsorAllowancePayload): Promise<MutationResult> {
		void _payload;
		throw new IntegrationUnavailableError("topUpSponsorAllowance");
	}

	deleteDatabase(_database: string, _proposalId?: string): Promise<MutationResult> {
		void _database;
		void _proposalId;
		throw new IntegrationUnavailableError("deleteDatabase");
	}

	cancelCloseDatabase(_database: string): Promise<MutationResult> {
		void _database;
		throw new IntegrationUnavailableError("cancelCloseDatabase");
	}

	renounceDatabaseAuthority(_database: string): Promise<MutationResult> {
		void _database;
		throw new IntegrationUnavailableError("renounceDatabaseAuthority");
	}

	listDatabaseGrants(_database: string): Promise<DatabaseGrant[]> {
		void _database;
		throw new IntegrationUnavailableError("listDatabaseGrants");
	}

	grantDatabaseRole(
		_database: string,
		_principal: string,
		_role: "admin" | "member",
	): Promise<MutationResult> {
		void _database;
		void _principal;
		void _role;
		throw new IntegrationUnavailableError("grantDatabaseRole");
	}

	revokeDatabaseRole(_database: string, _principal: string): Promise<MutationResult> {
		void _database;
		void _principal;
		throw new IntegrationUnavailableError("revokeDatabaseRole");
	}

	verifyAuditTrail(_database: string): Promise<AuditVerification> {
		void _database;
		throw new IntegrationUnavailableError("verifyAuditTrail");
	}

	closeSponsorAllowance(_grantee: string): Promise<MutationResult> {
		void _grantee;
		throw new IntegrationUnavailableError("closeSponsorAllowance");
	}

	listSchemas(_database: string): Promise<SchemaCatalogInfo[]> {
		void _database;
		throw new IntegrationUnavailableError("listSchemas");
	}

	createSchema(_database: string, _name: string): Promise<MutationResult> {
		void _database;
		void _name;
		throw new IntegrationUnavailableError("createSchema");
	}

	listDatabaseTypes(_database: string): Promise<DatabaseTypeInfo[]> {
		void _database;
		throw new IntegrationUnavailableError("listDatabaseTypes");
	}

	createEnum(_database: string, _payload: CreateEnumPayload): Promise<MutationResult> {
		void _database;
		void _payload;
		throw new IntegrationUnavailableError("createEnum");
	}

	createDomain(_database: string, _payload: CreateDomainPayload): Promise<MutationResult> {
		void _database;
		void _payload;
		throw new IntegrationUnavailableError("createDomain");
	}

	listTables(_database: string): Promise<TableInfo[]> {
		void _database;
		throw new IntegrationUnavailableError("listTables");
	}

	listDroppedTables(_database: string): Promise<TableInfo[]> {
		void _database;
		throw new IntegrationUnavailableError("listDroppedTables");
	}

	getTableColumns(_ref: TableRef): Promise<ColumnInfo[]> {
		void _ref;
		throw new IntegrationUnavailableError("getTableColumns");
	}

	listTablesWithColumns(
		_database: string,
	): Promise<Array<TableInfo & { columns: ColumnInfo[] }>> {
		void _database;
		throw new IntegrationUnavailableError("listTablesWithColumns");
	}

	createForeignKey(
		_ref: TableRef,
		_payload: { column: string; parentTable: string; parentColumn?: string },
	): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("createForeignKey");
	}

	createCompositeForeignKey(
		_ref: TableRef,
		_payload: {
			childColumns: string[];
			parentTable: string;
			parentIndexId?: string;
			match?: "simple" | "full";
		},
	): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("createCompositeForeignKey");
	}

	dropForeignKey(
		_ref: TableRef,
		_payload: { fkId: string; parentTable: string },
	): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("dropForeignKey");
	}

	getRelationships(_database: string): Promise<Relationship[]> {
		void _database;
		throw new IntegrationUnavailableError("getRelationships");
	}

	readRows(_ref: TableRef, _query: ReadRowsQuery): Promise<RowPage> {
		void _ref;
		void _query;
		throw new IntegrationUnavailableError("readRows");
	}

	insertRows(_ref: TableRef, _records: RowRecord[]): Promise<BulkInsertResult> {
		void _ref;
		void _records;
		throw new IntegrationUnavailableError("insertRows");
	}

	updateRows(_ref: TableRef, _updates: RowUpdate[]): Promise<MutationResult> {
		void _ref;
		void _updates;
		throw new IntegrationUnavailableError("updateRows");
	}

	deleteRows(_ref: TableRef, _keys: RowKey[]): Promise<DeleteRowsResult> {
		void _ref;
		void _keys;
		throw new IntegrationUnavailableError("deleteRows");
	}

	createTable(_database: string, _payload: CreateTablePayload): Promise<MutationResult> {
		void _database;
		void _payload;
		throw new IntegrationUnavailableError("createTable");
	}

	renameTable(_ref: TableRef, _payload: RenameTablePayload): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("renameTable");
	}

	duplicateTable(_ref: TableRef, _newTableName: string): Promise<MutationResult> {
		void _ref;
		void _newTableName;
		throw new IntegrationUnavailableError("duplicateTable");
	}

	dropTable(_ref: TableRef): Promise<MutationResult> {
		void _ref;
		throw new IntegrationUnavailableError("dropTable");
	}

	restoreTable(_ref: TableRef): Promise<MutationResult> {
		void _ref;
		throw new IntegrationUnavailableError("restoreTable");
	}

	getTableComment(_ref: TableRef): Promise<string | null> {
		void _ref;
		throw new IntegrationUnavailableError("getTableComment");
	}

	setTableComment(_ref: TableRef, _comment: string): Promise<MutationResult> {
		void _ref;
		void _comment;
		throw new IntegrationUnavailableError("setTableComment");
	}

	getTableGuards(_ref: TableRef): Promise<TableGuards> {
		void _ref;
		throw new IntegrationUnavailableError("getTableGuards");
	}

	setTableGuards(_ref: TableRef, _guards: Partial<TableGuards>): Promise<MutationResult> {
		void _ref;
		void _guards;
		throw new IntegrationUnavailableError("setTableGuards");
	}

	getTableStorage(_ref: TableRef): Promise<TableStorage> {
		void _ref;
		throw new IntegrationUnavailableError("getTableStorage");
	}

	setTableHistoryLimit(_ref: TableRef, _limit: number): Promise<MutationResult> {
		void _ref;
		void _limit;
		throw new IntegrationUnavailableError("setTableHistoryLimit");
	}

	setTablePartitioning(
		_ref: TableRef,
		_payload: SetTablePartitioningPayload,
	): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("setTablePartitioning");
	}

	getTablePolicies(_ref: TableRef): Promise<TablePolicies> {
		void _ref;
		throw new IntegrationUnavailableError("getTablePolicies");
	}

	setTablePolicies(_ref: TableRef, _policies: TablePolicyWrite[]): Promise<MutationResult> {
		void _ref;
		void _policies;
		throw new IntegrationUnavailableError("setTablePolicies");
	}

	setTablePolicyTimelock(_ref: TableRef, _delaySeconds: number): Promise<MutationResult> {
		void _ref;
		void _delaySeconds;
		throw new IntegrationUnavailableError("setTablePolicyTimelock");
	}

	setTablePolicyMultisig(
		_ref: TableRef,
		_signers: string[],
		_threshold: number,
	): Promise<MutationResult> {
		void _ref;
		void _signers;
		void _threshold;
		throw new IntegrationUnavailableError("setTablePolicyMultisig");
	}

	listPolicyProposals(_ref: TableRef): Promise<PolicyProposalInfo[]> {
		void _ref;
		throw new IntegrationUnavailableError("listPolicyProposals");
	}

	proposePolicy(
		_ref: TableRef,
		_payload: { proposalId: string; policies: TablePolicyWrite[] },
	): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("proposePolicy");
	}

	approvePolicy(_ref: TableRef, _proposalId: string): Promise<MutationResult> {
		void _ref;
		void _proposalId;
		throw new IntegrationUnavailableError("approvePolicy");
	}

	applyPolicy(_ref: TableRef, _proposalId: string): Promise<MutationResult> {
		void _ref;
		void _proposalId;
		throw new IntegrationUnavailableError("applyPolicy");
	}

	cancelPolicy(_ref: TableRef, _proposalId: string): Promise<MutationResult> {
		void _ref;
		void _proposalId;
		throw new IntegrationUnavailableError("cancelPolicy");
	}

	getTableExtensionPolicy(_ref: TableRef): Promise<ExtensionPolicyInfo | null> {
		void _ref;
		throw new IntegrationUnavailableError("getTableExtensionPolicy");
	}

	setTableExtensionPolicy(
		_ref: TableRef,
		_payload: ExtensionPolicyInfo,
	): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("setTableExtensionPolicy");
	}

	clearTableExtensionPolicy(_ref: TableRef): Promise<MutationResult> {
		void _ref;
		throw new IntegrationUnavailableError("clearTableExtensionPolicy");
	}

	invokeTableExtension(_ref: TableRef, _dataHex: string): Promise<MutationResult> {
		void _ref;
		void _dataHex;
		throw new IntegrationUnavailableError("invokeTableExtension");
	}

	addColumn(_ref: TableRef, _payload: AddColumnPayload): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("addColumn");
	}

	alterColumn(
		_ref: TableRef,
		_column: string,
		_payload: AlterColumnPayload,
	): Promise<MutationResult> {
		void _ref;
		void _column;
		void _payload;
		throw new IntegrationUnavailableError("alterColumn");
	}

	dropColumn(_ref: ColumnRef): Promise<MutationResult> {
		void _ref;
		throw new IntegrationUnavailableError("dropColumn");
	}

	renameColumn(_ref: TableRef, _payload: RenameColumnPayload): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("renameColumn");
	}

	listIndexes(_ref: TableRef): Promise<IndexInfo[]> {
		void _ref;
		throw new IntegrationUnavailableError("listIndexes");
	}

	createIndex(_ref: TableRef, _payload: CreateIndexPayload): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("createIndex");
	}

	dropIndex(_ref: TableRef, _indexName: string): Promise<MutationResult> {
		void _ref;
		void _indexName;
		throw new IntegrationUnavailableError("dropIndex");
	}

	setIndexNullsNotDistinct(
		_ref: TableRef,
		_indexName: string,
		_nullsNotDistinct: boolean,
	): Promise<MutationResult> {
		void _ref;
		void _indexName;
		void _nullsNotDistinct;
		throw new IntegrationUnavailableError("setIndexNullsNotDistinct");
	}

	executeQuery(_database: string, _request: ExecuteQueryRequest): Promise<QueryResult> {
		void _database;
		void _request;
		throw new IntegrationUnavailableError("executeQuery");
	}
}
