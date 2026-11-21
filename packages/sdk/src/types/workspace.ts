import { z } from "zod";

/**
 * An organization catalog account. `slug` is the URL-safe name the Studio routes carry; the
 * on-chain account stores the display name and its own `organization_id`.
 */
export const organizationInfoSchema = z.object({
	slug: z.string("Slug is required"),
	name: z.string("Name is required"),
	/** Catalog account address, base58. */
	address: z.string("Address is required"),
	owner: z.string("Owner is required"),
});

export type OrganizationInfo = z.infer<typeof organizationInfoSchema>;

/** A project catalog account; every database belongs to exactly one project. */
export const projectInfoSchema = z.object({
	slug: z.string("Slug is required"),
	name: z.string("Name is required"),
	organization: z.string("Organization is required"),
	address: z.string("Address is required"),
});

export type ProjectInfo = z.infer<typeof projectInfoSchema>;

export const ORGANIZATION_MEMBER_ROLES = ["owner", "admin", "member"] as const;

export const organizationMemberRoleSchema = z.enum(ORGANIZATION_MEMBER_ROLES);

export type OrganizationMemberRole = z.infer<typeof organizationMemberRoleSchema>;

/** One on-chain organization membership; the owner is reported as a synthetic member. */
export const organizationMemberInfoSchema = z.object({
	/** Wallet address, base58. */
	principal: z.string(),
	role: organizationMemberRoleSchema,
	/** Membership generation; absent for the owner, who has no member account. */
	generation: z.number().nullable(),
});

export type OrganizationMemberInfo = z.infer<typeof organizationMemberInfoSchema>;

/** Guarded organization actions, mirroring `ORG_ACTION_*` in the program. */
export const ORGANIZATION_ACTIONS = [
	"transferOwner",
	"rename",
	"addMember",
	"removeMember",
	"updateMember",
	"setPolicy",
	"closeDatabase",
] as const;

export type OrganizationAction = (typeof ORGANIZATION_ACTIONS)[number];

export const ORGANIZATION_ACTION_BITS: Record<OrganizationAction, number> = {
	transferOwner: 1 << 0,
	rename: 1 << 1,
	addMember: 1 << 2,
	removeMember: 1 << 3,
	updateMember: 1 << 4,
	setPolicy: 1 << 5,
	closeDatabase: 1 << 6,
};

/** The optional M-of-N governance policy on an organization. */
export const organizationPolicyInfoSchema = z.object({
	signers: z.array(z.string()),
	threshold: z.number(),
	/** Actions that require a proposal once this policy exists. */
	guardedActions: z.array(z.enum(ORGANIZATION_ACTIONS)),
	/** Break-glass key; null when recovery is disabled. */
	recoveryAuthority: z.string().nullable(),
	recoveryDelaySeconds: z.number(),
	/** Unix seconds the pending recovery becomes executable; null when idle. */
	recoveryReadyAt: z.number().nullable(),
	epoch: z.string(),
	proposalCounter: z.string(),
	createdAt: z.number(),
});

export type OrganizationPolicyInfo = z.infer<typeof organizationPolicyInfoSchema>;

/** A pending or executed organization action awaiting signer approvals. */
export const organizationProposalInfoSchema = z.object({
	proposalId: z.string(),
	action: z.string(),
	digest: z.string(),
	approvers: z.array(z.string()),
	expiresAt: z.number(),
	executed: z.boolean(),
	createdAt: z.number(),
});

export type OrganizationProposalInfo = z.infer<typeof organizationProposalInfoSchema>;

/** Arguments for creating (or replacing) the organization policy. */
export const organizationPolicyPayloadSchema = z.object({
	signers: z.array(z.string()).min(1, "At least one signer is required"),
	threshold: z.number().min(1),
	guardedActions: z.array(z.enum(ORGANIZATION_ACTIONS)),
	recoveryAuthority: z.string().optional(),
	recoveryDelaySeconds: z.number().min(0).optional(),
});

export type OrganizationPolicyPayload = z.infer<typeof organizationPolicyPayloadSchema>;

/** The action payload a policy proposal commits to, mirroring the program digest. */
export const organizationActionPayloadSchema = z.discriminatedUnion("action", [
	z.object({ action: z.literal("transferOwner"), newOwner: z.string() }),
	z.object({ action: z.literal("rename"), name: z.string() }),
	z.object({
		action: z.literal("addMember"),
		principal: z.string(),
		role: z.enum(["admin", "member"]),
	}),
	z.object({ action: z.literal("removeMember"), principal: z.string() }),
	z.object({
		action: z.literal("updateMember"),
		principal: z.string(),
		role: z.enum(["admin", "member"]),
	}),
	z.object({ action: z.literal("closeDatabase"), database: z.string() }),
]);

export type OrganizationActionPayload = z.infer<typeof organizationActionPayloadSchema>;
