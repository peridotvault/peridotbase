import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getDefaultAiModel, type AiProvider } from "./providers";

interface AiSettingsStore {
	provider: AiProvider;
	model: string;
	includeSchemaInAiContext: boolean;
	setProvider: (provider: AiProvider) => void;
	setModel: (model: string) => void;
	setIncludeSchemaInAiContext: (include: boolean) => void;
}

export const useAiSettingsStore = create<AiSettingsStore>()(
	persist(
		(set) => ({
			provider: "gemini",
			model: getDefaultAiModel("gemini"),
			includeSchemaInAiContext: true,
			setProvider: (provider) => set({ provider, model: getDefaultAiModel(provider) }),
			setModel: (model) => set({ model }),
			setIncludeSchemaInAiContext: (includeSchemaInAiContext) =>
				set({ includeSchemaInAiContext }),
		}),
		{ name: "peridotbase-ai-settings" },
	),
);
