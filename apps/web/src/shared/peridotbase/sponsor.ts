import type {
	CreateSponsorAllowancePayload,
	MutationResult,
	SponsorAllowance,
	TopUpSponsorAllowancePayload,
} from "@peridotvault/peridotbase-sdk";
import { getPeridotbaseClient } from "./client";

export const listSponsorAllowances = (): Promise<SponsorAllowance[]> =>
	getPeridotbaseClient().listSponsorAllowances();

export const createSponsorAllowance = (
	payload: CreateSponsorAllowancePayload,
): Promise<MutationResult> => getPeridotbaseClient().createSponsorAllowance(payload);

export const topUpSponsorAllowance = (
	payload: TopUpSponsorAllowancePayload,
): Promise<MutationResult> => getPeridotbaseClient().topUpSponsorAllowance(payload);

export const closeSponsorAllowance = (grantee: string): Promise<MutationResult> =>
	getPeridotbaseClient().closeSponsorAllowance(grantee);
