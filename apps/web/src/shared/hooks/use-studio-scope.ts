import { useParams } from "@tanstack/react-router";

export type StudioScope = {
	organization: string;
	project: string;
};

/**
 * The organization and project from the URL. Every studio link needs them, so this hook is the
 * one place the route params are read instead of repeating the cast at each call site.
 */
export const useStudioScope = (): StudioScope => {
	const params = useParams({ strict: false }) as Partial<StudioScope>;

	return { organization: params.organization ?? "", project: params.project ?? "" };
};
