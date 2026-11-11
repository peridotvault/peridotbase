import { describe, expect, it } from "vitest";
import { createDemoDatabase } from "./demo-data";
import { executeDemoSql } from "./demo-sql";

/*
 * Failure modes:
 * - A statement mutates the sample database but reports zero rows.
 * - `CREATE TABLE` parses column constraints as part of the next column.
 * - `WHERE` compares numbers as strings, so `id = 10` matches `1`.
 * - An unsupported statement silently succeeds instead of naming the supported set.
 */

const database = () => createDemoDatabase();

describe("executeDemoSql", () => {
	it("creates a table, inserts rows, and reads them back with a predicate", () => {
		const current = database();

		executeDemoSql(
			current,
			"CREATE TABLE notes (id bigint PRIMARY KEY, title text NOT NULL, body text)",
		);
		executeDemoSql(
			current,
			"INSERT INTO notes (id, title, body) VALUES (1, 'First', 'hello'), (2, 'Second', NULL)",
		);

		const result = executeDemoSql(
			current,
			"SELECT title FROM notes WHERE id = 2 ORDER BY title DESC LIMIT 5",
		);
		const notes = current.tables.find((candidate) => candidate.info.tableName === "notes");

		expect(notes?.columns.map((column) => column.columnName)).toEqual(["id", "title", "body"]);
		expect(notes?.columns.find((column) => column.columnName === "title")?.isNullable).toBe(
			false,
		);
		expect(result.columns).toEqual(["title"]);
		expect(result.rows).toEqual([{ title: "Second" }]);
		expect(result.rowCount).toBe(1);
	});

	it("updates and deletes only the rows the predicate matches", () => {
		const current = database();

		executeDemoSql(current, "CREATE TABLE notes (id bigint PRIMARY KEY, title text)");
		executeDemoSql(
			current,
			"INSERT INTO notes (id, title) VALUES (1, 'First'), (2, 'Second'), (3, 'Third')",
		);
		executeDemoSql(current, "UPDATE notes SET title = 'Changed' WHERE id = 2");
		executeDemoSql(current, "DELETE FROM notes WHERE id = 1");

		const notes = current.tables.find((candidate) => candidate.info.tableName === "notes");

		expect(notes?.rows).toEqual([
			{ id: 2, title: "Changed" },
			{ id: 3, title: "Third" },
		]);
	});

	it("adds a column with a default and an index through SQL", () => {
		const current = database();

		executeDemoSql(current, "CREATE TABLE notes (id bigint PRIMARY KEY, title text)");
		executeDemoSql(current, "INSERT INTO notes (id, title) VALUES (1, 'First')");
		executeDemoSql(
			current,
			"ALTER TABLE notes ADD COLUMN created_at timestamptz DEFAULT now()",
		);
		executeDemoSql(current, "CREATE UNIQUE INDEX notes_title_idx ON notes (title)");

		const notes = current.tables.find((candidate) => candidate.info.tableName === "notes");

		expect(notes?.rows[0]?.created_at).toEqual(expect.any(String));
		expect(notes?.indexes.map((index) => index.indexName)).toContain("notes_title_idx");
		expect(
			notes?.indexes.find((index) => index.indexName === "notes_title_idx")?.isUnique,
		).toBe(true);
	});

	it("creates a foreign key relationship from a REFERENCES clause", () => {
		const current = database();

		executeDemoSql(
			current,
			"CREATE TABLE notes (id bigint PRIMARY KEY, owner_id bigint REFERENCES users(id))",
		);

		expect(current.relationships).toContainEqual({
			fromTable: "notes",
			fromColumn: "owner_id",
			toTable: "users",
			toColumn: "id",
		});
	});

	it("reports unsupported statements instead of pretending they ran", () => {
		expect(() => executeDemoSql(database(), "TRUNCATE notes")).toThrow(
			/Demo SQL: "TRUNCATE" is not supported/,
		);
	});
});
