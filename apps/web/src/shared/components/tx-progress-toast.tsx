import { useEffect } from "react";
import { toast } from "sonner";
import { TxStepper } from "@/shared/components/tx-stepper";
import { useTxProgressStore } from "@/shared/stores/tx-progress.store";

const TX_TOAST_ID = "tx-progress-stepper";
/** Keeps the final state readable before it clears itself. */
const DONE_DISMISS_MS = 4000;

/** Hosts the approval stepper in a toast so a multi-transaction action keeps explaining itself. */
export const TxProgressToast = () => {
	const status = useTxProgressStore((state) => state.status);
	const runId = useTxProgressStore((state) => state.runId);

	useEffect(() => {
		if (status === "idle") {
			toast.dismiss(TX_TOAST_ID);

			return;
		}

		toast.custom(() => <TxStepper />, {
			id: TX_TOAST_ID,
			duration: Number.POSITIVE_INFINITY,
			position: "bottom-right",
		});

		if (status === "done") {
			const timer = window.setTimeout(() => {
				const store = useTxProgressStore.getState();

				// A new action may have started while this timer was pending.
				if (store.runId === runId) store.dismiss();
			}, DONE_DISMISS_MS);

			return () => window.clearTimeout(timer);
		}
	}, [status, runId]);

	return null;
};
