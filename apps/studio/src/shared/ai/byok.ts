import { anthropicByok } from "@tanstack/ai-anthropic/byok";
import { defineByok, memoryStorage } from "@tanstack/ai-client/byok";
import { geminiByok } from "@tanstack/ai-gemini/byok";
import { openaiByok } from "@tanstack/ai-openai/byok";

/**
 * Personal provider keys. They live in memory for this tab only: the Studio has no server and
 * no key store, so nothing is written to disk and a reload asks for the key again.
 */
export const aiByok = defineByok({
	storage: memoryStorage(),
	providers: [openaiByok, anthropicByok, geminiByok],
});
