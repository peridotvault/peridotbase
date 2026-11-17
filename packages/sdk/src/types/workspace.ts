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
