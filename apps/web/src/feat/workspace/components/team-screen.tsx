import {
	type MutationResult,
	type OrganizationMemberRole,
	type OrganizationMemberInfo,
} from "@peridotvault/peridotbase-sdk";
import { Badge } from "@peridotvault/peridotbase-ui/badge";
import { Button } from "@peridotvault/peridotbase-ui/button";
import { Input } from "@peridotvault/peridotbase-ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@peridotvault/peridotbase-ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@peridotvault/peridotbase-ui/checkbox";
import { Label } from "@peridotvault/peridotbase-ui/label";
import { PageHeader, PageShell, Panel, PanelBody, PanelList } from "@/shared/components/page";
import { useOrganization } from "@/shared/hooks/use-scope";
import { getPeridotbaseClient } from "@/shared/peridotbase";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";
import { workspaceKeys } from "@/shared/query/keys";
import { useWorkspaceStore } from "@/shared/stores/workspace.store";

type EditableRole = Exclude<OrganizationMemberRole, "owner">;

const roleLabel = (role: OrganizationMemberRole) =>
	role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Member";

const roleBadgeVariant = (role: OrganizationMemberRole) =>
	role === "owner" ? "default" : role === "admin" ? "secondary" : "outline";

/** The organization's team tab: on-chain owner plus every active membership account. */
export const TeamScreen = ({ organization }: { organization: string }) => {
	const active = useOrganization(organization);
	const queryClient = useQueryClient();
	const wallet = useWorkspaceStore((state) => state.wallet);
	const demo = isDemoMode();
	const [principal, setPrincipal] = useState("");
	const [role, setRole] = useState<EditableRole>("member");
	const [newOwner, setNewOwner] = useState("");
	const [proposalId, setProposalId] = useState("");
	const [transferConfirm, setTransferConfirm] = useState(false);

	const members = useQuery({
		queryKey: workspaceKeys.members(active?.slug ?? organization),
		queryFn: () =>
			getPeridotbaseClient().listOrganizationMembers(active?.slug ?? organization),
		enabled: Boolean(active),
	});

	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: workspaceKeys.members(active?.slug ?? organization),
		});

	const addMember = useMutation<
		MutationResult,
		Error,
		{ principal: string; role: EditableRole }
	>({
		mutationFn: (input) =>
			getPeridotbaseClient().addOrganizationMember(
				active?.slug ?? organization,
				input.principal,
				input.role,
				proposalId.trim() || undefined,
			),
		onSuccess: refresh,
	});

	const updateMember = useMutation<
		MutationResult,
		Error,
		{ principal: string; role: EditableRole }
	>({
		mutationFn: (input) =>
			getPeridotbaseClient().updateOrganizationMember(
				active?.slug ?? organization,
				input.principal,
				input.role,
				proposalId.trim() || undefined,
			),
		onSuccess: refresh,
	});

	const transferOwner = useMutation<MutationResult, Error, void>({
		mutationFn: () =>
			getPeridotbaseClient().transferOrganizationOwner(
				active?.slug ?? organization,
				newOwner.trim(),
				proposalId.trim() || undefined,
			),
		onSuccess: refresh,
	});

	const removeMember = useMutation<MutationResult, Error, string>({
		mutationFn: (member) =>
			getPeridotbaseClient().removeOrganizationMember(
				active?.slug ?? organization,
				member,
				proposalId.trim() || undefined,
			),
		onSuccess: refresh,
	});

	if (!active) return <Navigate to="/studio/org" replace />;

	const address = wallet?.address ?? null;
	const current = (members.data ?? []).find((member) => member.principal === address);
	const canManage = demo || current?.role === "owner";
	const count = members.data?.length ?? 0;

	const handleInvite = async () => {
		const trimmed = principal.trim();

		if (!trimmed) return;

		try {
			await toast
				.promise(addMember.mutateAsync({ principal: trimmed, role }), {
					loading: "Adding member...",
					success: (result) => result.message,
					error: (error: Error) => error.message || "Could not add member",
				})
				.unwrap();
			setPrincipal("");
		} catch {
			// toast.promise already reported the failure.
		}
	};

	const handleRole = async (member: OrganizationMemberInfo, next: EditableRole) => {
		try {
			await toast
				.promise(updateMember.mutateAsync({ principal: member.principal, role: next }), {
					loading: "Updating role...",
					success: (result) => result.message,
					error: (error: Error) => error.message || "Could not update role",
				})
				.unwrap();
		} catch {
			// toast.promise already reported the failure.
		}
	};

	const handleRemove = async (member: OrganizationMemberInfo) => {
		try {
			await toast
				.promise(removeMember.mutateAsync(member.principal), {
					loading: "Removing member...",
					success: (result) => result.message,
					error: (error: Error) => error.message || "Could not remove member",
				})
				.unwrap();
		} catch {
			// toast.promise already reported the failure.
		}
	};

	return (
		<PageShell>
			<PageHeader
				eyebrow={active.name}
				title="Team"
				description={
					members.isPending
						? "Reading on-chain memberships…"
						: `${count} member${count === 1 ? "" : "s"} · on-chain organization authority`
				}
			/>

			<Panel>
				<PanelBody className="space-y-2">
					<h2 className="text-sm font-medium">Guarded actions</h2>
					<p className="text-xs text-muted-foreground">
						When an organization policy guards membership or ownership changes, pass the
						approved proposal ID here. Leave it empty if this organization has no policy.
					</p>
					<Input
						aria-label="Approved proposal ID"
						placeholder="Approved proposal ID (optional)"
						className="w-64"
						value={proposalId}
						disabled={!canManage}
						onChange={(event) => setProposalId(event.target.value)}
					/>
				</PanelBody>
			</Panel>

			{members.error ? (
				<p className="rounded-lg border border-border px-5 py-4 text-sm text-muted-foreground">
					{members.error instanceof Error
						? members.error.message
						: "Could not read organization members."}
				</p>
			) : null}

			<PanelList className="overflow-hidden rounded-lg border border-border">
				{(members.data ?? []).map((member) => (
					<li
						key={member.principal}
						className="flex items-center justify-between gap-4 px-5 py-3"
					>
						<div className="min-w-0">
							<p className="truncate font-mono text-xs">{member.principal}</p>
							{member.principal === address ? (
								<p className="text-xs text-muted-foreground">You</p>
							) : null}
						</div>
						<div className="flex items-center gap-2">
							{member.role === "owner" || !canManage ? (
								<Badge variant={roleBadgeVariant(member.role)}>{roleLabel(member.role)}</Badge>
							) : (
								<>
									<Select
										value={member.role}
										onValueChange={(value) => handleRole(member, value as EditableRole)}
									>
										<SelectTrigger size="sm" aria-label="Member role">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="admin">Admin</SelectItem>
											<SelectItem value="member">Member</SelectItem>
										</SelectContent>
									</Select>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label={`Remove ${member.principal}`}
										onClick={() => handleRemove(member)}
									>
										<Trash2 className="size-4" />
									</Button>
								</>
							)}
						</div>
					</li>
				))}
			</PanelList>

			<Panel>
				<PanelBody className="space-y-3">
					<h2 className="text-sm font-medium">Add member</h2>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Input
							aria-label="Member wallet address"
							value={principal}
							onChange={(event) => setPrincipal(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") handleInvite();
							}}
							placeholder="Wallet address"
							disabled={!canManage}
						/>
						<Select
							value={role}
							onValueChange={(value) => setRole(value as EditableRole)}
							disabled={!canManage}
						>
							<SelectTrigger className="sm:w-36" aria-label="New member role">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="admin">Admin</SelectItem>
								<SelectItem value="member">Member</SelectItem>
							</SelectContent>
						</Select>
						<Button
							type="button"
							onClick={handleInvite}
							disabled={!canManage || !principal.trim() || addMember.isPending}
						>
							<Plus />
							Add
						</Button>
					</div>
					<p className="text-xs text-muted-foreground">
						{canManage
							? "Membership is an on-chain account; the new member signs with that wallet."
							: "Only the organization owner can add or remove members."}
					</p>
				</PanelBody>
			</Panel>

			{canManage ? (
				<Panel className="border-destructive/40">
					<PanelBody className="space-y-3">
						<div className="space-y-1">
							<h2 className="text-sm font-medium">Transfer ownership</h2>
							<p className="text-xs text-muted-foreground">
								Irreversible: the new owner gains full control of this organization.
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Input
								aria-label="New owner wallet"
								placeholder="New owner wallet address"
								className="min-w-56 flex-1 font-mono text-xs"
								value={newOwner}
								onChange={(event) => setNewOwner(event.target.value)}
							/>
						</div>
						<Label className="flex items-center gap-2 text-xs font-normal">
							<Checkbox
								checked={transferConfirm}
								onCheckedChange={(checked) => setTransferConfirm(checked === true)}
							/>
							I understand this cannot be undone
						</Label>
						<Button
							variant="destructive"
							disabled={!transferConfirm || !newOwner.trim() || transferOwner.isPending}
							onClick={() =>
								void toast
									.promise(transferOwner.mutateAsync(), {
										loading: "Transferring ownership...",
										success: (result) => result.message,
										error: (error: Error) => error.message || "Could not transfer ownership",
									})
									.unwrap()
									.catch(() => undefined)
							}
						>
							Transfer ownership
						</Button>
					</PanelBody>
				</Panel>
			) : null}
		</PageShell>
	);
};
