import type { AuditEvent, DatabaseAudit, MutationResult } from "@peridotvault/peridotbase-sdk";
import { getPeridotbaseClient } from "./client";

const requireDatabase = (database: string | null | undefined): string => {
	if (!database) throw new Error("Select a database first");

	return database;
};

export const getDatabaseAudit = (database?: string | null): Promise<DatabaseAudit> =>
	getPeridotbaseClient().getDatabaseAudit(requireDatabase(database));

export const setDatabaseAuditRequired = (
	database: string | null | undefined,
	required: boolean,
): Promise<MutationResult> =>
	getPeridotbaseClient().setDatabaseAuditRequired(requireDatabase(database), required);

export const listAuditEvents = (database?: string | null): Promise<AuditEvent[]> =>
	getPeridotbaseClient().listAuditEvents(requireDatabase(database));

export const verifyAuditTrail = (database?: string | null) =>
	getPeridotbaseClient().verifyAuditTrail(requireDatabase(database));
