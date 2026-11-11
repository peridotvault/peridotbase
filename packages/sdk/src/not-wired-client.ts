import type {
	PeridotbaseClient,
	PeridotbaseClientOptions,
	ProtocolHealth,
	RowUpdate,
} from "./client.js";
import { IntegrationUnavailableError } from "./errors.js";
import { PROGRAM_NOT_WIRED } from "./types/capabilities.js";
import type {
	AddColumnPayload,
	AlterColumnPayload,
	BulkInsertResult,
	ColumnInfo,
	ColumnRef,
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
} from "./types/index.js";

/**
 * The client that ships today. It exposes the whole `PeridotbaseClient` surface so the Studio can
 * wire every screen against it, but only the RPC and wallet plumbing is implemented.
 *
 * Each unimplemented method throws `IntegrationUnavailableError`, naming the operation and the
 * missing piece. Nothing returns placeholder rows, empty-but-successful results, or fake
 * signatures: a caller either receives real program data or a typed refusal.
 */
export class ProgramNotWiredClient implements PeridotbaseClient {
	readonly capabilities = PROGRAM_NOT_WIRED;
	readonly rpc;
	readonly wallet;
	readonly programId;

	constructor(options: PeridotbaseClientOptions) {
		this.rpc = options.rpc;
		this.wallet = options.wallet ?? null;
		this.programId = options.programId ?? null;
	}

	async getHealth(): Promise<ProtocolHealth> {
		let slot: string | undefined;
		let version: string | undefined;
		let reachable: boolean;

		try {
			[slot, version] = await Promise.all([
				this.rpc.getSlot().then(String),
				this.rpc.getVersion(),
			]);
			reachable = true;
		} catch {
			reachable = false;
		}

		return {
			reachable,
			slot,
			version,
			programConfigured: Boolean(this.programId),
			programReachable: false,
		};
	}

	listDatabases(): Promise<DatabaseInfo[]> {
		throw new IntegrationUnavailableError("listDatabases");
	}

	listTables(_database: string): Promise<TableInfo[]> {
		void _database;
		throw new IntegrationUnavailableError("listTables");
	}

	getTableColumns(_ref: TableRef): Promise<ColumnInfo[]> {
		void _ref;
		throw new IntegrationUnavailableError("getTableColumns");
	}

	getRelationships(_database: string): Promise<Relationship[]> {
		void _database;
		throw new IntegrationUnavailableError("getRelationships");
	}

	readRows(_ref: TableRef, _query: ReadRowsQuery): Promise<RowPage> {
		void _ref;
		void _query;
		throw new IntegrationUnavailableError("readRows");
	}

	insertRows(_ref: TableRef, _records: RowRecord[]): Promise<BulkInsertResult> {
		void _ref;
		void _records;
		throw new IntegrationUnavailableError("insertRows");
	}

	updateRows(_ref: TableRef, _updates: RowUpdate[]): Promise<MutationResult> {
		void _ref;
		void _updates;
		throw new IntegrationUnavailableError("updateRows");
	}

	deleteRows(_ref: TableRef, _keys: RowKey[]): Promise<DeleteRowsResult> {
		void _ref;
		void _keys;
		throw new IntegrationUnavailableError("deleteRows");
	}

	createTable(_database: string, _payload: CreateTablePayload): Promise<MutationResult> {
		void _database;
		void _payload;
		throw new IntegrationUnavailableError("createTable");
	}

	renameTable(_ref: TableRef, _payload: RenameTablePayload): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("renameTable");
	}

	dropTable(_ref: TableRef): Promise<MutationResult> {
		void _ref;
		throw new IntegrationUnavailableError("dropTable");
	}

	addColumn(_ref: TableRef, _payload: AddColumnPayload): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("addColumn");
	}

	alterColumn(
		_ref: TableRef,
		_column: string,
		_payload: AlterColumnPayload,
	): Promise<MutationResult> {
		void _ref;
		void _column;
		void _payload;
		throw new IntegrationUnavailableError("alterColumn");
	}

	dropColumn(_ref: ColumnRef): Promise<MutationResult> {
		void _ref;
		throw new IntegrationUnavailableError("dropColumn");
	}

	renameColumn(_ref: TableRef, _payload: RenameColumnPayload): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("renameColumn");
	}

	listIndexes(_ref: TableRef): Promise<IndexInfo[]> {
		void _ref;
		throw new IntegrationUnavailableError("listIndexes");
	}

	createIndex(_ref: TableRef, _payload: CreateIndexPayload): Promise<MutationResult> {
		void _ref;
		void _payload;
		throw new IntegrationUnavailableError("createIndex");
	}

	dropIndex(_ref: TableRef, _indexName: string): Promise<MutationResult> {
		void _ref;
		void _indexName;
		throw new IntegrationUnavailableError("dropIndex");
	}

	executeQuery(_database: string, _request: ExecuteQueryRequest): Promise<QueryResult> {
		void _database;
		void _request;
		throw new IntegrationUnavailableError("executeQuery");
	}
}
