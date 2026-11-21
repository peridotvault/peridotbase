import type { DatabaseGrant } from "@peridotvault/peridotbase-sdk";
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
import { Panel, PanelBody, PanelHeader } from "@/shared/components/page";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import {
	cancelCloseDatabase,
	deleteDatabase,
	grantDatabaseRole,
	listDatabaseGrants,
	renounceDatabaseAuthority,
	revokeDatabaseRole,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { databaseKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";

/** Destructive database lifecycle plus project-level role grants. */
export const DatabaseAdminSection = () => {
	const { selectedDatabase } = useDatabaseStore();
	const capabilities = useStudioCapabilities();
	const queryClient = useQueryClient();
	const [principal, setPrincipal] = useState("");
	const [role, setRole] = useState<"admin" | "member">("member");
	const [confirmName, setConfirmName] = useState("");
	const [closeProposal, setCloseProposal] = useState("");
	const [renounce, setRenounce] = useState(false);

	const grants = useQuery({
		queryKey: databaseKeys.grants(selectedDatabase),
		queryFn: () => listDatabaseGrants(selectedDatabase!),
		enabled: Boolean(selectedDatabase) && capabilities.ddl,
	});

	const refresh = async () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: databaseKeys.all() }),
			queryClient.invalidateQueries({ queryKey: databaseKeys.allGrants() }),
		]);

	const run = async (action: () => Promise<{ message: string }>, loading: string) => {
		try {
			await toast
				.promise(action(), {
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

	const addGrant = useMutation({
		mutationFn: () => grantDatabaseRole(selectedDatabase!, principal.trim(), role),
	});

	const removeGrant = useMutation({
		mutationFn: (entry: DatabaseGrant) =>
			revokeDatabaseRole(selectedDatabase!, entry.principal),
	});

	const closeDatabase = useMutation({
		mutationFn: () => deleteDatabase(selectedDatabase!, closeProposal.trim() || undefined),
	});

	const cancelClose = useMutation({
		mutationFn: () => cancelCloseDatabase(selectedDatabase!),
	});

	const giveUpAuthority = useMutation({
		mutationFn: () => renounceDatabaseAuthority(selectedDatabase!),
	});

	if (!capabilities.ddl || !selectedDatabase) return null;

	const confirmed = confirmName.trim() === selectedDatabase;

	return (
		<Panel>
			<PanelHeader
				title="Database access"
				description={`Project-level role grants and the destructive lifecycle for ${selectedDatabase}.`}
			/>

			<PanelBody className="space-y-5">
				<div className="space-y-3">
					<p className="text-xs font-medium">Role grants</p>
					{(grants.data ?? []).length === 0 ? (
						<p className="text-xs text-muted-foreground">
							{grants.isPending ? "Reading grants..." : "No grants yet."}
						</p>
					) : (
						<ul className="divide-y divide-border overflow-hidden rounded-sm border border-border">
							{(grants.data ?? []).map((grant) => (
								<li
									key={grant.principal}
									className="flex items-center justify-between gap-3 px-4 py-3"
								>
									<div className="min-w-0">
										<p className="truncate font-mono text-xs">{grant.principal}</p>
										<p className="text-xs text-muted-foreground">
											granted by {grant.grantedBy}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="secondary">{grant.role}</Badge>
										<Button
											variant="ghost"
											size="icon"
											aria-label="Revoke grant"
											disabled={removeGrant.isPending}
											onClick={() =>
												void run(() => removeGrant.mutateAsync(grant), "Revoking grant...")
											}
										>
											<Trash2 className="size-4" />
										</Button>
									</div>
								</li>
							))}
						</ul>
					)}
					<div className="flex flex-wrap items-end gap-2">
						<div className="min-w-56 flex-1 space-y-1">
							<Label htmlFor="grant-principal">Wallet address</Label>
							<Input
								id="grant-principal"
								className="font-mono text-xs"
								value={principal}
								onChange={(event) => setPrincipal(event.target.value)}
							/>
						</div>
						<Select
							value={role}
							onValueChange={(value) => setRole(value as "admin" | "member")}
						>
							<SelectTrigger className="w-28" aria-label="Grant role">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="member">Member</SelectItem>
								<SelectItem value="admin">Admin</SelectItem>
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							disabled={!principal.trim() || addGrant.isPending}
							onClick={() => void run(() => addGrant.mutateAsync(), "Granting role...")}
						>
							Grant
						</Button>
					</div>
				</div>

				<div className="space-y-3 border-t border-border pt-4">
					<p className="text-xs font-medium">Lifecycle</p>
					<p className="text-xs text-muted-foreground">
						Type the database name to enable these actions.
					</p>
					<Input
						aria-label="Confirm database name"
						placeholder={selectedDatabase}
						value={confirmName}
						onChange={(event) => setConfirmName(event.target.value)}
					/>
					<Input
						aria-label="Close proposal ID"
						placeholder="Approved close proposal ID (only with an org policy)"
						value={closeProposal}
						onChange={(event) => setCloseProposal(event.target.value)}
					/>
					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							disabled={!confirmed || cancelClose.isPending}
							onClick={() =>
								void run(() => cancelClose.mutateAsync(), "Cancelling staged close...")
							}
						>
							Cancel staged close
						</Button>
						<Button
							variant="destructive"
							disabled={!confirmed || closeDatabase.isPending}
							onClick={() =>
								void run(
									() => closeDatabase.mutateAsync(),
									"Closing every table and the catalog...",
								)
							}
						>
							Delete database
						</Button>
					</div>

					<div className="flex items-start gap-3 rounded-lg border border-destructive/40 p-3">
						<Checkbox
							id="renounce-authority"
							checked={renounce}
							onCheckedChange={(value) => setRenounce(value === true)}
						/>
						<div className="space-y-1">
							<Label htmlFor="renounce-authority" className="cursor-pointer">
								Renounce authority
							</Label>
							<p className="text-xs text-muted-foreground">
								Irreversible: the wallet loses the ability to manage this database.
							</p>
							<Button
								variant="destructive"
								size="sm"
								disabled={!confirmed || !renounce || giveUpAuthority.isPending}
								onClick={() =>
									void run(() => giveUpAuthority.mutateAsync(), "Renouncing authority...")
								}
							>
								Renounce
							</Button>
						</div>
					</div>
				</div>
			</PanelBody>
		</Panel>
	);
};
