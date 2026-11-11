import { isIntegrationUnavailable, type SdkFailure } from "@peridotbase/sdk";

/**
 * The rejection the Studio's mutation hooks are typed with: unimplemented operations, RPC
 * failures and wallet rejections all arrive as one error shape.
 */
export type StudioError = SdkFailure;

/**
 * Message shown by a toast or an error state. An unwired program reports which operation is
 * missing; RPC and wallet failures report their own message.
 */
export const sdkErrorMessage = (error: unknown, fallback: string): string => {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return fallback;
};

/** True when the failure means "the program has no instruction for this yet". */
export const isPendingIntegration = (error: unknown): boolean =>
	isIntegrationUnavailable(error);
