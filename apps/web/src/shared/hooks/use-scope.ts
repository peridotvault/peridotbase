import { useScopeStore } from "@/shared/stores/scope.store";

/** The organization and project a route param names, or `null` when it no longer exists. */
export const useOrganization = (slug: string | undefined) =>
	useScopeStore((state) => state.organizations.find((item) => item.slug === slug) ?? null);

export const useProject = (organization: string | undefined, slug: string | undefined) =>
	useScopeStore(
		(state) =>
			state.projects.find(
				(item) => item.slug === slug && item.organization === organization,
			) ?? null,
	);
