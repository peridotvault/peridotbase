import type {
	CreateDomainPayload,
	CreateEnumPayload,
	DatabaseTypeInfo,
	MutationResult,
	SchemaCatalogInfo,
} from "@peridotvault/peridotbase-sdk";
import { getPeridotbaseClient } from "./client";

const requireDatabase = (database: string | null | undefined): string => {
	if (!database) throw new Error("Select a database first");

	return database;
};

export const listSchemas = (database?: string | null): Promise<SchemaCatalogInfo[]> =>
	getPeridotbaseClient().listSchemas(requireDatabase(database));

export const createSchema = (
	database: string | null | undefined,
	name: string,
): Promise<MutationResult> =>
	getPeridotbaseClient().createSchema(requireDatabase(database), name);

export const listDatabaseTypes = (database?: string | null): Promise<DatabaseTypeInfo[]> =>
	getPeridotbaseClient().listDatabaseTypes(requireDatabase(database));

export const createEnum = (
	database: string | null | undefined,
	payload: CreateEnumPayload,
): Promise<MutationResult> =>
	getPeridotbaseClient().createEnum(requireDatabase(database), payload);

export const createDomain = (
	database: string | null | undefined,
	payload: CreateDomainPayload,
): Promise<MutationResult> =>
	getPeridotbaseClient().createDomain(requireDatabase(database), payload);
