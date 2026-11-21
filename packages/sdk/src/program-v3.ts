import { BN } from "@coral-xyz/anchor";
import { SystemProgram, PublicKey, type Connection } from "@solana/web3.js";
import { V3Table, type PeridotBase } from "@peridotvault/peridotbase-core-sdk";

/**
 * Storage-v3 defaults for tables the Studio creates.
 *
 * One logical record is one deterministic Record PDA, so a table only pays for
 * the directory lane/page it appends to, the record itself, and its index
 * claims. `laneCount` is the cold-scan cost: 256 lanes is 3 RPC batches, while
 * the PRD's 4096 default costs ~41 for a table with a handful of rows.
 */
export const V3_LAYOUT = {
	epoch: 1n,
	laneCount: 256,
	pageCap: 128,
	postingLanes: 64,
} as const;

export const storageDescriptorAddress = (programId: PublicKey, table: PublicKey) =>
	PublicKey.findProgramAddressSync(
		[Buffer.from("pd"), Buffer.from("storage-v3"), table.toBuffer()],
		programId,
	)[0];

/** A table is v3 as soon as its storage descriptor exists; the marker follows a migration. */
export const hasV3Storage = async (
	connection: Connection,
	programId: PublicKey,
	table: PublicKey,
): Promise<boolean> =>
	(await connection.getAccountInfo(
		storageDescriptorAddress(programId, table),
		"confirmed",
	)) !== null;

/** The generated IDL types `initStorageV3` as a dynamic method; this is the chain we call. */
type InitStorageV3 = {
	methods: {
		initStorageV3: (args: {
			tableId: BN;
			epoch: BN;
			laneCount: number;
			pageCap: number;
			postingLanes: number;
		}) => {
			accounts: (accounts: Record<string, unknown>) => {
				remainingAccounts: (accounts: unknown[]) => { rpc: () => Promise<string> };
			};
		};
	};
};

/** Provisions the v3 descriptor for a table that has none. */
export const initV3Storage = async (
	client: PeridotBase,
	tableId: bigint,
): Promise<PublicKey> => {
	const table = client.tableAddress(tableId);
	const storage = storageDescriptorAddress(client.programId, table);

	await (client.program as unknown as InitStorageV3).methods
		.initStorageV3({
			tableId: new BN(tableId.toString()),
			epoch: new BN(V3_LAYOUT.epoch.toString()),
			laneCount: V3_LAYOUT.laneCount,
			pageCap: V3_LAYOUT.pageCap,
			postingLanes: V3_LAYOUT.postingLanes,
		})
		.accounts({
			protocol: client.protocolAddress,
			database: client.databaseAddress(),
			authority: client.wallet,
			table,
			storage,
			systemProgram: SystemProgram.programId,
		})
		.remainingAccounts(await client.roleHelpers())
		.rpc();

	return storage;
};

/** Loads a v3 table, or `null` when the table has no v3 storage descriptor. */
export const loadV3Table = async (
	client: PeridotBase,
	tableId: bigint,
): Promise<V3Table | null> => {
	const table = client.tableAddress(tableId);

	if (!(await hasV3Storage(client.connection, client.programId, table))) return null;

	return V3Table.load(client, tableId);
};
