import { parseSql } from "@peridotvault/peridotbase-core-sdk";
import { describe, expect, it } from "vitest";

/*
 * The Studio query runner is handed Postgres-style DDL. Before this, `SERIAL`, an inline
 * `CHECK`, or an inline `REFERENCES` failed at parse time, so a normal schema never ran.
 */

describe("CREATE TABLE parsing", () => {
	const table = (sql: string) => {
		const statement = parseSql(sql)[0];

		if (statement.kind !== "createTable") throw new Error("not a CREATE TABLE");

		return statement;
	};

	it("reads column constraints, a DEFAULT, a CHECK and an inline REFERENCES", () => {
		const parsed = table(`CREATE TABLE checkouts (
			id BIGINT PRIMARY KEY,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
			quantity INT NOT NULL CHECK (quantity > 0),
			status VARCHAR(50) DEFAULT 'pending'
		)`);

		expect(parsed.columns.map((column) => column.name)).toEqual([
			"id",
			"user_id",
			"quantity",
			"status",
		]);
		expect(parsed.columns[3].default).toBe("pending");
		expect(parsed.constraints.map((constraint) => constraint.kind)).toEqual([
			"primaryKey",
			"check",
		]);
		expect(parsed.foreignKeys).toEqual([
			{
				columns: ["user_id"],
				referencedTable: "users",
				referencedColumns: ["id"],
				onDelete: "restrict",
				onUpdate: "noAction",
			},
		]);
	});

	it("reads a composite foreign key and rejects a later ADD FOREIGN KEY", () => {
		const composite = table(
			"CREATE TABLE lines (order_id BIGINT, line_no BIGINT, FOREIGN KEY (order_id, line_no) REFERENCES orders(id, line_no) MATCH FULL)",
		);

		expect(composite.foreignKeys[0]).toMatchObject({
			columns: ["order_id", "line_no"],
			referencedColumns: ["id", "line_no"],
			match: "full",
		});

		expect(() =>
			parseSql(
				"ALTER TABLE lines ADD CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id)",
			),
		).toThrow(/declare the key in CREATE TABLE/);
	});

	it("keeps a column named `unique` a column, not a constraint", () => {
		const parsed = table("CREATE TABLE t (unique INT NOT NULL)");

		expect(parsed.columns[0].name).toBe("unique");
		expect(parsed.columns[0].nullable).toBe(false);
	});

	it("reads generator defaults and still names the gaps", () => {
		const parsed = table(
			"CREATE TABLE t (id UUID PRIMARY KEY DEFAULT uuidv7(), at TIMESTAMP DEFAULT now(), owner ADDRESS DEFAULT current_signer())",
		);
		expect(parsed.columns.map((column) => column.defaultExpr)).toEqual([
			"uuidv7",
			"now",
			"currentSigner",
		]);
		expect(() => parseSql("CREATE TABLE t (id SERIAL PRIMARY KEY)")).toThrow(
			/SERIAL is not auto-generated on-chain/,
		);
		expect(() =>
			parseSql("CREATE TABLE t (id BIGINT REFERENCES p(id) ON DELETE CASCADE)"),
		).toThrow(/CASCADE is not supported on-chain/);
	});
});
