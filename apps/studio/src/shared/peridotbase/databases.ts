import type { DatabaseInfo } from "@peridotbase/sdk";
import { getPeridotbaseClient } from "./client";

export const getDatabases = async (): Promise<DatabaseInfo[]> =>
	getPeridotbaseClient().listDatabases();

/** RPC round trip used by the workspace screen to label the endpoint; demo mode answers locally. */
export const getProtocolHealth = () => getPeridotbaseClient().getHealth();
