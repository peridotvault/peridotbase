import {
	type TableGuardKind,
	type TableGuards,
	TABLE_GUARD_KINDS,
} from "@peridotvault/peridotbase-sdk";
import { Button } from "@peridotvault/peridotbase-ui/button";
import { Checkbox } from "@peridotvault/peridotbase-ui/checkbox";
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
import {
	clearTableExtensionPolicy,
	createCompositeForeignKey,
	createForeignKey,
	dropForeignKey,
	getRelationships,
	getTableIndexes,
	getTableColumns,
	getTableComment,
	getTableExtensionPolicy,
	getTableGuards,
	getTableStorage,
	invokeTableExtension,
	setTableExtensionPolicy,
	setTableComment,
	setTableGuards,
	setTableHistoryLimit,
	setTablePartitioning,
	type StudioError,
} from "@/shared/peridotbase";
import { useTablesList } from "@/shared/hooks/use-tables-list";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { CONSTANTS } from "@/shared/utils/constants";

const GUARD_COPY: Record<TableGuardKind, { label: string; description: string }> = {
	appendOnly: {
		label: "Append only",
		description: "Inserts still land; every update and delete is denied.",
	},
	denyDelete: {
		label: "Deny delete",
		description: "No role can delete a row from this table.",
	},
	denyUpdate: {
		label: "Deny update",
		description: "No role can change an existing row.",
	},
	immutable: {
		label: "Immutable",
		description: "Every row write is denied. Strongest guard; set last.",
	},
	freezePolicies: {
		label: "Freeze policies",
		description: "Policy changes are denied forever; data and schema stay separate.",
	},
};

const EMPTY_GUARDS: TableGuards = {
	appendOnly: false,
	denyDelete: false,
	denyUpdate: false,
	immutable: false,
	freezePolicies: false,
};

/** Comment plus irreversible guards for one table, read from and written to the program. */
export const TableSettingsDialog = ({
	tableName,
	schemaName,
	open,
	onOpenChange,
}: {
	tableName: string;
	schemaName?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();
	const [comment, setComment] = useState("");
	const [guards, setGuards] = useState<TableGuards>(EMPTY_GUARDS);
	const [historyLimit, setHistoryLimit] = useState("0");
	const [strategy, setStrategy] = useState<"none" | "range" | "list">("none");
	const [partitionColumn, setPartitionColumn] = useState("0");
	const [bounds, setBounds] = useState("");
	const [defaultPartition, setDefaultPartition] = useState(false);
	const [extProgram, setExtProgram] = useState("");
	const [extDiscriminator, setExtDiscriminator] = useState("");
	const [extAccounts, setExtAccounts] = useState("");
	const [extData, setExtData] = useState("");
	const [fkColumn, setFkColumn] = useState("");
	const [fkParent, setFkParent] = useState("");
	const [fkParentColumn, setFkParentColumn] = useState("");
	const [compParent, setCompParent] = useState("");
	const [compColumns, setCompColumns] = useState<string[]>([]);
	const [compIndex, setCompIndex] = useState("");
	const { tablesList = [] } = useTablesList();

	const comments = useQuery({
		queryKey: tableKeys.comment(tableName, selectedDatabase, schemaName),
		queryFn: () => getTableComment(tableName, selectedDatabase, schemaName),
		enabled: open,
	});

	const current = useQuery({
		queryKey: tableKeys.guards(tableName, selectedDatabase, schemaName),
		queryFn: () => getTableGuards(tableName, selectedDatabase, schemaName),
		enabled: open,
	});

	const relationships = useQuery({
		queryKey: tableKeys.relationships(selectedDatabase),
		queryFn: () => getRelationships(selectedDatabase),
		enabled: open && Boolean(selectedDatabase),
	});

	const columns = useQuery({
		queryKey: tableKeys.columns(tableName, selectedDatabase, schemaName),
		queryFn: () => getTableColumns(tableName, selectedDatabase, schemaName),
		enabled: open && Boolean(selectedDatabase),
	});

	const compParentIndexes = useQuery({
		queryKey: tableKeys.relationships(`${compParent}:${selectedDatabase}`),
		queryFn: () => getTableIndexes(compParent, selectedDatabase, schemaName),
		enabled: open && Boolean(compParent) && Boolean(selectedDatabase),
	});

	const selectedCompIndex = (compParentIndexes.data ?? []).find(
		(index) => (index.indexId ?? index.indexName) === compIndex,
	);

	const extension = useQuery({
		queryKey: tableKeys.extension(tableName, selectedDatabase, schemaName),
		queryFn: () => getTableExtensionPolicy(tableName, selectedDatabase, schemaName),
		enabled: open,
	});

	useEffect(() => {
		if (!open) return;

		const policy = extension.data;

		setExtProgram(policy?.program ?? "");
		setExtDiscriminator(policy?.discriminator ?? "");
		setExtAccounts(
			(policy?.accounts ?? [])
				.map(
					(account) =>
						`${account.key}${account.writable ? ",write" : ""}${account.signer ? ",sign" : ""}`,
				)
				.join("\n"),
		);
		setExtData("");
	}, [extension.data, open]);

	const storage = useQuery({
		queryKey: tableKeys.storage(tableName, selectedDatabase, schemaName),
		queryFn: () => getTableStorage(tableName, selectedDatabase, schemaName),
		enabled: open,
	});

	useEffect(() => {
		if (!storage.data || !open) return;

		setHistoryLimit(String(storage.data.historyLimit));
		setStrategy(storage.data.partition.strategy);
		setPartitionColumn(String(storage.data.partition.column));
		setBounds(storage.data.partition.bounds.join(", "));
		setDefaultPartition(storage.data.partition.hasDefault);
	}, [storage.data, open]);

	useEffect(() => {
		if (comments.data !== undefined && open) setComment(comments.data ?? "");
	}, [comments.data, open]);

	useEffect(() => {
		if (current.data && open) setGuards(current.data);
	}, [current.data, open]);

	// A table name is unique only inside a schema; filter by both so a same-named table in
	// another namespace does not contribute foreign keys here.
	const outgoingRelationships = (relationships.data ?? []).filter(
		(entry) =>
			entry.fromTable === tableName &&
			(entry.fromSchema === undefined ||
				entry.fromSchema === (schemaName ?? CONSTANTS.DEFAULT_SCHEMA)),
	);

	const save = useMutation({
		mutationFn: async () => {
			const enabled = TABLE_GUARD_KINDS.filter(
				(kind) => guards[kind] && !current.data?.[kind],
			);

			if (enabled.length > 0) {
				await setTableGuards({
					tableName,
					schemaName,
					guards: Object.fromEntries(enabled.map((kind) => [kind, true])),
					db: selectedDatabase,
				});
			}

			if (comment !== (comments.data ?? "")) {
				await setTableComment({
					tableName,
					schemaName,
					comment,
					db: selectedDatabase,
				});
			}
		},
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: tableKeys.allComments() }),
				queryClient.invalidateQueries({ queryKey: tableKeys.allGuards() }),
			]);
			onOpenChange(false);
		},
	});

	const saveStorage = useMutation({
		mutationFn: async () => {
			const data = storage.data;
			if (!data) return;

			const limit = Number(historyLimit);

			if (limit !== data.historyLimit) {
				await setTableHistoryLimit({
					tableName,
					schemaName,
					limit,
					db: selectedDatabase,
				});
			}

			const nextBounds = bounds
				.split(",")
				.map((value) => Number(value.trim()))
				.filter((value) => Number.isFinite(value));
			const changed =
				strategy !== data.partition.strategy ||
				(strategy !== "none" &&
					(Number(partitionColumn) !== data.partition.column ||
						nextBounds.join(",") !== data.partition.bounds.join(",") ||
						defaultPartition !== data.partition.hasDefault));

			if (changed) {
				await setTablePartitioning({
					tableName,
					schemaName,
					payload: {
						strategy,
						column: strategy === "none" ? undefined : Number(partitionColumn),
						bounds: strategy === "range" ? nextBounds : strategy === "list" ? nextBounds : [],
						defaultPartition: strategy === "none" ? undefined : defaultPartition,
					},
					db: selectedDatabase,
				});
			}
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: tableKeys.allStorage() });
		},
	});

	const handleSaveStorage = async () => {
		try {
			await toast
				.promise(saveStorage.mutateAsync(), {
					loading: "Saving storage settings...",
					success: "Storage settings updated",
					error: (error: StudioError) => error.message || "Could not save storage settings",
				})
				.unwrap();
		} catch {
			// toast.promise already reported the failure.
		}
	};

	const link = useMutation({
		mutationFn: () =>
			createForeignKey(tableName, selectedDatabase, schemaName, {
				column: fkColumn,
				parentTable: fkParent,
				parentColumn: fkParentColumn.trim() || undefined,
			}),
	});

	const unlink = useMutation({
		mutationFn: (payload: { fkId: string; parentTable: string }) =>
			dropForeignKey(tableName, selectedDatabase, schemaName, payload),
	});

	const linkComposite = useMutation({
		mutationFn: () =>
			createCompositeForeignKey(tableName, selectedDatabase, schemaName, {
				childColumns: compColumns,
				parentTable: compParent,
				...(compIndex ? { parentIndexId: compIndex } : {}),
			}),
	});

	const refreshRelationships = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: tableKeys.allRelationships() }),
			queryClient.invalidateQueries({ queryKey: tableKeys.allColumns() }),
		]);
	};

	const runRelationship = async (
		work: () => Promise<{ message: string }>,
		loading: string,
	) => {
		try {
			await toast
				.promise(work(), {
					loading,
					success: (result) => result.message,
					error: (error: StudioError) => error.message || "The program rejected the request",
				})
				.unwrap();
			await refreshRelationships();
		} catch {
			// toast.promise already reported the failure.
		}
	};

	const saveExtension = useMutation({
		mutationFn: () =>
			setTableExtensionPolicy(tableName, selectedDatabase, schemaName, {
				program: extProgram.trim(),
				discriminator: extDiscriminator.trim(),
				accounts: extAccounts
					.split("\n")
					.map((line) => line.trim())
					.filter(Boolean)
					.map((line) => {
						const [key, ...flags] = line.split(",").map((part) => part.trim());
						return {
							key,
							writable: flags.includes("write"),
							signer: flags.includes("sign"),
						};
					}),
			}),
	});

	const clearExtension = useMutation({
		mutationFn: () => clearTableExtensionPolicy(tableName, selectedDatabase, schemaName),
	});

	const invokeExtension = useMutation({
		mutationFn: () =>
			invokeTableExtension(tableName, selectedDatabase, schemaName, extData.trim()),
	});

	const saveExtensionAndRefresh = async (action: () => Promise<{ message: string }>) => {
		try {
			await toast
				.promise(action(), {
					loading: "Updating extension...",
					success: (value) => value.message,
					error: (error: StudioError) =>
						error.message || "The program rejected the extension call",
				})
				.unwrap();
			await queryClient.invalidateQueries({ queryKey: tableKeys.allExtensions() });
		} catch {
			// toast.promise already reported the failure.
		}
	};

	const handleSave = async () => {
		try {
			await toast
				.promise(save.mutateAsync(), {
					loading: "Saving table settings...",
					success: "Table settings updated",
					error: (error: StudioError) => error.message || "Could not save table settings",
				})
				.unwrap();
		} catch {
			// toast.promise already reported the failure.
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Table settings</DialogTitle>
					<DialogDescription>
						Comment and irreversible guards for {tableName}.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor="table-comment">Comment</Label>
						<Textarea
							id="table-comment"
							value={comment}
							onChange={(event) => setComment(event.target.value)}
							placeholder="What this table holds"
							rows={3}
						/>
					</div>

					<div className="space-y-3">
						<div className="space-y-1">
							<p className="text-sm font-medium">Guards</p>
							<p className="text-xs text-muted-foreground">
								Guards can only be enabled. The program rejects any attempt to clear one.
							</p>
						</div>
						{TABLE_GUARD_KINDS.map((kind) => {
							const enabled = current.data?.[kind] ?? false;
							const copy = GUARD_COPY[kind];

							return (
								<div
									key={kind}
									className="flex items-start gap-3 rounded-lg border border-border p-3"
								>
									<Checkbox
										id={`guard-${kind}`}
										checked={guards[kind]}
										disabled={enabled || current.isPending}
										onCheckedChange={(checked) =>
											setGuards((previous) => ({
												...previous,
												[kind]: checked === true,
											}))
										}
									/>
									<div className="space-y-1">
										<Label htmlFor={`guard-${kind}`} className="cursor-pointer">
											{copy.label}
											{enabled ? " · on" : ""}
										</Label>
										<p className="text-xs text-muted-foreground">{copy.description}</p>
									</div>
								</div>
							);
						})}
					</div>

					<div className="space-y-3">
						<div className="space-y-1">
							<p className="text-sm font-medium">Storage</p>
							<p className="text-xs text-muted-foreground">
								History keeps revisions per row; partitions route rows by a BIGINT primary-key
								column.
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="history-limit">History retention (0 disables)</Label>
							<Input
								id="history-limit"
								type="number"
								min="0"
								value={historyLimit}
								onChange={(event) => setHistoryLimit(event.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label>Partition strategy</Label>
							<div className="flex flex-wrap items-center gap-2">
								<Select
									value={strategy}
									onValueChange={(value) => setStrategy(value as "none" | "range" | "list")}
								>
									<SelectTrigger className="w-32" aria-label="Partition strategy">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">None</SelectItem>
										<SelectItem value="range">Range</SelectItem>
										<SelectItem value="list">List</SelectItem>
									</SelectContent>
								</Select>
								{strategy !== "none" ? (
									<>
										<Input
											aria-label="Partition column index"
											type="number"
											min="0"
											className="w-24"
											value={partitionColumn}
											onChange={(event) => setPartitionColumn(event.target.value)}
										/>
										<Input
											aria-label="Partition bounds"
											placeholder="100, 200, 300"
											value={bounds}
											onChange={(event) => setBounds(event.target.value)}
										/>
										<div className="flex items-center gap-2">
											<Checkbox
												id="partition-default"
												checked={defaultPartition}
												onCheckedChange={(checked) => setDefaultPartition(checked === true)}
											/>
											<Label htmlFor="partition-default" className="cursor-pointer">
												Default partition
											</Label>
										</div>
									</>
								) : null}
							</div>
						</div>

						<div className="flex justify-end">
							<Button
								variant="outline"
								onClick={() => void handleSaveStorage()}
								disabled={saveStorage.isPending || storage.isPending}
							>
								Apply storage
							</Button>
						</div>
					</div>

					<div className="space-y-3 border-t border-border pt-4">
						<div className="space-y-1">
							<p className="text-sm font-medium">Foreign keys</p>
							<p className="text-xs text-muted-foreground">
								Single-column links to a parent primary key or unique column. The program
								accepts a key only while the child table has no storage, so declare it in
								CREATE TABLE with <code className="font-mono">REFERENCES parent(id)</code>;
								links added after the table exists are rejected on-chain.
							</p>
						</div>
						<ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
							{outgoingRelationships.map((entry) => (
								<li
									key={`${entry.fkId}-${entry.fromColumn}`}
									className="flex items-center justify-between gap-3 px-4 py-2 text-xs"
								>
									<span className="font-mono">
										{entry.fromColumn} →{" "}
										{entry.toSchema && entry.toSchema !== CONSTANTS.DEFAULT_SCHEMA
											? `${entry.toSchema}.`
											: ""}
										{entry.toTable}.{entry.toColumn}
									</span>
									{entry.fkId ? (
										<Button
											variant="ghost"
											size="sm"
											disabled={unlink.isPending}
											onClick={() =>
												void runRelationship(
													() =>
														unlink.mutateAsync({
															fkId: entry.fkId!,
															parentTable: entry.toTable,
														}),
													"Removing foreign key...",
												)
											}
										>
											Remove
										</Button>
									) : null}
								</li>
							))}
							{outgoingRelationships.length === 0 ? (
								<li className="px-4 py-2 text-xs text-muted-foreground">
									No outgoing foreign keys.
								</li>
							) : null}
						</ul>
						<div className="flex flex-wrap items-end gap-2">
							<Select value={fkColumn} onValueChange={setFkColumn}>
								<SelectTrigger className="w-40" aria-label="Child column">
									<SelectValue placeholder="Child column" />
								</SelectTrigger>
								<SelectContent>
									{(columns.data ?? []).map((column) => (
										<SelectItem key={column.columnName} value={column.columnName}>
											{column.columnName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={fkParent} onValueChange={setFkParent}>
								<SelectTrigger className="w-44" aria-label="Parent table">
									<SelectValue placeholder="Parent table" />
								</SelectTrigger>
								<SelectContent>
									{tablesList
										.filter((entry) => entry.tableName !== tableName)
										.map((entry) => (
											<SelectItem key={entry.tableName} value={entry.tableName}>
												{entry.tableName}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
							<Input
								aria-label="Parent column"
								className="w-40"
								placeholder="Parent column (PK default)"
								value={fkParentColumn}
								onChange={(event) => setFkParentColumn(event.target.value)}
							/>
							<Button
								variant="outline"
								disabled={!fkColumn || !fkParent || link.isPending}
								onClick={() =>
									void runRelationship(() => link.mutateAsync(), "Adding foreign key...")
								}
							>
								Add link
							</Button>
						</div>

						<div className="space-y-2 rounded-lg border border-dashed border-input p-3">
							<p className="text-xs font-medium">Composite link</p>
							<p className="text-xs text-muted-foreground">
								Two or more child columns onto a UNIQUE index of the parent.
							</p>
							<div className="flex flex-wrap gap-3">
								{(columns.data ?? []).map((column) => (
									<div key={column.columnName} className="flex items-center gap-1.5">
										<Checkbox
											id={`composite-fk-${column.columnName}`}
											checked={compColumns.includes(column.columnName)}
											onCheckedChange={(checked) =>
												setCompColumns((previous) =>
													checked === true
														? [...previous, column.columnName]
														: previous.filter((name) => name !== column.columnName),
												)
											}
										/>
										<Label
											htmlFor={`composite-fk-${column.columnName}`}
											className="cursor-pointer font-mono font-normal text-xs"
										>
											{column.columnName}
										</Label>
									</div>
								))}
							</div>
							<div className="flex flex-wrap items-end gap-2">
								<Select
									value={compParent}
									onValueChange={(value) => {
										setCompParent(value);
										setCompIndex("");
									}}
								>
									<SelectTrigger className="w-44" aria-label="Composite parent table">
										<SelectValue placeholder="Parent table" />
									</SelectTrigger>
									<SelectContent>
										{tablesList
											.filter((entry) => entry.tableName !== tableName)
											.map((entry) => (
												<SelectItem key={entry.tableName} value={entry.tableName}>
													{entry.tableName}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
								<Select value={compIndex} onValueChange={setCompIndex}>
									<SelectTrigger className="w-52" aria-label="Parent unique index">
										<SelectValue placeholder="Parent UNIQUE index" />
									</SelectTrigger>
									<SelectContent>
										{(compParentIndexes.data ?? [])
											.filter((index) => index.isUnique && index.columns.length >= 2)
											.map((index) => {
												const value = index.indexId ?? index.indexName;

												return (
													<SelectItem key={value} value={value}>
														{index.indexName} ({index.columns.join(", ")})
													</SelectItem>
												);
											})}
									</SelectContent>
								</Select>
								<Button
									variant="outline"
									disabled={
										compColumns.length < 2 ||
										!compParent ||
										!selectedCompIndex ||
										selectedCompIndex.columns.length !== compColumns.length ||
										linkComposite.isPending
									}
									onClick={() =>
										void runRelationship(
											() => linkComposite.mutateAsync(),
											"Adding composite foreign key...",
										)
									}
								>
									Add composite link
								</Button>
							</div>
						</div>
					</div>

					<div className="space-y-3 border-t border-border pt-4">
						<div className="space-y-1">
							<p className="text-sm font-medium">CPI extension</p>
							<p className="text-xs text-muted-foreground">
								Pins one callee program and instruction with a fixed account list. Accounts:
								one per line as <code>address[,write][,sign]</code>.
							</p>
						</div>
						<div className="grid gap-2 sm:grid-cols-2">
							<Input
								aria-label="Extension program"
								placeholder="Callee program ID"
								className="font-mono text-xs"
								value={extProgram}
								onChange={(event) => setExtProgram(event.target.value)}
							/>
							<Input
								aria-label="Extension discriminator"
								placeholder="8-byte discriminator (hex)"
								className="font-mono text-xs"
								value={extDiscriminator}
								onChange={(event) => setExtDiscriminator(event.target.value)}
							/>
						</div>
						<Textarea
							aria-label="Extension accounts"
							rows={3}
							className="font-mono text-xs"
							value={extAccounts}
							onChange={(event) => setExtAccounts(event.target.value)}
						/>
						<div className="flex flex-wrap gap-2">
							<Button
								variant="outline"
								disabled={
									!extProgram.trim() ||
									extDiscriminator.trim().length !== 16 ||
									saveExtension.isPending
								}
								onClick={() => void saveExtensionAndRefresh(() => saveExtension.mutateAsync())}
							>
								Pin extension
							</Button>
							<Button
								variant="outline"
								disabled={!extension.data || clearExtension.isPending}
								onClick={() =>
									void saveExtensionAndRefresh(() => clearExtension.mutateAsync())
								}
							>
								Clear
							</Button>
						</div>
						{extension.data ? (
							<div className="flex flex-wrap items-center gap-2">
								<Input
									aria-label="Extension data"
									placeholder="Instruction data (hex)"
									className="font-mono text-xs"
									value={extData}
									onChange={(event) => setExtData(event.target.value)}
								/>
								<Button
									variant="secondary"
									disabled={invokeExtension.isPending}
									onClick={() =>
										void saveExtensionAndRefresh(() => invokeExtension.mutateAsync())
									}
								>
									Invoke
								</Button>
							</div>
						) : null}
					</div>
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={() => void handleSave()} disabled={save.isPending}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
