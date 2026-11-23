import { beforeEach, expect, test } from "vitest";
import { useTxProgressStore } from "./tx-progress.store";

beforeEach(() => {
	useTxProgressStore.getState().dismiss();
});

test("each new transaction marks the previous one confirmed", () => {
	const store = () => useTxProgressStore.getState();

	store().begin('Deleting "orders"');
	store().apply({ label: "Freeze the database", status: "active" });
	store().apply({ label: "Freeze the database", status: "done" });
	store().apply({ label: "Close 19 accounts of users", status: "active" });
	store().apply({ label: "Close 19 accounts of users", status: "done" });
	store().apply({ label: "Finish the close", status: "active" });

	expect(store().title).toBe('Deleting "orders"');
	expect(store().steps.map((step) => step.status)).toEqual(["done", "done", "active"]);
});

test("a failure marks the open approval instead of leaving it spinning", () => {
	const store = () => useTxProgressStore.getState();

	store().begin('Deleting "orders"');
	store().apply({ label: "Freeze the database", status: "active" });
	store().finish(new Error("User rejected the request"));

	expect(store().status).toBe("failed");
	expect(store().error).toBe("User rejected the request");
	expect(store().steps.at(-1)?.status).toBe("failed");
});

test("finishing without an error keeps the completed list", () => {
	const store = () => useTxProgressStore.getState();

	store().begin('Deleting "orders"');
	store().apply({ label: "Freeze the database", status: "active" });
	store().apply({ label: "Freeze the database", status: "done" });
	store().finish();

	expect(store().status).toBe("done");
	expect(store().error).toBeNull();
	expect(store().steps).toHaveLength(1);
});
