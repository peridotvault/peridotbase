import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { useQueryRunStore } from "@/shared/stores/query-run.store";
import { RunStepper } from "./run-stepper";

beforeEach(() => {
	useQueryRunStore.setState({ status: "idle", steps: [], total: 0, error: null });
});

test("shows the finished steps, the active one and the queue", () => {
	useQueryRunStore.setState({
		status: "running",
		total: 3,
		steps: [
			{ index: 0, label: "CREATE TABLE users", status: "done" },
			{ index: 1, label: "CREATE TABLE orders", status: "active" },
		],
	});

	render(<RunStepper />);

	expect(screen.getByText("Running 2 of 3")).toBeDefined();
	expect(screen.getByText("CREATE TABLE users")).toBeDefined();
	expect(screen.getByText("CREATE TABLE orders")).toBeDefined();
	expect(screen.getByText("Waiting for the previous step")).toBeDefined();
});

test("reports the failed step instead of spinning", () => {
	useQueryRunStore.setState({
		status: "failed",
		total: 2,
		error: "account already exists",
		steps: [
			{ index: 0, label: "CREATE TABLE users", status: "done" },
			{ index: 1, label: "CREATE TABLE orders", status: "failed" },
		],
	});

	render(<RunStepper />);

	expect(screen.getByText("Query failed")).toBeDefined();
	expect(screen.getByText("account already exists")).toBeDefined();
});
