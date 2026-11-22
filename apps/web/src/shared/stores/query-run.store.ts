import type { QueryRunStepEvent } from "@peridotvault/peridotbase-sdk";
import { create } from "zustand";

export type QueryRunStep = {
	index: number;
	label: string;
	status: QueryRunStepEvent["status"];
};

type QueryRunState = {
	/** Bumped per run so a late dismiss timer cannot hide the next run's toast. */
	runId: number;
	status: "idle" | "running" | "done" | "failed";
	steps: QueryRunStep[];
	total: number;
	/** Message of the statement that threw, or null. */
	error: string | null;
	start: () => void;
	apply: (event: QueryRunStepEvent) => void;
	finish: (error: Error | null) => void;
	dismiss: () => void;
};

/**
 * A multi-statement run outlives the runner screen: the writes are on-chain, so the progress
 * lives here instead of in component state and the toast keeps reporting after navigation.
 */
export const useQueryRunStore = create<QueryRunState>((set) => ({
	runId: 0,
	status: "idle",
	steps: [],
	total: 0,
	error: null,
	start: () =>
		set((state) => ({
			runId: state.runId + 1,
			status: "running",
			steps: [],
			total: 0,
			error: null,
		})),
	apply: (event) =>
		set((state) => ({
			status: "running",
			total: event.total,
			steps: [...state.steps.filter((step) => step.index !== event.index), event].sort(
				(a, b) => a.index - b.index,
			),
		})),
	finish: (error) =>
		set((state) => ({
			status: error ? "failed" : "done",
			error: error ? error.message : null,
			// A failed step can be the only one reported; keep it visible as failed.
			steps:
				error && state.steps.length === 0
					? [{ index: 0, label: "Statement failed", status: "failed" }]
					: state.steps,
		})),
	dismiss: () => set({ status: "idle", steps: [], total: 0, error: null }),
}));
