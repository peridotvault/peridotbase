import type { DatabaseInfo } from "@peridotvault/peridotbase-sdk";
import { getPeridotbaseClient } from "./client";

export const getDatabases = async (): Promise<DatabaseInfo[]> =>
	getPeridotbaseClient().listDatabases();

export const createDatabaseRequest = async (name: string): Promise<DatabaseInfo> =>
	getPeridotbaseClient().createDatabase(name);

/** RPC round trip used by the workspace screen to label the endpoint; demo mode answers locally. */
export const getProtocolHealth = () => getPeridotbaseClient().getHealth();

export const deleteDatabase = (name: string, proposalId?: string) =>
	getPeridotbaseClient().deleteDatabase(name, proposalId);

export const cancelCloseDatabase = (name: string) =>
	getPeridotbaseClient().cancelCloseDatabase(name);

export const renounceDatabaseAuthority = (name: string) =>
	getPeridotbaseClient().renounceDatabaseAuthority(name);

export const listDatabaseGrants = (name: string) =>
	getPeridotbaseClient().listDatabaseGrants(name);

export const grantDatabaseRole = (name: string, principal: string, role: "admin" | "member") =>
	getPeridotbaseClient().grantDatabaseRole(name, principal, role);

export const revokeDatabaseRole = (name: string, principal: string) =>
	getPeridotbaseClient().revokeDatabaseRole(name, principal);
