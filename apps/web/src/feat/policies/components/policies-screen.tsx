import {
	type PolicyProposalInfo,
	type TablePolicyWrite,
	tablePolicyOps,
	type TablePolicyOp,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { Panel, PanelBody, PanelHeader } from "@/shared/components/page";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import {
	approvePolicy,
	applyPolicy,
	cancelPolicy,
	getTablePolicies,
	listPolicyProposals,
	proposePolicy,
	setTablePolicies,
	setTablePolicyMultisig,
	setTablePolicyTimelock,
	type StudioError,
} from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";

const ROLE_LABELS = { member: "Member", admin: "Admin", owner: "Owner" } as const;

const OPS_LABELS: Record<TablePolicyOp, string> = {
	insert: "Insert",
	update: "Update",
	delete: "Delete",
	select: "Select",
};

const draftId = (index: number) => String(index + 1);

type DraftPolicy = TablePolicyWrite;

const emptyDraft = (index: number): DraftPolicy => ({
	policyId: draftId(index),
	role: "member",
	ops: ["select"],
});

/** Row-level policies, their timelock and M-of-N signers, plus pending proposals. */
export const PoliciesScreen = ({ tableName }: { tableName: string }) => {
	const schemaName = useTableSchemaName();
	const { selectedDatabase } = useDatabaseStore();
	const capabilities = useStudioCapabilities();
	const queryClient = useQueryClient();
	const [drafts, setDrafts] = useState<DraftPolicy[]>([emptyDraft(0)]);
	const [timelock, setTimelock] = useState("");
	const [signers, setSigners] = useState("");
	const [threshold, setThreshold] = useState("1");
	const [proposalId, setProposalId] = useState("1");

	const policies = useQuery({
		queryKey: tableKeys.policies(tableName, selectedDatabase, schemaName),
		queryFn: () => getTablePolicies(tableName, selectedDatabase, schemaName),
		enabled: Boolean(selectedDatabase),
	});

	const proposals = useQuery({
		queryKey: tableKeys.policyProposals(tableName, selectedDatabase, schemaName),
		queryFn: () => listPolicyProposals(tableName, selectedDatabase, schemaName),
		enabled: Boolean(selectedDatabase),
	});

	useEffect(() => {
		if (!policies.data) return;
		setDrafts(
			policies.data.policies.length > 0
				? policies.data.policies.map(({ predicate: _predicate, ...policy }) => policy)
				: [emptyDraft(0)],
		);
	}, [policies.data]);

	const refresh = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: tableKeys.allPolicies() }),
			queryClient.invalidateQueries({ queryKey: tableKeys.allPolicyProposals() }),
		]);
	};

	const run = async (action: () => Promise<{ message: string }>, loading: string) => {
		try {
			const result = await toast
				.promise(action(), {
					loading,
					success: (value) => value.message,
					error: (error: StudioError) => error.message || "The program rejected the request",
				})
				.unwrap();
			await refresh();
			return result;
		} catch {
			return null;
		}
	};

	const savePolicies = useMutation({
		mutationFn: () => setTablePolicies(tableName, selectedDatabase, schemaName, drafts),
	});

	const runTimelock = useMutation({
		mutationFn: () =>
			setTablePolicyTimelock(tableName, selectedDatabase, schemaName, Number(timelock)),
	});

	const runMultisig = useMutation({
		mutationFn: () =>
			setTablePolicyMultisig(
				tableName,
				selectedDatabase,
				schemaName,
				signers
					.split(",")
					.map((signer) => signer.trim())
					.filter(Boolean),
				Number(threshold),
			),
	});

	const runPropose = useMutation({
		mutationFn: () =>
			proposePolicy(tableName, selectedDatabase, schemaName, {
				proposalId,
				policies: drafts,
			}),
	});

	if (!capabilities.ddl) {
		return (
			<p className="px-4 py-6 text-sm text-muted-foreground">
				The program does not expose policy changes to this client.
			</p>
		);
	}

	const data = policies.data;
	const hasPredicates = (data?.policies ?? []).some((policy) => policy.predicate.length > 0);
	const frozen = data?.frozen ?? false;
	const locked = frozen || hasPredicates;

	return (
		<div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10">
			<header className="space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">Policies</h2>
				<p className="text-sm text-muted-foreground">
					Row policies for {tableName}. Each policy grants a role a set of operations.
				</p>
			</header>

			{hasPredicates ? (
				<p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
					This table has policies with compiled row predicates. The Studio cannot rewrite
					predicate bytecode, so policy editing is read-only here.
				</p>
			) : null}

			{frozen ? (
				<p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
					Policies are frozen on this table; the program rejects every change.
				</p>
			) : null}

			<Panel>
				<PanelHeader title="Current policies" />
				<PanelBody className="space-y-3">
					{drafts.map((draft, index) => (
						<div key={draft.policyId} className="flex flex-wrap items-end gap-2">
							<div className="space-y-1">
								<Label>ID</Label>
								<Input
									className="w-20"
									value={draft.policyId}
									disabled={locked}
									onChange={(event) =>
										setDrafts((current) =>
											current.map((entry, position) =>
												position === index
													? { ...entry, policyId: event.target.value }
													: entry,
											),
										)
									}
								/>
							</div>
							<div className="space-y-1">
								<Label>Role</Label>
								<Select
									value={draft.role}
									disabled={locked}
									onValueChange={(value) =>
										setDrafts((current) =>
											current.map((entry, position) =>
												position === index
													? {
															...entry,
															role: value as DraftPolicy["role"],
														}
													: entry,
											),
										)
									}
								>
									<SelectTrigger className="w-32" aria-label="Policy role">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(ROLE_LABELS).map(([role, label]) => (
											<SelectItem key={role} value={role}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								{tablePolicyOps.map((op) => {
									const checked = draft.ops.includes(op);

									return (
										<div key={op} className="flex items-center gap-1.5">
											<Checkbox
												id={`policy-${index}-${op}`}
												checked={checked}
												disabled={locked}
												onCheckedChange={(value) =>
													setDrafts((current) =>
														current.map((entry, position) => {
															if (position !== index) return entry;
															const ops = value
																? [...entry.ops, op]
																: entry.ops.filter((item) => item !== op);
															return { ...entry, ops };
														}),
													)
												}
											/>
											<Label
												htmlFor={`policy-${index}-${op}`}
												className="cursor-pointer text-xs"
											>
												{OPS_LABELS[op]}
											</Label>
										</div>
									);
								})}
							</div>
							<Button
								variant="ghost"
								size="icon"
								disabled={locked || drafts.length === 1}
								onClick={() =>
									setDrafts((current) => current.filter((_, position) => position !== index))
								}
								aria-label="Remove policy"
							>
								<Trash2 className="size-4" />
							</Button>
						</div>
					))}

					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							disabled={locked}
							onClick={() => setDrafts((current) => [...current, emptyDraft(current.length)])}
						>
							Add policy
						</Button>
						<Button
							disabled={locked || savePolicies.isPending}
							onClick={() => void run(() => savePolicies.mutateAsync(), "Saving policies...")}
						>
							Save policies
						</Button>
						<Button
							variant="secondary"
							disabled={locked || runPropose.isPending}
							onClick={() => void run(() => runPropose.mutateAsync(), "Proposing policies...")}
						>
							Propose
						</Button>
						<Input
							aria-label="Proposal ID"
							className="w-24"
							value={proposalId}
							onChange={(event) => setProposalId(event.target.value)}
						/>
					</div>
				</PanelBody>
			</Panel>

			<Panel>
				<PanelHeader title="Policy guards" />
				<PanelBody className="space-y-4">
					<div className="flex flex-wrap items-end gap-2">
						<div className="space-y-1">
							<Label htmlFor="policy-timelock">Timelock (seconds)</Label>
							<Input
								id="policy-timelock"
								type="number"
								min="1"
								className="w-40"
								value={timelock}
								disabled={data?.timelockSeconds != null || locked}
								onChange={(event) => setTimelock(event.target.value)}
							/>
						</div>
						<Button
							variant="outline"
							disabled={
								locked ||
								data?.timelockSeconds != null ||
								!timelock.trim() ||
								runTimelock.isPending
							}
							onClick={() => void run(() => runTimelock.mutateAsync(), "Enabling timelock...")}
						>
							Enable timelock
						</Button>
						{data?.timelockSeconds != null ? (
							<Badge variant="secondary">Timelocked · {data.timelockSeconds}s</Badge>
						) : null}
					</div>

					<div className="flex flex-wrap items-end gap-2">
						<div className="min-w-56 flex-1 space-y-1">
							<Label htmlFor="policy-signers">M-of-N signers (comma separated)</Label>
							<Input
								id="policy-signers"
								className="font-mono text-xs"
								value={signers}
								disabled={data?.requiresMultisig || locked}
								onChange={(event) => setSigners(event.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="policy-threshold">Threshold</Label>
							<Input
								id="policy-threshold"
								type="number"
								min="1"
								className="w-24"
								value={threshold}
								disabled={data?.requiresMultisig || locked}
								onChange={(event) => setThreshold(event.target.value)}
							/>
						</div>
						<Button
							variant="outline"
							disabled={
								locked || data?.requiresMultisig || !signers.trim() || runMultisig.isPending
							}
							onClick={() =>
								void run(() => runMultisig.mutateAsync(), "Installing signers...")
							}
						>
							Install signers
						</Button>
						{data?.requiresMultisig ? <Badge variant="secondary">M-of-N</Badge> : null}
					</div>
				</PanelBody>
			</Panel>

			<Panel>
				<PanelHeader title="Pending proposals" />
				<PanelBody className="space-y-2">
					{proposals.isPending ? (
						<p className="text-xs text-muted-foreground">Reading proposals...</p>
					) : (proposals.data ?? []).length === 0 ? (
						<p className="text-xs text-muted-foreground">No pending proposals.</p>
					) : (
						(proposals.data ?? []).map((proposal) => (
							<ProposalRow
								key={proposal.proposalId}
								proposal={proposal}
								onAction={(action) =>
									run(
										() =>
											action === "approve"
												? approvePolicy(
														tableName,
														selectedDatabase,
														schemaName,
														proposal.proposalId,
													)
												: action === "apply"
													? applyPolicy(
															tableName,
															selectedDatabase,
															schemaName,
															proposal.proposalId,
														)
													: cancelPolicy(
															tableName,
															selectedDatabase,
															schemaName,
															proposal.proposalId,
														),
										`${action} proposal ${proposal.proposalId}...`,
									)
								}
							/>
						))
					)}
				</PanelBody>
			</Panel>
		</div>
	);
};

const ProposalRow = ({
	proposal,
	onAction,
}: {
	proposal: PolicyProposalInfo;
	onAction: (action: "approve" | "apply" | "cancel") => Promise<unknown>;
}) => (
	<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
		<div className="space-y-1">
			<p className="font-mono text-xs">Proposal {proposal.proposalId}</p>
			<p className="text-xs text-muted-foreground">
				{proposal.policies.length} policies · ETA{" "}
				{new Date(proposal.eta * 1000).toLocaleString()} · approvals{" "}
				{proposal.approvals.length}
			</p>
		</div>
		<div className="flex gap-2">
			<Button variant="outline" size="sm" onClick={() => void onAction("approve")}>
				Approve
			</Button>
			<Button variant="outline" size="sm" onClick={() => void onAction("apply")}>
				Apply
			</Button>
			<Button variant="ghost" size="sm" onClick={() => void onAction("cancel")}>
				Cancel
			</Button>
		</div>
	</div>
);
