import { z } from "zod";

/**
 * A prepaid fee allowance: `sponsor` covers mutation fees for `grantee` until `cap` lamports
 * are spent or `expiresAt` passes. Amounts stay in lamports; the UI converts for display.
 */
export const sponsorAllowanceSchema = z.object({
	address: z.string(),
	sponsor: z.string(),
	grantee: z.string(),
	/** Cumulative lamport cap. */
	cap: z.number(),
	/** Lamports already charged. */
	spent: z.number(),
	/** Unix seconds; `0` means no expiry. */
	expiresAt: z.number(),
	createdAt: z.number(),
});

export type SponsorAllowance = z.infer<typeof sponsorAllowanceSchema>;

export const createSponsorAllowanceSchema = z.object({
	grantee: z.string("Grantee is required"),
	cap: z.number().nonnegative(),
	/** Unix seconds; omit or `0` for no expiry. */
	expiresAt: z.number().nonnegative().optional(),
});

export type CreateSponsorAllowancePayload = z.infer<typeof createSponsorAllowanceSchema>;

export const topUpSponsorAllowanceSchema = z.object({
	grantee: z.string("Grantee is required"),
	amount: z.number().positive(),
	/** Unix seconds; omit to keep the current expiry. */
	expiresAt: z.number().nonnegative().optional(),
});

export type TopUpSponsorAllowancePayload = z.infer<typeof topUpSponsorAllowanceSchema>;
