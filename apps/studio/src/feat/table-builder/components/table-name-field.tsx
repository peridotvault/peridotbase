import { FieldError } from "@peridotbase/ui/field";
import { Input } from "@peridotbase/ui/input";
import { Label } from "@peridotbase/ui/label";
import { useFormContext } from "react-hook-form";
import type { AddTableFormData } from "@/feat/table-builder/types";

export const TableNameField = () => {
	const {
		register,
		formState: { errors },
	} = useFormContext<AddTableFormData>();

	return (
		<div className="flex gap-24 px-2">
			<Label htmlFor="tableName">Table Name</Label>
			<div className="flex-1 space-y-1">
				<Input
					id="tableName"
					{...register("tableName")}
					className={errors.tableName ? "border-destructive ring-destructive ring-1" : ""}
				/>
				{errors.tableName && <FieldError errors={[errors.tableName]} />}
			</div>
		</div>
	);
};
