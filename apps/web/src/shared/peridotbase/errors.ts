import { isIntegrationUnavailable, type SdkFailure } from "@peridotvault/peridotbase-sdk";

/**
 * The rejection the Studio's mutation hooks are typed with: unimplemented operations, RPC
 * failures and wallet rejections all arrive as one error shape.
 */
export type StudioError = SdkFailure;

/**
 * Message shown by a toast or an error state. An unwired program reports which operation is
 * missing; RPC and wallet failures report their own message. Known on-chain constraint
 * violations are translated into plain English.
 */
export const sdkErrorMessage = (error: unknown, fallback: string): string => {
	if (isDuplicateTableName(error)) {
		const name = (error as { tableName?: unknown }).tableName;
		return typeof name === "string" && name
			? `Table "${name}" already exists in this database`
			: "A table with this name already exists in this database";
	}
	if (isForeignKeyViolation(error)) {
		return "Foreign key violation: the referenced row does not exist, or another row still references this one.";
	}
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return fallback;
};

/** True when the failure is a duplicate table name inside one database. */
export const isDuplicateTableName = (error: unknown): boolean => {
	if (!error || typeof error !== "object") return false;
	const code = (error as { code?: unknown }).code;
	const canonicalCode = (error as { canonicalCode?: unknown }).canonicalCode;
	return (
		code === "DuplicateTableName" ||
		canonicalCode === "TABLE_ALREADY_EXISTS" ||
		(error instanceof Error && error.message.includes("DuplicateTableName"))
	);
};

/** True when the program rejected a write because a foreign key would break. */
export const isForeignKeyViolation = (error: unknown): boolean => {
	if (!error || typeof error !== "object") return false;
	const record = error as { canonicalCode?: unknown; code?: unknown; message?: unknown };

	return (
		record.canonicalCode === "FOREIGN_KEY_VIOLATION" ||
		record.code === "ForeignKeyViolation" ||
		record.code === "MissingForeignKeyAccount" ||
		record.code === "ForeignKeyCounterUnderflow" ||
		record.code === "ForeignKeyChildNotEmpty" ||
		(typeof record.message === "string" &&
			/ForeignKey(Violation|ChildNotEmpty|CounterUnderflow)|MissingForeignKeyAccount/.test(
				record.message,
			))
	);
};

/** True when the failure means "the program has no instruction for this yet". */
export const isPendingIntegration = (error: unknown): boolean =>
	isIntegrationUnavailable(error);
