import type {
	ExtensionPolicyInfo,
	MutationResult,
	PolicyProposalInfo,
	TablePolicies,
	TablePolicyWrite,
} from "@peridotvault/peridotbase-sdk";
import { getPeridotbaseClient } from "./client";

const ref = (db: string | null | undefined, tableName: string, schemaName?: string) => {
	if (!db) throw new Error("Select a database first");

	return { database: db, table: tableName, schema: schemaName };
};

export const getTablePolicies = (
	tableName: string,
	db?: string | null,
	schemaName?: string,
): Promise<TablePolicies> =>
	getPeridotbaseClient().getTablePolicies(ref(db, tableName, schemaName));

export const setTablePolicies = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
	policies: TablePolicyWrite[],
): Promise<MutationResult> =>
	getPeridotbaseClient().setTablePolicies(ref(db, tableName, schemaName), policies);

export const setTablePolicyTimelock = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
	delaySeconds: number,
): Promise<MutationResult> =>
	getPeridotbaseClient().setTablePolicyTimelock(ref(db, tableName, schemaName), delaySeconds);

export const setTablePolicyMultisig = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
	signers: string[],
	threshold: number,
): Promise<MutationResult> =>
	getPeridotbaseClient().setTablePolicyMultisig(
		ref(db, tableName, schemaName),
		signers,
		threshold,
	);

export const listPolicyProposals = (
	tableName: string,
	db?: string | null,
	schemaName?: string,
): Promise<PolicyProposalInfo[]> =>
	getPeridotbaseClient().listPolicyProposals(ref(db, tableName, schemaName));

export const proposePolicy = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
	payload: { proposalId: string; policies: TablePolicyWrite[] },
): Promise<MutationResult> =>
	getPeridotbaseClient().proposePolicy(ref(db, tableName, schemaName), payload);

export const approvePolicy = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
	proposalId: string,
): Promise<MutationResult> =>
	getPeridotbaseClient().approvePolicy(ref(db, tableName, schemaName), proposalId);

export const applyPolicy = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
	proposalId: string,
): Promise<MutationResult> =>
	getPeridotbaseClient().applyPolicy(ref(db, tableName, schemaName), proposalId);

export const cancelPolicy = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
	proposalId: string,
): Promise<MutationResult> =>
	getPeridotbaseClient().cancelPolicy(ref(db, tableName, schemaName), proposalId);

export const getTableExtensionPolicy = (
	tableName: string,
	db?: string | null,
	schemaName?: string,
): Promise<ExtensionPolicyInfo | null> =>
	getPeridotbaseClient().getTableExtensionPolicy(ref(db, tableName, schemaName));

export const setTableExtensionPolicy = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
	payload: ExtensionPolicyInfo,
): Promise<MutationResult> =>
	getPeridotbaseClient().setTableExtensionPolicy(ref(db, tableName, schemaName), payload);

export const clearTableExtensionPolicy = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
): Promise<MutationResult> =>
	getPeridotbaseClient().clearTableExtensionPolicy(ref(db, tableName, schemaName));

export const invokeTableExtension = (
	tableName: string,
	db: string | null | undefined,
	schemaName: string | undefined,
	dataHex: string,
): Promise<MutationResult> =>
	getPeridotbaseClient().invokeTableExtension(ref(db, tableName, schemaName), dataHex);
