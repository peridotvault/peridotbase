import { useByok } from "@tanstack/ai-react";
import { aiByok, useAiByokReady, useAiSettingsStore } from "@/feat/settings";

/**
 * Whether the assistant can send. There is no hosted key: a turn goes straight from this tab to
 * the selected provider, so the user's own key is the only requirement.
 */
export const useAiAvailability = () => {
	const { provider } = useAiSettingsStore();
	const byok = useByok(aiByok);
	const isByokReady = useAiByokReady();
	const keyStatus = byok.status[provider];
	const hasPersonalKey = keyStatus?.state === "set" || keyStatus?.state === "locked";

	return {
		provider,
		isByokReady,
		hasPersonalKey,
		prompt: byok.prompt,
		canSend: isByokReady && hasPersonalKey,
	};
};
