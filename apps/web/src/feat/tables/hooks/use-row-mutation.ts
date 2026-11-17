import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";

/** Whether the program allows grid edits and deletes, and why not when it doesn't. */
export const useRowMutation = () => {
	const { writes } = useStudioCapabilities();

	return {
		canMutateRows: writes,
		rowMutationReason: writes
			? undefined
			: "The Peridotbase program has no row-write instruction yet.",
	};
};
