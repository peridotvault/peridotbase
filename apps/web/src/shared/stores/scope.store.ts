import { create } from "zustand";
import { onConnectionReset } from "./connection-reset";

/**
 * The Studio's outer scope: `/org/<org>/<project>`. Slugs are the on-chain account names, so the
 * store holds only what `useScopeSync` reads from the program (organizations and their projects)
 * plus the selection the open route names. Nothing here seeds sample data; demo entries come from
 * the demo client through the same sync.
 */
export type Organization = {
	slug: string;
	name: string;
	/** Account address, base58. */
	address: string;
	/** Wallet that created the account. */
	owner: string;
};

export type Project = {
	slug: string;
	name: string;
	organization: string;
	address: string;
};

type ScopeStore = {
	organizations: Organization[];
	projects: Project[];
	/** The organization/project the open route names. Scopes every on-chain call. */
	activeScope: { organization: string; project: string } | null;
	setActiveScope: (scope: { organization: string; project: string } | null) => void;
	/** Replaces the catalog snapshot with what the program reported. */
	setScopeData: (data: { organizations: Organization[]; projects: Project[] }) => void;
};

export const useScopeStore = create<ScopeStore>()((set) => ({
	organizations: [],
	projects: [],
	activeScope: null,
	setActiveScope: (activeScope) => set({ activeScope }),
	setScopeData: ({ organizations, projects }) => set({ organizations, projects }),
}));

// The catalogs belong to the connection that produced them.
onConnectionReset(() => useScopeStore.setState({ organizations: [], projects: [] }));
