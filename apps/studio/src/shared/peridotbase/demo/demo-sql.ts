/**
 * A small SQL executor for the demo database. It exists so the query runner can show real SQL
 * behaviour against the labeled sample data: CREATE TABLE/INDEX, ALTER TABLE ... ADD COLUMN,
 * INSERT, SELECT, UPDATE, DELETE and DROP TABLE. It never touches Solana or the network.
 *
 * This is deliberately a subset. The on-chain SDK owns the production parser; keeping the demo
 * parser here means a statement that succeeds against sample data is a UI demonstration, not a
 * claim about the protocol's SQL coverage.
 */
import type { ColumnInfo, IndexInfo, QueryResult, RowRecord } from "@peridotbase/sdk";
import { standardizedType, variant, type DemoDatabase, type DemoTable } from "./demo-data";

type Token = { type: "word" | "string" | "number" | "punct" | "op"; value: string };

type Predicate = (row: RowRecord) => boolean;

type Sort = { column: string; direction: "asc" | "desc" };

type ColumnSpec = {
	columnName: string;
	type: string;
	isNullable: boolean;
	isPrimaryKey: boolean;
	isUnique: boolean;
	defaultValue: string | null;
	referencedTable: string | null;
	referencedColumn: string | null;
};

const lower = (value: string) => value.toLowerCase();

const tokenize = (sql: string): Token[] => {
	const tokens: Token[] = [];
	let position = 0;

	while (position < sql.length) {
		const char = sql[position];

		if (/\s/.test(char)) {
			position += 1;
			continue;
		}

		if (char === "-" && sql[position + 1] === "-") {
			while (position < sql.length && sql[position] !== "\n") position += 1;
			continue;
		}

		if (char === "'") {
			let value = "";
			position += 1;

			while (position < sql.length) {
				if (sql[position] === "'" && sql[position + 1] === "'") {
					value += "'";
					position += 2;
					continue;
				}

				if (sql[position] === "'") {
					position += 1;
					break;
				}

				value += sql[position];
				position += 1;
			}

			tokens.push({ type: "string", value });
			continue;
		}

		if (char === '"') {
			let value = "";
			position += 1;

			while (position < sql.length && sql[position] !== '"') {
				value += sql[position];
				position += 1;
			}

			position += 1;
			tokens.push({ type: "word", value });
			continue;
		}

		if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(sql[position + 1]))) {
			let value = "";

			while (position < sql.length && /[0-9.]/.test(sql[position])) {
				value += sql[position];
				position += 1;
			}

			tokens.push({ type: "number", value });
			continue;
		}

		if (/[A-Za-z_]/.test(char)) {
			let value = "";

			while (position < sql.length && /[A-Za-z0-9_]/.test(sql[position])) {
				value += sql[position];
				position += 1;
			}

			tokens.push({ type: "word", value });
			continue;
		}

		const pair = sql.slice(position, position + 2);

		if (["<=", ">=", "<>", "!="].includes(pair)) {
			tokens.push({ type: "op", value: pair === "!=" ? "<>" : pair });
			position += 2;
			continue;
		}

		if ("(),;*=<>+-/.".includes(char)) {
			tokens.push({ type: "punct", value: char });
			position += 1;
			continue;
		}

		throw new Error(`Demo SQL: unexpected character "${char}"`);
	}

	return tokens;
};

const numeric = (value: unknown) =>
	typeof value === "number" ||
	(typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim()));

const compare = (left: unknown, right: unknown): number => {
	if (left === right) return 0;
	if (left === null || left === undefined) return 1;
	if (right === null || right === undefined) return -1;
	if (numeric(left) && numeric(right)) return Number(left) - Number(right);

	return String(left).localeCompare(String(right));
};

const equals = (left: unknown, right: unknown): boolean => {
	if (left === null || left === undefined) return right === null || right === undefined;
	if (right === null || right === undefined) return false;
	if (numeric(left) && numeric(right)) return Number(left) === Number(right);

	return String(left) === String(right);
};

const like = (pattern: string) => {
	const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	return new RegExp(`^${escaped.replace(/%/g, ".*").replace(/_/g, ".")}$`, "i");
};

/** The same literal interpretation the demo client applies to column defaults. */
const interpretDefault = (value: string | null): unknown => {
	if (value === null || value === "") return null;
	if (value === "true") return true;
	if (value === "false") return false;
	if (value === "now()") return new Date().toISOString();
	if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

	return value.replace(/^'(.*)'$/, "$1");
};

const nextKey = (table: DemoTable, column: string): number =>
	table.rows.reduce((max, row) => {
		const value = Number(row[column]);

		return Number.isFinite(value) ? Math.max(max, value) : max;
	}, 0) + 1;

class DemoParser {
	private readonly tokens: Token[];
	private readonly database: DemoDatabase;
	private position = 0;

	constructor(tokens: Token[], database: DemoDatabase) {
		this.tokens = tokens;
		this.database = database;
	}

	run(): QueryResult {
		const startedAt = performance.now();
		const token = this.next();

		if (token?.type !== "word") {
			throw new Error("Demo SQL: expected a statement keyword");
		}

		const keyword = token.value.toUpperCase();
		let result: QueryResult;

		switch (keyword) {
			case "SELECT":
				result = this.select(startedAt);
				break;
			case "INSERT":
				result = this.insert(startedAt);
				break;
			case "UPDATE":
				result = this.update(startedAt);
				break;
			case "DELETE":
				result = this.remove(startedAt);
				break;
			case "CREATE":
				result = this.create(startedAt);
				break;
			case "ALTER":
				result = this.alter(startedAt);
				break;
			case "DROP":
				result = this.drop(startedAt);
				break;
			default:
				throw new Error(
					`Demo SQL: "${token.value}" is not supported. Use SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, CREATE INDEX, ALTER TABLE or DROP TABLE.`,
				);
		}

		while (this.matchPunct(";")) {
			// Trailing semicolons are optional.
		}

		if (!this.atEnd()) {
			throw new Error(`Demo SQL: unexpected "${this.peek()?.value ?? "end of input"}"`);
		}

		return result;
	}

	private select(startedAt: number): QueryResult {
		const requested: string[] = [];
		let all = false;

		if (this.matchPunct("*")) {
			all = true;
		} else {
			requested.push(this.identifier());

			while (this.matchPunct(",")) requested.push(this.identifier());
		}

		this.expectWord("FROM");
		const table = this.table(this.identifier());
		const predicate = this.matchWord("WHERE") ? this.where(table) : () => true;
		const sorts: Sort[] = [];

		if (this.matchWord("ORDER")) {
			this.expectWord("BY");

			do {
				const column = this.column(table, this.identifier()).columnName;
				const direction: Sort["direction"] = this.matchWord("DESC")
					? "desc"
					: (this.matchWord("ASC"), "asc");

				sorts.push({ column, direction });
			} while (this.matchPunct(","));
		}

		let limit: number | null = null;

		if (this.matchWord("LIMIT")) {
			const token = this.next();

			if (token?.type !== "number") throw new Error("Demo SQL: LIMIT expects a number");

			limit = Number(token.value);
		}

		const columns = all
			? table.columns.map((column) => column.columnName)
			: requested.map((name) => this.column(table, name).columnName);
		const rows = table.rows.filter(predicate);

		if (sorts.length > 0) {
			rows.sort((left, right) => {
				for (const sort of sorts) {
					const order = compare(left[sort.column], right[sort.column]);

					if (order !== 0) return sort.direction === "desc" ? -order : order;
				}

				return 0;
			});
		}

		const limited = limit === null ? rows : rows.slice(0, Math.max(limit, 0));
		const projected = limited.map((row) => {
			const next: RowRecord = {};

			for (const column of columns) next[column] = row[column];

			return next;
		});

		return {
			columns,
			rows: structuredClone(projected),
			rowCount: projected.length,
			duration: performance.now() - startedAt,
			...(projected.length === 0
				? { message: "Demo mode: 0 rows matched. Nothing was sent to Solana." }
				: {}),
		};
	}

	private insert(startedAt: number): QueryResult {
		this.expectWord("INTO");
		const table = this.table(this.identifier());
		let columns: string[] | null = null;

		if (this.matchPunct("(")) {
			columns = this.identifierList();
			this.expectPunct(")");
		}

		this.expectWord("VALUES");
		const records: RowRecord[] = [];

		do {
			this.expectPunct("(");
			const values: unknown[] = [this.value()];

			while (this.matchPunct(",")) values.push(this.value());

			this.expectPunct(")");

			const names = columns ?? table.columns.map((column) => column.columnName);

			if (values.length !== names.length) {
				throw new Error(
					`Demo SQL: INSERT has ${names.length} column(s) but ${values.length} value(s)`,
				);
			}

			const record: RowRecord = {};

			names.forEach((name, index) => {
				record[this.column(table, name).columnName] = values[index];
			});

			records.push(record);
		} while (this.matchPunct(","));

		const primaryKey = table.columns.find((column) => column.isPrimaryKey)?.columnName;

		for (const record of records) {
			if (primaryKey && (record[primaryKey] === undefined || record[primaryKey] === null)) {
				record[primaryKey] = nextKey(table, primaryKey);
			}

			for (const column of table.columns) {
				if (record[column.columnName] === undefined && column.columnDefault !== null) {
					record[column.columnName] = interpretDefault(column.columnDefault);
				}
			}

			table.rows.push(record);
		}

		return this.message(
			`Inserted ${records.length} row(s) into "${table.info.tableName}"`,
			startedAt,
			records.length,
		);
	}

	private update(startedAt: number): QueryResult {
		const table = this.table(this.identifier());

		this.expectWord("SET");
		const assignments: Array<{ column: string; value: unknown }> = [];

		do {
			const column = this.column(table, this.identifier()).columnName;

			this.expectPunct("=");
			assignments.push({ column, value: this.value() });
		} while (this.matchPunct(","));

		const predicate = this.matchWord("WHERE") ? this.where(table) : () => true;
		let updated = 0;

		for (const row of table.rows) {
			if (!predicate(row)) continue;

			for (const assignment of assignments) row[assignment.column] = assignment.value;

			updated += 1;
		}

		return this.message(
			`Updated ${updated} row(s) in "${table.info.tableName}"`,
			startedAt,
			updated,
		);
	}

	private remove(startedAt: number): QueryResult {
		this.expectWord("FROM");
		const table = this.table(this.identifier());
		const predicate = this.matchWord("WHERE") ? this.where(table) : () => true;
		const before = table.rows.length;

		table.rows = table.rows.filter((row) => !predicate(row));

		const deleted = before - table.rows.length;

		return this.message(
			`Deleted ${deleted} row(s) from "${table.info.tableName}"`,
			startedAt,
			deleted,
		);
	}

	private create(startedAt: number): QueryResult {
		if (this.matchWord("TABLE")) return this.createTable(startedAt);

		if (this.matchWord("UNIQUE")) {
			this.expectWord("INDEX");

			return this.createIndex(startedAt, true);
		}

		if (this.matchWord("INDEX")) return this.createIndex(startedAt, false);

		throw new Error("Demo SQL: only CREATE TABLE and CREATE INDEX are supported");
	}

	private createTable(startedAt: number): QueryResult {
		let ifNotExists = false;

		if (this.matchWord("IF")) {
			this.expectWord("NOT");
			this.expectWord("EXISTS");
			ifNotExists = true;
		}

		const name = this.identifier();
		const existing = this.database.tables.find(
			(table) => lower(table.info.tableName) === lower(name),
		);

		if (existing) {
			if (ifNotExists) {
				return this.message(`Table "${existing.info.tableName}" already exists`, startedAt);
			}

			throw new Error(`Demo SQL: table "${name}" already exists`);
		}

		this.expectPunct("(");
		const specs: ColumnSpec[] = [];
		const tablePrimaryKeys: string[] = [];
		const tableUniques: string[][] = [];
		const tableForeignKeys: Array<{
			columns: string[];
			table: string;
			referenced: string[];
		}> = [];

		while (true) {
			if (this.peekPunct(")")) {
				this.next();
				break;
			}

			if (this.matchWord("PRIMARY")) {
				this.expectWord("KEY");
				this.expectPunct("(");
				tablePrimaryKeys.push(...this.identifierList());
				this.expectPunct(")");
			} else if (this.matchWord("UNIQUE")) {
				this.expectPunct("(");
				tableUniques.push(this.identifierList());
				this.expectPunct(")");
			} else if (this.matchWord("FOREIGN")) {
				this.expectWord("KEY");
				this.expectPunct("(");
				const columns = this.identifierList();

				this.expectPunct(")");
				this.expectWord("REFERENCES");
				const referencedTable = this.identifier();

				this.expectPunct("(");
				const referenced = this.identifierList();

				this.expectPunct(")");
				tableForeignKeys.push({ columns, table: referencedTable, referenced });
			} else if (this.matchWord("CONSTRAINT")) {
				this.identifier();
				continue;
			} else if (this.matchWord("CHECK")) {
				this.skipParenthesized();
			} else {
				specs.push(this.columnSpec());
			}

			if (this.matchPunct(",")) continue;

			this.expectPunct(")");
			break;
		}

		for (const name of tablePrimaryKeys) {
			const spec = this.spec(specs, name);

			spec.isPrimaryKey = true;
			spec.isNullable = false;
		}

		for (const columns of tableUniques) {
			for (const name of columns) this.spec(specs, name).isUnique = true;
		}

		for (const foreignKey of tableForeignKeys) {
			if (foreignKey.columns.length !== foreignKey.referenced.length) {
				throw new Error("Demo SQL: FOREIGN KEY columns and references must line up");
			}

			foreignKey.columns.forEach((name, index) => {
				const spec = this.spec(specs, name);

				spec.referencedTable = foreignKey.table;
				spec.referencedColumn = foreignKey.referenced[index];
			});
		}

		const columns: ColumnInfo[] = specs.map((spec) => {
			const label = standardizedType(spec.type);

			return {
				columnName: spec.columnName,
				dataType: variant(label),
				dataTypeLabel: label,
				isNullable: spec.isNullable,
				columnDefault: spec.defaultValue,
				isPrimaryKey: spec.isPrimaryKey,
				isForeignKey: spec.referencedTable !== null,
				referencedTable: spec.referencedTable,
				referencedSchema: spec.referencedTable ? "public" : undefined,
				referencedColumn: spec.referencedColumn,
				enumValues: null,
			};
		});
		const primary = columns
			.filter((column) => column.isPrimaryKey)
			.map((column) => column.columnName);
		const indexes: IndexInfo[] = [];

		if (primary.length > 0) {
			indexes.push({
				indexName: `${name}_pkey`,
				columns: primary,
				isUnique: true,
				method: null,
				kind: "primary",
				definition: `PRIMARY KEY (${primary.join(", ")})`,
			});
		}

		for (const spec of specs) {
			if (!spec.isUnique) continue;

			indexes.push({
				indexName: `${name}_${spec.columnName}_key`,
				columns: [spec.columnName],
				isUnique: true,
				method: "btree",
				kind: "unique-constraint",
				definition: `CREATE UNIQUE INDEX ${name}_${spec.columnName}_key ON ${name} USING btree (${spec.columnName})`,
			});
		}

		this.database.tables.push({
			info: { tableName: name, schemaName: "public", rowCount: 0 },
			columns,
			rows: [],
			indexes,
		});

		for (const spec of specs) {
			if (!spec.referencedTable || !spec.referencedColumn) continue;

			this.database.relationships.push({
				fromTable: name,
				fromColumn: spec.columnName,
				toTable: spec.referencedTable,
				toColumn: spec.referencedColumn,
			});
		}

		return this.message(`Created table "${name}"`, startedAt);
	}

	private createIndex(startedAt: number, unique: boolean): QueryResult {
		let ifNotExists = false;

		if (this.matchWord("IF")) {
			this.expectWord("NOT");
			this.expectWord("EXISTS");
			ifNotExists = true;
		}

		const indexName = this.identifier();

		this.expectWord("ON");
		const table = this.table(this.identifier());

		this.expectPunct("(");
		const columns = this.identifierList().map((name) => this.column(table, name).columnName);

		this.expectPunct(")");
		const method = this.matchWord("USING") ? this.identifier().toLowerCase() : "btree";

		if (table.indexes.some((index) => index.indexName === indexName)) {
			if (ifNotExists) {
				return this.message(`Index "${indexName}" already exists`, startedAt);
			}

			throw new Error(`Demo SQL: index "${indexName}" already exists`);
		}

		table.indexes.push({
			indexName,
			columns,
			isUnique: unique,
			method,
			kind: unique ? "unique-constraint" : "index",
			definition: `CREATE ${unique ? "UNIQUE " : ""}INDEX ${indexName} ON ${table.info.tableName} USING ${method} (${columns.join(", ")})`,
		});

		return this.message(
			`Created index "${indexName}" on "${table.info.tableName}"`,
			startedAt,
		);
	}

	private alter(startedAt: number): QueryResult {
		this.expectWord("TABLE");
		const table = this.table(this.identifier());

		if (!this.matchWord("ADD")) {
			throw new Error("Demo SQL: only ALTER TABLE ... ADD COLUMN is supported");
		}

		this.matchWord("COLUMN");
		const spec = this.columnSpec();
		const label = standardizedType(spec.type);

		table.columns.push({
			columnName: spec.columnName,
			dataType: variant(label),
			dataTypeLabel: label,
			isNullable: spec.isNullable,
			columnDefault: spec.defaultValue,
			isPrimaryKey: spec.isPrimaryKey,
			isForeignKey: spec.referencedTable !== null,
			referencedTable: spec.referencedTable,
			referencedSchema: spec.referencedTable ? "public" : undefined,
			referencedColumn: spec.referencedColumn,
			enumValues: null,
		});

		for (const row of table.rows) {
			row[spec.columnName] = interpretDefault(spec.defaultValue);
		}

		if (spec.referencedTable && spec.referencedColumn) {
			this.database.relationships.push({
				fromTable: table.info.tableName,
				fromColumn: spec.columnName,
				toTable: spec.referencedTable,
				toColumn: spec.referencedColumn,
			});
		}

		return this.message(
			`Added column "${spec.columnName}" to "${table.info.tableName}"`,
			startedAt,
		);
	}

	private drop(startedAt: number): QueryResult {
		this.expectWord("TABLE");
		let ifExists = false;

		if (this.matchWord("IF")) {
			this.expectWord("EXISTS");
			ifExists = true;
		}

		const name = this.identifier();
		const table = this.database.tables.find(
			(candidate) => lower(candidate.info.tableName) === lower(name),
		);

		if (!table) {
			if (ifExists) return this.message(`Table "${name}" does not exist`, startedAt);

			throw new Error(`Demo SQL: table "${name}" does not exist`);
		}

		this.database.tables = this.database.tables.filter((candidate) => candidate !== table);
		this.database.relationships = this.database.relationships.filter(
			(relationship) =>
				relationship.fromTable !== table.info.tableName &&
				relationship.toTable !== table.info.tableName,
		);

		return this.message(`Dropped table "${table.info.tableName}"`, startedAt);
	}

	private where(table: DemoTable): Predicate {
		const terms = [this.andPredicate(table)];

		while (this.matchWord("OR")) terms.push(this.andPredicate(table));

		return (row) => terms.some((term) => term(row));
	}

	private andPredicate(table: DemoTable): Predicate {
		const terms = [this.comparison(table)];

		while (this.matchWord("AND")) terms.push(this.comparison(table));

		return (row) => terms.every((term) => term(row));
	}

	private comparison(table: DemoTable): Predicate {
		if (this.matchPunct("(")) {
			const nested = this.where(table);

			this.expectPunct(")");

			return nested;
		}

		const column = this.column(table, this.identifier()).columnName;

		if (this.matchWord("IS")) {
			const negated = this.matchWord("NOT");

			this.expectWord("NULL");

			return (row) => (row[column] === null || row[column] === undefined) !== Boolean(negated);
		}

		if (this.matchWord("NOT")) {
			this.expectWord("LIKE");
			const pattern = like(String(this.value()));

			return (row) => !pattern.test(String(row[column] ?? ""));
		}

		if (this.matchWord("LIKE")) {
			const pattern = like(String(this.value()));

			return (row) => pattern.test(String(row[column] ?? ""));
		}

		const operator = this.next();

		if (!operator || !["=", "<>", "<", "<=", ">", ">="].includes(operator.value)) {
			throw new Error(
				`Demo SQL: expected a comparison after "${column}", found "${operator?.value ?? "end of input"}"`,
			);
		}

		const value = this.value();

		switch (operator.value) {
			case "=":
				return (row) => equals(row[column], value);
			case "<>":
				return (row) => !equals(row[column], value);
			case "<":
				return (row) => compare(row[column], value) < 0;
			case "<=":
				return (row) => compare(row[column], value) <= 0;
			case ">":
				return (row) => compare(row[column], value) > 0;
			case ">=":
				return (row) => compare(row[column], value) >= 0;
			default:
				return () => false;
		}
	}

	private columnSpec(): ColumnSpec {
		const columnName = this.identifier();
		const spec: ColumnSpec = {
			columnName,
			type: this.typeName(),
			isNullable: true,
			isPrimaryKey: false,
			isUnique: false,
			defaultValue: null,
			referencedTable: null,
			referencedColumn: null,
		};

		while (!this.atEnd() && !this.peekPunct(",") && !this.peekPunct(")")) {
			if (this.matchWord("PRIMARY")) {
				this.expectWord("KEY");
				spec.isPrimaryKey = true;
				spec.isNullable = false;
			} else if (this.matchWord("NOT")) {
				this.expectWord("NULL");
				spec.isNullable = false;
			} else if (this.matchWord("NULL")) {
				spec.isNullable = true;
			} else if (this.matchWord("UNIQUE")) {
				spec.isUnique = true;
			} else if (this.matchWord("DEFAULT")) {
				spec.defaultValue = this.defaultLiteral();
			} else if (this.matchWord("REFERENCES")) {
				spec.referencedTable = this.identifier();
				this.expectPunct("(");
				spec.referencedColumn = this.identifier();
				this.expectPunct(")");
			} else if (this.matchWord("CHECK")) {
				this.skipParenthesized();
			} else if (this.matchWord("CONSTRAINT")) {
				this.identifier();
			} else {
				const token = this.next();

				throw new Error(
					`Demo SQL: unexpected "${token?.value ?? "end of input"}" in column "${columnName}"`,
				);
			}
		}

		return spec;
	}

	private typeName(): string {
		const base = this.identifier().toLowerCase();
		let name = base;

		if (base === "double") {
			if (this.matchWord("PRECISION")) name = "double precision";
		} else if (base === "character") {
			if (this.matchWord("VARYING")) name = "character varying";
		} else if (base === "timestamp" || base === "time") {
			const withKind = this.matchWord("WITH", "WITHOUT");

			if (withKind) {
				this.expectWord("TIME");
				this.expectWord("ZONE");
				name = `${base} ${withKind.toLowerCase()} time zone`;
			}
		}

		if (this.matchPunct("(")) {
			let depth = 1;

			while (depth > 0) {
				const token = this.next();

				if (!token) throw new Error("Demo SQL: unterminated type arguments");
				if (token.value === "(") depth += 1;
				if (token.value === ")") depth -= 1;
			}
		}

		while (this.matchPunct("[")) this.expectPunct("]");

		return name;
	}

	private defaultLiteral(): string | null {
		if (this.matchWord("NULL")) return null;

		if (this.matchWord("NOW")) {
			this.expectPunct("(");
			this.expectPunct(")");

			return "now()";
		}

		const value = this.value();

		if (value === null) return null;

		return typeof value === "string" ? value : String(value);
	}

	private value(): unknown {
		if (this.matchPunct("-")) {
			const token = this.next();

			if (token?.type !== "number") throw new Error("Demo SQL: expected a number after '-'");

			return -Number(token.value);
		}

		const token = this.next();

		if (!token) throw new Error("Demo SQL: expected a value");

		if (token.type === "string") return token.value;
		if (token.type === "number") return Number(token.value);

		if (token.type === "word") {
			const word = token.value.toUpperCase();

			if (word === "NULL") return null;
			if (word === "TRUE") return true;
			if (word === "FALSE") return false;

			if (word === "NOW") {
				this.expectPunct("(");
				this.expectPunct(")");

				return new Date().toISOString();
			}
		}

		throw new Error(`Demo SQL: expected a value, found "${token.value}"`);
	}

	private skipParenthesized() {
		this.expectPunct("(");
		let depth = 1;

		while (depth > 0) {
			const token = this.next();

			if (!token) throw new Error("Demo SQL: unterminated expression");
			if (token.value === "(") depth += 1;
			if (token.value === ")") depth -= 1;
		}
	}

	private spec(specs: ColumnSpec[], name: string): ColumnSpec {
		const spec = specs.find((candidate) => lower(candidate.columnName) === lower(name));

		if (!spec) throw new Error(`Demo SQL: column "${name}" is not defined in this table`);

		return spec;
	}

	private column(table: DemoTable, name: string) {
		const column = table.columns.find(
			(candidate) => lower(candidate.columnName) === lower(name),
		);

		if (!column) throw new Error(`Demo SQL: column "${name}" does not exist`);

		return column;
	}

	private table(name: string): DemoTable {
		const table = this.database.tables.find(
			(candidate) => lower(candidate.info.tableName) === lower(name),
		);

		if (!table) throw new Error(`Demo SQL: table "${name}" does not exist`);

		return table;
	}

	private identifier(): string {
		const token = this.peek();

		if (!token || (token.type !== "word" && token.type !== "string")) {
			throw new Error(`Demo SQL: expected a name, found "${token?.value ?? "end of input"}"`);
		}

		this.position += 1;

		return token.value;
	}

	private identifierList(): string[] {
		const names = [this.identifier()];

		while (this.matchPunct(",")) names.push(this.identifier());

		return names;
	}

	private peek(offset = 0): Token | undefined {
		return this.tokens[this.position + offset];
	}

	private next(): Token | undefined {
		const token = this.tokens[this.position];

		this.position += 1;

		return token;
	}

	private atEnd(): boolean {
		return this.position >= this.tokens.length;
	}

	private peekPunct(punct: string): boolean {
		const token = this.peek();

		return Boolean(
			token && (token.type === "punct" || token.type === "op") && token.value === punct,
		);
	}

	private matchPunct(punct: string): boolean {
		if (!this.peekPunct(punct)) return false;

		this.position += 1;

		return true;
	}

	private expectPunct(punct: string): void {
		if (!this.matchPunct(punct)) {
			throw new Error(
				`Demo SQL: expected "${punct}", found "${this.peek()?.value ?? "end of input"}"`,
			);
		}
	}

	private matchWord(...words: string[]): string | null {
		const token = this.peek();

		if (token?.type !== "word") return null;

		const upper = token.value.toUpperCase();

		if (!words.includes(upper)) return null;

		this.position += 1;

		return upper;
	}

	private expectWord(word: string): void {
		if (!this.matchWord(word)) {
			throw new Error(
				`Demo SQL: expected "${word}", found "${this.peek()?.value ?? "end of input"}"`,
			);
		}
	}

	private message(message: string, startedAt: number, rowCount = 0): QueryResult {
		return {
			columns: [],
			rows: [],
			rowCount,
			duration: performance.now() - startedAt,
			message: `${message} (demo mode — nothing was sent to Solana).`,
		};
	}
}

/**
 * Runs one demo statement. The database is mutated in place for DDL and writes, exactly like the
 * client's method calls, so the table grid and schema screens see the result after a refetch.
 */
export const executeDemoSql = (database: DemoDatabase, statement: string): QueryResult => {
	const tokens = tokenize(statement);

	if (tokens.length === 0) throw new Error("Demo SQL: the statement is empty");

	return new DemoParser(tokens, database).run();
};
