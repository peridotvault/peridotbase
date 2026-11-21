import { Badge } from "@peridotvault/peridotbase-ui/badge";
import { Button } from "@peridotvault/peridotbase-ui/button";
import { Switch } from "@peridotvault/peridotbase-ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	getDatabaseAudit,
	listAuditEvents,
	sdkErrorMessage,
	setDatabaseAuditRequired,
	verifyAuditTrail,
} from "@/shared/peridotbase";
import { Panel, PanelHeader } from "@/shared/components/page";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";

const shortAddress = (address: string) =>
	address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;

/** Database-level audit enforcement plus the newest events of the append-only trail. */
export const AuditSection = () => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();
	const capabilities = useStudioCapabilities();
	const [verification, setVerification] = useState<{
		valid: boolean;
		sequence: number;
		brokenAt?: string;
	} | null>(null);

	const audit = useQuery({
		queryKey: tableKeys.audit(selectedDatabase),
		queryFn: () => getDatabaseAudit(selectedDatabase),
		enabled: Boolean(selectedDatabase) && capabilities.ddl,
	});

	const events = useQuery({
		queryKey: tableKeys.auditEvents(selectedDatabase),
		queryFn: () => listAuditEvents(selectedDatabase),
		enabled: Boolean(selectedDatabase) && capabilities.ddl,
	});

	const verify = useMutation({
		mutationFn: () => verifyAuditTrail(selectedDatabase),
	});

	const handleVerify = async () => {
		try {
			const result = await toast
				.promise(verify.mutateAsync(), {
					loading: "Recomputing the audit chain...",
					success: (value) =>
						value.valid
							? `Chain valid across ${value.sequence} events`
							: `Chain broken at ${value.brokenAt ?? "unknown"}`,
					error: (error: Error) => sdkErrorMessage(error, "Could not verify the audit chain"),
				})
				.unwrap();
			setVerification(result);
		} catch {
			// toast.promise already reported the failure.
		}
	};

	const toggle = useMutation({
		mutationFn: (required: boolean) => setDatabaseAuditRequired(selectedDatabase, required),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: tableKeys.allAudit() }),
				queryClient.invalidateQueries({ queryKey: tableKeys.allAuditEvents() }),
			]);
		},
	});

	const handleToggle = async (required: boolean) => {
		try {
			await toast
				.promise(toggle.mutateAsync(required), {
					loading: required
						? "Enabling audit enforcement..."
						: "Disabling audit enforcement...",
					success: (result) => result.message,
					error: (error: Error) =>
						sdkErrorMessage(error, "Could not change audit enforcement"),
				})
				.unwrap();
		} catch {
			// toast.promise already reported the failure.
		}
	};

	if (!capabilities.ddl) return null;

	if (!selectedDatabase) {
		return (
			<Panel className="p-5 text-sm text-muted-foreground">
				Select a database to read its audit trail.
			</Panel>
		);
	}

	const recent = (events.data ?? []).slice(-10).reverse();

	return (
		<Panel>
			<PanelHeader
				title="Audit trail"
				description={
					audit.isPending
						? "Reading the trail head…"
						: `${audit.data?.sequence ?? 0} events · ${selectedDatabase}`
				}
				actions={
					<>
						<Button
							variant="outline"
							size="sm"
							disabled={verify.isPending}
							onClick={() => void handleVerify()}
						>
							Verify chain
						</Button>
						{verification ? (
							<Badge variant={verification.valid ? "secondary" : "destructive"}>
								{verification.valid ? "valid" : `broken at ${verification.brokenAt}`}
							</Badge>
						) : null}
						<span className="text-xs text-muted-foreground">Require events</span>
						<Switch
							aria-label="Require audit events on every write"
							checked={audit.data?.required ?? false}
							disabled={audit.isPending || toggle.isPending}
							onCheckedChange={(checked) => void handleToggle(checked === true)}
						/>
					</>
				}
			/>

			{audit.data?.required ? (
				<p className="border-b border-border px-5 py-3 text-xs text-muted-foreground">
					Every insert, update and delete must append an audit event in the same transaction;
					the program rejects writes that omit one.
				</p>
			) : null}

			{events.error ? (
				<p className="px-5 py-4 text-sm text-muted-foreground">
					{events.error instanceof Error
						? events.error.message
						: "Could not read audit events."}
				</p>
			) : recent.length === 0 ? (
				<p className="px-5 py-4 text-sm text-muted-foreground">
					{events.isPending ? "Reading events..." : "No audit events yet."}
				</p>
			) : (
				<ul className="divide-y divide-border text-sm">
					{recent.map((event) => (
						<li
							key={event.sequence}
							className="flex items-center justify-between gap-4 px-5 py-3"
						>
							<div className="min-w-0 space-y-0.5">
								<p className="flex items-center gap-2">
									<Badge variant="secondary">{event.action}</Badge>
									<span className="font-mono text-xs">#{event.sequence}</span>
									{event.tableId !== "0" ? (
										<span className="text-xs text-muted-foreground">
											table {event.tableId}
										</span>
									) : null}
								</p>
								{event.payload ? (
									<p className="truncate font-mono text-xs text-muted-foreground">
										{event.payload}
									</p>
								) : null}
							</div>
							<div className="shrink-0 text-right text-xs text-muted-foreground">
								<p className="font-mono">{shortAddress(event.actor)}</p>
								<p>{new Date(event.createdAt * 1000).toLocaleString()}</p>
							</div>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
};
