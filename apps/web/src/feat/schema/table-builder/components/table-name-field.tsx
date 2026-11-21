import { FieldError } from "@peridotvault/peridotbase-ui/field";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Label } from "@peridotvault/peridotbase-ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@peridotvault/peridotbase-ui/select";
import { useQuery } from "@tanstack/react-query";
import { useFormContext, useWatch } from "react-hook-form";
import { listSchemas } from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";
import type { AddTableFormData } from "../types";

export const TableNameField = () => {
	const {
		control,
		register,
		setValue,
		formState: { errors },
	} = useFormContext<AddTableFormData>();
	const { selectedDatabase } = useDatabaseStore();
	const schemaName = useWatch({ control, name: "schemaName" });
	const schemas = useQuery({
		queryKey: tableKeys.schemas(selectedDatabase),
		queryFn: () => listSchemas(selectedDatabase),
		enabled: Boolean(selectedDatabase),
	});
	const schemaOptions = Array.from(
		new Set(["public", ...(schemas.data ?? []).map((entry) => entry.schemaName)]),
	);

	return (
		<div className="flex gap-24 px-2">
			<Label htmlFor="tableName">Table Name</Label>
			<div className="flex-1 space-y-1">
				<div className="flex gap-2">
					<Select
						value={schemaName || "public"}
						onValueChange={(value) =>
							setValue("schemaName", value === "public" ? undefined : value)
						}
					>
						<SelectTrigger className="w-36" aria-label="Schema">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{schemaOptions.map((name) => (
								<SelectItem key={name} value={name}>
									{name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Input
						id="tableName"
						{...register("tableName")}
						className={errors.tableName ? "border-destructive ring-destructive ring-1" : ""}
					/>
				</div>
				{errors.tableName && <FieldError errors={[errors.tableName]} />}
			</div>
		</div>
	);
};
