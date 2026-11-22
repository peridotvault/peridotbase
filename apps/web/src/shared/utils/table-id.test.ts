import { expect, test } from "vitest";
import { tableId } from "@/shared/utils/table-id";

test("hides the default schema, keeps a real one", () => {
	expect(tableId({ tableName: "products" })).toBe("products");
	expect(tableId({ tableName: "products", schemaName: "public" })).toBe("products");
	expect(tableId({ tableName: "products", schemaName: "sales" })).toBe("sales.products");
});
