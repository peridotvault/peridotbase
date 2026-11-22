import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SidebarDatabaseDropdown } from "./sidebar-database-dropdown";

const createDatabase = vi.fn();
// The write is in flight: the trigger must say so, or a click looks ignored.
const pending = true;

vi.mock("@/shared/hooks/use-project-databases", () => ({
	useProjectDatabases: () => ["app"],
	useActiveDatabase: () => "app",
	useCreateDatabase: () => ({ mutateAsync: createDatabase, isPending: pending }),
}));

vi.mock("@/shared/hooks/use-studio-scope", () => ({
	useStudioScope: () => ({ organization: "org", project: "proj" }),
}));

vi.mock("@/shared/hooks/use-studio-capabilities", () => ({
	useStudioCapabilities: () => ({ ddl: true }),
}));

vi.mock("@/shared/stores/database.store", () => ({
	useDatabaseStore: (selector: (state: { setSelectedDatabase: () => void }) => unknown) =>
		selector({ setSelectedDatabase: () => undefined }),
}));

describe("SidebarDatabaseDropdown", () => {
	it("reports a create in flight in the trigger", () => {
		render(<SidebarDatabaseDropdown />);

		expect(screen.getByRole("button", { name: "Database" })).toHaveTextContent("Creating");
	});
});
