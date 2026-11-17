/**
 * URL-safe, stable identifier. The Studio addresses organizations and projects by slug, and the
 * program stores exactly this string, so a slug survives a reload and maps to the same account.
 */
export const slugify = (value: string): string =>
	value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
