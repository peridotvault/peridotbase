import { create } from "zustand";
import { onConnectionReset } from "@/shared/stores/connection-reset";

interface DatabaseStore {
	/** The on-chain database account the Studio is currently browsing. */
	selectedDatabase: string | null;
	setSelectedDatabase: (database: string | null) => void;
}

export const useDatabaseStore = create<DatabaseStore>()((set) => ({
	selectedDatabase: null,
	setSelectedDatabase: (database) => set({ selectedDatabase: database }),
}));

onConnectionReset(() => useDatabaseStore.setState(useDatabaseStore.getInitialState(), true));
