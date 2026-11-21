import { z } from "zod";

/** A database account the connected wallet can read. `name` is its on-chain account name. */
export const databaseInfoSchema = z.object({
	name: z.string("Name is required"),
	owner: z.string("Owner is required"),
	/** Account size in bytes, human readable. */
	size: z.string("Size is required"),
	encoding: z.string("Encoding is required"),
});

export type DatabaseInfo = z.infer<typeof databaseInfoSchema>;

/** Identifies a table inside a database; `schema` scopes it to a namespace when set. */
export type TableRef = {
	database: string;
	table: string;
	schema?: string;
};

/** Identifies a column inside a table. */
export type ColumnRef = TableRef & {
	column: string;
};

/** On-chain audit actions, in the numeric order the program encodes them. */
export const AUDIT_ACTIONS = ["insert", "update", "delete", "ddl", "custom"] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const auditEventSchema = z.object({
	/** Monotonic per-database sequence. */
	sequence: z.number(),
	tableId: z.string(),
	actor: z.string(),
	action: z.enum(AUDIT_ACTIONS),
	/** UTF-8 payload when printable, base64 otherwise. */
	payload: z.string().nullable(),
	createdAt: z.number(),
});

export type AuditEvent = z.infer<typeof auditEventSchema>;

/** Audit enforcement and the head of the append-only trail. */
export const databaseAuditSchema = z.object({
	required: z.boolean(),
	sequence: z.number(),
});

export type DatabaseAudit = z.infer<typeof databaseAuditSchema>;

/** A project-level role grant for one principal. */
export const databaseGrantSchema = z.object({
	principal: z.string(),
	role: z.enum(["admin", "member"]),
	grantedBy: z.string(),
	grantedAt: z.number(),
});

export type DatabaseGrant = z.infer<typeof databaseGrantSchema>;

/** Result of recomputing the audit hash chain and its Merkle root. */
export const auditVerificationSchema = z.object({
	valid: z.boolean(),
	sequence: z.number(),
	/** Address of the first event that failed, or `trail-head`. */
	brokenAt: z.string().optional(),
});

export type AuditVerification = z.infer<typeof auditVerificationSchema>;
