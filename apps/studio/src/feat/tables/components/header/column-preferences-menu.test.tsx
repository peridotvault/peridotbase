import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { column } from "@/shared/testing/column";
import {
	getColumnPrefs,
	useColumnPreferencesStore,
} from "../../stores/column-preferences.store";
import { ColumnPreferencesMenu } from "./column-preferences-menu";

const parts = { database: "dbstudio", schemaName: undefined, tableName: "users" };

const makeCol = (columnName: string, isPrimaryKey = false) =>
	column(columnName, { isPrimaryKey, isNullable: !isPrimaryKey });

vi.mock("@/shared/hooks/use-table-schema-name", () => ({
	useTableSchemaName: () => undefined,
}));

vi.mock("@/shared/hooks/use-table-cols", () => ({
	useTableCols: ({ tableName }: { tableName: string }) => ({
		tableCols:
			tableName === "users"
				? [makeCol("id", true), makeCol("name", false), makeCol("email", false)]
				: undefined,
	}),
}));

vi.mock("@/shared/stores/database.store", () => ({
	useDatabaseStore: () => ({ selectedDatabase: "dbstudio" }),
}));

const openMenu = async () => {
	fireEvent.click(screen.getByRole("button", { name: "Manage columns" }));
	await screen.findByLabelText("Search columns");
};

beforeEach(() => {
	localStorage.clear();
	useColumnPreferencesStore.setState({ prefsByTable: {} });
});

describe("ColumnPreferencesMenu", () => {
	it("reordering works safely even when search filter is active", async () => {
		render(<ColumnPreferencesMenu tableName="users" />);
		await openMenu();
		// Filter to only 'name' and 'email' (hiding 'id')
		fireEvent.change(screen.getByLabelText("Search columns"), {
			target: { value: "m" },
		});
		const emailHandle = screen.getByRole("button", { name: "Reorder email" });
		fireEvent.keyDown(emailHandle, { key: "ArrowUp" });
		await waitFor(() => {
			expect(getColumnPrefs(parts).order).toEqual(["id", "email", "name"]);
		});
	});
});
