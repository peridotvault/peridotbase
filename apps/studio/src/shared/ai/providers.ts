/**
 * The providers the assistant can talk to directly from the browser. Each one has a TanStack AI
 * adapter installed, so a personal key is the only thing the Studio needs: there is no relay.
 */
export const AI_PROVIDERS = ["gemini", "openai", "anthropic"] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_PROVIDER_OPTIONS = [
	{
		id: "gemini",
		label: "Google Gemini",
		models: [
			{ id: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
			{ id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
		],
	},
	{
		id: "openai",
		label: "OpenAI",
		models: [
			{ id: "gpt-5.2", label: "GPT-5.2" },
			{ id: "gpt-5-mini", label: "GPT-5 mini" },
		],
	},
	{
		id: "anthropic",
		label: "Anthropic",
		models: [
			{ id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
			{ id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
		],
	},
] as const satisfies ReadonlyArray<{
	id: AiProvider;
	label: string;
	models: ReadonlyArray<{ id: string; label: string }>;
}>;

export const getDefaultAiModel = (provider: AiProvider): string =>
	AI_PROVIDER_OPTIONS.find((option) => option.id === provider)?.models[0]?.id ??
	"gemini-3-flash-preview";

export const getAiProviderLabel = (provider: AiProvider): string =>
	AI_PROVIDER_OPTIONS.find((option) => option.id === provider)?.label ?? provider;
