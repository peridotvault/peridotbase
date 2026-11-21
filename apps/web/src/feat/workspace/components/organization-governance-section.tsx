import {
	ORGANIZATION_ACTIONS,
	type OrganizationAction,
	type OrganizationPolicyPayload,
} from "@peridotvault/peridotbase-sdk";
import { Badge } from "@peridotvault/peridotbase-ui/badge";
import { Button } from "@peridotvault/peridotbase-ui/button";
import { Checkbox } from "@peridotvault/peridotbase-ui/checkbox";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Label } from "@peridotvault/peridotbase-ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@peridotvault/peridotbase-ui/select";
import { Textarea } from "@peridotvault/peridotbase-ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Panel, PanelBody, PanelHeader } from "@/shared/components/page";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { useOrganization } from "@/shared/hooks/use-scope";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";
import {
	approveOrganizationAction,
	cancelOrganizationRecovery,
	closeOrganizationProposal,
	executeOrganizationRecovery,
	getOrganizationPolicy,
	initiateOrganizationRecovery,
	listOrganizationProposals,
	proposeOrganizationAction,
	sdkErrorMessage,
	setOrganizationPolicy,
} from "@/shared/peridotbase";
import { workspaceKeys } from "@/shared/query/keys";
import { useWorkspaceStore } from "@/shared/stores/workspace.store";

const ACTION_LABELS: Record<OrganizationAction, string> = {
	transferOwner: "Transfer owner",
	rename: "Rename",
	addMember: "Add member",
	removeMember: "Remove member",
	updateMember: "Update member",
	setPolicy: "Set policy",
	closeDatabase: "Close database",
};

type ProposableAction = Exclude<OrganizationAction, "setPolicy" | "rename">;

const PROPOSABLE_ACTIONS = ORGANIZATION_ACTIONS.filter(
	(entry): entry is ProposableAction => entry !== "setPolicy" && entry !== "rename",
);

const parseList = (value: string) =>
	value
		.split(/[\s,]+/)
		.map((entry) => entry.trim())
		.filter(Boolean);

/** The optional org multisig: policy, proposals and break-glass recovery. */
export const OrganizationGovernanceSection = ({ organization }: { organization: string }) => {
	const active = useOrganization(organization);
	const wallet = useWorkspaceStore((state) => state.wallet);
	const demo = isDemoMode();
	const canManage = demo || (active ? active.owner === wallet?.address : false);
	const capabilities = useStudioCapabilities();
	const queryClient = useQueryClient();

	const [signers, setSigners] = useState("");
	const [threshold, setThreshold] = useState("2");
	const [guarded, setGuarded] = useState<OrganizationAction[]>([...ORGANIZATION_ACTIONS]);
	const [recoveryAuthority, setRecoveryAuthority] = useState("");
	const [recoveryDelay, setRecoveryDelay] = useState("86400");
	const [replaceProposal, setReplaceProposal] = useState("");
	const [action, setAction] = useState<ProposableAction>("addMember");
	const [actionProposal, setActionProposal] = useState("1");
	const [expiresAt, setExpiresAt] = useState("");
	const [target, setTarget] = useState("");
	const [role, setRole] = useState<"admin" | "member">("member");
	const [database, setDatabase] = useState("");
	const [recoverSigners, setRecoverSigners] = useState("");
	const [recoverThreshold, setRecoverThreshold] = useState("2");

	const policy = useQuery({
		queryKey: workspaceKeys.orgPolicy(organization),
		queryFn: () => getOrganizationPolicy(organization),
		enabled: Boolean(active),
	});

	const proposals = useQuery({
		queryKey: workspaceKeys.orgProposals(organization),
		queryFn: () => listOrganizationProposals(organization),
		enabled: Boolean(active),
	});

	useEffect(() => {
		const current = policy.data;

		if (!current) return;

		setSigners(current.signers.join("\n"));
		setThreshold(String(current.threshold));
		setGuarded(current.guardedActions);
		setRecoveryAuthority(current.recoveryAuthority ?? "");
		setRecoveryDelay(String(current.recoveryDelaySeconds));
	}, [policy.data]);

	const refresh = async () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: workspaceKeys.orgPolicy(organization) }),
			queryClient.invalidateQueries({ queryKey: workspaceKeys.orgProposals(organization) }),
		]);

	const run = async (work: () => Promise<{ message: string }>, loading: string) => {
		try {
			await toast
				.promise(work(), {
					loading,
					success: (result) => result.message,
					error: (error: Error) => sdkErrorMessage(error, "The program rejected the request"),
				})
				.unwrap();
			await refresh();
		} catch {
			// toast.promise already reported the failure.
		}
	};

	const install = useMutation({
		mutationFn: () => {
			const payload: OrganizationPolicyPayload = {
				signers: parseList(signers),
				threshold: Number(threshold),
				guardedActions: guarded,
				recoveryAuthority: recoveryAuthority.trim() || undefined,
				recoveryDelaySeconds: Number(recoveryDelay) || 0,
			};

			return setOrganizationPolicy(organization, payload, replaceProposal.trim() || undefined);
		},
	});

	const propose = useMutation({
		mutationFn: () => {
			const base = {
				proposalId: actionProposal.trim(),
				expiresAt: expiresAt.trim() ? Number(expiresAt) : undefined,
			};

			switch (action) {
				case "transferOwner":
					return proposeOrganizationAction(organization, {
						...base,
						action,
						newOwner: target.trim(),
					});
				case "removeMember":
					return proposeOrganizationAction(organization, {
						...base,
						action,
						principal: target.trim(),
					});
				case "closeDatabase":
					return proposeOrganizationAction(organization, {
						...base,
						action,
						database: database.trim(),
					});
				default:
					return proposeOrganizationAction(organization, {
						...base,
						action,
						principal: target.trim(),
						role,
					});
			}
		},
	});

	const recoveryStart = useMutation({
		mutationFn: () => initiateOrganizationRecovery(organization),
	});

	const recoveryCancel = useMutation({
		mutationFn: () => cancelOrganizationRecovery(organization),
	});

	const recoveryExecute = useMutation({
		mutationFn: () =>
			executeOrganizationRecovery(
				organization,
				parseList(recoverSigners),
				Number(recoverThreshold),
			),
	});

	if (!capabilities.ddl || !active) return null;

	const data = policy.data;

	return (
		<Panel>
			<PanelHeader
				title="Organization multisig"
				description="Optional M-of-N signers. Once a policy exists, guarded actions need an approved proposal before the program accepts them."
			/>
			<PanelBody className="space-y-5">
				{data ? (
					<div className="flex flex-wrap items-center gap-2 text-xs">
						<Badge variant="secondary">
							{data.threshold}-of-{data.signers.length}
						</Badge>
						<Badge variant="outline">epoch {data.epoch}</Badge>
						<Badge variant="outline">next proposal {data.proposalCounter}</Badge>
						{data.guardedActions.map((entry) => (
							<Badge key={entry} variant="outline">
								{ACTION_LABELS[entry]}
							</Badge>
						))}
					</div>
				) : (
					<p className="text-xs text-muted-foreground">
						This organization has no policy; the owner acts alone.
					</p>
				)}

				<div className="space-y-3 border-t border-border pt-4">
					<p className="text-xs font-medium">{data ? "Replace policy" : "Install policy"}</p>
					<Textarea
						aria-label="Policy signers"
						rows={3}
						className="font-mono text-xs"
						placeholder="One signer wallet per line"
						value={signers}
						disabled={!canManage}
						onChange={(event) => setSigners(event.target.value)}
					/>
					<div className="flex flex-wrap items-end gap-3">
						<div className="space-y-1">
							<Label htmlFor="org-threshold">Threshold</Label>
							<Input
								id="org-threshold"
								type="number"
								min="1"
								className="w-24"
								value={threshold}
								disabled={!canManage}
								onChange={(event) => setThreshold(event.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="org-recovery-authority">Recovery authority</Label>
							<Input
								id="org-recovery-authority"
								className="w-64 font-mono text-xs"
								placeholder="Optional break-glass wallet"
								value={recoveryAuthority}
								disabled={!canManage}
								onChange={(event) => setRecoveryAuthority(event.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="org-recovery-delay">Recovery delay (s)</Label>
							<Input
								id="org-recovery-delay"
								type="number"
								min="0"
								className="w-32"
								value={recoveryDelay}
								disabled={!canManage}
								onChange={(event) => setRecoveryDelay(event.target.value)}
							/>
						</div>
					</div>
					<div className="flex flex-wrap gap-3">
						{ORGANIZATION_ACTIONS.map((entry) => (
							<div key={entry} className="flex items-center gap-1.5">
								<Checkbox
									id={`guarded-${entry}`}
									checked={guarded.includes(entry)}
									disabled={!canManage}
									onCheckedChange={(value) =>
										setGuarded((current) =>
											value === true
												? [...current, entry]
												: current.filter((item) => item !== entry),
										)
									}
								/>
								<Label htmlFor={`guarded-${entry}`} className="cursor-pointer text-xs">
									{ACTION_LABELS[entry]}
								</Label>
							</div>
						))}
					</div>
					{data ? (
						<Input
							aria-label="Policy replacement proposal ID"
							className="w-72"
							placeholder="Approved proposal ID for the replacement"
							value={replaceProposal}
							disabled={!canManage}
							onChange={(event) => setReplaceProposal(event.target.value)}
						/>
					) : null}
					<Button
						variant="outline"
						disabled={
							!canManage ||
							parseList(signers).length === 0 ||
							install.isPending ||
							(data != null && !replaceProposal.trim())
						}
						onClick={() => void run(() => install.mutateAsync(), "Updating policy...")}
					>
						{data ? "Replace policy" : "Install policy"}
					</Button>
				</div>

				<div className="space-y-3 border-t border-border pt-4">
					<p className="text-xs font-medium">Propose a guarded action</p>
					<div className="flex flex-wrap items-end gap-2">
						<Select
							value={action}
							onValueChange={(value) => setAction(value as ProposableAction)}
						>
							<SelectTrigger className="w-48" aria-label="Guarded action">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PROPOSABLE_ACTIONS.map((entry) => (
									<SelectItem key={entry} value={entry}>
										{ACTION_LABELS[entry]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Input
							aria-label="Proposal ID"
							className="w-28"
							placeholder="ID"
							value={actionProposal}
							onChange={(event) => setActionProposal(event.target.value)}
						/>
						<Input
							aria-label="Expiry"
							className="w-40"
							placeholder="Expiry (unix, optional)"
							value={expiresAt}
							onChange={(event) => setExpiresAt(event.target.value)}
						/>
						{action === "closeDatabase" ? (
							<Input
								aria-label="Database"
								className="min-w-48 flex-1"
								placeholder="Database name"
								value={database}
								onChange={(event) => setDatabase(event.target.value)}
							/>
						) : (
							<Input
								aria-label="Target wallet"
								className="min-w-48 flex-1 font-mono text-xs"
								placeholder="Wallet address"
								value={target}
								onChange={(event) => setTarget(event.target.value)}
							/>
						)}
						{action === "addMember" || action === "updateMember" ? (
							<Select
								value={role}
								onValueChange={(value) => setRole(value as "admin" | "member")}
							>
								<SelectTrigger className="w-28" aria-label="Member role">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="member">Member</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
								</SelectContent>
							</Select>
						) : null}
						<Button
							variant="secondary"
							disabled={!canManage || !data || propose.isPending}
							onClick={() => void run(() => propose.mutateAsync(), "Proposing action...")}
						>
							Propose
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						The digest commits to these exact arguments, so every signer approves the same
						bytes the program will execute.
					</p>
				</div>

				<div className="space-y-3 border-t border-border pt-4">
					<p className="text-xs font-medium">Proposals</p>
					{proposals.isPending ? (
						<p className="text-xs text-muted-foreground">Reading proposals...</p>
					) : (proposals.data ?? []).length === 0 ? (
						<p className="text-xs text-muted-foreground">No proposals yet.</p>
					) : (
						<ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
							{(proposals.data ?? []).map((proposal) => (
								<li
									key={proposal.proposalId}
									className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
								>
									<div className="min-w-0 space-y-0.5">
										<p className="text-xs font-medium">
											#{proposal.proposalId} ·{" "}
											{ACTION_LABELS[proposal.action as OrganizationAction] ?? proposal.action}
										</p>
										<p className="truncate font-mono text-[11px] text-muted-foreground">
											{proposal.digest}
										</p>
										<p className="text-xs text-muted-foreground">
											{proposal.approvers.length} approvals
											{proposal.expiresAt
												? ` · expires ${new Date(proposal.expiresAt * 1000).toLocaleString()}`
												: ""}
											{proposal.executed ? " · executed" : ""}
										</p>
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={!canManage || proposal.executed}
											onClick={() =>
												void run(
													() => approveOrganizationAction(organization, proposal.proposalId),
													"Approving...",
												)
											}
										>
											Approve
										</Button>
										<Button
											variant="ghost"
											size="sm"
											disabled={!canManage}
											onClick={() =>
												void run(
													() => closeOrganizationProposal(organization, proposal.proposalId),
													"Closing proposal...",
												)
											}
										>
											Close
										</Button>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>

				{data?.recoveryAuthority ? (
					<div className="space-y-3 border-t border-border pt-4">
						<p className="text-xs font-medium">Break-glass recovery</p>
						<p className="text-xs text-muted-foreground">
							{data.recoveryReadyAt
								? `Pending since ${new Date(data.recoveryReadyAt * 1000).toLocaleString()}; executable after the ${data.recoveryDelaySeconds}s delay.`
								: `Recovery waits ${data.recoveryDelaySeconds}s before it can replace the signer set.`}
						</p>
						<div className="flex flex-wrap gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={!canManage || data.recoveryReadyAt != null}
								onClick={() =>
									void run(() => recoveryStart.mutateAsync(), "Starting recovery...")
								}
							>
								Start recovery
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={!canManage || data.recoveryReadyAt == null}
								onClick={() =>
									void run(() => recoveryCancel.mutateAsync(), "Cancelling recovery...")
								}
							>
								Cancel recovery
							</Button>
						</div>
						<Textarea
							aria-label="Replacement signers"
							rows={2}
							className="font-mono text-xs"
							placeholder="New signer wallets, one per line"
							value={recoverSigners}
							disabled={!canManage}
							onChange={(event) => setRecoverSigners(event.target.value)}
						/>
						<div className="flex flex-wrap items-end gap-2">
							<Input
								aria-label="Replacement threshold"
								type="number"
								min="1"
								className="w-28"
								value={recoverThreshold}
								disabled={!canManage}
								onChange={(event) => setRecoverThreshold(event.target.value)}
							/>
							<Button
								variant="destructive"
								size="sm"
								disabled={
									!canManage ||
									parseList(recoverSigners).length === 0 ||
									recoveryExecute.isPending
								}
								onClick={() =>
									void run(() => recoveryExecute.mutateAsync(), "Executing recovery...")
								}
							>
								Execute recovery
							</Button>
						</div>
					</div>
				) : null}
			</PanelBody>
		</Panel>
	);
};
