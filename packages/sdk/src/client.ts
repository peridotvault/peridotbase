import type { RpcPort, WalletPort } from "./ports.js";
import type {
	AddColumnPayload,
	AlterColumnPayload,
	BulkInsertResult,
	Capabilities,
	ColumnInfo,
	CreateIndexPayload,
	CreateTablePayload,
	DatabaseInfo,
	DeleteRowsResult,
	ExecuteQueryRequest,
	IndexInfo,
	MutationResult,
	QueryResult,
	ReadRowsQuery,
	Relationship,
	RenameColumnPayload,
	RenameTablePayload,
	RowKey,
	RowPage,
	RowRecord,
	TableInfo,
	TableRef,
	ColumnRef,
} from "./types/index.js";

export type RowUpdate = {
	rowData: RowRecord;
	columnName: string;
	value: unknown;
	/** Sets the column to its declared default; `value` is ignored. */
	useDefault?: boolean;
};

export type ProtocolHealth = {
	/** The RPC endpoint answered. */
	reachable: boolean;
	slot?: string;
	version?: string;
	/** A program ID is configured, which is the prerequisite for any account read. */
	programConfigured: boolean;
	/** The configured program answers `getAccountInfo`. */
	programReachable: boolean;
};

/**
 * The single contract between the Studio and Peridotbase. Every implementation either talks to
 * the program through Solana RPC or throws `IntegrationUnavailableError`; there is deliberately
 * no HTTP fallback.
 */
export type PeridotbaseClient = {
	readonly capabilities: Capabilities;
	readonly rpc: RpcPort;
	readonly wallet: WalletPort | null;
	readonly programId: string | null;

	getHealth: () => Promise<ProtocolHealth>;
	listDatabases: () => Promise<DatabaseInfo[]>;
	listTables: (database: string) => Promise<TableInfo[]>;
	getTableColumns: (ref: TableRef) => Promise<ColumnInfo[]>;
	getRelationships: (database: string) => Promise<Relationship[]>;
	readRows: (ref: TableRef, query: ReadRowsQuery) => Promise<RowPage>;
	insertRows: (ref: TableRef, records: RowRecord[]) => Promise<BulkInsertResult>;
	updateRows: (ref: TableRef, updates: RowUpdate[]) => Promise<MutationResult>;
	deleteRows: (ref: TableRef, keys: RowKey[]) => Promise<DeleteRowsResult>;
	createTable: (database: string, payload: CreateTablePayload) => Promise<MutationResult>;
	renameTable: (ref: TableRef, payload: RenameTablePayload) => Promise<MutationResult>;
	dropTable: (ref: TableRef) => Promise<MutationResult>;
	addColumn: (ref: TableRef, payload: AddColumnPayload) => Promise<MutationResult>;
	alterColumn: (
		ref: TableRef,
		column: string,
		payload: AlterColumnPayload,
	) => Promise<MutationResult>;
	dropColumn: (ref: ColumnRef) => Promise<MutationResult>;
	renameColumn: (ref: TableRef, payload: RenameColumnPayload) => Promise<MutationResult>;
	listIndexes: (ref: TableRef) => Promise<IndexInfo[]>;
	createIndex: (ref: TableRef, payload: CreateIndexPayload) => Promise<MutationResult>;
	dropIndex: (ref: TableRef, indexName: string) => Promise<MutationResult>;
	executeQuery: (database: string, request: ExecuteQueryRequest) => Promise<QueryResult>;
};

export type PeridotbaseClientOptions = {
	rpc: RpcPort;
	wallet?: WalletPort | null;
	/** Absent until `peridotbase-core` publishes the deployed program address. */
	programId?: string | null;
};
