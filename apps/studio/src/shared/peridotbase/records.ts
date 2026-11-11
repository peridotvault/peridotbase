import type {
	BulkInsertResult,
	DeleteRowsResult,
	MutationResult,
	TableRef,
} from "@peridotbase/sdk";
import { getPeridotbaseClient } from "./client";

export type RecordValues = Record<string, string | null>;

/** The add/edit record form holds every field as text until it is written. */
export type AddRecordFormData = Record<string, string>;

const ref = (
	db: string | null | undefined,
	tableName: string,
	schemaName?: string,
): TableRef => {
	if (!db) throw new Error("Select a database first");

	return { database: db, table: tableName, schema: schemaName };
};

export const createRecord = ({
	tableName,
	schemaName,
	data,
	db,
}: {
	tableName: string;
	schemaName?: string;
	data: RecordValues;
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().insertRows(ref(db, tableName, schemaName), [data]);

export const updateRecords = ({
	tableName,
	schemaName,
	updates,
	db,
}: {
	tableName: string;
	schemaName?: string;
	updates: Array<{
		rowData: Record<string, unknown>;
		columnName: string;
		value: unknown;
		useDefault?: boolean;
	}>;
	primaryKey?: string;
	primaryKeys?: string[];
	db?: string | null;
}): Promise<MutationResult> =>
	getPeridotbaseClient().updateRows(ref(db, tableName, schemaName), updates);

export const bulkInsertRecords = ({
	tableName,
	schemaName,
	records,
	db,
}: {
	tableName: string;
	schemaName?: string;
	records: Record<string, unknown>[];
	db?: string | null;
}): Promise<BulkInsertResult> =>
	getPeridotbaseClient().insertRows(ref(db, tableName, schemaName), records);

export const deleteRecords = ({
	tableName,
	schemaName,
	primaryKeys,
	force: _force,
	db,
}: {
	tableName: string;
	schemaName?: string;
	primaryKeys: Array<{ columnName: string; value: unknown }>;
	force?: boolean;
	db?: string | null;
}): Promise<DeleteRowsResult> =>
	getPeridotbaseClient().deleteRows(
		ref(db, tableName, schemaName),
		primaryKeys.map((key) => ({ [key.columnName]: key.value })),
	);
