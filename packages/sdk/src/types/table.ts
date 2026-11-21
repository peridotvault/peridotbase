import { z } from "zod";
import { dataTypesSchema, standardizedDataTypeSchema } from "./common.js";

export const tableInfoSchema = z.object({
	tableName: z.string("Table name is required"),
	schemaName: z.string().optional(),
	rowCount: z.coerce.number("Row count is required"),
	/** True when the row count is an estimate reported by the program. */
	rowCountEstimated: z.boolean().optional(),
	/** Catalog lifecycle state; dropped tables stay readable until restored or closed. */
	status: z.enum(["active", "dropped"]).optional(),
});

export type TableInfo = z.infer<typeof tableInfoSchema>;

/** Irreversible on-chain table guards; once set, a guard cannot be cleared. */
export const TABLE_GUARD_KINDS = [
	"appendOnly",
	"denyDelete",
	"denyUpdate",
	"immutable",
	"freezePolicies",
] as const;

export type TableGuardKind = (typeof TABLE_GUARD_KINDS)[number];

export type TableGuards = Record<TableGuardKind, boolean>;

export const tableGuardsSchema = z.object({
	appendOnly: z.boolean(),
	denyDelete: z.boolean(),
	denyUpdate: z.boolean(),
	immutable: z.boolean(),
	freezePolicies: z.boolean(),
});

export type TableGuardsSchemaType = z.infer<typeof tableGuardsSchema>;

/** Historical name kept for the Studio's UI types; prefer `TableInfo`. */
export type TableInfoSchemaType = TableInfo;

export const columnInfoSchema = z.object({
	columnName: z.string(),
	dataType: dataTypesSchema,
	dataTypeLabel: standardizedDataTypeSchema,
	isNullable: z.boolean(),
	columnDefault: z.string().nullable(),
	isPrimaryKey: z.boolean(),
	isForeignKey: z.boolean(),
	referencedTable: z.string().nullable(),
	referencedSchema: z.string().optional(),
	referencedColumn: z.string().nullable(),
	enumValues: z.array(z.string()).nullable(),
});

export type ColumnInfo = z.infer<typeof columnInfoSchema>;

/** Historical name kept for the Studio's UI types; prefer `ColumnInfo`. */
export type ColumnInfoSchemaType = ColumnInfo;

export const relationshipSchema = z.object({
	fromTable: z.string(),
	fromColumn: z.string(),
	toTable: z.string(),
	toColumn: z.string(),
	/** On-chain foreign key id; set when the relationship was decoded from a catalog. */
	fkId: z.string().optional(),
});

export type Relationship = z.infer<typeof relationshipSchema>;

export const tableSchemaResultSchema = z.object({
	schema: z.string(),
});

export type TableSchemaResult = z.infer<typeof tableSchemaResultSchema>;

/** Declarative partition routing for a v3 table. */
export const tablePartitionSchema = z.object({
	strategy: z.enum(["none", "range", "list"]),
	/** Column index the partition key is read from. */
	column: z.number(),
	/** RANGE: ascending exclusive upper bounds. LIST: listed values. */
	bounds: z.array(z.string()),
	/** Values outside every bound fall into a final partition. */
	hasDefault: z.boolean(),
});

export type TablePartition = z.infer<typeof tablePartitionSchema>;

/** Read-only view of the table's v3 storage descriptor. */
export const tableStorageSchema = z.object({
	/** Retained revisions per record; 0 disables append-only history. */
	historyLimit: z.number(),
	partition: tablePartitionSchema,
});

export type TableStorage = z.infer<typeof tableStorageSchema>;

export const setTablePartitioningSchema = z.object({
	strategy: z.enum(["none", "range", "list"]),
	column: z.number().nonnegative().optional(),
	bounds: z.array(z.number()).optional(),
	defaultPartition: z.boolean().optional(),
});

export type SetTablePartitioningPayload = z.infer<typeof setTablePartitioningSchema>;

export const tablePolicyOps = ["insert", "update", "delete", "select"] as const;

export type TablePolicyOp = (typeof tablePolicyOps)[number];

export const TABLE_POLICY_OPS: Record<TablePolicyOp, number> = {
	insert: 0x01,
	update: 0x02,
	delete: 0x04,
	select: 0x08,
};

export const tablePolicySchema = z.object({
	policyId: z.string(),
	role: z.enum(["member", "admin", "owner"]),
	/** Operation names enabled by the mask. */
	ops: z.array(z.enum(tablePolicyOps)),
	/** Hex predicate bytecode; empty when the policy has no row filter. */
	predicate: z.string(),
});

export type TablePolicy = z.infer<typeof tablePolicySchema>;

/** A policy the Studio may write: no predicate bytecode, IDs as strings. */
export type TablePolicyWrite = Omit<TablePolicy, "predicate">;

export const tablePoliciesSchema = z.object({
	policies: z.array(tablePolicySchema),
	/** Policy changes are timelocked for this many seconds when set. */
	timelockSeconds: z.number().nullable(),
	/** The table requires its M-of-N signers for policy changes. */
	requiresMultisig: z.boolean(),
	/** Policy changes are permanently frozen. */
	frozen: z.boolean(),
});

export type TablePolicies = z.infer<typeof tablePoliciesSchema>;

export const policyProposalSchema = z.object({
	proposalId: z.string(),
	proposer: z.string(),
	/** Unix seconds after which the proposal may be applied. */
	eta: z.number(),
	policies: z.array(tablePolicySchema),
	approvals: z.array(z.string()),
	createdAt: z.number(),
});

export type PolicyProposalInfo = z.infer<typeof policyProposalSchema>;

/** One forwarded account in the pinned CPI extension. */
export const extensionAccountSchema = z.object({
	key: z.string(),
	writable: z.boolean(),
	signer: z.boolean(),
});

export type ExtensionAccount = z.infer<typeof extensionAccountSchema>;

/** The opt-in CPI extension pinned to a table, when one exists. */
export const extensionPolicySchema = z.object({
	program: z.string(),
	/** Required 8-byte instruction discriminator, hex encoded. */
	discriminator: z.string(),
	accounts: z.array(extensionAccountSchema),
});

export type ExtensionPolicyInfo = z.infer<typeof extensionPolicySchema>;
