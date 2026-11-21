import type {
	MutationResult,
	OrganizationActionPayload,
	OrganizationPolicyInfo,
	OrganizationPolicyPayload,
	OrganizationProposalInfo,
} from "@peridotvault/peridotbase-sdk";
import { getPeridotbaseClient } from "./client";

export const getOrganizationPolicy = (
	organization: string,
): Promise<OrganizationPolicyInfo | null> =>
	getPeridotbaseClient().getOrganizationPolicy(organization);

export const setOrganizationPolicy = (
	organization: string,
	payload: OrganizationPolicyPayload,
	proposalId?: string,
): Promise<MutationResult> =>
	getPeridotbaseClient().setOrganizationPolicy(organization, payload, proposalId);

export const listOrganizationProposals = (
	organization: string,
): Promise<OrganizationProposalInfo[]> =>
	getPeridotbaseClient().listOrganizationProposals(organization);

export const proposeOrganizationAction = (
	organization: string,
	payload: OrganizationActionPayload & { proposalId: string; expiresAt?: number },
): Promise<MutationResult> =>
	getPeridotbaseClient().proposeOrganizationAction(organization, payload);

export const approveOrganizationAction = (
	organization: string,
	proposalId: string,
): Promise<MutationResult> =>
	getPeridotbaseClient().approveOrganizationAction(organization, proposalId);

export const closeOrganizationProposal = (
	organization: string,
	proposalId: string,
): Promise<MutationResult> =>
	getPeridotbaseClient().closeOrganizationProposal(organization, proposalId);

export const initiateOrganizationRecovery = (organization: string): Promise<MutationResult> =>
	getPeridotbaseClient().initiateOrganizationRecovery(organization);

export const cancelOrganizationRecovery = (organization: string): Promise<MutationResult> =>
	getPeridotbaseClient().cancelOrganizationRecovery(organization);

export const executeOrganizationRecovery = (
	organization: string,
	signers: string[],
	threshold: number,
): Promise<MutationResult> =>
	getPeridotbaseClient().executeOrganizationRecovery(organization, signers, threshold);
