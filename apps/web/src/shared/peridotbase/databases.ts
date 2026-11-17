import type { DatabaseInfo } from "@peridotvault/peridotbase-sdk";
import { getPeridotbaseClient } from "./client";

export const getDatabases = async (): Promise<DatabaseInfo[]> =>
	getPeridotbaseClient().listDatabases();

export const createDatabaseRequest = async (name: string): Promise<DatabaseInfo> =>
	getPeridotbaseClient().createDatabase(name);

/** RPC round trip used by the workspace screen to label the endpoint; demo mode answers locally. */
export const getProtocolHealth = () => getPeridotbaseClient().getHealth();
