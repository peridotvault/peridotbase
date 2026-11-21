import type { SponsorAllowance } from "@peridotvault/peridotbase-sdk";
import { Button } from "@peridotvault/peridotbase-ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@peridotvault/peridotbase-ui/dialog";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Label } from "@peridotvault/peridotbase-ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	closeSponsorAllowance,
	createSponsorAllowance,
	listSponsorAllowances,
	sdkErrorMessage,
	topUpSponsorAllowance,
} from "@/shared/peridotbase";
import { Panel, PanelHeader } from "@/shared/components/page";
import { tableKeys } from "@/shared/query/keys";
import { useWalletSession } from "@/shared/hooks/use-wallet-session";

const LAMPORTS_PER_SOL = 1_000_000_000;

const toSol = (lamports: number) => (lamports / LAMPORTS_PER_SOL).toFixed(4);

const toLamports = (sol: string) => Math.round(Number(sol) * LAMPORTS_PER_SOL);

const expiryFromDays = (days: string): number | undefined => {
	const value = Number(days);

	if (!Number.isFinite(value) || value <= 0) return undefined;

	return Math.floor(Date.now() / 1000) + Math.round(value * 86_400);
};

const formatExpiry = (expiresAt: number) =>
	expiresAt === 0 ? "No expiry" : new Date(expiresAt * 1000).toLocaleDateString();

type DialogState =
	{ mode: "closed" } | { mode: "create" } | { mode: "topup"; allowance: SponsorAllowance };

type FormState = { grantee: string; amount: string; days: string };

const EMPTY_FORM: FormState = { grantee: "", amount: "", days: "" };

/** Prepaid fee allowances the connected wallet sponsors for other wallets. */
export const SponsorAllowanceSection = () => {
	const queryClient = useQueryClient();
	const { wallet } = useWalletSession();
	const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
	const [form, setForm] = useState<FormState>(EMPTY_FORM);

	const allowances = useQuery({
		queryKey: tableKeys.sponsorAllowances(),
		queryFn: listSponsorAllowances,
		enabled: Boolean(wallet),
	});

	const refresh = () =>
		queryClient.invalidateQueries({ queryKey: tableKeys.allSponsorAllowances() });

	const create = useMutation({
		mutationFn: () =>
			createSponsorAllowance({
				grantee: form.grantee.trim(),
				cap: toLamports(form.amount),
				expiresAt: expiryFromDays(form.days),
			}),
		onSuccess: refresh,
	});

	const topUp = useMutation({
		mutationFn: (allowance: { grantee: string }) =>
			topUpSponsorAllowance({
				grantee: allowance.grantee,
				amount: toLamports(form.amount),
				expiresAt: expiryFromDays(form.days),
			}),
		onSuccess: refresh,
	});

	const close = useMutation({
		mutationFn: (grantee: string) => closeSponsorAllowance(grantee),
		onSuccess: refresh,
	});

	const closeDialog = () => {
		setDialog({ mode: "closed" });
		setForm(EMPTY_FORM);
	};

	const openCreate = () => {
		setForm(EMPTY_FORM);
		setDialog({ mode: "create" });
	};

	const openTopUp = (allowance: SponsorAllowance) => {
		setForm({ grantee: allowance.grantee, amount: "", days: "" });
		setDialog({ mode: "topup", allowance });
	};

	const submit = async () => {
		const isTopUp = dialog.mode === "topup";
		const amount = toLamports(form.amount);

		if (!isTopUp && !form.grantee.trim()) return;
		if (!Number.isFinite(amount) || amount <= 0) return;

		try {
			await toast
				.promise(isTopUp ? topUp.mutateAsync(dialog.allowance) : create.mutateAsync(), {
					loading: isTopUp ? "Topping up allowance..." : "Creating allowance...",
					success: (result) => result.message,
					error: (error: Error) => sdkErrorMessage(error, "Could not save the allowance"),
				})
				.unwrap();
			closeDialog();
		} catch {
			// toast.promise already reported the failure.
		}
	};

	const handleClose = async (allowance: SponsorAllowance) => {
		try {
			await toast
				.promise(close.mutateAsync(allowance.grantee), {
					loading: "Closing allowance...",
					success: (result) => result.message,
					error: (error: Error) => sdkErrorMessage(error, "Could not close the allowance"),
				})
				.unwrap();
		} catch {
			// toast.promise already reported the failure.
		}
	};

	const pending = create.isPending || topUp.isPending || close.isPending;
	const rows = allowances.data ?? [];

	return (
		<Panel>
			<PanelHeader
				title="Sponsor allowances"
				description="Prepaid fee caps this wallet covers for other wallets."
				actions={
					<Button size="sm" variant="outline" onClick={openCreate} disabled={!wallet}>
						<Plus />
						New allowance
					</Button>
				}
			/>

			{!wallet ? (
				<p className="px-5 py-4 text-sm text-muted-foreground">
					Connect a wallet to sponsor another wallet&apos;s fees.
				</p>
			) : allowances.error ? (
				<p className="px-5 py-4 text-sm text-muted-foreground">
					{allowances.error instanceof Error
						? allowances.error.message
						: "Could not read allowances."}
				</p>
			) : rows.length === 0 ? (
				<p className="px-5 py-4 text-sm text-muted-foreground">
					{allowances.isPending ? "Reading allowances..." : "No allowances yet."}
				</p>
			) : (
				<ul className="divide-y divide-border text-sm">
					{rows.map((allowance) => {
						const remaining = allowance.cap - allowance.spent;

						return (
							<li
								key={allowance.address}
								className="flex items-center justify-between gap-4 px-5 py-3"
							>
								<div className="min-w-0 space-y-0.5">
									<p className="flex items-center gap-2">
										<Wallet className="size-3.5 text-muted-foreground" />
										<span className="truncate font-mono text-xs">{allowance.grantee}</span>
									</p>
									<p className="text-xs text-muted-foreground">
										{toSol(remaining)} SOL left of {toSol(allowance.cap)} ·{" "}
										{formatExpiry(allowance.expiresAt)}
									</p>
								</div>
								<div className="flex shrink-0 gap-1">
									<Button
										size="sm"
										variant="ghost"
										disabled={pending}
										onClick={() => openTopUp(allowance)}
									>
										Top up
									</Button>
									<Button
										size="icon-sm"
										variant="ghost"
										aria-label={`Close allowance for ${allowance.grantee}`}
										disabled={pending}
										onClick={() => void handleClose(allowance)}
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
							</li>
						);
					})}
				</ul>
			)}

			<Dialog
				open={dialog.mode !== "closed"}
				onOpenChange={(open) => {
					if (!open) closeDialog();
				}}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{dialog.mode === "topup" ? "Top up allowance" : "New sponsor allowance"}
						</DialogTitle>
						<DialogDescription>
							{dialog.mode === "topup"
								? "Adds to the cap and optionally replaces the expiry."
								: "Caps how many lamports of fees the grantee may spend, prepaid from this wallet."}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="allowance-grantee">Grantee wallet</Label>
							<Input
								id="allowance-grantee"
								value={form.grantee}
								readOnly={dialog.mode === "topup"}
								disabled={dialog.mode === "topup"}
								onChange={(event) =>
									setForm((previous) => ({ ...previous, grantee: event.target.value }))
								}
								placeholder="Wallet address"
								className="font-mono"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="allowance-amount">
								{dialog.mode === "topup" ? "Amount to add (SOL)" : "Cap (SOL)"}
							</Label>
							<Input
								id="allowance-amount"
								type="number"
								min="0"
								step="0.001"
								value={form.amount}
								onChange={(event) =>
									setForm((previous) => ({ ...previous, amount: event.target.value }))
								}
								placeholder="0.05"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="allowance-days">
								{dialog.mode === "topup" ? "Extend by (days)" : "Expires in (days)"}
							</Label>
							<Input
								id="allowance-days"
								type="number"
								min="0"
								step="1"
								value={form.days}
								onChange={(event) =>
									setForm((previous) => ({ ...previous, days: event.target.value }))
								}
								placeholder={dialog.mode === "topup" ? "Keep current" : "Never"}
							/>
						</div>
					</div>

					<DialogFooter className="gap-2">
						<Button variant="outline" onClick={closeDialog}>
							Cancel
						</Button>
						<Button onClick={() => void submit()} disabled={pending}>
							{dialog.mode === "topup" ? "Top up" : "Create"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Panel>
	);
};
