import { CONSTANTS } from "@/shared/utils/constants";

/**
 * Tells same-named tables in different schemas apart. The default schema is implicit, so
 * `public.products` renders as `products`; a real schema name is the only prefix shown.
 */
export const tableId = ({
	schemaName,
	tableName,
}: {
	schemaName?: string;
	tableName: string;
}) =>
	schemaName && schemaName !== CONSTANTS.DEFAULT_SCHEMA
		? `${schemaName}.${tableName}`
		: tableName;
