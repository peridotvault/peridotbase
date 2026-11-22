import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { RunStepper } from "./run-stepper";

test("shows the finished steps, the active one and the queue", () => {
	render(
		<RunStepper
			total={3}
			steps={[
				{ index: 0, label: "CREATE TABLE users", status: "done" },
				{ index: 1, label: "CREATE TABLE orders", status: "active" },
			]}
		/>,
	);

	expect(screen.getByText("Running 2 of 3")).toBeDefined();
	expect(screen.getByText("CREATE TABLE users")).toBeDefined();
	expect(screen.getByText("CREATE TABLE orders")).toBeDefined();
	expect(screen.getByText("Waiting for the previous step")).toBeDefined();
});
