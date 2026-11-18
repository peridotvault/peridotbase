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
	/**
	 * True once the catalog read settled (success or failure). Gates must not treat a catalog
	 * that has not been read yet as "this slug does not exist", or a refresh redirects away.
	 */
	catalogSettled: boolean;
	/** The organization/project the open route names. Scopes every on-chain call. */
	activeScope: { organization: string; project: string } | null;
	setActiveScope: (scope: { organization: string; project: string } | null) => void;
	/** Replaces the catalog snapshot with what the program reported. */
	setScopeData: (data: { organizations: Organization[]; projects: Project[] }) => void;
	/** Marks the catalog read as done even when it failed, so gates can decide. */
	settleCatalog: () => void;
};

export const useScopeStore = create<ScopeStore>()((set) => ({
	organizations: [],
	projects: [],
	catalogSettled: false,
	activeScope: null,
	setActiveScope: (activeScope) => set({ activeScope }),
	setScopeData: ({ organizations, projects }) =>
		set({ organizations, projects, catalogSettled: true }),
	settleCatalog: () => set({ catalogSettled: true }),
}));

// The catalogs belong to the connection that produced them.
onConnectionReset(() =>
	useScopeStore.setState({ organizations: [], projects: [], catalogSettled: false }),
);
