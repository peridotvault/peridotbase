import type { Capabilities } from "@peridotbase/sdk";
import { getPeridotbaseClient } from "@/shared/peridotbase/client";

/**
 * The program capabilities behind the current client. `cellDefault` stays false until the
 * program defines column defaults; the grid uses it to hide the "reset to default" affordance.
 */
export type StudioCapabilities = Capabilities & { cellDefault: boolean };

export const getStudioCapabilities = (): StudioCapabilities => ({
	...getPeridotbaseClient().capabilities,
	cellDefault: false,
});

export const useStudioCapabilities = (): StudioCapabilities => getStudioCapabilities();
