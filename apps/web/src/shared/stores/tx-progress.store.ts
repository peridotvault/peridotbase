import type { TxStepEvent } from "@peridotvault/peridotbase-sdk";
import { create } from "zustand";

export type TxProgressStep = {
	index: number;
	label: string;
	status: TxStepEvent["status"] | "failed";
};

const markActiveFailed = (steps: TxProgressStep[]): TxProgressStep[] => {
	if (steps.some((step) => step.status === "failed")) return steps;
	const active = steps.findIndex((step) => step.status === "active");

	if (active >= 0) {
		return steps.map((step, index) =>
			index === active ? { ...step, status: "failed" as const } : step,
		);
	}

	return steps;
};

type TxProgressState = {
	/** Bumped per action so a late dismiss timer cannot hide the next one. */
	runId: number;
	status: "idle" | "running" | "done" | "failed";
	/** Named action, e.g. `Deleting "orders"`. */
	title: string;
	steps: TxProgressStep[];
	error: string | null;
	begin: (title: string) => void;
	apply: (event: TxStepEvent) => void;
	finish: (error?: unknown) => void;
	dismiss: () => void;
};

/**
 * Progress for an action that costs more than one wallet approval. A staged database close signs
 * once per batch, so an unexplained queue of prompts looked like the same transaction three times.
 * Keeping this outside component state lets the stepper outlive the screen that started it.
 */
export const useTxProgressStore = create<TxProgressState>()((set) => ({
	runId: 0,
	status: "idle",
	title: "",
	steps: [],
	error: null,
	begin: (title) =>
		set((state) => ({
			runId: state.runId + 1,
			status: "running",
			title,
			steps: [],
			error: null,
		})),
	apply: (event) =>
		set((state) => {
			const steps = state.steps.map((step) =>
				// A new transaction starting means the previous one was confirmed.
				event.status === "active" && step.status === "active"
					? { ...step, status: "done" as const }
					: step,
			);
			const index = steps.findIndex((step) => step.label === event.label);

			if (index >= 0) steps[index] = { ...steps[index], status: event.status };
			else steps.push({ index: steps.length, label: event.label, status: event.status });

			return { steps, status: "running" };
		}),
	finish: (error) =>
		set((state) => ({
			status: error ? "failed" : "done",
			error: error ? (error instanceof Error ? error.message : String(error)) : null,
			// Nothing reported a failing step (e.g. the wallet rejected): keep the list honest.
			steps: error ? markActiveFailed(state.steps) : state.steps,
		})),
	dismiss: () => set({ status: "idle", steps: [], title: "", error: null }),
}));
