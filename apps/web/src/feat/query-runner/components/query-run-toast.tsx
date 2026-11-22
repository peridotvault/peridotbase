import { useEffect } from "react";
import { toast } from "sonner";
import { useQueryRunStore } from "@/shared/stores/query-run.store";
import { RunStepper } from "./run-stepper";

const RUN_TOAST_ID = "query-run-stepper";
/** Keeps the final state readable before it clears itself. */
const DONE_DISMISS_MS = 3000;

/**
 * Hosts the run stepper in a toast instead of the result pane: a multi-statement run keeps
 * landing transactions after the user navigates, so its progress has to outlive the screen.
 */
export const QueryRunToast = () => {
	const status = useQueryRunStore((state) => state.status);
	const runId = useQueryRunStore((state) => state.runId);

	useEffect(() => {
		if (status === "idle") {
			toast.dismiss(RUN_TOAST_ID);

			return;
		}

		toast.custom(() => <RunStepper />, {
			id: RUN_TOAST_ID,
			duration: Number.POSITIVE_INFINITY,
			position: "bottom-right",
		});

		if (status === "done") {
			const timer = window.setTimeout(() => {
				const store = useQueryRunStore.getState();

				// A new run may have started while this timer was pending.
				if (store.runId === runId) store.dismiss();
			}, DONE_DISMISS_MS);

			return () => window.clearTimeout(timer);
		}
	}, [status, runId]);

	return null;
};
