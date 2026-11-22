/**
 * The Studio's demo data source. It is built only when the admin database enables demo mode
 * every `PeridotbaseClient` method from sample rows instead of Solana. Nothing here talks to an
 * RPC endpoint, signs a transaction, or claims to be real program data; the shell labels the
 * whole session as a demo.
 */
import type {
	AddColumnPayload,
	AlterColumnPayload,
	AuditEvent,
	BulkInsertResult,
	Capabilities,
	ColumnInfo,
	ColumnRef,
	CreateIndexPayload,
	CreateDomainPayload,
	CreateEnumPayload,
	CreateSponsorAllowancePayload,
	DatabaseTypeInfo,
	SchemaCatalogInfo,
	CreateTablePayload,
	DatabaseAudit,
	DatabaseInfo,
	DatabaseGrant,
	DeleteRowsResult,
	ExecuteQueryRequest,
	IndexInfo,
	MutationResult,
	OrganizationActionPayload,
	OrganizationInfo,
	OrganizationMemberInfo,
	OrganizationMemberRole,
	OrganizationPolicyInfo,
	OrganizationPolicyPayload,
	OrganizationProposalInfo,
	SponsorAllowance,
	TopUpSponsorAllowancePayload,
	PeridotbaseClient,
	PeridotbaseClientOptions,
	ProjectInfo,
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
	TableGuards,
	TableStorage,
	TablePolicies,
	TablePolicyWrite,
	ExtensionPolicyInfo,
	PolicyProposalInfo,
	SetTablePartitioningPayload,
} from "@peridotvault/peridotbase-sdk";
import { slugify } from "@peridotvault/peridotbase-sdk";
import {
	createDemoDatabase,
	DEMO_ORGANIZATIONS,
	DEMO_PROJECTS,
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

	private databases: DemoDatabase[] = [createDemoDatabase()];
	private organizations = DEMO_ORGANIZATIONS.map((entry) => ({ ...entry }));
	private projects = DEMO_PROJECTS.map((entry) => ({ ...entry }));
	/** Demo memberships keyed by organization slug. */
	private members = new Map<string, OrganizationMemberInfo[]>();
	/** Soft-dropped demo tables, keyed by `database/table`. */
	private dropped = new Map<string, DemoTable>();
	private comments = new Map<string, string>();
	private guards = new Map<string, TableGuards>();
	/** Demo audit state: enforcement flag plus events, keyed by database. */
	private auditRequired = new Set<string>();
	private auditEvents = new Map<string, AuditEvent[]>();
	/** Demo allowances keyed by grantee; the demo wallet is always the sponsor. */
	private allowances = new Map<string, SponsorAllowance>();
	private storage = new Map<string, TableStorage>();
	private grants = new Map<string, DatabaseGrant[]>();
	private extensions = new Map<string, ExtensionPolicyInfo>();
	private orgPolicies = new Map<string, OrganizationPolicyInfo>();
	private orgProposals = new Map<string, OrganizationProposalInfo[]>();
	private policies = new Map<string, TablePolicies>();
	private proposals = new Map<string, PolicyProposalInfo[]>();
	/** Demo schemas and type catalogs, keyed by database name. */
	private schemas = new Map<string, string[]>();
	private types = new Map<string, DatabaseTypeInfo[]>();

	private tableKey(database: string, table: string): string {
		return `${database}/${table.toLowerCase()}`;
	}

	private demoMembers(organization: string): OrganizationMemberInfo[] {
		const owner =
			this.organizations.find((entry) => entry.slug === organization)?.owner ?? "demo";
		return [
			{ principal: owner, role: "owner", generation: null },
			...(this.members.get(organization) ?? []),
		];
	}
	private databaseAt(name: string): DemoDatabase {
		const database = this.databases.find((candidate) => candidate.info.name === name);

		if (!database) {
			throw new Error(
				`Demo mode: "${name}" does not exist yet. Create it from the database dropdown.`,
			);
		}

		return database;
	}

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

	/** Demo mode answers the organization/project catalog from the seeded sample set. */
	async listOrganizations(): Promise<OrganizationInfo[]> {
		return this.organizations.map((organization) => ({ ...organization }));
	}

	async createOrganization(name: string): Promise<OrganizationInfo> {
		const slug = slugify(name);

		if (!slug) throw new Error("Name your organization first");
		if (this.organizations.some((organization) => organization.slug === slug)) {
			throw new Error(`Demo mode: organization "${slug}" already exists`);
		}

		const organization = { slug, name: slug, address: `demo-org-${slug}`, owner: "demo" };
		this.organizations.push(organization);

		return { ...organization };
	}

	async listProjects(organization: string): Promise<ProjectInfo[]> {
		return this.projects
			.filter((project) => project.organization === organization)
			.map((project) => ({ ...project }));
	}

	async createProject(organization: string, name: string): Promise<ProjectInfo> {
		const slug = slugify(name);

		if (!slug) throw new Error("Name your project first");
		if (
			this.projects.some(
				(project) => project.organization === organization && project.slug === slug,
			)
		) {
			throw new Error(`Demo mode: project "${slug}" already exists`);
		}

		const project = { slug, name: slug, organization, address: `demo-project-${slug}` };
		this.projects.push(project);

		return { ...project };
	}

	async listOrganizationMembers(organization: string): Promise<OrganizationMemberInfo[]> {
		return clone(this.demoMembers(organization));
	}

	async addOrganizationMember(
		organization: string,
		principal: string,
		role: Exclude<OrganizationMemberRole, "owner">,
		proposalId?: string,
	): Promise<MutationResult> {
		void proposalId;
		if (this.demoMembers(organization).some((member) => member.principal === principal)) {
			throw new Error(`Demo mode: ${principal} is already a member`);
		}

		this.members.set(organization, [
			...(this.members.get(organization) ?? []),
			{ principal, role, generation: 1 },
		]);

		return { message: `Added ${principal} as ${role} in demo mode` };
	}

	async updateOrganizationMember(
		organization: string,
		principal: string,
		role: Exclude<OrganizationMemberRole, "owner">,
		proposalId?: string,
	): Promise<MutationResult> {
		void proposalId;
		this.members.set(
			organization,
			(this.members.get(organization) ?? []).map((member) =>
				member.principal === principal ? { ...member, role } : member,
			),
		);

		return { message: `Updated ${principal} to ${role} in demo mode` };
	}

	async getOrganizationPolicy(organization: string): Promise<OrganizationPolicyInfo | null> {
		return clone(this.orgPolicies.get(organization) ?? null);
	}

	async setOrganizationPolicy(
		organization: string,
		payload: OrganizationPolicyPayload,
		proposalId?: string,
	): Promise<MutationResult> {
		void proposalId;
		this.orgPolicies.set(organization, {
			signers: payload.signers,
			threshold: payload.threshold,
			guardedActions: payload.guardedActions,
			recoveryAuthority: payload.recoveryAuthority ?? null,
			recoveryDelaySeconds: payload.recoveryDelaySeconds ?? 0,
			recoveryReadyAt: null,
			epoch: "1",
			proposalCounter: "1",
			createdAt: Math.floor(Date.now() / 1000),
		});

		return {
			message: `Installed a ${payload.threshold}-of-${payload.signers.length} policy in demo mode`,
		};
	}

	async listOrganizationProposals(organization: string): Promise<OrganizationProposalInfo[]> {
		return clone(this.orgProposals.get(organization) ?? []);
	}

	async proposeOrganizationAction(
		organization: string,
		payload: OrganizationActionPayload & { proposalId: string; expiresAt?: number },
	): Promise<MutationResult> {
		const current = this.orgProposals.get(organization) ?? [];
		this.orgProposals.set(organization, [
			...current,
			{
				proposalId: payload.proposalId,
				action: payload.action,
				digest: `demo-${payload.action}-${payload.proposalId}`,
				approvers: ["Demo workspace"],
				expiresAt: payload.expiresAt ?? 0,
				executed: false,
				createdAt: Math.floor(Date.now() / 1000),
			},
		]);

		return { message: `Proposed ${payload.action} in demo mode` };
	}

	async approveOrganizationAction(
		organization: string,
		proposalId: string,
	): Promise<MutationResult> {
		this.orgProposals.set(
			organization,
			(this.orgProposals.get(organization) ?? []).map((proposal) =>
				proposal.proposalId === proposalId && !proposal.approvers.includes("Demo workspace")
					? { ...proposal, approvers: [...proposal.approvers, "Demo workspace"] }
					: proposal,
			),
		);

		return { message: `Approved proposal ${proposalId} in demo mode` };
	}

	async closeOrganizationProposal(
		organization: string,
		proposalId: string,
	): Promise<MutationResult> {
		this.orgProposals.set(
			organization,
			(this.orgProposals.get(organization) ?? []).filter(
				(proposal) => proposal.proposalId !== proposalId,
			),
		);

		return { message: `Closed proposal ${proposalId} in demo mode` };
	}

	async initiateOrganizationRecovery(organization: string): Promise<MutationResult> {
		const policy = this.orgPolicies.get(organization);

		if (!policy) throw new Error("Demo mode: this organization has no policy");

		this.orgPolicies.set(organization, {
			...policy,
			recoveryReadyAt: Math.floor(Date.now() / 1000) + policy.recoveryDelaySeconds,
		});

		return { message: "Recovery started in demo mode" };
	}

	async cancelOrganizationRecovery(organization: string): Promise<MutationResult> {
		const policy = this.orgPolicies.get(organization);

		if (!policy) throw new Error("Demo mode: this organization has no policy");

		this.orgPolicies.set(organization, { ...policy, recoveryReadyAt: null });

		return { message: "Recovery cancelled in demo mode" };
	}

	async executeOrganizationRecovery(
		organization: string,
		signers: string[],
		threshold: number,
	): Promise<MutationResult> {
		const policy = this.orgPolicies.get(organization);

		if (!policy) throw new Error("Demo mode: this organization has no policy");

		this.orgPolicies.set(organization, {
			...policy,
			signers,
			threshold,
			recoveryReadyAt: null,
			epoch: String(Number(policy.epoch) + 1),
		});

		return { message: "Recovered the organization in demo mode" };
	}

	async transferOrganizationOwner(
		organization: string,
		newOwner: string,
		proposalId?: string,
	): Promise<MutationResult> {
		const entry = this.organizations.find((candidate) => candidate.slug === organization);

		if (!entry) throw new Error(`Demo mode: organization ${organization} does not exist`);
		void proposalId;

		entry.owner = newOwner;

		return { message: `Transferred ${organization} to ${newOwner} in demo mode` };
	}

	async removeOrganizationMember(
		organization: string,
		principal: string,
		proposalId?: string,
	): Promise<MutationResult> {
		void proposalId;
		this.members.set(
			organization,
			(this.members.get(organization) ?? []).filter(
				(member) => member.principal !== principal,
			),
		);

		return { message: `Removed ${principal} in demo mode` };
	}

	async listDatabases(): Promise<DatabaseInfo[]> {
		return this.databases.map((database) => clone(database.info));
	}

	async createDatabase(name: string): Promise<DatabaseInfo> {
		const existing = this.databases.some((database) => database.info.name === name);

		if (existing) throw new Error(`Demo mode: database "${name}" already exists`);

		const database = createDemoDatabase(name);

		database.tables = [];
		database.relationships = [];

		this.databases.push(database);

		return clone(database.info);
	}

	async getDatabaseAudit(database: string): Promise<DatabaseAudit> {
		this.assertDatabase(database);

		return {
			required: this.auditRequired.has(database),
			sequence: this.auditEvents.get(database)?.length ?? 0,
		};
	}

	async setDatabaseAuditRequired(
		database: string,
		required: boolean,
	): Promise<MutationResult> {
		this.assertDatabase(database);

		if (required) this.auditRequired.add(database);
		else this.auditRequired.delete(database);

		return {
			message: required
				? "Audit events are now required in demo mode"
				: "Audit events are optional again in demo mode",
		};
	}

	async listAuditEvents(database: string): Promise<AuditEvent[]> {
		this.assertDatabase(database);

		return clone(this.auditEvents.get(database) ?? []);
	}

	async verifyAuditTrail(database: string): Promise<{
		valid: boolean;
		sequence: number;
		brokenAt?: string;
	}> {
		this.assertDatabase(database);

		// Demo events never carry a hash chain, so there is nothing to verify.
		return { valid: true, sequence: (this.auditEvents.get(database) ?? []).length };
	}

	async listSponsorAllowances(): Promise<SponsorAllowance[]> {
		return clone([...this.allowances.values()]);
	}

	async createSponsorAllowance(
		payload: CreateSponsorAllowancePayload,
	): Promise<MutationResult> {
		if (this.allowances.has(payload.grantee)) {
			throw new Error(`Demo mode: an allowance for ${payload.grantee} already exists`);
		}

		this.allowances.set(payload.grantee, {
			address: `demo-allowance-${payload.grantee}`,
			sponsor: "demo",
			grantee: payload.grantee,
			cap: payload.cap,
			spent: 0,
			expiresAt: payload.expiresAt ?? 0,
			createdAt: Math.floor(Date.now() / 1000),
		});

		return { message: `Allowance created for ${payload.grantee} in demo mode` };
	}

	async topUpSponsorAllowance(payload: TopUpSponsorAllowancePayload): Promise<MutationResult> {
		const current = this.allowances.get(payload.grantee);

		if (!current) {
			throw new Error(`Demo mode: no allowance for ${payload.grantee}`);
		}

		this.allowances.set(payload.grantee, {
			...current,
			cap: current.cap + payload.amount,
			expiresAt: payload.expiresAt ?? current.expiresAt,
		});

		return { message: `Allowance topped up for ${payload.grantee} in demo mode` };
	}

	async closeSponsorAllowance(grantee: string): Promise<MutationResult> {
		if (!this.allowances.delete(grantee)) {
			throw new Error(`Demo mode: no allowance for ${grantee}`);
		}

		return { message: `Allowance closed for ${grantee} in demo mode` };
	}

	async deleteDatabase(database: string, proposalId?: string): Promise<MutationResult> {
		this.assertDatabase(database);
		this.databases = this.databases.filter((entry) => entry.info.name !== database);
		this.grants.delete(database);
		void proposalId;

		return { message: `Closed ${database} in demo mode` };
	}

	async cancelCloseDatabase(database: string): Promise<MutationResult> {
		this.assertDatabase(database);

		return { message: `Cancelled the staged close of ${database} in demo mode` };
	}

	async renounceDatabaseAuthority(database: string): Promise<MutationResult> {
		this.assertDatabase(database);

		return { message: `Renounced authority over ${database} in demo mode` };
	}

	async listDatabaseGrants(database: string): Promise<DatabaseGrant[]> {
		this.assertDatabase(database);

		return [...(this.grants.get(database) ?? [])];
	}

	async grantDatabaseRole(
		database: string,
		principal: string,
		role: "admin" | "member",
	): Promise<MutationResult> {
		this.assertDatabase(database);
		const current = (this.grants.get(database) ?? []).filter(
			(entry) => entry.principal !== principal,
		);
		this.grants.set(database, [
			...current,
			{
				principal,
				role,
				grantedBy: "Demo workspace",
				grantedAt: Math.floor(Date.now() / 1000),
			},
		]);

		return { message: `Granted ${role} on ${database} in demo mode` };
	}

	async revokeDatabaseRole(database: string, principal: string): Promise<MutationResult> {
		this.assertDatabase(database);
		this.grants.set(
			database,
			(this.grants.get(database) ?? []).filter((entry) => entry.principal !== principal),
		);

		return { message: `Revoked the grant for ${principal} in demo mode` };
	}

	async listSchemas(database: string): Promise<SchemaCatalogInfo[]> {
		this.assertDatabase(database);

		return (this.schemas.get(database) ?? ["public"]).map((schemaName) => ({
			schemaName,
			createdAt: 0,
		}));
	}

	async createSchema(database: string, name: string): Promise<MutationResult> {
		this.assertDatabase(database);
		const current = this.schemas.get(database) ?? ["public"];

		if (current.includes(name)) throw new Error(`Demo mode: schema ${name} already exists`);

		this.schemas.set(database, [...current, name]);

		return { message: `Created schema ${name} in demo mode` };
	}

	async listDatabaseTypes(database: string): Promise<DatabaseTypeInfo[]> {
		this.assertDatabase(database);

		return clone(this.types.get(database) ?? []);
	}

	async createEnum(database: string, payload: CreateEnumPayload): Promise<MutationResult> {
		this.assertDatabase(database);
		const current = this.types.get(database) ?? [];

		if (current.some((type) => type.typeName === payload.typeName)) {
			throw new Error(`Demo mode: type ${payload.typeName} already exists`);
		}

		this.types.set(database, [
			...current,
			{
				typeName: payload.typeName,
				kind: "enum",
				base: "text",
				scale: 0,
				enumValues: payload.values,
				createdAt: 0,
			},
		]);

		return { message: `Created enum ${payload.typeName} in demo mode` };
	}

	async createDomain(database: string, payload: CreateDomainPayload): Promise<MutationResult> {
		this.assertDatabase(database);
		const current = this.types.get(database) ?? [];

		if (current.some((type) => type.typeName === payload.typeName)) {
			throw new Error(`Demo mode: type ${payload.typeName} already exists`);
		}

		this.types.set(database, [
			...current,
			{
				typeName: payload.typeName,
				kind: "domain",
				base: payload.base,
				scale: payload.scale ?? 0,
				enumValues: [],
				createdAt: 0,
			},
		]);

		return { message: `Created domain ${payload.typeName} in demo mode` };
	}

	async listTables(database: string): Promise<TableInfo[]> {
		this.assertDatabase(database);

		return this.databaseAt(database).tables.map((table) => ({
			...clone(table.info),
			rowCount: table.rows.length,
		}));
	}

	async listDroppedTables(database: string): Promise<TableInfo[]> {
		this.assertDatabase(database);

		return [...this.dropped.entries()]
			.filter(([key]) => key.startsWith(`${database}/`))
			.map(([, table]) => ({
				...clone(table.info),
				rowCount: table.rows.length,
				status: "dropped" as const,
			}));
	}

	async getTableColumns(ref: TableRef): Promise<ColumnInfo[]> {
		return clone(this.table(ref).columns);
	}

	async listTablesWithColumns(
		database: string,
	): Promise<Array<TableInfo & { columns: ColumnInfo[] }>> {
		this.assertDatabase(database);

		return this.databaseAt(database).tables.map((table) => ({
			...clone(table.info),
			rowCount: table.rows.length,
			columns: clone(table.columns),
		}));
	}

	async getRelationships(database: string): Promise<Relationship[]> {
		this.assertDatabase(database);

		return clone(this.databaseAt(database).relationships);
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

	async createTable(
		databaseName: string,
		payload: CreateTablePayload,
	): Promise<MutationResult> {
		const database = this.databaseAt(databaseName);
		const name = payload.tableName.trim();
		const existing = database.tables.find(
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
			indexes: [
				...(columns.some((column) => column.isPrimaryKey)
					? [
							{
								indexName: `${name}_pkey`,
								columns: columns
									.filter((column) => column.isPrimaryKey)
									.map((column) => column.columnName),
								isUnique: true,
								method: null,
								kind: "primary" as const,
								definition: `PRIMARY KEY (${columns
									.filter((column) => column.isPrimaryKey)
									.map((column) => column.columnName)
									.join(", ")})`,
							},
						]
					: []),
				...(payload.indexes ?? []).map((index) => ({
					indexName: index.indexName,
					columns: index.columns,
					isUnique: index.isUnique,
					method: "btree",
					kind: index.isUnique ? ("unique-constraint" as const) : ("index" as const),
					definition: `CREATE ${index.isUnique ? "UNIQUE " : ""}INDEX ${index.indexName} ON ${name} (${index.columns.join(", ")})`,
				})),
			],
		};

		database.tables.push(table);

		for (const foreignKey of foreignKeys) {
			database.relationships.push({
				fromTable: name,
				fromColumn: foreignKey.columnName,
				toTable: foreignKey.referencedTable,
				toColumn: foreignKey.referencedColumn,
			});
		}

		return { message: `Created table "${name}" in demo mode` };
	}

	async renameTable(ref: TableRef, payload: RenameTablePayload): Promise<MutationResult> {
		const database = this.databaseAt(ref.database);
		const table = this.table(ref);
		const previous = table.info.tableName;

		table.info.tableName = payload.newTableName;

		for (const relationship of database.relationships) {
			if (relationship.fromTable === previous) relationship.fromTable = payload.newTableName;
			if (relationship.toTable === previous) relationship.toTable = payload.newTableName;
		}

		return { message: `Renamed "${previous}" to "${payload.newTableName}" in demo mode` };
	}

	async dropTable(ref: TableRef): Promise<MutationResult> {
		const database = this.databaseAt(ref.database);
		const table = this.table(ref);
		const name = table.info.tableName;

		database.tables = database.tables.filter((entry) => entry.info.tableName !== name);
		database.relationships = database.relationships.filter(
			(relationship) => relationship.fromTable !== name && relationship.toTable !== name,
		);
		this.dropped.set(this.tableKey(ref.database, name), table);

		return { message: `Dropped table "${name}" in demo mode` };
	}

	async createForeignKey(
		ref: TableRef,
		payload: { column: string; parentTable: string; parentColumn?: string },
	): Promise<MutationResult> {
		const database = this.databaseAt(ref.database);
		const parent = database.tables.find(
			(table) => table.info.tableName === payload.parentTable,
		);

		if (!parent) throw new Error(`Demo mode: table "${payload.parentTable}" does not exist`);

		const fkId = String(database.relationships.length + 1);
		database.relationships.push({
			fromTable: ref.table,
			fromColumn: payload.column,
			toTable: payload.parentTable,
			toColumn: payload.parentColumn ?? parent.columns[0]?.columnName ?? "id",
			fkId,
		});

		return { message: `Linked ${ref.table}.${payload.column} in demo mode` };
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
		const database = this.databaseAt(ref.database);
		const parent = database.tables.find(
			(table) => table.info.tableName === payload.parentTable,
		);

		if (!parent) throw new Error(`Demo mode: table "${payload.parentTable}" does not exist`);

		const index = parent.indexes.find(
			(candidate) =>
				candidate.indexId === payload.parentIndexId ||
				candidate.indexName === payload.parentIndexId,
		);
		const parentColumns = index?.columns ?? parent.columns.map((column) => column.columnName);
		const fkId = String(
			database.relationships.reduce((max, relationship) => {
				const value = Number(relationship.fkId ?? 0);
				return Number.isFinite(value) && value > max ? value : max;
			}, 0) + 1,
		);

		payload.childColumns.forEach((childColumn, position) => {
			database.relationships.push({
				fromTable: ref.table,
				fromColumn: childColumn,
				toTable: payload.parentTable,
				toColumn: parentColumns[position] ?? parentColumns[0] ?? "id",
				fkId,
			});
		});

		return {
			message: `Linked ${ref.table}(${payload.childColumns.join(", ")}) in demo mode`,
		};
	}

	async dropForeignKey(
		ref: TableRef,
		payload: { fkId: string; parentTable: string },
	): Promise<MutationResult> {
		const database = this.databaseAt(ref.database);
		const before = database.relationships.length;
		database.relationships = database.relationships.filter(
			(relationship) =>
				!(
					relationship.fromTable === ref.table &&
					relationship.toTable === payload.parentTable &&
					relationship.fkId === payload.fkId
				),
		);

		if (database.relationships.length === before) {
			throw new Error(`Demo mode: no foreign key ${payload.fkId} on ${ref.table}`);
		}

		return { message: `Dropped foreign key on ${ref.table} in demo mode` };
	}

	async duplicateTable(ref: TableRef, newTableName: string): Promise<MutationResult> {
		const database = this.databaseAt(ref.database);
		const source = database.tables.find(
			(table) => table.info.tableName.toLowerCase() === ref.table.toLowerCase(),
		);

		if (!source) throw new Error(`Demo mode: table "${ref.table}" does not exist`);
		if (
			database.tables.some(
				(table) => table.info.tableName.toLowerCase() === newTableName.toLowerCase(),
			)
		) {
			throw new Error(`Demo mode: table "${newTableName}" already exists`);
		}

		const copy = clone(source);
		copy.info = { ...copy.info, tableName: newTableName, rowCount: 0 };
		copy.rows = [];
		database.tables.push(copy);

		return { message: `Duplicated "${ref.table}" as "${newTableName}" in demo mode` };
	}

	async closeDroppedTable(ref: TableRef): Promise<MutationResult> {
		const key = this.tableKey(ref.database, ref.table);

		if (!this.dropped.delete(key)) {
			throw new Error(`Demo mode: ${ref.table} is not dropped`);
		}

		return { message: `Closed "${ref.table}" permanently in demo mode` };
	}

	async restoreTable(ref: TableRef): Promise<MutationResult> {
		const key = this.tableKey(ref.database, ref.table);
		const table = this.dropped.get(key);

		if (!table) throw new Error(`Demo mode: dropped table "${ref.table}" does not exist`);

		this.dropped.delete(key);
		this.databaseAt(ref.database).tables.push(table);

		return { message: `Restored table "${ref.table}" in demo mode` };
	}

	async getTableComment(ref: TableRef): Promise<string | null> {
		return this.comments.get(this.tableKey(ref.database, ref.table)) ?? null;
	}

	async setTableComment(ref: TableRef, comment: string): Promise<MutationResult> {
		this.table(ref);
		const key = this.tableKey(ref.database, ref.table);

		if (comment.trim()) this.comments.set(key, comment.trim());
		else this.comments.delete(key);

		return {
			message: comment.trim()
				? "Table comment saved in demo mode"
				: "Table comment cleared in demo mode",
		};
	}

	async getTableGuards(ref: TableRef): Promise<TableGuards> {
		this.table(ref);

		return {
			appendOnly: false,
			denyDelete: false,
			denyUpdate: false,
			immutable: false,
			freezePolicies: false,
			...this.guards.get(this.tableKey(ref.database, ref.table)),
		};
	}

	async setTableGuards(ref: TableRef, guards: Partial<TableGuards>): Promise<MutationResult> {
		this.table(ref);
		const key = this.tableKey(ref.database, ref.table);
		const current = await this.getTableGuards(ref);

		this.guards.set(key, { ...current, ...guards });

		return { message: `Updated guards for "${ref.table}" in demo mode` };
	}

	async getTableStorage(ref: TableRef): Promise<TableStorage> {
		this.table(ref);

		return (
			this.storage.get(this.tableKey(ref.database, ref.table)) ?? {
				historyLimit: 0,
				partition: { strategy: "none", column: 0, bounds: [], hasDefault: false },
			}
		);
	}

	async setTableHistoryLimit(ref: TableRef, limit: number): Promise<MutationResult> {
		const current = await this.getTableStorage(ref);
		this.storage.set(this.tableKey(ref.database, ref.table), {
			...current,
			historyLimit: limit,
		});

		return { message: `Set history retention to ${limit} in demo mode` };
	}

	async setTablePartitioning(
		ref: TableRef,
		payload: SetTablePartitioningPayload,
	): Promise<MutationResult> {
		const current = await this.getTableStorage(ref);
		this.storage.set(this.tableKey(ref.database, ref.table), {
			...current,
			partition: {
				strategy: payload.strategy,
				column: payload.column ?? 0,
				bounds: (payload.bounds ?? []).map((bound) => String(bound)),
				hasDefault: payload.defaultPartition ?? false,
			},
		});

		return { message: `Updated partitioning for "${ref.table}" in demo mode` };
	}

	async getTablePolicies(ref: TableRef): Promise<TablePolicies> {
		this.table(ref);

		return (
			this.policies.get(this.tableKey(ref.database, ref.table)) ?? {
				policies: [],
				timelockSeconds: null,
				requiresMultisig: false,
				frozen: false,
			}
		);
	}

	async setTablePolicies(
		ref: TableRef,
		policies: TablePolicyWrite[],
	): Promise<MutationResult> {
		const current = await this.getTablePolicies(ref);
		this.policies.set(this.tableKey(ref.database, ref.table), {
			...current,
			policies: policies.map((policy) => ({ ...policy, predicate: "" })),
		});

		return { message: `Replaced policies for "${ref.table}" in demo mode` };
	}

	async setTablePolicyTimelock(ref: TableRef, delaySeconds: number): Promise<MutationResult> {
		const current = await this.getTablePolicies(ref);
		this.policies.set(this.tableKey(ref.database, ref.table), {
			...current,
			timelockSeconds: delaySeconds,
		});

		return { message: `Timelocked policy changes by ${delaySeconds}s in demo mode` };
	}

	async setTablePolicyMultisig(
		ref: TableRef,
		signers: string[],
		threshold: number,
	): Promise<MutationResult> {
		const current = await this.getTablePolicies(ref);
		this.policies.set(this.tableKey(ref.database, ref.table), {
			...current,
			requiresMultisig: true,
		});

		return {
			message: `Installed ${threshold}-of-${signers.length} signers in demo mode`,
		};
	}

	async listPolicyProposals(ref: TableRef): Promise<PolicyProposalInfo[]> {
		this.table(ref);

		return this.proposals.get(this.tableKey(ref.database, ref.table)) ?? [];
	}

	async proposePolicy(
		ref: TableRef,
		payload: { proposalId: string; policies: TablePolicyWrite[] },
	): Promise<MutationResult> {
		const key = this.tableKey(ref.database, ref.table);
		const current = this.proposals.get(key) ?? [];
		const now = Math.floor(Date.now() / 1000);

		this.proposals.set(key, [
			...current,
			{
				proposalId: payload.proposalId,
				proposer: "Demo workspace",
				eta: now,
				policies: payload.policies.map((policy) => ({ ...policy, predicate: "" })),
				approvals: [],
				createdAt: now,
			},
		]);

		return { message: `Proposed policies in demo mode` };
	}

	async approvePolicy(ref: TableRef, proposalId: string): Promise<MutationResult> {
		const key = this.tableKey(ref.database, ref.table);
		this.proposals.set(
			key,
			(this.proposals.get(key) ?? []).map((proposal) =>
				proposal.proposalId === proposalId
					? { ...proposal, approvals: [...proposal.approvals, "Demo workspace"] }
					: proposal,
			),
		);

		return { message: `Approved proposal ${proposalId} in demo mode` };
	}

	async applyPolicy(ref: TableRef, proposalId: string): Promise<MutationResult> {
		const key = this.tableKey(ref.database, ref.table);
		const proposals = this.proposals.get(key) ?? [];
		const proposal = proposals.find((entry) => entry.proposalId === proposalId);

		if (proposal) {
			const current = await this.getTablePolicies(ref);
			this.policies.set(key, { ...current, policies: proposal.policies });
			this.proposals.set(
				key,
				proposals.filter((entry) => entry.proposalId !== proposalId),
			);
		}

		return { message: `Applied proposal ${proposalId} in demo mode` };
	}

	async cancelPolicy(ref: TableRef, proposalId: string): Promise<MutationResult> {
		const key = this.tableKey(ref.database, ref.table);
		this.proposals.set(
			key,
			(this.proposals.get(key) ?? []).filter((entry) => entry.proposalId !== proposalId),
		);

		return { message: `Cancelled proposal ${proposalId} in demo mode` };
	}

	async getTableExtensionPolicy(ref: TableRef): Promise<ExtensionPolicyInfo | null> {
		this.table(ref);

		return this.extensions.get(this.tableKey(ref.database, ref.table)) ?? null;
	}

	async setTableExtensionPolicy(
		ref: TableRef,
		payload: ExtensionPolicyInfo,
	): Promise<MutationResult> {
		this.table(ref);
		this.extensions.set(this.tableKey(ref.database, ref.table), payload);

		return { message: `Pinned an extension to "${ref.table}" in demo mode` };
	}

	async clearTableExtensionPolicy(ref: TableRef): Promise<MutationResult> {
		this.table(ref);
		this.extensions.delete(this.tableKey(ref.database, ref.table));

		return { message: `Cleared the extension on "${ref.table}" in demo mode` };
	}

	async invokeTableExtension(ref: TableRef, dataHex: string): Promise<MutationResult> {
		const policy = await this.getTableExtensionPolicy(ref);

		if (!policy) throw new Error(`Demo mode: ${ref.table} has no extension policy`);
		void dataHex;

		return { message: `Invoked the extension on "${ref.table}" in demo mode` };
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
		const database = this.databaseAt(ref.database);
		const table = this.table(ref);

		table.columns = table.columns.filter((column) => column.columnName !== ref.column);
		table.rows = table.rows.map((row) => {
			const next = { ...row };
			delete next[ref.column];

			return next;
		});
		database.relationships = database.relationships.filter(
			(relationship) =>
				relationship.fromColumn !== ref.column ||
				relationship.fromTable !== table.info.tableName,
		);

		return {
			message: `Dropped column "${ref.column}" from "${table.info.tableName}" in demo mode`,
		};
	}

	async renameColumn(ref: TableRef, payload: RenameColumnPayload): Promise<MutationResult> {
		const database = this.databaseAt(ref.database);
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

		for (const relationship of database.relationships) {
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

	async setIndexNullsNotDistinct(
		ref: TableRef,
		indexName: string,
		nullsNotDistinct: boolean,
	): Promise<MutationResult> {
		const index = this.table(ref).indexes.find((entry) => entry.indexName === indexName);

		if (!index) throw new Error(`Demo mode: unknown index "${indexName}"`);

		index.nullsNotDistinct = nullsNotDistinct;

		return {
			message: `${indexName} ${nullsNotDistinct ? "treats" : "no longer treats"} NULLs as equal in demo mode`,
		};
	}

	async dropIndex(ref: TableRef, indexName: string): Promise<MutationResult> {
		const table = this.table(ref);

		table.indexes = table.indexes.filter((index) => index.indexName !== indexName);

		return { message: `Dropped index "${indexName}" in demo mode` };
	}

	async executeQuery(
		databaseName: string,
		request: ExecuteQueryRequest,
	): Promise<QueryResult> {
		const database = this.databaseAt(databaseName);

		return executeDemoSql(database, request.statement);
	}

	private assertDatabase(database: string) {
		this.databaseAt(database);
	}

	private table(ref: TableRef): DemoTable {
		const table = this.databaseAt(ref.database).tables.find(
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
