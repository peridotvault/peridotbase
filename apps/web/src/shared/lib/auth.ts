import { useWorkspaceStore } from "@/shared/stores/workspace.store";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";

/**
 * Session gate. "Signed in" means a wallet session exists: the program derives every organization
 * from the wallet that created it, so there is nothing to read without one. Demo mode has no
 * wallet by design, so the walkthrough stays reachable.
 */
export const isSignedIn = (): boolean =>
	isDemoMode() || useWorkspaceStore.getState().wallet !== null;
