import type { DomainCheckOperator } from "@peridotvault/peridotbase-sdk";
import { domainCheckOperators } from "@peridotvault/peridotbase-sdk";
import { Badge } from "@peridotvault/peridotbase-ui/badge";
import { Button } from "@peridotvault/peridotbase-ui/button";
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
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import {
	createDomain,
	createEnum,
	createSchema,
	listDatabaseTypes,
	listSchemas,
	sdkErrorMessage,
} from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";

const DOMAIN_BASES = [
	"bool",
	"i64",
	"decimal",
	"text",
	"uuid",
	"date",
	"timestamp",
	"time",
	"inet",
	"cidr",
	"macaddr",
	"bit",
	"varbit",
] as const;

const OPERATOR_LABELS: Record<DomainCheckOperator, string> = {
	gt: ">",
	ge: "≥",
	lt: "<",
	le: "≤",
	eq: "=",
	ne: "≠",
};

/** Database-level schema namespaces and reusable ENUM/DOMAIN type catalogs. */
export const CatalogSection = () => {
	const queryClient = useQueryClient();
	const { selectedDatabase } = useDatabaseStore();
	const capabilities = useStudioCapabilities();
	const [schemaName, setSchemaName] = useState("");
	const [mode, setMode] = useState<"enum" | "domain">("enum");
	const [typeName, setTypeName] = useState("");
	const [enumValues, setEnumValues] = useState("");
	const [base, setBase] = useState<string>("text");
	const [operator, setOperator] = useState<DomainCheckOperator>("gt");
	const [checkValue, setCheckValue] = useState("");
	const [scale, setScale] = useState("");

	const schemas = useQuery({
		queryKey: tableKeys.schemas(selectedDatabase),
		queryFn: () => listSchemas(selectedDatabase),
		enabled: Boolean(selectedDatabase) && capabilities.ddl,
	});

	const types = useQuery({
		queryKey: tableKeys.databaseTypes(selectedDatabase),
		queryFn: () => listDatabaseTypes(selectedDatabase),
		enabled: Boolean(selectedDatabase) && capabilities.ddl,
	});

	const addSchema = useMutation({
		mutationFn: (name: string) => createSchema(selectedDatabase, name),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: tableKeys.allSchemas() }),
	});

	const addType = useMutation({
		mutationFn: () =>
			mode === "enum"
				? createEnum(selectedDatabase, {
						typeName: typeName.trim(),
						values: enumValues
							.split(",")
							.map((value) => value.trim())
							.filter(Boolean),
					})
				: createDomain(selectedDatabase, {
						typeName: typeName.trim(),
						base,
						operator,
						value: checkValue.trim(),
						scale: scale.trim() ? Number(scale) : undefined,
					}),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: tableKeys.allDatabaseTypes() }),
	});

	if (!capabilities.ddl || !selectedDatabase) return null;

	const handleSchema = async () => {
		const name = schemaName.trim();
		if (!name) return;

		try {
			await toast
				.promise(addSchema.mutateAsync(name), {
					loading: "Creating schema...",
					success: (result) => result.message,
					error: (error: Error) => sdkErrorMessage(error, "Could not create the schema"),
				})
				.unwrap();
			setSchemaName("");
		} catch {
			// toast.promise already reported the failure.
		}
	};

	const handleType = async () => {
		if (!typeName.trim()) return;
		if (mode === "domain" && !checkValue.trim()) return;

		try {
			await toast
				.promise(addType.mutateAsync(), {
					loading: mode === "enum" ? "Creating enum..." : "Creating domain...",
					success: (result) => result.message,
					error: (error: Error) => sdkErrorMessage(error, "Could not create the type"),
				})
				.unwrap();
			setTypeName("");
			setEnumValues("");
			setCheckValue("");
			setScale("");
		} catch {
			// toast.promise already reported the failure.
		}
	};

	return (
		<Panel>
			<PanelHeader
				title="Schemas and types"
				description={`Namespaces plus reusable ENUM and DOMAIN catalogs for ${selectedDatabase}.`}
			/>

			<PanelBody className="space-y-3 border-b border-border">
				<div className="flex items-center justify-between gap-4">
					<p className="text-xs font-medium">Schemas</p>
					<div className="flex flex-wrap gap-1">
						{(schemas.data ?? []).map((schema) => (
							<Badge key={schema.schemaName} variant="secondary">
								{schema.schemaName}
							</Badge>
						))}
						{schemas.isPending ? (
							<span className="text-xs text-muted-foreground">Reading...</span>
						) : null}
					</div>
				</div>
				<div className="flex gap-2">
					<Input
						aria-label="New schema name"
						value={schemaName}
						onChange={(event) => setSchemaName(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") void handleSchema();
						}}
						placeholder="analytics"
						className="font-mono"
					/>
					<Button
						variant="outline"
						onClick={() => void handleSchema()}
						disabled={!schemaName.trim() || addSchema.isPending}
					>
						<Plus className="size-4" />
						Add schema
					</Button>
				</div>
			</PanelBody>

			<PanelBody className="space-y-4">
				<div className="flex items-center justify-between gap-4">
					<p className="text-xs font-medium">Types</p>
					<Select value={mode} onValueChange={(value) => setMode(value as "enum" | "domain")}>
						<SelectTrigger size="sm" aria-label="Type kind">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="enum">Enum</SelectItem>
							<SelectItem value="domain">Domain</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{(types.data ?? []).length > 0 ? (
					<ul className="divide-y divide-border overflow-hidden rounded-sm border border-border text-sm">
						{(types.data ?? []).map((type) => (
							<li
								key={type.typeName}
								className="flex items-center justify-between gap-4 px-4 py-3"
							>
								<div className="min-w-0">
									<p className="truncate font-mono text-xs">{type.typeName}</p>
									<p className="truncate text-xs text-muted-foreground">
										{type.kind === "enum"
											? type.enumValues.join(", ")
											: `${type.base}${type.scale ? `(${type.scale})` : ""} with a check`}
									</p>
								</div>
								<Badge variant={type.kind === "enum" ? "secondary" : "outline"}>
									{type.kind}
								</Badge>
							</li>
						))}
					</ul>
				) : (
					<p className="text-xs text-muted-foreground">
						{types.isPending ? "Reading types..." : "No type catalogs yet."}
					</p>
				)}

				<div className="grid gap-3 sm:grid-cols-2">
					<div className="space-y-1">
						<Label htmlFor="type-name">Name</Label>
						<Input
							id="type-name"
							value={typeName}
							onChange={(event) => setTypeName(event.target.value)}
							placeholder={mode === "enum" ? "order_status" : "positive_amount"}
							className="font-mono"
						/>
					</div>
					{mode === "enum" ? (
						<div className="space-y-1">
							<Label htmlFor="enum-values">Values (comma separated)</Label>
							<Input
								id="enum-values"
								value={enumValues}
								onChange={(event) => setEnumValues(event.target.value)}
								placeholder="pending, paid, refunded"
							/>
						</div>
					) : (
						<>
							<div className="space-y-1">
								<Label>Base type</Label>
								<Select value={base} onValueChange={setBase}>
									<SelectTrigger className="w-full" aria-label="Domain base type">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{DOMAIN_BASES.map((name) => (
											<SelectItem key={name} value={name}>
												{name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1">
								<Label>Check</Label>
								<div className="flex gap-2">
									<Select
										value={operator}
										onValueChange={(value) => setOperator(value as DomainCheckOperator)}
									>
										<SelectTrigger className="w-24" aria-label="Domain check operator">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{domainCheckOperators.map((name) => (
												<SelectItem key={name} value={name}>
													{OPERATOR_LABELS[name]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Input
										aria-label="Domain check value"
										value={checkValue}
										onChange={(event) => setCheckValue(event.target.value)}
										placeholder="0"
									/>
								</div>
							</div>
							<div className="space-y-1">
								<Label htmlFor="domain-scale">Scale (decimal only)</Label>
								<Input
									id="domain-scale"
									type="number"
									min="0"
									value={scale}
									onChange={(event) => setScale(event.target.value)}
									placeholder="0"
								/>
							</div>
						</>
					)}
				</div>

				<div className="flex justify-end">
					<Button
						onClick={() => void handleType()}
						disabled={
							!typeName.trim() ||
							(mode === "domain" && !checkValue.trim()) ||
							addType.isPending
						}
					>
						<Plus className="size-4" />
						{mode === "enum" ? "Add enum" : "Add domain"}
					</Button>
				</div>
			</PanelBody>
		</Panel>
	);
};
