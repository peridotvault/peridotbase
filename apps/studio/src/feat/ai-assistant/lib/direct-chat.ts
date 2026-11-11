import { chat } from "@tanstack/ai";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { createGeminiChat } from "@tanstack/ai-gemini";
import { createOpenaiChat } from "@tanstack/ai-openai";
import type { UIMessage } from "@tanstack/ai-react";
import type { AiProvider } from "@/feat/settings";
import type { SchemaGraphTable } from "@/shared/peridotbase";

const BASE_PROMPT = `You are the database assistant inside Peridotbase Studio, a wallet-connected client for Peridotbase, a Solana-native relational database.

Peridotbase has no backend server: every read and write is a Solana program instruction signed by the connected wallet. The Studio talks to the program through the Peridotbase TypeScript SDK and a Solana RPC endpoint.

Answer concisely. Use exact table and column names from the schema below. When you write SQL, write PostgreSQL-compatible statements in a \`\`\`sql code block, explain them in one or two sentences, and warn before destructive or expensive operations.`;

/** Table and column metadata only: never row values. */
const formatSchema = (tables: SchemaGraphTable[]) => {
	const blocks = tables.map((table) => {
		const name = table.schemaName ? `${table.schemaName}.${table.tableName}` : table.tableName;

		const columns = table.columns.map((column) => {
			const parts = [`  - ${column.columnName} ${column.dataTypeLabel}`];

			if (column.isPrimaryKey) parts.push("[PRIMARY KEY]");
			if (!column.isNullable) parts.push("NOT NULL");
			if (column.isForeignKey && column.referencedTable) {
				const target = column.referencedSchema
					? `${column.referencedSchema}.${column.referencedTable}`
					: column.referencedTable;

				parts.push(`[FK -> ${target}.${column.referencedColumn ?? ""}]`);
			}

			return parts.join(" ");
		});

		return `### ${name}\n${columns.join("\n")}`;
	});

	return blocks.join("\n\n");
};

const buildSystemPrompt = ({
	database,
	schemaTables,
	includeSchema,
}: {
	database: string;
	schemaTables: SchemaGraphTable[] | undefined;
	includeSchema: boolean;
}) => {
	const header = `${BASE_PROMPT}\n\nDatabase: ${database}`;

	if (!includeSchema) {
		return `${header}\n\nThe user chose not to share the schema. Do not claim to know their tables or columns; ask for the minimum missing detail.`;
	}

	if (!schemaTables || schemaTables.length === 0) {
		return `${header}\n\nThe schema is not readable yet: the Peridotbase program has not published its account layout. Ask the user for the tables and columns you need instead of inventing them.`;
	}

	return `${header}\n\nDatabase schema:\n\n${formatSchema(schemaTables)}`;
};

const createAdapter = (provider: AiProvider, model: string, apiKey: string) => {
	switch (provider) {
		case "openai":
			return createOpenaiChat(model as Parameters<typeof createOpenaiChat>[0], apiKey);
		case "anthropic":
			return createAnthropicChat(model as Parameters<typeof createAnthropicChat>[0], apiKey);
		case "gemini":
			return createGeminiChat(model as Parameters<typeof createGeminiChat>[0], apiKey);
	}
};

/**
 * Streams one assistant turn straight from the provider, in the browser, with the user's own
 * key. There is no relay: the request goes from this tab to the provider's API.
 */
export const streamAssistantReply = ({
	provider,
	model,
	apiKey,
	database,
	messages,
	schemaTables,
	includeSchema,
	threadId,
	signal,
}: {
	provider: AiProvider;
	model: string;
	apiKey: string;
	database: string;
	messages: Array<UIMessage>;
	schemaTables: SchemaGraphTable[] | undefined;
	includeSchema: boolean;
	threadId: string;
	signal: AbortSignal;
}) => {
	const controller = new AbortController();
	const abort = () => controller.abort();

	if (signal.aborted) controller.abort();
	else signal.addEventListener("abort", abort, { once: true });

	return chat({
		adapter: createAdapter(provider, model, apiKey),
		messages,
		threadId,
		systemPrompts: [buildSystemPrompt({ database, schemaTables, includeSchema })],
		abortController: controller,
	});
};
