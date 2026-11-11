import type { FormatType, RowRecord, TableRef } from "@peridotbase/sdk";
import { getPeridotbaseClient } from "./client";

const PAGE_SIZE = 500;

const ref = (
	db: string | null | undefined,
	tableName: string,
	schemaName?: string,
): TableRef => {
	if (!db) throw new Error("Select a database first");

	return { database: db, table: tableName, schema: schemaName };
};

/** Every row of a table, following the program's cursors until the last page. */
const readAllRows = async (table: TableRef): Promise<RowRecord[]> => {
	const client = getPeridotbaseClient();
	const rows: RowRecord[] = [];
	let cursor: string | undefined;

	for (;;) {
		const page = await client.readRows(table, {
			cursor,
			limit: PAGE_SIZE,
			direction: "asc",
			sorts: [],
			filters: [],
		});

		rows.push(...page.rows);

		if (!page.meta.hasNextPage || !page.meta.nextCursor) return rows;

		cursor = page.meta.nextCursor;
	}
};

const escapeCsv = (value: unknown): string => {
	if (value === null || value === undefined) return "";

	const text = typeof value === "object" ? JSON.stringify(value) : String(value);

	return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const toCsv = (rows: RowRecord[]): string => {
	const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
	const header = columns.map(escapeCsv).join(",");
	const body = rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(","));

	return [header, ...body].join("\n");
};

export type ExportedFile = {
	filename: string;
	contentType: string;
	data: BlobPart;
};

/**
 * Reads the table through the SDK and serializes it in the browser. There is no server-side
 * export endpoint: the wallet's program response is the only source of rows.
 */
export const exportTable = async ({
	tableName,
	schemaName,
	format,
	db,
}: {
	tableName: string;
	schemaName?: string;
	format: FormatType;
	db?: string | null;
}): Promise<ExportedFile> => {
	const rows = await readAllRows(ref(db, tableName, schemaName));
	const filename = `${tableName}_export.${format}`;

	if (format === "json") {
		return {
			filename,
			contentType: "application/json",
			data: JSON.stringify(rows, null, 2),
		};
	}

	return { filename, contentType: "text/csv", data: toCsv(rows) };
};
